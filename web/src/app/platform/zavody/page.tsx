
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Race = {
  id: string;
  name: string | null;
  sport: string | null;
  start_date: string | null;
  city: string | null;
  region: string | null;
  status: string | null;
};

export default async function RacesPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (
    authError ||
    !user ||
    !process.env.ADMIN_USER_ID ||
    user.id !== process.env.ADMIN_USER_ID
  ) {
    redirect("/");
  }

  const races: Race[] = [];
  const pageSize = 500;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("races")
      .select("id,name,sport,start_date,city,region,status")
      .order("start_date", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Nepodařilo se načíst závody: ${error.message}`);
    }

    const batch = (data ?? []) as Race[];
    races.push(...batch);

    if (batch.length < pageSize) break;
  }

  const months = new Map<string, Race[]>();

  for (const race of races) {
    const key = race.start_date
      ? race.start_date.slice(0, 7)
      : "unknown";

    const group = months.get(key) ?? [];
    group.push(race);
    months.set(key, group);
  }

  function monthLabel(key: string) {
    if (key === "unknown") return "Bez uvedeného data";

    return new Intl.DateTimeFormat("cs-CZ", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${key}-01T12:00:00Z`));
  }

  function dayLabel(date: string | null) {
    if (!date) return "—";
    return date.slice(8, 10) + ".";
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#171717]">
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-10">
        <Link
          href="/platform"
          className="mb-10 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black"
        >
          <ArrowLeft size={16} />
          Zpět na platformu
        </Link>

        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              SPRINTUY / PLATFORM
            </p>
            <h1 className="text-4xl font-bold tracking-tight">
              Závody
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              Chronologický přehled všech závodů.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <p className="text-xs text-gray-400">Celkem závodů</p>
            <p className="mt-1 text-2xl font-bold">{races.length}</p>
          </div>
        </div>

        {races.length === 0 && (
          <p className="rounded-xl border bg-white p-6 text-sm text-gray-500">
            V databázi nejsou žádné dostupné závody.
          </p>
        )}

        <div className="space-y-12">
          {[...months.entries()].map(([month, items]) => (
            <section key={month}>
              <div className="mb-5 flex items-center gap-3">
                <CalendarDays size={18} className="text-gray-400" />

                <h2 className="text-xl font-bold capitalize">
                  {monthLabel(month)}
                </h2>

                <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs text-gray-600">
                  {items.length}
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {items.map((race) => (
                  <Link
                    key={race.id}
                    href={`/platform/zavody/${race.id}`}
                    className="flex items-center gap-4 border-b border-gray-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-gray-50"
                  >
                    <div className="w-12 shrink-0 text-center">
                      <span className="text-lg font-bold">
                        {dayLabel(race.start_date)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">
                        {race.name || "Nepojmenovaný závod"}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {[race.city, race.region, race.sport]
                          .filter(Boolean)
                          .join(" · ") || "Bez dalších údajů"}
                      </p>
                    </div>

                    <span className="hidden text-xs text-gray-400 sm:block">
                      {race.status || "—"}
                    </span>

                    <ChevronRight
                      size={17}
                      className="shrink-0 text-gray-400"
                    />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
