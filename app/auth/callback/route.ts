import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { saveGoogleTokens } from "@/lib/google-tokens";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Store Google OAuth tokens in database for persistence
      if (data.session.provider_token && data.session.user) {
        await saveGoogleTokens(data.session.user.id, {
          provider_token: data.session.provider_token,
          provider_refresh_token: data.session.provider_refresh_token || undefined,
          expires_at: data.session.expires_at
            ? new Date(data.session.expires_at * 1000).toISOString()
            : undefined,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
