import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // By setting maxAge to 0, or bypassing it, we can force a session cookie.
        // Actually, passing `maxAge: undefined` might not override the default if they use object spread.
        // Let's override the cookie name to force a fresh session, and provide a custom cookie storage to ensure it's a session cookie.
      }
    }
  )
}
