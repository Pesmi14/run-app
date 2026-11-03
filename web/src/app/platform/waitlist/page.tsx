import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlatformContentShell from "@/components/PlatformContentShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WaitlistEntry = {
  id: string;
  email: string;
  operating_system: string;
  created_at: string;
};

async function loadEntries(supabase: Awaited<ReturnType<typeof createClient>>) {
  const entries: WaitlistEntry[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("waitlist_entries")
      .select("id,email,operating_system,created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) return { entries: [] as WaitlistEntry[], error: error.message };
    const batch = (data ?? []) as WaitlistEntry[];
    entries.push(...batch);
    if (batch.length < pageSize) break;
  }
  return { entries, error: null as string | null };
}

export default async function WaitlistPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  if (!process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/unauthorized");
  }

  const { entries, error } = await loadEntries(supabase);
  const ios = entries.filter((entry) => entry.operating_system === "ios").length;
  const android = entries.filter((entry) => entry.operating_system === "android").length;
  const formatDate = (date: string) => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime())
      ? "—"
      : new Intl.DateTimeFormat("cs-CZ", {
          dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Prague",
        }).format(parsed);
  };

  return (
    <PlatformContentShell active="waitlist" email={user.email ?? ""}>
      <div className="dashboard-heading">
        <span className="eyebrow">SPRINTUY / ZÁJEMCI</span>
        <h1>Waitlist</h1>
        <p>E-mailové adresy a operační systémy lidí, kteří čekají na spuštění aplikace.</p>
      </div>

      {error ? (
        <div style={{ marginTop: 28, padding: 18, border: "1px solid #f0caca", borderRadius: 12, color: "#b91c1c" }}>
          Nelze načíst čekací listinu: {error}. Zkontroluj admin SELECT politiku v Supabase.
        </div>
      ) : (
        <>
          <div className="dashboard-grid" style={{ marginTop: 32, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {[
              { label: "Celkem lidí", value: entries.length },
              { label: "iOS", value: ios },
              { label: "Android", value: android },
            ].map(({ label, value }) => (
              <div className="dashboard-card" key={label} style={{ minHeight: 126, gap: 16 }}>
                <span style={{ color: "#747474", fontSize: 12, fontWeight: 600 }}>{label}</span>
                <strong style={{ display: "block", fontSize: 36, fontWeight: 750, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
                  {new Intl.NumberFormat("cs-CZ").format(value)}
                </strong>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 21, fontWeight: 750, letterSpacing: "-0.5px", marginBottom: 16 }}>Přihlášení zájemci</h2>
            <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, overflowX: "auto" }}>
              {entries.length === 0 ? (
                <p style={{ padding: 22, color: "#888", fontSize: 13 }}>Na čekací listinu se zatím nikdo nepřihlásil.</p>
              ) : (
                <table style={{ width: "100%", minWidth: 550, borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f7f7f7", color: "#888" }}>
                      <th scope="col" style={{ padding: "16px 20px", fontWeight: 650 }}>E-mail</th>
                      <th scope="col" style={{ padding: "16px 20px", fontWeight: 650 }}>Zařízení</th>
                      <th scope="col" style={{ padding: "16px 20px", fontWeight: 650 }}>Přidáno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} style={{ borderTop: "1px solid #ededed" }}>
                        <td style={{ padding: "15px 20px", fontWeight: 600 }}>{entry.email}</td>
                        <td style={{ padding: "15px 20px", color: "#666" }}>
                          {entry.operating_system === "ios" ? "iOS" : entry.operating_system === "android" ? "Android" : entry.operating_system}
                        </td>
                        <td style={{ padding: "15px 20px", color: "#888" }}>{formatDate(entry.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </PlatformContentShell>
  );
}
