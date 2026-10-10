# Vercel authentication persistence fix

This version waits for the Supabase state write to finish before returning successful user/admin login responses (and logout responses). This prevents a follow-up request from reaching a different Vercel container before the session token has been persisted.

Production environment variables:
- SUPABASE_URL
- SUPABASE_SECRET_KEY (server-only)
- GEMINI_API_KEY (server-only, if used)
- APP_URL (optional)

Do not expose SUPABASE_SECRET_KEY to the browser.
