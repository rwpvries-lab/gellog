import { createClient } from "@/src/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Only ever a plain internal path ("/feed", "/settings/..."). Rejects
 * anything that could turn into an open redirect or break out of the HTML/JS
 * context this value gets embedded into below (protocol-relative "//",
 * query/fragment separators, quotes, angle brackets, etc.).
 */
function sanitizeNextPath(next: string): string {
  return /^\/(?!\/)[a-zA-Z0-9\-_/]*$/.test(next) ? next : "/feed";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next") ?? "/feed");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if profile exists; create one if not (OAuth users skip the signup flow)
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existing) {
          const emailPrefix = (user.email ?? "user")
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
            .slice(0, 30);

          await supabase.from("profiles").insert({
            id: user.id,
            username: emailPrefix,
          });
        }
      }

      // Safari's ITP treats gellog.app -> accounts.google.com -> gellog.app as
      // a cross-site redirect "bounce" and can suppress the session cookie set
      // on this response when we chain straight through to `next` via a 302 in
      // the same hop. Confirmed in Supabase auth logs: a successful sign-in
      // here was followed ~10-15s later by a second, separately-initiated
      // /authorize -> /callback round trip (referer pointing back at this very
      // URL) before the session actually stuck — i.e. the user saw themselves
      // signed out after the first exchange and had to retry. Render a real
      // (200) HTML document that performs its own top-level navigation instead
      // of another redirect hop, so the browser treats it as a genuine page
      // load rather than a further bounce.
      const target = `${origin}${next}`;
      return new NextResponse(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${target}"></head><body><script>location.replace(${JSON.stringify(target)})</script></body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
