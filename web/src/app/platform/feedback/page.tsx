import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlatformContentShell from "@/components/PlatformContentShell";
import FeedbackManager from "@/components/FeedbackManager";

export const dynamic = "force-dynamic";
export default async function FeedbackPage() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect("/login");
  if (!process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) redirect("/unauthorized");
  const all: Record<string, unknown>[] = [];
  let loadError: string | null = null;
  for (let offset = 0; ; offset += 500) {
    const { data, error: e } = await db.from("app_feedback").select("*")
      .order("created_at", { ascending: false }).range(offset, offset + 499);
    if (e) { loadError = e.message; break; }
    all.push(...(data ?? []));
    if ((data ?? []).length < 500) break;
  }
  return <PlatformContentShell active="feedback" email={user.email || ""}>
    <div className="dashboard-heading"><span className="eyebrow">SPRINTUY / PODPORA</span>
      <h1>Zpětná vazba</h1><p>Podněty z mobilní aplikace. Zprávy vidí pouze administrátor.</p>
    </div>
    {loadError ? <p style={{color:"#b91c1c",paddingTop:20}}>Načtení feedbacku selhalo: {loadError}. Zkontroluj administrátorské SELECT RLS.</p> : <FeedbackManager initial={all} />}
  </PlatformContentShell>;
}
