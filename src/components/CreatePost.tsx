import { useEffect, useState } from 'react';
import { X, Upload, Waves, Film, Trash2, GripVertical, MapPin } from 'lucide-react';
import { db } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';
import MentionInput from './MentionInput';
import MapLocationPickerModal from './MapLocationPickerModal';
import { extractExifMetadata } from '../utils/exifGps';

interface CreatePostProps {
  onClose: () => void;
  onPostCreated: () => void;
}

interface FilePreview {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

export default function CreatePost({ onClose, onPostCreated }: CreatePostProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [diveType, setDiveType] = useState<'scuba' | 'freediving' | 'technical'>('scuba');
  const [diveDate, setDiveDate] = useState('');
  const [maxDepth, setMaxDepth] = useState('');
  const [waterTemperature, setWaterTemperature] = useState('');
  const [diveDuration, setDiveDuration] = useState('');
  const [diveSite, setDiveSite] = useState('');
  const [visibility, setVisibility] = useState('');
  const [gasType, setGasType] = useState<'air' | 'nitrox' | 'heliox'>('air');
  const [gasPercent, setGasPercent] = useState('');
  const [buddyName, setBuddyName] = useState('');
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [resortSuggestions, setResortSuggestions] = useState<Array<{ id: string; username: string }>>([]);
  const [resortQuery, setResortQuery] = useState('');
  const [showResortList, setShowResortList] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
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

    loadLocationSuggestions();
  }, []);

  useEffect(() => {
    const fillFromExif = async () => {
      const images = files.filter((f) => f.type === 'image');
      if (!images.length) return;

      for (const img of images) {
        const meta = await extractExifMetadata(img.file);
        if (!meta) continue;

        if (meta.lat != null && meta.lng != null) {
          setLocation(`${meta.lat.toFixed(6)}, ${meta.lng.toFixed(6)}`);
          break;
        }
      }

      if (!diveDate) {
        for (const img of images) {
          const meta = await extractExifMetadata(img.file);
          if (meta?.date) {
            setDiveDate(meta.date);
            break;
          }
        }
      }
    };

    fillFromExif();
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const allValidTypes = [...validImageTypes, ...validVideoTypes];

    const newFiles: FilePreview[] = [];

    selectedFiles.forEach((selectedFile) => {
      if (!allValidTypes.includes(selectedFile.type)) {
        setError('지원하지 않는 파일 형식입니다. 이미지(JPG, PNG, GIF, WEBP) 또는 비디오(MP4, MOV, WEBM)만 업로드 가능합니다.');
        return;
      }

      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('파일 크기는 50MB를 초과할 수 없습니다.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const filePreview: FilePreview = {
          file: selectedFile,
          previewUrl: reader.result as string,
          type: selectedFile.type.startsWith('video/') ? 'video' : 'image'
        };
        newFiles.push(filePreview);

        if (newFiles.length === selectedFiles.length) {
          setFiles(prev => [...prev, ...newFiles]);
          setError('');
        }
      };
      reader.readAsDataURL(selectedFile);
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newFiles = [...files];
    const draggedFile = newFiles[draggedIndex];

    newFiles.splice(draggedIndex, 1);
    newFiles.splice(dropIndex, 0, draggedFile);

    setFiles(newFiles);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const uploadFiles = async (): Promise<Array<{ url: string; type: 'image' | 'video' }> | null> => {
    if (files.length === 0 || !user) return null;

    setUploading(true);
    try {
      const uploadedFiles: Array<{ url: string; type: 'image' | 'video' }> = [];
      const timestamp = Date.now();

      for (let i = 0; i < files.length; i++) {
        const filePreview = files[i];
        const fileExt = filePreview.file.name.split('.').pop();
        const fileName = `${user.id}/${timestamp}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await db.storage
          .from('diving-media')
          .upload(fileName, filePreview.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = db.storage
          .from('diving-media')
          .getPublicUrl(fileName);

        uploadedFiles.push({ url: publicUrl, type: filePreview.type });
      }

      return uploadedFiles;
    } catch (err: any) {
      setError(`업로드 실패: ${err.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || files.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const uploadedFiles = await uploadFiles();
      if (!uploadedFiles || uploadedFiles.length === 0) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const { data: postData, error: insertError } = await db.from('posts').insert({
        user_id: user.id,
        caption: caption,
        dive_type: diveType,
        dive_date: diveDate || null,
        max_depth: maxDepth ? parseFloat(maxDepth) : null,
        water_temperature: waterTemperature ? parseFloat(waterTemperature) : null,
        dive_duration: diveDuration ? parseInt(diveDuration) : null,
        dive_site: (diveSite || '').replace(/^@/, '').trim() || null,
        visibility: visibility ? parseFloat(visibility) : null,
        gas_type: (diveType === 'scuba' || diveType === 'technical') ? gasType : null,
        gas_percent: (diveType === 'scuba' || diveType === 'technical') && gasType !== 'air' && gasPercent ? parseFloat(gasPercent) : null,
        buddy_name: buddyName || null,
        location: location || null,
      }).select().single();

      if (insertError) throw insertError;

      if (postData) {
        const mediaInserts = uploadedFiles.map((file, index) => ({
          post_id: postData.id,
          media_url: file.url,
          media_type: file.type,
          order_index: index,
        }));

        const { error: mediaError } = await db
          .from('post_media')
          .insert(mediaInserts);

        if (mediaError) throw mediaError;
      }

      onPostCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-[#262626]">
          <h2 className="text-xl font-semibold flex items-center gap-2 dark:text-white">
            <Waves className="h-6 w-6 text-blue-500" />
            새 다이빙 로그 작성
          </h2>
          <button
            onClick={onClose}
            className="hover:bg-gray-100 dark:hover:bg-gray-900 p-2 rounded-full"
          >
            <X className="h-6 w-6 dark:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              사진 또는 영상 업로드 * (최대 10개)
            </label>
            {files.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                드래그하여 순서를 변경할 수 있습니다. 첫 번째 미디어가 메인 이미지가 됩니다.
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 mb-3">
              {files.map((filePreview, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-move ${
                    draggedIndex === index
                      ? 'opacity-40 border-blue-500 scale-95'
                      : dragOverIndex === index
                      ? 'border-blue-500 scale-105 shadow-lg'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {filePreview.type === 'video' ? (
                    <video
                      src={filePreview.previewUrl}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <img
                      src={filePreview.previewUrl}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}

                  <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-md">
                    {index + 1}
                  </div>

                  <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-gray-900 bg-opacity-70 text-white p-1 rounded cursor-move">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {index === 0 && (
                    <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded font-semibold shadow-md">
                      메인
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-md z-10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

                  {filePreview.type === 'video' && (
                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <Film className="h-3 w-3" />
                      VIDEO
                    </div>
                  )}
                </div>
              ))}

              {files.length < 10 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50 dark:bg-[#262626]">
                  <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">추가</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              다이빙 타입 *
            </label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center cursor-pointer">
                <input type="radio" value="freediving" checked={diveType === 'freediving'} onChange={() => setDiveType('freediving')} className="mr-2" />
                <span className="text-sm dark:text-gray-300">프리다이빙</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input type="radio" value="scuba" checked={diveType === 'scuba'} onChange={() => setDiveType('scuba')} className="mr-2" />
                <span className="text-sm dark:text-gray-300">스쿠버다이빙</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input type="radio" value="technical" checked={diveType === 'technical'} onChange={() => setDiveType('technical')} className="mr-2" />
                <span className="text-sm dark:text-gray-300">테크니컬다이빙</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                다이빙 날짜
              </label>
              <input
                type="date"
                value={diveDate}
                onChange={(e) => setDiveDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                최대 수심 (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={maxDepth}
                onChange={(e) => setMaxDepth(e.target.value)}
                placeholder="예: 18.5"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {diveType !== 'technical' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  수온 (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={waterTemperature}
                  onChange={(e) => setWaterTemperature(e.target.value)}
                  placeholder="예: 24.0"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {(diveType === 'scuba' || diveType === 'technical') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  다이빙 시간 (분)
                </label>
                <input
                  type="number"
                  value={diveDuration}
                  onChange={(e) => setDiveDuration(e.target.value)}
                  placeholder="예: 45"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                가시거리 (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                placeholder="예: 15.0"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {(diveType === 'scuba' || diveType === 'technical') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    기체 선택
                  </label>
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center cursor-pointer"><input type="radio" className="mr-2" checked={gasType === 'air'} onChange={() => setGasType('air')} />공기</label>
                    <label className="flex items-center cursor-pointer"><input type="radio" className="mr-2" checked={gasType === 'nitrox'} onChange={() => setGasType('nitrox')} />나이트록스</label>
                    <label className="flex items-center cursor-pointer"><input type="radio" className="mr-2" checked={gasType === 'heliox'} onChange={() => setGasType('heliox')} />헬리옥스</label>
                  </div>
                </div>
                {gasType !== 'air' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      농도 (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={gasPercent}
                      onChange={(e) => setGasPercent(e.target.value)}
                      placeholder="예: 32"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              다이빙 리조트
            </label>
            <input
              type="text"
              value={resortQuery || diveSite}
              onChange={(e) => {
                const v = e.target.value;
                setResortQuery(v);
                setDiveSite(v);
                setShowResortList(v.includes('@'));
              }}
              onFocus={() => setShowResortList((resortQuery || diveSite).includes('@'))}
              onBlur={() => setTimeout(() => setShowResortList(false), 120)}
              placeholder="@ 입력 후 리조트 계정 검색"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {showResortList && (
              <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#121212] shadow-lg">
                {resortSuggestions
                  .filter((r) => {
                    const q = (resortQuery || diveSite);
                    const token = q.includes('@') ? q.split('@').pop() || '' : '';
                    return r.username.toLowerCase().includes(token.toLowerCase());
                  })
                  .slice(0, 8)
                  .map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setDiveSite(r.username);
                        setResortQuery(`@${r.username}`);
                        setShowResortList(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#262626] dark:text-white"
                    >
                      @{r.username}
                    </button>
                  ))}
                {resortSuggestions.filter((r) => {
                  const q = (resortQuery || diveSite);
                  const token = q.includes('@') ? q.split('@').pop() || '' : '';
                  return r.username.toLowerCase().includes(token.toLowerCase());
                }).length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-500">리조트 계정을 찾을 수 없습니다.</div>
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
              list="create-location-options"
              value={location}
              readOnly
              placeholder="사진 GPS 또는 지도 핀 좌표"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="create-location-options">
              {locationSuggestions.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              버디
            </label>
            <MentionInput
              value={buddyName}
              onChange={setBuddyName}
              placeholder="@를 입력하여 버디 태그하기"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              다이빙컨디션
            </label>
            <MentionInput
              value={caption}
              onChange={setCaption}
              placeholder="이번 다이빙에 대한 메모나 경험을 적어주세요... (@를 입력하면 사용자를 태그할 수 있습니다)"
              multiline={true}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || uploading}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 dark:text-white rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || uploading || files.length === 0}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? '업로드 중...' : loading ? '게시 중...' : '다이빙 로그 공유'}
            </button>
          </div>
        </form>
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
