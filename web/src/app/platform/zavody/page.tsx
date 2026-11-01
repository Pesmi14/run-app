import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RacesManager from "@/components/RacesManager";

export const runtime = "nodejs";

type Row = Record<string, unknown>;

async function loadAll(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  orderColumn: string
): Promise<Row[]> {
  const all: Row[] = [];
  const size = 500;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderColumn, { ascending: true, nullsFirst: false })
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
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/");
  if (!process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/unauthorized");
  }

  // Vždy čteme aktuální data ze stejného Supabase projektu jako mobilní aplikace.
  // Nezávislé dotazy kvůli chybějícím/neúplným relačním vazbám při importu.
  const [races, distances, prices] = await Promise.all([
    loadAll(supabase, "races", "start_date"),
    loadAll(supabase, "race_distances", "created_at"),
    loadAll(supabase, "race_price_tiers", "created_at"),
  ]);

  const query = await searchParams;
  return (
    <RacesManager
      races={races}
      distances={distances}
      prices={prices}
      initiallyOpen={query.open || ""}
      saved={query.saved === "1"}
    />
  );
}
