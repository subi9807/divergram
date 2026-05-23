import { apiClient } from '../lib/api';

export type UploadResult = { url: string; thumbnailUrl?: string; source: 'cloudinary' | 'mock' };

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '';

function makeMockUploadUrl(type: 'image' | 'video') {
  if (type === 'image') return 'https://res.cloudinary.com/demo/image/upload/divergram-placeholder.jpg';
  return 'https://res.cloudinary.com/demo/video/upload/divergram-placeholder.mp4';
}

function inferMimeType(uri: string, type: 'image' | 'video') {
  const lower = uri.toLowerCase();
  if (type === 'video') {
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.m4v')) return 'video/x-m4v';
    if (lower.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

function inferFileName(uri: string, type: 'image' | 'video') {
  const name = uri.split('/').pop() || '';
  if (name.includes('.')) return name;
  const ext = type === 'video' ? 'mp4' : 'jpg';
  return `divergram-${Date.now()}.${ext}`;
}

async function uploadToCloudinary(uri: string, type: 'image' | 'video'): Promise<UploadResult> {
  const fileName = inferFileName(uri, type);
  const mimeType = inferMimeType(uri, type);
  const signature = await apiClient.requestCloudinarySignedUpload({
    resourceType: type,
    fileName,
    mimeType,
    folder: 'divergram',
  });

  const cloudName = (signature.cloudName || CLOUD_NAME || '').trim();
  if (!cloudName) {
    throw new Error('cloudinary_cloud_name_missing');
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`;
  const formData = new FormData();
  formData.append('file', { uri, type: mimeType, name: fileName } as any);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  if (signature.apiKey) formData.append('api_key', signature.apiKey);
  if (signature.uploadPreset) formData.append('upload_preset', signature.uploadPreset);
  if (signature.folder) formData.append('folder', signature.folder);
  if (signature.publicId) formData.append('public_id', signature.publicId);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const raw = await response.text();
  let payload: any = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { raw };
  }

  if (!response.ok) {
    throw new Error(String(payload?.error?.message || payload?.message || `cloudinary_upload_failed_${response.status}`));
  }

  const uploadedUrl = String(payload?.secure_url || payload?.url || '').trim();
  if (!uploadedUrl) throw new Error('cloudinary_upload_url_missing');

  if (type === 'video') {
    return {
      url: uploadedUrl,
      thumbnailUrl: generateThumbnail(uploadedUrl),
      source: 'cloudinary',
    };
  }

  return {
    url: uploadedUrl,
    source: 'cloudinary',
  };
}

export async function uploadImage(uri: string): Promise<UploadResult> {
  const normalized = String(uri || '').trim();
  if (!normalized) {
    return { url: makeMockUploadUrl('image'), source: 'mock' };
  }
  try {
    return await uploadToCloudinary(normalized, 'image');
  } catch {
    return { url: makeMockUploadUrl('image'), source: 'mock' };
  }
}

export async function uploadVideo(uri: string): Promise<UploadResult> {
  const normalized = String(uri || '').trim();
  if (!normalized) {
    return {
      url: makeMockUploadUrl('video'),
      thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/divergram-placeholder-thumb.jpg',
      source: 'mock',
    };
  }
  try {
    return await uploadToCloudinary(normalized, 'video');
  } catch {
    return {
      url: makeMockUploadUrl('video'),
      thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/divergram-placeholder-thumb.jpg',
      source: 'mock',
    };
  }
}

export function generateThumbnail(videoUrl: string): string {
  const url = String(videoUrl || '').trim();
  if (!url) return 'https://res.cloudinary.com/demo/image/upload/divergram-placeholder-thumb.jpg';
  if (!url.includes('/upload/')) {
    return 'https://res.cloudinary.com/demo/image/upload/divergram-placeholder-thumb.jpg';
  }
  return url
    .replace('/video/upload/', '/video/upload/so_1/')
    .replace(/\.(mp4|mov|m4v|webm)(\?.*)?$/i, '.jpg');
}

function inferDeleteResourceType(url: string): 'image' | 'video' | 'raw' {
  const lower = String(url || '').toLowerCase();
  if (lower.includes('/video/upload/')) return 'video';
  if (lower.match(/\.(mp4|mov|m4v|webm)(\?.*)?$/i)) return 'video';
  return 'image';
}

export async function deleteMedia(url: string): Promise<void> {
  const normalized = String(url || '').trim();
  if (!normalized) return;
  try {
    await apiClient.deleteCloudinaryMedia({
      url: normalized,
      resourceType: inferDeleteResourceType(normalized),
    });
  } catch {
    // 삭제 실패는 UX 중단 없이 무시하고, 서버 정책에 따라 정리 작업으로 위임한다.
  }
}
