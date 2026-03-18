/**
 * Centralized UI messages for localization.
 * API error messages are mapped to friendlier UI messages here.
 */

const API_TO_UI: Record<string, string> = {
  // Admin
  'Please enter a valid email address': 'Please enter a valid email address.',
  'This email is already in the allowlist': 'This email already has access.',
  'This email is not in the allowlist': 'This email is not in the access list.',
  'You cannot remove your own email': 'You cannot remove yourself.',
  'Cannot remove the last admin': 'There must be at least one admin.',
  'Cannot revoke admin from the last admin': 'There must be at least one admin.',

  // Auth
  'Authentication required': 'Please sign in to continue.',
};

/**
 * Extract the actual error message from Apollo errors.
 * Apollo Client wraps GraphQL errors in different ways:
 * - graphQLErrors: array of {message} from the API
 * - networkError: for non-200 responses (may contain result.errors)
 * - message: generic "Response not successful: Received status code 400"
 */
function extractMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;

  const err = error as Record<string, unknown>;

  // Apollo graphQLErrors array
  if (Array.isArray(err.graphQLErrors) && err.graphQLErrors.length > 0) {
    return (err.graphQLErrors[0] as { message: string }).message;
  }

  // Apollo networkError with embedded result
  if (err.networkError && typeof err.networkError === 'object') {
    const netErr = err.networkError as Record<string, unknown>;
    if (netErr.result && typeof netErr.result === 'object') {
      const result = netErr.result as { errors?: { message: string }[] };
      if (Array.isArray(result.errors) && result.errors.length > 0) {
        return result.errors[0].message;
      }
    }
  }

  // Plain Error message
  if (error instanceof Error) {
    return error.message.replace('GraphQL error: ', '');
  }

  return null;
}

/**
 * Convert an API error to a user-friendly UI message.
 * Falls back to a generic message if no mapping exists.
 */
export function toUIMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const msg = extractMessage(error);
  if (!msg) return fallback;
  return API_TO_UI[msg] || msg;
}
