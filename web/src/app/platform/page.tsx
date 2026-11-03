import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  CalendarCheck2,
  Users,
  MessageCircleMore,
  Flag,
  LogOut,
  PlusCircle,
  ShieldCheck,
  Newspaper,
  UsersRound,
  MessageSquare,
  ListChecks,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const started = performance.now();
  const supabase = await createClient();

  // Zachováme ověřené getUser() pro kompatibilitu se stávající verzí Supabase.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  if (!process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/unauthorized");
  }
  const authMs = Math.round(performance.now() - started);
  const email = user.email || "";

  const todayPrague = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const statsStarted = performance.now();
  const [usersResult, participationsResult, feedbackResult, racesResult] = await Promise.all([
    supabase.from("user_profiles").select("user_id", { count: "exact", head: true }),
    supabase.from("user_races").select("id", { count: "exact", head: true }).eq("status", "registered"),
    supabase.from("app_feedback").select("id", { count: "exact", head: true }).in("status", ["new", "in_progress"]),
    supabase
      .from("races")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .is("parent_event_id", null)
      .or(`start_date.gte.${todayPrague},end_date.gte.${todayPrague}`),
  ]);
  const statsMs = Math.round(performance.now() - statsStarted);
  console.log(`[SPRINTUY PERFORMANCE] Prehled: auth=${authMs}ms stats=${statsMs}ms total=${Math.round(performance.now()-started)}ms`);

  const statistics = [
    { label: "Uživatelé", value: usersResult.error ? null : usersResult.count, detail: "Profily registrovaných uživatelů", icon: Users },
    { label: "Registrace na závody", value: participationsResult.error ? null : participationsResult.count, detail: "Aktuální registrace (registered)", icon: CalendarCheck2 },
    { label: "Nevyřízená zpětná vazba", value: feedbackResult.error ? null : feedbackResult.count, detail: "Nové a rozpracované zprávy", icon: MessageCircleMore },
    { label: "Nadcházející závody v aplikaci", value: racesResult.error ? null : racesResult.count, detail: "Publikované budoucí hlavní závody", icon: Flag },
  ];

  return (
    <main className="platform-page">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link href="/platform" className="brand">
            SPRINTUY<span className="brand-dot">.</span>
          </Link>
          <p className="sidebar-caption">WORKSPACE</p>
          <nav className="sidebar-nav">
            <Link href="/platform" className="nav-item active"><Activity size={17} /><span>Přehled</span></Link>
            <Link href="/platform/zavody" className="nav-item"><Flag size={17} /><span>Závody</span></Link>
            <Link href="/platform/pridat-zavody" className="nav-item"><PlusCircle size={17} /><span>Přidat závody</span></Link>
            <Link href="/platform/novinky" className="nav-item"><Newspaper size={17} /><span>Novinky</span></Link>
            <Link href="/platform/komunita" className="nav-item"><UsersRound size={17} /><span>Komunita</span></Link>
            <Link href="/platform/feedback" className="nav-item"><MessageSquare size={17} /><span>Zpětná vazba</span></Link>
            <Link href="/platform/waitlist" className="nav-item"><ListChecks size={17} /><span>Waitlist</span></Link>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">{(email || "A").slice(0, 1).toUpperCase()}</div>
            <div className="user-meta"><strong>Administrator</strong><span>{email}</span></div>
          </div>
          <form action={logout}>
            <button type="submit" className="logout-button"><LogOut size={16} />Odhlásit se</button>
          </form>
        </div>
      </aside>
      <section className="platform-main">
        <header className="platform-header">
          <span>Platforma / Přehled</span>
          <span className="admin-label"><ShieldCheck size={15} />Administrátor</span>
        </header>
        <div className="dashboard-content">
          <div className="dashboard-heading">
            <span className="eyebrow">SPRINTUY PLATFORM</span>
            <h1>Vítej ve Sprintuy.</h1>
            <p>Administrace závodů a správa dat propojených s mobilní aplikací.</p>
          </div>
          <div className="dashboard-grid" style={{ marginTop: 32 }}>
            {statistics.map(({ label, value, detail, icon: Icon }) => (
              <div className="dashboard-card" key={label} style={{ minHeight: 156, gap: 16 }}>
                <div className="card-top">
                  <span style={{ color: "#747474", fontSize: 12, fontWeight: 600 }}>{label}</span>
                  <Icon size={19} style={{ color: "#777" }} aria-hidden="true" />
                </div>
                <div>
                  <strong style={{ display: "block", fontSize: 38, fontWeight: 750, lineHeight: 1.1, letterSpacing: "-1.5px", fontVariantNumeric: "tabular-nums" }}>
                    {value === null ? "—" : new Intl.NumberFormat("cs-CZ").format(value)}
                  </strong>
                  <p style={{ marginTop: 9 }}>{value === null ? "Nepodařilo se načíst údaj – zkontroluj oprávnění RLS." : detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
