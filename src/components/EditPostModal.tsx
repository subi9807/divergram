import { useState, useRef } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { Post, db, PostMedia } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<Post>) => void;
  post: Post;
}

export default function EditPostModal({
  isOpen,
  onClose,
  onSave,
  post,
}: EditPostModalProps) {
  const [caption, setCaption] = useState(post.caption || '');
  const [location, setLocation] = useState(post.location || '');
  const [diveType, setDiveType] = useState<'scuba' | 'freediving' | undefined>(post.dive_type);
  const [diveDate, setDiveDate] = useState(post.dive_date || '');
  const [maxDepth, setMaxDepth] = useState(post.max_depth?.toString() || '');
  const [waterTemp, setWaterTemp] = useState(post.water_temperature?.toString() || '');
  const [diveDuration, setDiveDuration] = useState(post.dive_duration?.toString() || '');
  const [diveSite, setDiveSite] = useState(post.dive_site || '');
  const [visibility, setVisibility] = useState(post.visibility?.toString() || '');
  const [buddyName, setBuddyName] = useState(post.buddy_name || '');
  const [existingMedia, setExistingMedia] = useState<PostMedia[]>(post.post_media || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

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
        buddy_name: buddyName || undefined,
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
      <div className="bg-white dark:bg-[#121212] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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

            <div className="grid grid-cols-3 gap-2 mb-3">
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
                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 flex flex-col items-center justify-center transition-colors"
              >
                <Upload className="h-6 w-6 text-gray-400 dark:text-gray-500 mb-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400">추가</span>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              문구
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="문구를 입력하세요..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              위치
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="위치를 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              다이빙 타입
            </label>
            <select
              value={diveType || ''}
              onChange={(e) => setDiveType(e.target.value as 'scuba' | 'freediving' || undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택 안함</option>
              <option value="scuba">스쿠버 다이빙</option>
              <option value="freediving">프리다이빙</option>
            </select>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    다이빙 사이트
                  </label>
                  <input
                    type="text"
                    value={diveSite}
                    onChange={(e) => setDiveSite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="다이빙 사이트"
                  />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  버디 이름
                </label>
                <input
                  type="text"
                  value={buddyName}
                  onChange={(e) => setBuddyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="버디 이름"
                />
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
    </div>
  );
}
