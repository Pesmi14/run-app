import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatný formulář." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Neplatný formulář." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  if (data.website) return NextResponse.json({ ok: true }); // honeypot
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const system = data.operating_system;

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Zadej platnou e-mailovou adresu." }, { status: 400 });
  }
  if (system !== "ios" && system !== "android") {
    return NextResponse.json({ error: "Vyber operační systém." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("waitlist_entries").insert({ email, operating_system: system });
    // Stejný e-mail na čekací listině již je. Nic dalšího nevkládej.
    if (error && error.code !== "23505") {
      console.error("Waitlist insert failed:", error.code, error.message);
      return NextResponse.json({ error: "Nepodařilo se připojit k čekací listině. Zkus to znovu." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Waitlist request failed:", error);
    return NextResponse.json({ error: "Služba je dočasně nedostupná." }, { status: 500 });
  }
}
