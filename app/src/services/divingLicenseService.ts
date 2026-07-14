import { storage } from '../lib/storage';
import type { DivingLicense, DivingLicenseInput } from '../models/DivingLicense';
import {
  normalizeDivingDiscipline,
  normalizeDivingLicenseStatus,
} from '../models/DivingLicense';
import { mockDivingLicenses } from '../mock/divergramExpansionMock';
import { apiClient } from '../lib/api';

const DIVING_LICENSE_STORAGE_KEY = 'divergram_diving_licenses_v1';

function readStoredLicenses(): DivingLicense[] {
  const raw = storage.getString(DIVING_LICENSE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeLicenseRow(item))
      .filter(Boolean) as DivingLicense[];
  } catch {
    return [];
  }
}

function writeStoredLicenses(items: DivingLicense[]) {
  storage.set(DIVING_LICENSE_STORAGE_KEY, JSON.stringify(items));
}

function normalizeLicenseRow(row: any): DivingLicense | null {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id || '').trim();
  const licenseNumber = String(row.licenseNumber || row.license_number || '').trim();
  const holderName = String(row.holderName || row.holder_name || '').trim();
  if (!id || !licenseNumber || !holderName) return null;

  const issueDate = String(row.issueDate || row.issue_date || '').trim();
  return {
    id,
    licenseNumber,
    userId: String(row.userId || row.user_id || 'me').trim() || 'me',
    holderName,
    profileImageUrl: String(row.profileImageUrl || row.profile_image_url || '').trim() || undefined,
    discipline: normalizeDivingDiscipline(row.discipline),
    certificationLevel: String(row.certificationLevel || row.certification_level || '').trim() || 'LICENSE',
    issueDate: issueDate || new Date().toISOString().slice(0, 10),
    expirationDate: String(row.expirationDate || row.expiration_date || '').trim() || undefined,
    hasExpiration:
      typeof row.hasExpiration === 'boolean'
        ? row.hasExpiration
        : typeof row.has_expiration === 'boolean'
          ? row.has_expiration
          : Boolean(String(row.expirationDate || row.expiration_date || '').trim()),
    maxDepth:
      typeof row.maxDepth === 'number'
        ? row.maxDepth
        : typeof row.max_depth === 'number'
          ? row.max_depth
          : Number.isFinite(Number(row.maxDepth || row.max_depth))
            ? Number(row.maxDepth || row.max_depth)
            : undefined,
    trainingAgency: String(row.trainingAgency || row.training_agency || '').trim() || undefined,
    instructorName: String(row.instructorName || row.instructor_name || '').trim() || undefined,
    instructorNumber: String(row.instructorNumber || row.instructor_number || '').trim() || undefined,
    emergencyContact: String(row.emergencyContact || row.emergency_contact || '').trim() || undefined,
    verificationUrl: String(row.verificationUrl || row.verification_url || '').trim() || undefined,
    walletPassUrl: String(row.walletPassUrl || row.wallet_pass_url || '').trim() || undefined,
    status: normalizeDivingLicenseStatus(row.status),
    notes: String(row.notes || '').trim() || undefined,
    createdAt: String(row.createdAt || row.created_at || new Date().toISOString()),
    updatedAt: String(row.updatedAt || row.updated_at || new Date().toISOString()),
  };
}

function sortByCreatedAtDesc(items: DivingLicense[]) {
  return [...items].sort((a, b) => Date.parse(String(b.createdAt || '')) - Date.parse(String(a.createdAt || '')));
}

export async function listDivingLicenses(userId = 'me'): Promise<DivingLicense[]> {
  const uid = String(userId || 'me').trim() || 'me';
  const stored = readStoredLicenses().filter((item) => item.userId === uid);
  const remote = await apiClient.getDivingLicenses();
  const remoteItems = remote.data.map(normalizeLicenseRow).filter(Boolean) as DivingLicense[];
  if (remote.exists) {
    writeStoredLicenses(remoteItems);
    return sortByCreatedAtDesc(remoteItems);
  }
  if (stored.length) {
    const migrated = await apiClient.saveDivingLicenses(stored as unknown as Record<string, unknown>[]);
    const normalized = migrated.map(normalizeLicenseRow).filter(Boolean) as DivingLicense[];
    writeStoredLicenses(normalized);
    return sortByCreatedAtDesc(normalized);
  }
  return mockDivingLicenses.map((item) => ({ ...item, userId: uid }));
}

export async function getDivingLicenseById(licenseId: string): Promise<DivingLicense | null> {
  const id = String(licenseId || '').trim();
  if (!id) return null;
  const rows = readStoredLicenses();
  return rows.find((item) => item.id === id) || null;
}

