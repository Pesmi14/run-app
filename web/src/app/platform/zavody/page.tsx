import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RacesManager from "@/components/RacesManager";
import PlatformContentShell from "@/components/PlatformContentShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type Db = Awaited<ReturnType<typeof createClient>>;

async function loadAll(db: Db, table: string, orderColumn: string): Promise<Row[]> {
  const all: Row[] = [];
  const size = 1000;

  for (let offset = 0; ; offset += size) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .order(orderColumn, { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(offset, offset + size - 1);

    if (error) throw new Error(`Načítání ${table}: ${error.message}`);

    const batch = (data ?? []) as Row[];
    all.push(...batch);
    if (batch.length < size) break;
  }

  return all;
}

export default async function ZavodyPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string; saved?: string }>;
}) {
  const started = performance.now();
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");
  if (!process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/unauthorized");
  }

  const authMs = Math.round(performance.now() - started);
  const dataStarted = performance.now();

  const [races, distances, prices] = await Promise.all([
    loadAll(supabase, "races", "start_date"),
    loadAll(supabase, "race_distances", "created_at"),
    loadAll(supabase, "race_price_tiers", "created_at"),
  ]);

  const dataMs = Math.round(performance.now() - dataStarted);
  const query = await searchParams;

  console.log(
    `[SPRINTUY PERFORMANCE] Zavody: auth=${authMs}ms data=${dataMs}ms total=${Math.round(performance.now() - started)}ms races=${races.length} distances=${distances.length} prices=${prices.length}`
  );

  return (
    <PlatformContentShell active="zavody" email={user.email || ""}>
      <RacesManager
        races={races}
        distances={distances}
        prices={prices}
        initiallyOpen={query.open || ""}
        saved={query.saved === "1"}
      />
    </PlatformContentShell>
  );
}
