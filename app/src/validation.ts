/**
 * Input validation utilities for request parameters.
 *
 * SEC-002: Path parameters interpolated into URLs must be validated
 * to prevent path traversal (e.g., ../../admin/allowlist).
 */

const PATH_PARAM_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate a value is safe for URL path interpolation.
 * Rejects path traversal characters (/, ., ..) and special characters.
 */
export function isValidPathParam(value: string): boolean {
  return PATH_PARAM_RE.test(value) && value.length > 0 && value.length <= 128;
}
