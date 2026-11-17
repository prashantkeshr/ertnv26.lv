import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  ApiProvider,
  Authority,
  CatalogEntry,
  Country,
  CountryCoverage,
  Organization,
  Source,
} from '../src/types/schemas';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = resolve(ROOT, 'public/data');

export function dataPath(rel: string): string {
  return resolve(DATA_DIR, rel);
}

export function readJson(rel: string): unknown {
  return JSON.parse(readFileSync(dataPath(rel), 'utf8'));
}

export function writeJson(rel: string, value: unknown, pretty = false): void {
  const file = dataPath(rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, pretty ? 2 : 0) + '\n');
}

export function dataExists(rel: string): boolean {
  return existsSync(dataPath(rel));
}

/** Parse a dataset, throwing a readable error that names the file and the failing field. */
export function parseDataset<T>(rel: string, schema: z.ZodType<T>): T {
  const result = schema.safeParse(readJson(rel));
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 12)
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Schema validation failed for ${rel}\n${issues}`);
  }
  return result.data;
}

/** The hand-authored and generated source datasets, validated. */
export function loadSourceData() {
  return {
    catalog: parseDataset('catalog.json', z.array(CatalogEntry)),
    countries: parseDataset('countries/index.json', z.array(Country)),
    coverage: parseDataset('countries/coverage.json', CountryCoverage),
    organizations: parseDataset('organizations/index.json', z.array(Organization)),
    authorities: parseDataset('authorities/in.json', z.array(Authority)),
    sources: parseDataset('sources/sources.json', z.array(Source)),
    providers: parseDataset('sources/api-providers.json', z.array(ApiProvider)),
  };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
