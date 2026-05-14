import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const CONTRIBUTORS_PATH = join(REPO_ROOT, 'contributors.json');
const AUDIT_LOG_PATH = join(REPO_ROOT, 'design-audit.log');

export interface Contributor {
  id: string;
  name: string;
  role: string;
}

export function isAuthorized(contributorId: string): boolean {
  if (!existsSync(CONTRIBUTORS_PATH)) return false;
  const { contributors }: { contributors: Contributor[] } = JSON.parse(
    readFileSync(CONTRIBUTORS_PATH, 'utf8')
  );
  return contributors.some(c => c.id === contributorId);
}

export function auditLog(contributorId: string, action: string, detail: string): void {
  const entry = `${new Date().toISOString()} | ${contributorId} | ${action} | ${detail}\n`;
  appendFileSync(AUDIT_LOG_PATH, entry, 'utf8');
}

export function requireAuth(
  contributorId: string | undefined,
  action: string,
  detail: string
): { authorized: true } | { authorized: false; error: string } {
  if (!contributorId) {
    return { authorized: false, error: 'contributor_id is required for this action' };
  }
  if (!isAuthorized(contributorId)) {
    auditLog(contributorId, `${action}_REJECTED`, detail);
    return {
      authorized: false,
      error: `"${contributorId}" is not an authorized contributor. Add via PR to contributors.json.`,
    };
  }
  return { authorized: true };
}
