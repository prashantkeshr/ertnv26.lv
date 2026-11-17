import { ApiError } from './http';

const TEXT: Record<string, string> = {
  timeout: 'The service did not respond in time.',
  network: 'The service could not be reached. You may be offline.',
  'rate-limited': 'The service is limiting requests right now. Wait a few seconds and try again.',
  'not-found': 'The service has nothing for this request.',
  http: 'The service returned an error.',
  'invalid-response': 'The service returned something eport could not read, so it is not shown.',
};

/** Plain-language explanation of why a live request failed. */
export function describeApiError(error: unknown): string {
  return error instanceof ApiError ? (TEXT[error.kind] ?? TEXT.http!) : 'The request failed.';
}
