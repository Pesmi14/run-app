import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContentAdmin, { type Item } from "@/components/ContentAdmin";
import PlatformContentShell from "@/components/PlatformContentShell";

export const dynamic = "force-dynamic";
const sections = {
  runclubs: { label: "Runcluby", table: "runclubs", order: "created_at" },
  events: { label: "Eventy", table: "community_events", order: "starts_at" },
  competitions: { label: "Soutěže", table: "competitions", order: "created_at" },
} as const;

type Section = keyof typeof sections;
export default async function KomunitaPage({ searchParams }: { searchParams: Promise<{ sekce?: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  if (!process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) redirect("/unauthorized");
  const { sekce } = await searchParams;
  const current: Section = sekce === "events" || sekce === "competitions" ? sekce : "runclubs";
  const settings = sections[current];
  const { data, error: queryError } = await supabase.from(settings.table).select("*")
    .order(settings.order, { ascending: current === "events", nullsFirst: false }).limit(500);
  const counts: Record<string, number> = {};
  let entryError = "";
  if (current === "competitions") {
    // Načítáme pouze competition_id, nikoli identitu přihlášených.
    for (let offset = 0; ; offset += 1000) {
      const { data: entries, error: err } = await supabase.from("competition_entries")
        .select("competition_id").range(offset, offset + 999);
      if (err) { entryError = err.message; break; }
      for (const entry of entries || []) counts[entry.competition_id] = (counts[entry.competition_id] || 0) + 1;
      if ((entries || []).length < 1000) break;
    }
  }
  return <PlatformContentShell active="komunita" email={user.email || ""}>
    <div className="dashboard-heading"><span className="eyebrow">SPRINTUY / KOMUNITA</span><h1>Komunita</h1>
      <p>Správa runclubů, komunitních eventů a soutěží propojených s mobilní aplikací.</p></div>
    <nav aria-label="Sekce komunity" style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 22 }}>
      {(Object.keys(sections) as Section[]).map(key => <Link key={key} href={`/platform/komunita?sekce=${key}`}
        style={{ border: "1px solid #e5e5e5", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 650,
          background: current === key ? "#171717" : "#fff", color: current === key ? "white" : "#555" }}>
        {sections[key].label}</Link>)}
    </nav>
    {entryError && <p style={{ color: "#a16207", marginTop: 15 }}>Počty přihlášených nejsou dostupné: {entryError}</p>}
    {queryError ? <p style={{ color: "#b91c1c", marginTop: 30 }}>Načítání {settings.table}: {queryError.message}. Zkontroluj administrátorské SELECT RLS.</p> :
      <ContentAdmin key={current} kind={current} items={(data || []) as Item[]} entryCounts={counts}/>}
  </PlatformContentShell>;
}
