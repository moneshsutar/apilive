/**
 * Webhook Validation Service
 * Validates user-supplied webhook URLs
 */

/**
 * Validate a webhook URL
 * Returns { valid: boolean, error?: string }
 */
function validateWebhookUrl(webhookUrl) {
  if (!webhookUrl || typeof webhookUrl !== 'string') {
    return { valid: false, error: 'Webhook URL is required' };
  }

  const trimmedUrl = webhookUrl.trim();

  // Basic URL format validation (supports http and https)
  try {
    const parsedUrl = new URL(trimmedUrl);
    if (!parsedUrl.protocol.startsWith('http')) {
      return { valid: false, error: 'Webhook URL must start with http:// or https://' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  return { valid: true };
}

module.exports = { validateWebhookUrl };
