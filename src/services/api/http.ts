/**
 * Shared transport for live, browser-side API providers.
 *
 * Rules (see API_POLICY.md): only providers in the registry with verified browser access
 * are called; no credentials are ever sent; every failure becomes a typed ApiError so the
 * interface can say what actually happened instead of showing a blank or invented value.
 */
import { z } from 'zod';

export type ApiErrorKind = 'timeout' | 'network' | 'rate-limited' | 'not-found' | 'http' | 'invalid-response';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    public readonly providerId: string,
    message: string,
    /** Seconds the provider asked us to wait, when rate-limited. */
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions<T> {
  providerId: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
}

export async function fetchJson<T>(url: string, { providerId, schema, timeoutMs = 12_000 }: RequestOptions<T>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  } catch (e) {
    const timedOut = e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw new ApiError(timedOut ? 'timeout' : 'network', providerId, timedOut ? 'The provider did not respond in time.' : 'The provider could not be reached.');
  }
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After')) || undefined;
    throw new ApiError('rate-limited', providerId, 'The provider is limiting requests right now.', retryAfter);
  }
  if (response.status === 404) throw new ApiError('not-found', providerId, 'The provider has no data for this request.');
  if (!response.ok) throw new ApiError('http', providerId, `The provider returned HTTP ${response.status}.`);

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiError('invalid-response', providerId, 'The provider returned a response eport could not read.');
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError('invalid-response', providerId, 'The provider response did not match the expected format.');
  return parsed.data;
}
