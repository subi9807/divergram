import { useState, useRef, useEffect } from 'react';
import { X, Upload, Trash2, MapPin } from 'lucide-react';
import { Post, db, PostMedia } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';
import MapLocationPickerModal from './MapLocationPickerModal';
import { extractExifMetadata } from '../utils/exifGps';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<Post>) => void;
  post: Post;
}

function getCaretCoordinates(el: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div');
  const style = window.getComputedStyle(el);
  const props = [
    'boxSizing', 'width', 'height', 'overflowX', 'overflowY', 'borderTopWidth', 'borderRightWidth',
    'borderBottomWidth', 'borderLeftWidth', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust', 'lineHeight',
    'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing',
  ] as const;

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  props.forEach((p) => { (div.style as any)[p] = style[p]; });
  div.textContent = el.value.substring(0, position);

  const span = document.createElement('span');
  span.textContent = el.value.substring(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);
  const top = span.offsetTop - el.scrollTop;
  const left = span.offsetLeft - el.scrollLeft;
  document.body.removeChild(div);

  return { top, left };
}

export default function EditPostModal({
  isOpen,
  onClose,
  onSave,
  post,
}: EditPostModalProps) {
  const [caption, setCaption] = useState(post.caption || '');
  const [location, setLocation] = useState(post.location || '');
  const [diveType, setDiveType] = useState<'scuba' | 'freediving' | 'technical' | undefined>(post.dive_type as any);
  const [diveDate, setDiveDate] = useState(post.dive_date || '');
  const [maxDepth, setMaxDepth] = useState(post.max_depth?.toString() || '');
  const [waterTemp, setWaterTemp] = useState(post.water_temperature?.toString() || '');
  const [diveDuration, setDiveDuration] = useState(post.dive_duration?.toString() || '');
  const [diveSite, setDiveSite] = useState(post.dive_site || '');
  const [visibility, setVisibility] = useState(post.visibility?.toString() || '');
  const [selectedBuddies, setSelectedBuddies] = useState<string[]>(
    (post.buddy_name || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  );
  const [buddyQuery, setBuddyQuery] = useState('');
  const [existingMedia, setExistingMedia] = useState<PostMedia[]>(post.post_media || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const [followingUsers, setFollowingUsers] = useState<Array<{ id: string; username: string }>>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionPopupPos, setMentionPopupPos] = useState({ top: 0, left: 0 });
  const [suggestionMode, setSuggestionMode] = useState<'mention' | 'hashtag'>('mention');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [buddySuggestions, setBuddySuggestions] = useState<Array<{ id: string; username: string }>>([]);
  const [showBuddyList, setShowBuddyList] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [resortSuggestions, setResortSuggestions] = useState<Array<{ id: string; username: string }>>([]);
  const [resortQuery, setResortQuery] = useState(post.dive_site || '');
  const [showResortList, setShowResortList] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const loadRelations = async () => {
      if (!user) return;

      const [{ data: follows }, { data: followers }] = await Promise.all([
        db.from('follows').select('following_id').eq('follower_id', user.id),
        db.from('follows').select('follower_id').eq('following_id', user.id),
      ]);

      const ids = Array.from(new Set([
        ...(follows || []).map((f: any) => String(f.following_id)),
        ...(followers || []).map((f: any) => String(f.follower_id)),
      ]));

      if (!ids.length) {
        setFollowingUsers([]);
        setBuddySuggestions([]);
        return;
      }

      const { data: profiles } = await db.from('profiles').select('id, username').in('id', ids);
      const list = (profiles || []).map((p: any) => ({ id: String(p.id), username: p.username }));
      setFollowingUsers(list);
      setBuddySuggestions(list);
    };

    const loadLocationSuggestions = async () => {
      const { data } = await db
        .from('posts')
        .select('location, dive_site')
        .order('created_at', { ascending: false })
        .limit(300);

      const merged = Array.from(new Set(
        (data || [])
          .flatMap((item: any) => [item.location, item.dive_site])
          .map((v) => String(v || '').trim())
          .filter(Boolean)
      ));

      setLocationSuggestions(merged);

      const { data: resorts } = await db
        .from('profiles')
        .select('id, username, account_type')
        .eq('account_type', 'resort');

      setResortSuggestions((resorts || []).map((r: any) => ({ id: String(r.id), username: String(r.username || '') })));
    };

    if (isOpen) {
      loadRelations();
      loadLocationSuggestions();
    }
  }, [isOpen, user]);

  useEffect(() => {
    const fillFromExif = async () => {
      const images = newFiles.filter((f) => f.type.startsWith('image/'));
      if (!images.length) return;

      for (const img of images) {
        const meta = await extractExifMetadata(img);
        if (!meta) continue;
        if (meta.lat != null && meta.lng != null) {
          setLocation(`${meta.lat.toFixed(6)}, ${meta.lng.toFixed(6)}`);
          break;
        }
      }

      if (!diveDate) {
        for (const img of images) {
          const meta = await extractExifMetadata(img);
          if (meta?.date) {
            setDiveDate(meta.date);
            break;
          }
        }
      }
    };

    fillFromExif();
  }, [newFiles]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    setNewFiles(prev => [...prev, ...imageFiles]);
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingMedia = (mediaId: string) => {
    setDeletedMediaIds(prev => [...prev, mediaId]);
    setExistingMedia(prev => prev.filter(m => m.id !== mediaId));
  };

  const hashtagSuggestions = [
    '다이빙', '프리다이빙', '스쿠버', '바다기록', '오늘의다이브', '수중사진', '다이브로그', '오션'
  ];

  const filteredMentions = followingUsers.filter((u) => u.username?.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8);
  const filteredHashtags = hashtagSuggestions.filter((t) => t.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8);

  const handleCaptionChange = (value: string) => {
    setCaption(value);
    const el = captionRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const textUntilCaret = value.slice(0, caret);
    const m = textUntilCaret.match(/(^|\s)([@#])([a-zA-Z0-9_가-힣]*)$/);
    if (m) {
      setSuggestionMode(m[2] === '@' ? 'mention' : 'hashtag');
      setMentionQuery(m[3] || '');
      setShowMentionList(true);
      setSelectedSuggestionIndex(0);

      const pos = getCaretCoordinates(el, caret);
      setMentionPopupPos({
        top: Math.min(el.clientHeight - 8, pos.top + 26),
        left: Math.min(el.clientWidth - 180, Math.max(8, pos.left)),
      });
    } else {
      setShowMentionList(false);
      setMentionQuery('');
    }
  };

  const insertToken = (token: string, mode: 'mention' | 'hashtag') => {
    const el = captionRef.current;
    const current = caption;
    const prefix = mode === 'mention' ? '@' : '#';

    if (!el) {
      setCaption(`${current} ${prefix}${token} `);
      setShowMentionList(false);
      return;
    }

    const caret = el.selectionStart ?? current.length;
    const before = current.slice(0, caret);
    const after = current.slice(caret);
    const replaced = before.replace(/(^|\s)([@#])([a-zA-Z0-9_가-힣]*)$/, `$1${prefix}${token} `);
    const next = replaced + after;
    setCaption(next);
    setShowMentionList(false);
    setMentionQuery('');

    requestAnimationFrame(() => {
      const pos = replaced.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setUploading(true);

    try {
      const uploadedMediaUrls: { url: string; type: 'image' | 'video' }[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${timestamp}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await db.storage
          .from('diving-media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data: urlData } = db.storage
          .from('diving-media')
          .getPublicUrl(uploadData.path);

        uploadedMediaUrls.push({
          url: urlData.publicUrl,
          type: file.type.startsWith('video/') ? 'video' : 'image'
        });
      }

      for (const mediaId of deletedMediaIds) {
        const media = post.post_media?.find(m => m.id === mediaId);
        if (media) {
          const urlParts = media.media_url.split('/');
          const bucketIndex = urlParts.indexOf('diving-media');
          if (bucketIndex !== -1) {
            const filePath = urlParts.slice(bucketIndex + 1).join('/');

            await db.storage
              .from('diving-media')
              .remove([filePath]);
          }

          await db
            .from('post_media')
            .delete()
            .eq('id', mediaId);
        }
      }

      const maxOrderIndex = Math.max(
        ...existingMedia.map(m => m.order_index),
        0
      );

      for (let i = 0; i < uploadedMediaUrls.length; i++) {
        const mediaData = uploadedMediaUrls[i];
        await db.from('post_media').insert({
          post_id: post.id,
          media_url: mediaData.url,
          media_type: mediaData.type,
          order_index: maxOrderIndex + i + 1,
        });
      }

      const updatedData: Partial<Post> = {
        caption,
        location: location || undefined,
        dive_type: diveType || undefined,
        dive_date: diveDate || undefined,
        max_depth: maxDepth ? parseFloat(maxDepth) : undefined,
        water_temperature: waterTemp ? parseFloat(waterTemp) : undefined,
        dive_duration: diveDuration ? parseInt(diveDuration) : undefined,
        dive_site: diveSite || undefined,
        visibility: visibility ? parseFloat(visibility) : undefined,
        buddy_name: selectedBuddies.length ? selectedBuddies.join(', ') : undefined,
      };

      onSave(updatedData);
      onClose();
    } catch (error) {
      console.error('Error updating post:', error);
      alert('게시물 수정 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-[#262626]">
          <h2 className="text-xl font-semibold dark:text-white">게시물 수정</h2>
          <button
            onClick={onClose}
            className="hover:bg-gray-100 dark:hover:bg-gray-900 p-2 rounded-full"
          >
            <X className="h-6 w-6 dark:text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              미디어
            </label>

            <div className="grid grid-cols-3 gap-2 mb-3 w-full">
              {existingMedia.map((media) => (
                <div key={media.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                  {media.media_type === 'image' ? (
                    <img src={media.media_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={media.media_url} className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => handleRemoveExistingMedia(media.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {newFiles.map((file, index) => (
                <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-500 dark:border-blue-400">
                  {file.type.startsWith('video/') ? (
                    <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                  ) : (
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => handleRemoveNewFile(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                    새 파일
                  </div>
                </div>
              ))}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="col-span-3 w-full h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 flex flex-row items-center justify-center gap-2 transition-colors"
              >
                <Upload className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">미디어 추가</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              다이빙컨디션
            </label>
            <textarea
              ref={captionRef}
              value={caption}
              onChange={(e) => handleCaptionChange(e.target.value)}
              onKeyDown={(e) => {
                if (!showMentionList) return;
                const list = suggestionMode === 'mention' ? filteredMentions : filteredHashtags;
                if (!list.length) return;

                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedSuggestionIndex((prev) => (prev + 1) % list.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedSuggestionIndex((prev) => (prev - 1 + list.length) % list.length);
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  const item = list[selectedSuggestionIndex];
                  if (!item) return;
                  if (suggestionMode === 'mention') {
                    insertToken((item as any).username, 'mention');
                  } else {
                    insertToken(String(item), 'hashtag');
                  }
                } else if (e.key === 'Escape') {
                  setShowMentionList(false);
                }
              }}
              className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="다이빙 컨디션을 입력하세요..."
            />

            {showMentionList && (
              <div
                className="absolute z-20 w-44 max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#121212] shadow-lg"
                style={{ top: mentionPopupPos.top, left: mentionPopupPos.left }}
              >
                {suggestionMode === 'mention' && filteredMentions.map((u, idx) => (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertToken(u.username, 'mention')}
                    className={`w-full text-left px-3 py-2 text-sm dark:text-white ${idx === selectedSuggestionIndex ? 'bg-gray-100 dark:bg-[#262626]' : 'hover:bg-gray-100 dark:hover:bg-[#262626]'}`}
                  >
                    @{u.username}
                  </button>
                ))}

                {suggestionMode === 'hashtag' && filteredHashtags.map((t, idx) => (
                  <button
                    key={t}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertToken(t, 'hashtag')}
                    className={`w-full text-left px-3 py-2 text-sm dark:text-white ${idx === selectedSuggestionIndex ? 'bg-gray-100 dark:bg-[#262626]' : 'hover:bg-gray-100 dark:hover:bg-[#262626]'}`}
                  >
                    #{t}
                  </button>
                ))}

                {((suggestionMode === 'mention' && filteredMentions.length === 0) || (suggestionMode === 'hashtag' && filteredHashtags.length === 0)) && (
                  <div className="px-3 py-2 text-xs text-gray-500">추천 항목이 없습니다.</div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              위치
            </label>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setShowMapPicker(true)} className="px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-700 dark:text-gray-200 inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                지도에서 핀 찍기
              </button>
            </div>
            <input
              type="text"
              list="edit-location-options"
              value={location}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="사진 GPS 또는 지도 핀 좌표"
            />
            <datalist id="edit-location-options">
              {locationSuggestions.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              다이빙 타입
            </label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center cursor-pointer dark:text-gray-300">
                <input type="radio" checked={diveType === 'freediving'} onChange={() => setDiveType('freediving')} className="mr-2" />
                프리다이빙
              </label>
              <label className="flex items-center cursor-pointer dark:text-gray-300">
                <input type="radio" checked={diveType === 'scuba'} onChange={() => setDiveType('scuba')} className="mr-2" />
                스쿠버다이빙
              </label>
              <label className="flex items-center cursor-pointer dark:text-gray-300">
                <input type="radio" checked={diveType === 'technical'} onChange={() => setDiveType('technical')} className="mr-2" />
                테크니컬다이빙
              </label>
            </div>
          </div>

          {diveType && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    다이빙 날짜
                  </label>
                  <input
                    type="date"
                    value={diveDate}
                    onChange={(e) => setDiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    다이빙 리조트
                  </label>
                  <input
                    type="text"
                    value={resortQuery || diveSite}
                    onChange={(e) => {
                      setResortQuery(e.target.value);
                      setDiveSite(e.target.value);
                      setShowResortList(true);
                    }}
                    onFocus={() => setShowResortList(true)}
                    onBlur={() => setTimeout(() => setShowResortList(false), 120)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="리조트 계정 검색"
                  />

                  {showResortList && (
                    <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#121212] shadow-lg">
                      {resortSuggestions
                        .filter((r) => r.username.toLowerCase().includes((resortQuery || diveSite).toLowerCase()))
                        .slice(0, 8)
                        .map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setDiveSite(r.username);
                              setResortQuery(r.username);
                              setShowResortList(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#262626] dark:text-white"
                          >
                            @{r.username}
                          </button>
                        ))}
                      {resortSuggestions.filter((r) => r.username.toLowerCase().includes((resortQuery || diveSite).toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-500">리조트 계정을 찾을 수 없습니다.</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    최대 수심 (m)
                  </label>
                  <input
                    type="number"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    수온 (°C)
                  </label>
                  <input
                    type="number"
                    value={waterTemp}
                    onChange={(e) => setWaterTemp(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    다이빙 시간 (분)
                  </label>
                  <input
                    type="number"
                    value={diveDuration}
                    onChange={(e) => setDiveDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    시야 (m)
                  </label>
                  <input
                    type="number"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  버디 이름 (여러 명 선택 가능)
                </label>

                {selectedBuddies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedBuddies.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-3 py-1 text-sm"
                      >
                        @{name}
                        <button
                          type="button"
                          onClick={() => setSelectedBuddies((prev) => prev.filter((v) => v !== name))}
                          className="hover:opacity-80"
                          aria-label={`${name} 제거`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={buddyQuery}
                  onChange={(e) => {
                    setBuddyQuery(e.target.value);
                    setShowBuddyList(true);
                  }}
                  onFocus={() => setShowBuddyList(true)}
                  onBlur={() => setTimeout(() => setShowBuddyList(false), 120)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="버디 이름을 검색해서 여러 명 추가"
                />

                {showBuddyList && (
                  <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#121212] shadow-lg">
                    {buddySuggestions
                      .filter((u) => u.username?.toLowerCase().includes(buddyQuery.toLowerCase()))
                      .filter((u) => !selectedBuddies.includes(u.username))
                      .slice(0, 8)
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedBuddies((prev) => [...prev, u.username]);
                            setBuddyQuery('');
                            setShowBuddyList(true);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#262626] dark:text-white"
                        >
                          @{u.username}
                        </button>
                      ))}
                    {buddySuggestions
                      .filter((u) => u.username?.toLowerCase().includes(buddyQuery.toLowerCase()))
                      .filter((u) => !selectedBuddies.includes(u.username)).length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500">추가할 버디가 없습니다.</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
              disabled={uploading}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              {uploading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      <MapLocationPickerModal
        isOpen={showMapPicker}
        initialLocation={location}
        onClose={() => setShowMapPicker(false)}
        onSelect={({ locationText }) => {
          setLocation(locationText);
          setShowMapPicker(false);
        }}
      />
    </div>
  );
}
