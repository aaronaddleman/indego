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
 * Convert an API error message to a user-friendly UI message.
 * Falls back to a generic message if no mapping exists.
 */
export function toUIMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error) {
    // Apollo wraps GraphQL errors — extract the message
    const msg = error.message.replace('GraphQL error: ', '');
    return API_TO_UI[msg] || msg;
  }
  return fallback;
}
