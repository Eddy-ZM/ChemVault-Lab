import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const requiredCompatibilityRoutes = [
  'functions/api/projects/index.ts',
  'functions/api/documents/index.ts',
  'functions/api/documents/upload/index.ts',
  'functions/api/documents/batch-upload/index.ts',
  'functions/api/documents/[id]/extract-ai/index.ts',
  'functions/api/documents/[id]/review-items/index.ts',
  'functions/api/batch/jobs/index.ts',
  'functions/api/search/index.ts',
  'functions/api/exports/index.ts',
  'functions/api/database/index.ts',
];

describe('Extract to Lab cutover', () => {
  it('keeps the load-bearing Extract contracts on Lab-owned routes', () => {
    for (const route of requiredCompatibilityRoutes) expect(existsSync(route), route).toBe(true);
  });

  it('scopes compatibility records to the verified session subject', () => {
    const source = readFileSync('src/api/extractCompat.ts', 'utf8');
    expect(source).toContain('const session = await requireSession(request, env)');
    expect(source).toContain('listPersistedHistory(env, session.sub)');
    expect(source).not.toMatch(/owner(?:Id|_id)\s*=\s*(?:body|url|request)/u);
  });

  it('routes legacy product journeys into canonical Lab pages', () => {
    const source = readFileSync('src/App.tsx', 'utf8');
    for (const path of ['/dashboard', '/documents', '/review', '/exports', '/usage', '/settings']) {
      expect(source).toContain(`path="${path}"`);
    }
    expect(source).toContain('path="/documents/:id"');
    expect(source).toContain('<LegacyDocumentRedirect />');
  });
});
