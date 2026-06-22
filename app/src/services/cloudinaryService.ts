import { apiClient } from '../lib/api';
import { storage } from '../lib/storage';

export type UploadResult = { url: string; thumbnailUrl?: string; source: 'cloudinary' | 'mock' };

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || '';

export function getCloudinaryConfig() {
  return {
    cloudName: CLOUD_NAME.trim(),
    uploadPreset: UPLOAD_PRESET.trim(),
    hasCloudName: Boolean(CLOUD_NAME.trim()),
    hasUploadPreset: Boolean(UPLOAD_PRESET.trim()),
    canUnsignedUpload: Boolean(CLOUD_NAME.trim() && UPLOAD_PRESET.trim()),
  };
}

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

function buildCloudinaryEndpoint(type: 'image' | 'video', cloudName: string) {
  return `https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`;
}

function readCloudinaryResponse(raw: string) {
  let payload: any = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { raw };
  }
  return payload;
}

async function uploadToCloudinarySigned(uri: string, type: 'image' | 'video'): Promise<UploadResult> {
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

  const endpoint = buildCloudinaryEndpoint(type, cloudName);
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
  const payload = readCloudinaryResponse(raw);

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

async function uploadToCloudinaryUnsigned(uri: string, type: 'image' | 'video'): Promise<UploadResult> {
  const { cloudName, uploadPreset, canUnsignedUpload } = getCloudinaryConfig();
  if (!canUnsignedUpload) {
    throw new Error('cloudinary_unsigned_config_missing');
  }

  const fileName = inferFileName(uri, type);
  const mimeType = inferMimeType(uri, type);
  const endpoint = buildCloudinaryEndpoint(type, cloudName);
  const formData = new FormData();
  formData.append('file', { uri, type: mimeType, name: fileName } as any);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'divergram');
  formData.append('public_id', `divergram-${Date.now()}-${fileName.replace(/\.[^.]+$/, '')}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const raw = await response.text();
  const payload = readCloudinaryResponse(raw);

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

async function uploadToCloudinary(uri: string, type: 'image' | 'video'): Promise<UploadResult> {
  const cloudConfig = getCloudinaryConfig();

  try {
    return await uploadToCloudinarySigned(uri, type);
  } catch (signedError) {
    if (cloudConfig.canUnsignedUpload) {
      try {
        return await uploadToCloudinaryUnsigned(uri, type);
      } catch {
        // 아래 mock fallback으로 이어진다.
      }
    }
    throw signedError;
  }
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

type PendingDeleteItem = {
  url: string;
  resourceType: 'image' | 'video' | 'raw';
  queuedAt: string;
  attempts: number;
};

const PENDING_DELETE_STORAGE_KEY = 'cloudinary_pending_deletes_v1';

function readPendingDeletes(): PendingDeleteItem[] {
  const raw = storage.getString(PENDING_DELETE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        url: String(item?.url || '').trim(),
        resourceType:
          item?.resourceType === 'video' || item?.resourceType === 'raw' || item?.resourceType === 'image'
            ? item.resourceType
            : 'image',
        queuedAt: String(item?.queuedAt || new Date().toISOString()),
        attempts: Number.isFinite(Number(item?.attempts)) ? Math.max(0, Number(item.attempts)) : 0,
      }))
      .filter((item) => item.url.length > 0);
  } catch {
    return [];
  }
}

function writePendingDeletes(items: PendingDeleteItem[]) {
  if (!items.length) {
    storage.delete(PENDING_DELETE_STORAGE_KEY);
    return;
  }
  storage.set(PENDING_DELETE_STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
}

function enqueuePendingDelete(url: string, resourceType: 'image' | 'video' | 'raw') {
  const normalized = String(url || '').trim();
  if (!normalized) return;
  const current = readPendingDeletes();
  const key = `${resourceType}:${normalized}`;
  const hasAlready = current.some((item) => `${item.resourceType}:${item.url}` === key);
  if (hasAlready) return;
  current.unshift({
    url: normalized,
    resourceType,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  });
  writePendingDeletes(current);
}

export function getPendingDeleteCount() {
  return readPendingDeletes().length;
}

export async function flushPendingMediaDeletes(limit = 15): Promise<{ attempted: number; removed: number; remaining: number }> {
  const current = readPendingDeletes();
  if (!current.length) return { attempted: 0, removed: 0, remaining: 0 };
  const slice = current.slice(0, Math.max(1, limit));
  const keep: PendingDeleteItem[] = [];
  let removed = 0;

  for (const item of slice) {
    try {
      await apiClient.deleteCloudinaryMedia({
        url: item.url,
        resourceType: item.resourceType,
      });
      removed += 1;
    } catch {
      keep.push({
        ...item,
        attempts: item.attempts + 1,
      });
    }
  }

  const untouched = current.slice(slice.length);
  writePendingDeletes([...keep, ...untouched]);
  return {
    attempted: slice.length,
    removed,
    remaining: keep.length + untouched.length,
  };
}

export async function deleteMedia(url: string): Promise<void> {
  const normalized = String(url || '').trim();
  if (!normalized) return;
  const resourceType = inferDeleteResourceType(normalized);
  try {
    await apiClient.deleteCloudinaryMedia({
      url: normalized,
      resourceType,
    });
  } catch {
    enqueuePendingDelete(normalized, resourceType);
  }
}