export async function createDivingLicense(input: DivingLicenseInput): Promise<DivingLicense> {
  const now = new Date().toISOString();
  const next: DivingLicense = {
    id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    licenseNumber: String(input.licenseNumber || '').trim(),
    userId: String(input.userId || 'me').trim() || 'me',
    holderName: String(input.holderName || '').trim(),
    profileImageUrl: String(input.profileImageUrl || '').trim() || undefined,
    discipline: normalizeDivingDiscipline(input.discipline),
    certificationLevel: String(input.certificationLevel || '').trim(),
    issueDate: String(input.issueDate || '').trim(),
    expirationDate: String(input.expirationDate || '').trim() || undefined,
    hasExpiration: Boolean(input.hasExpiration),
    maxDepth:
      input.maxDepth === undefined || input.maxDepth === null
        ? undefined
        : Number(input.maxDepth),
    trainingAgency: String(input.trainingAgency || '').trim() || undefined,
    instructorName: String(input.instructorName || '').trim() || undefined,
    instructorNumber: String(input.instructorNumber || '').trim() || undefined,
    emergencyContact: String(input.emergencyContact || '').trim() || undefined,
    verificationUrl:
      String(input.verificationUrl || '').trim() || `https://divergram.com/license/${encodeURIComponent(String(input.licenseNumber || '').trim())}`,
    walletPassUrl: String(input.walletPassUrl || '').trim() || undefined,
    status: normalizeDivingLicenseStatus(input.status),
    notes: String(input.notes || '').trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const current = readStoredLicenses().filter((item) => item.userId === next.userId);
  const saved = await apiClient.saveDivingLicenses([next, ...current] as unknown as Record<string, unknown>[]);
  const normalized = saved.map(normalizeLicenseRow).filter(Boolean) as DivingLicense[];
  writeStoredLicenses(normalized);
  return normalized.find((item) => item.id === next.id) || next;
}

export async function updateDivingLicense(licenseId: string, patch: Partial<DivingLicenseInput>): Promise<DivingLicense | null> {
  const id = String(licenseId || '').trim();
  if (!id) return null;

  const rows = readStoredLicenses();
  let updated: DivingLicense | null = null;
  const nextRows = rows.map((item) => {
    if (item.id !== id) return item;
    const next: DivingLicense = {
      ...item,
      licenseNumber: patch.licenseNumber !== undefined ? String(patch.licenseNumber || '').trim() || item.licenseNumber : item.licenseNumber,
      holderName: patch.holderName !== undefined ? String(patch.holderName || '').trim() || item.holderName : item.holderName,
      profileImageUrl:
        patch.profileImageUrl !== undefined ? String(patch.profileImageUrl || '').trim() || undefined : item.profileImageUrl,
      discipline: patch.discipline !== undefined ? normalizeDivingDiscipline(patch.discipline) : item.discipline,
      certificationLevel:
        patch.certificationLevel !== undefined ? String(patch.certificationLevel || '').trim() || item.certificationLevel : item.certificationLevel,
      issueDate: patch.issueDate !== undefined ? String(patch.issueDate || '').trim() || item.issueDate : item.issueDate,
      expirationDate:
        patch.expirationDate !== undefined ? String(patch.expirationDate || '').trim() || undefined : item.expirationDate,
      hasExpiration: patch.hasExpiration !== undefined ? Boolean(patch.hasExpiration) : item.hasExpiration,
      maxDepth:
        patch.maxDepth !== undefined
          ? patch.maxDepth === null
            ? undefined
            : Number(patch.maxDepth)
          : item.maxDepth,
      trainingAgency:
        patch.trainingAgency !== undefined ? String(patch.trainingAgency || '').trim() || undefined : item.trainingAgency,
      instructorName:
        patch.instructorName !== undefined ? String(patch.instructorName || '').trim() || undefined : item.instructorName,
      instructorNumber:
        patch.instructorNumber !== undefined ? String(patch.instructorNumber || '').trim() || undefined : item.instructorNumber,
      emergencyContact:
        patch.emergencyContact !== undefined ? String(patch.emergencyContact || '').trim() || undefined : item.emergencyContact,
      verificationUrl:
        patch.verificationUrl !== undefined
          ? String(patch.verificationUrl || '').trim() || `https://divergram.com/license/${encodeURIComponent(String(item.licenseNumber || '').trim())}`
          : item.verificationUrl,
      walletPassUrl:
        patch.walletPassUrl !== undefined ? String(patch.walletPassUrl || '').trim() || undefined : item.walletPassUrl,
      status: patch.status !== undefined ? normalizeDivingLicenseStatus(patch.status) : item.status,
      notes: patch.notes !== undefined ? String(patch.notes || '').trim() || undefined : item.notes,
      updatedAt: new Date().toISOString(),
    };
    updated = next;
    return next;
  });

  if (!updated) return null;
  const saved = await apiClient.saveDivingLicenses(nextRows as unknown as Record<string, unknown>[]);
  const normalized = saved.map(normalizeLicenseRow).filter(Boolean) as DivingLicense[];
  writeStoredLicenses(normalized);
  return normalized.find((item) => item.id === id) || null;
}

export async function deleteDivingLicense(licenseId: string): Promise<boolean> {
  const id = String(licenseId || '').trim();
  if (!id) return false;
  const before = readStoredLicenses();
  const after = before.filter((item) => item.id !== id);
  const removed = after.length !== before.length;
  if (removed) {
    const saved = await apiClient.saveDivingLicenses(after as unknown as Record<string, unknown>[]);
    writeStoredLicenses(saved.map(normalizeLicenseRow).filter(Boolean) as DivingLicense[]);
  }
  return removed;
}
