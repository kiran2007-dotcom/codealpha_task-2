import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
const blueprint = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf-8')) as {
  entities: Record<string, { required?: string[]; properties: Record<string, unknown> }>;
  firestore: Record<string, unknown>;
};

describe('Firestore Security Rules & Blueprint Integrity (Phase 0 Dirty Dozen Audit)', () => {
  it('enforces default-deny global safety net and rules_version 2', () => {
    expect(rulesContent).toContain("rules_version = '2';");
    expect(rulesContent).toMatch(/match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/);
  });

  it('covers every collection declared in firebase-blueprint.json', () => {
    const collections = Object.keys(blueprint.firestore).map((p) => p.split('/')[1]);
    for (const col of collections) {
      expect(rulesContent).toContain(`match /${col}/`);
    }
  });

  it('prevents PII blanket reads and email directory listing', () => {
    expect(rulesContent).toMatch(/match \/users\/\{userId\}[\s\S]*allow list: if false;/);
    expect(rulesContent).toMatch(/match \/emailDirectory\/\{emailHash\}[\s\S]*allow list: if false;/);
  });

  it('mandates email_verified == true and zero get()/exists() in allow list rules', () => {
    expect(rulesContent).toContain('request.auth.token.email_verified == true');

    // Verify no allow list block contains get( or exists(
    const listRuleMatches = rulesContent.match(/allow list:[\s\S]*?;/g) || [];
    expect(listRuleMatches.length).toBeGreaterThan(0);
    for (const rule of listRuleMatches) {
      expect(rule).not.toMatch(/\bget\(/);
      expect(rule).not.toMatch(/\bexists\(/);
      expect(rule).not.toMatch(/\bgetAfter\(/);
      expect(rule).not.toMatch(/\bexistsAfter\(/);
    }
  });

  it('blocks shadow fields via strict hasAll/hasOnly and affectedKeys().hasOnly() gates', () => {
    const dirtyDozenPayloads = [
      { name: 'Shadow field on User', keys: ['uid', 'displayName', 'email', 'isAdmin'] },
      { name: 'Owner spoof on Project', ownerId: 'other_user', authUid: 'attacker' },
      { name: 'ID poisoning', id: '../admin/' + 'a'.repeat(200) },
    ];

    expect(rulesContent).toContain('data.keys().hasAll(');
    expect(rulesContent).toContain('data.keys().hasOnly(');
    expect(rulesContent).toContain('affectedKeys().hasOnly(');
    expect(dirtyDozenPayloads[1].ownerId).not.toBe(dirtyDozenPayloads[1].authUid);
    expect(dirtyDozenPayloads[2].id).not.toMatch(/^[a-zA-Z0-9_-]{1,128}$/);
  });

  it('enforces Tier 1 (Owner) vs Tier 2 (Member) task update separation', () => {
    expect(rulesContent).toContain("isProjectOwner(existing().projectId)");
    expect(rulesContent).toContain("affectedKeys().hasOnly(['status', 'attachments', 'updatedAt'])");
  });
});
