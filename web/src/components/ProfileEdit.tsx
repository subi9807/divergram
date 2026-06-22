import { useState, useEffect, useCallback } from 'react';
import { X, Camera, Loader, ShieldCheck } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { db, getApiBase, getToken } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';

interface ProfileEditProps {
  onClose: () => void;
  onSaved: () => void;
}

async function getCroppedImage(imageSrc: string, pixelCrop: Area | null, size = 512): Promise<string> {
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

  const crop = pixelCrop || { x: 0, y: 0, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size,
    size
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

async function fileToJpegDataUrl(file: File, maxSize = 1600): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('failed to read image'));
    reader.readAsDataURL(file);
  });

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('이미지 변환에 실패했습니다. JPG/PNG 사진으로 다시 시도해 주세요.'));
      image.src = original;
    });

    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이미지 변환에 실패했습니다.');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {
    if (/^data:image\/(png|jpe?g|webp);base64,/i.test(original)) return original;
    throw error;
  }
}


export default function ProfileEdit({ onClose, onSaved }: ProfileEditProps) {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    website: '',
    avatar_url: '',
    license_type: '',
    license_number: '',
    license_agency: '',
    license_issued_at: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licenseImageUrl, setLicenseImageUrl] = useState('');
  const [licenseNotice, setLicenseNotice] = useState('');

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
        license_type: profile.license_type || '',
        license_number: profile.license_number || '',
        license_agency: profile.license_agency || '',
        license_issued_at: profile.license_issued_at || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    let objectUrl = '';
    fetch(`${getApiBase()}/api/license-image/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob) return;
        objectUrl = URL.createObjectURL(blob);
        setLicenseImageUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [user]);

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
    if (!cropImageSrc) return;

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


  const handleLicenseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('라이센스 사진은 8MB 이하로 업로드해 주세요.');
      e.target.value = '';
      return;
    }

    setLicenseUploading(true);
    setLicenseNotice('라이센스 사진을 저장하고 OCR로 읽는 중입니다...');
    try {
      const dataUrl = await fileToJpegDataUrl(file);

      const token = getToken();
      const r = await fetch(`${getApiBase()}/api/license-image/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageData: dataUrl }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) throw new Error('로그인 세션이 만료됐어요. 로그아웃 후 다시 로그인한 뒤 업로드해 주세요.');
      if (!r.ok) throw new Error(j.error || 'license_upload_failed');

      if (licenseImageUrl) URL.revokeObjectURL(licenseImageUrl);
      setLicenseImageUrl(URL.createObjectURL(file));

      const ocr = j.ocr || {};
      setFormData((prev) => ({
        ...prev,
        license_agency: ocr.agency || prev.license_agency,
        license_type: ocr.type || prev.license_type,
        license_number: ocr.number || prev.license_number,
        license_issued_at: ocr.issued_at || prev.license_issued_at,
      }));

      if (!j.ocr_configured) {
        setLicenseNotice('사진은 비공개로 저장됐어요. OCR 설정이 없어 자동 입력은 아직 비활성화 상태입니다.');
      } else if (j.ocr_error) {
        setLicenseNotice('사진은 비공개로 저장됐어요. OCR 인식은 실패해서 직접 입력해 주세요.');
      } else {
        setLicenseNotice('사진은 비공개로 저장했고, 인식된 값은 아래 입력칸에 자동 반영했어요. 저장 전 확인해 주세요.');
      }
    } catch (error: any) {
      console.error('Error uploading license image:', error);
      alert(error.message || '라이센스 사진 업로드에 실패했습니다.');
      setLicenseNotice('');
    } finally {
      setLicenseUploading(false);
      e.target.value = '';
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
          license_type: formData.license_type,
          license_number: formData.license_number,
          license_agency: formData.license_agency,
          license_issued_at: formData.license_issued_at,
        })
        .eq('id', user.id);

      if (error) throw error;

      onSaved();
      onClose();
      window.location.reload();
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

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-900">다이빙 라이센스</h3>
                <p className="mt-1 text-xs text-gray-500">프로필에 표시할 대표 라이센스를 등록해 주세요.</p>
              </div>
              <div className="mb-4 rounded-xl border border-emerald-100 bg-white p-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">라이센스 사진</p>
                    <p className="mt-1 text-xs text-gray-500">사진은 본인만 볼 수 있게 비공개로 저장됩니다. 공개 프로필에는 노출되지 않아요.</p>
                    {licenseImageUrl && (
                      <img src={licenseImageUrl} alt="비공개 라이센스" className="mt-3 max-h-40 rounded-lg border border-gray-200 object-contain" />
                    )}
                    {licenseNotice && <p className="mt-2 text-xs text-blue-600">{licenseNotice}</p>}
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                      {licenseUploading ? <Loader className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      {licenseUploading ? '인식 중...' : '사진 업로드 + OCR 자동입력'}
                      <input type="file" accept="image/*" onChange={handleLicenseImageUpload} disabled={licenseUploading} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold mb-2">라이센스 종류</label>
                  <select
                    value={formData.license_type}
                    onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택 안 함</option>
                    <option value="Open Water">Open Water</option>
                    <option value="Advanced Open Water">Advanced Open Water</option>
                    <option value="Rescue Diver">Rescue Diver</option>
                    <option value="Dive Master">Dive Master</option>
                    <option value="Instructor">Instructor</option>
                    <option value="Freediving">Freediving</option>
                    <option value="Technical Diver">Technical Diver</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">발급기관</label>
                  <input
                    type="text"
                    value={formData.license_agency}
                    onChange={(e) => setFormData({ ...formData, license_agency: e.target.value })}
                    placeholder="PADI, SSI, NAUI 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">라이센스 번호</label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    placeholder="선택 입력"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">취득일</label>
                  <input
                    type="date"
                    value={formData.license_issued_at}
                    onChange={(e) => setFormData({ ...formData, license_issued_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
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
