import type { Certification } from '../models';
import { mockCertifications } from '../mock/divergramExpansionMock';
import type { CertificationAgency } from '../models/Certification';
import { storage } from '../lib/storage';
import { apiClient } from '../lib/api';

const CERT_STORAGE_KEY = 'divergram_certifications_v1';

export type CertificationSyncSource = 'backend' | 'local';
export type CertificationSyncState = {
  source: CertificationSyncSource;
  reason?: string;
  updatedAt: string;
};

type RegisterCertificationInput = {
  userId?: string;
  agency: CertificationAgency;
  certificationNumber?: string;
  level?: string;
  issuedAt?: string;
  expiresAt?: string;
  imageUrl?: string;
};

let certificationSyncState: CertificationSyncState = {
  source: 'local',
  reason: 'init',
  updatedAt: new Date().toISOString(),
};

function setSyncState(source: CertificationSyncSource, reason?: string) {
  certificationSyncState = {
    source,
    reason: String(reason || '').trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function getCertificationSyncState() {
  return certificationSyncState;
}

function readStoredCertifications(): Certification[] {
  const raw = storage.getString(CERT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => item as Certification)
      .filter((item) => typeof item?.id === 'string' && typeof item?.agency === 'string');
  } catch {
    return [];
  }
}

function writeStoredCertifications(items: Certification[]) {
  storage.set(CERT_STORAGE_KEY, JSON.stringify(items));
}

function normalizeCertificationRow(row: any): Certification | null {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id || '').trim();
  const agencyRaw = String(row.agency || '').trim().toUpperCase();
  if (!id || (agencyRaw !== 'PADI' && agencyRaw !== 'SSI')) return null;
  return {
    id,
    userId: String(row.user_id || row.userId || 'me').trim() || 'me',
    agency: agencyRaw as CertificationAgency,
    certificationNumber: String(row.certification_number || row.certificationNumber || '').trim() || undefined,
    level: String(row.level || '').trim() || undefined,
    issuedAt: String(row.issued_at || row.issuedAt || '').trim() || undefined,
    expiresAt: String(row.expires_at || row.expiresAt || '').trim() || undefined,
    imageUrl: String(row.image_url || row.imageUrl || '').trim() || undefined,
    status:
      row.status === 'unregistered' || row.status === 'reviewing' || row.status === 'verified' || row.status === 'rejected'
        ? row.status
        : 'reviewing',
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.updatedAt || new Date().toISOString()),
  };
}

function upsertLocalCertification(item: Certification) {
  const current = readStoredCertifications();
  const next = [item, ...current.filter((row) => row.id !== item.id)];
  writeStoredCertifications(next);
}

function sortByCreatedAtDesc(items: Certification[]) {
  return [...items].sort((a, b) => Date.parse(String(b.createdAt || '')) - Date.parse(String(a.createdAt || '')));
}

export async function listCertifications(userId = 'me'): Promise<Certification[]> {
  try {
    const rows = await apiClient.listCertifications(userId);
    const normalized = rows.map(normalizeCertificationRow).filter(Boolean) as Certification[];
    if (normalized.length > 0) {
      const sorted = sortByCreatedAtDesc(normalized);
      writeStoredCertifications(sorted);
      setSyncState('backend');
      return sorted;
    }
    setSyncState('backend', 'empty');
  } catch {
    setSyncState('local', 'backend_read_failed');
  }

  const stored = readStoredCertifications();
  if (stored.length) return sortByCreatedAtDesc(stored);
  writeStoredCertifications(mockCertifications);
  setSyncState('local', 'seed_mock');
  return sortByCreatedAtDesc(mockCertifications);
}

export async function registerCertification(input: RegisterCertificationInput): Promise<Certification> {
  const now = new Date().toISOString();
  const nextId = `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const nextUserId = input.userId || 'me';
  const next: Certification = {
    id: nextId,
    userId: nextUserId,
    agency: input.agency,
    certificationNumber: String(input.certificationNumber || '').trim() || undefined,
    level: String(input.level || '').trim() || undefined,
    issuedAt: String(input.issuedAt || '').trim() || undefined,
    expiresAt: String(input.expiresAt || '').trim() || undefined,
    imageUrl: String(input.imageUrl || '').trim() || undefined,
    status: 'reviewing',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const createdRow = await apiClient.createCertification({
      id: next.id,
      user_id: next.userId,
      agency: next.agency,
      certification_number: next.certificationNumber,
      level: next.level,
      issued_at: next.issuedAt,
      expires_at: next.expiresAt,
      image_url: next.imageUrl,
      status: next.status,
      created_at: next.createdAt,
      updated_at: next.updatedAt,
    });
    const normalized = normalizeCertificationRow(createdRow);
    if (normalized) {
      upsertLocalCertification(normalized);
      setSyncState('backend');
      return normalized;
    }
  } catch {
    setSyncState('local', 'backend_create_failed');
  }

  upsertLocalCertification(next);
  return next;
}

export async function updateCertificationStatus(
  certificationId: string,
  status: Certification['status']
): Promise<Certification | null> {
  const certId = String(certificationId || '').trim();
  if (!certId) return null;

  try {
    const updatedRow = await apiClient.updateCertificationStatus(certId, status);
    const normalized = normalizeCertificationRow(updatedRow);
    if (normalized) {
      upsertLocalCertification(normalized);
      setSyncState('backend');
      return normalized;
    }
  } catch {
    setSyncState('local', 'backend_update_failed');
  }

  const rows = await listCertifications();
  const nextRows = rows.map((item) =>
    item.id === certId
      ? {
          ...item,
          status,
          updatedAt: new Date().toISOString(),
        }
      : item
  );
  const updated = nextRows.find((item) => item.id === certId) || null;
  writeStoredCertifications(nextRows);
  return updated;
}
