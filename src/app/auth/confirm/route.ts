import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino de los enlaces de email de Supabase (invitación, recuperación).
 * Requiere que la plantilla de email use:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/cuenta
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/cuenta";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/cuenta";

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/login?error=enlace", origin));
  }

  const destino = new URL(next, origin);
  if (type === "invite" || type === "recovery") destino.searchParams.set("bienvenida", "1");
  return NextResponse.redirect(destino);
}
