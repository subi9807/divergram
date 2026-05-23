import type { Certification } from '../models';
import { mockCertifications } from '../mock/divergramExpansionMock';
import type { CertificationAgency } from '../models/Certification';
import { storage } from '../lib/storage';

const CERT_STORAGE_KEY = 'divergram_certifications_v1';

type RegisterCertificationInput = {
  userId?: string;
  agency: CertificationAgency;
  certificationNumber?: string;
  level?: string;
  issuedAt?: string;
  expiresAt?: string;
  imageUrl?: string;
};

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

export async function listCertifications(): Promise<Certification[]> {
  const stored = readStoredCertifications();
  if (stored.length) return stored;
  writeStoredCertifications(mockCertifications);
  return mockCertifications;
}

export async function registerCertification(input: RegisterCertificationInput): Promise<Certification> {
  const now = new Date().toISOString();
  const next: Certification = {
    id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId || 'me',
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
  const rows = await listCertifications();
  const updated = [next, ...rows];
  writeStoredCertifications(updated);
  return next;
}

export async function updateCertificationStatus(
  certificationId: string,
  status: Certification['status']
): Promise<Certification | null> {
  const rows = await listCertifications();
  const nextRows = rows.map((item) =>
    item.id === certificationId
      ? {
          ...item,
          status,
          updatedAt: new Date().toISOString(),
        }
      : item
  );
  const updated = nextRows.find((item) => item.id === certificationId) || null;
  writeStoredCertifications(nextRows);
  return updated;
}
