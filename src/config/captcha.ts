/**
 * Google reCAPTCHA v2 ("I'm not a robot") site key.
 * This is a PUBLIC key — safe to keep in the codebase.
 * Get it from https://www.google.com/recaptcha/admin (choose reCAPTCHA v2 → checkbox).
 * While it is empty, the human-check gate is skipped so the app stays usable.
 */
// Disabled for now — empty key skips the human-check gate entirely.
export const RECAPTCHA_SITE_KEY = "";

export const isCaptchaConfigured = () => RECAPTCHA_SITE_KEY.trim().length > 0;
