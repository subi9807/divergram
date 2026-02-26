import { useState, useEffect, useCallback } from 'react';
import { X, Camera, Loader } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { db } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';

interface ProfileEditProps {
  onClose: () => void;
  onSaved: () => void;
}

async function getCroppedImage(imageSrc: string, pixelCrop: Area, size = 512): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스를 초기화하지 못했습니다.');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

export default function ProfileEdit({ onClose, onSaved }: ProfileEditProps) {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    website: '',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [cropImageSrc, setCropImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        website: profile.website || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const toDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('failed to read image'));
        reader.readAsDataURL(f);
      });

      const dataUrl = await toDataUrl(file);
      setCropImageSrc(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleApplyCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;

    setUploading(true);
    try {
      const cropped = await getCroppedImage(cropImageSrc, croppedAreaPixels, 512);
      setFormData((prev) => ({ ...prev, avatar_url: cropped }));
      setCropImageSrc('');
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('이미지 크롭에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await db
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          bio: formData.bio,
          website: formData.website,
          avatar_url: formData.avatar_url,
        })
        .eq('id', user.id);

      if (error) throw error;

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error.message || '프로필 업데이트에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <button onClick={onClose} className="hover:bg-gray-100 p-2 rounded-full">
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-semibold">프로필 편집</h2>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-blue-500 font-semibold hover:text-blue-700 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '완료'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-semibold text-3xl">
                      {formData.username?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <Loader className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="text-blue-500 font-semibold cursor-pointer hover:text-blue-700 flex items-center gap-2"
            >
              <Camera className="h-5 w-5" />
              프로필 사진 변경
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
          </div>

          {cropImageSrc && (
            <div className="mb-8 p-4 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold mb-3">사진 크롭 (정사각형)</p>
              <div className="relative w-full h-72 bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={cropImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="mt-4">
                <label className="block text-xs text-gray-600 mb-1">확대</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300"
                  onClick={() => setCropImageSrc('')}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-sm rounded-lg bg-blue-500 text-white"
                  onClick={handleApplyCrop}
                >
                  크롭 적용
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">사용자 이름</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">이름</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">소개</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                maxLength={150}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/150</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">웹사이트</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
