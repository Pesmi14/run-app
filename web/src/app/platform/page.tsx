
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Database,
  Flag,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { logout } from "../actions";

export default async function PlatformPage() {
  const supabase = await createClient();

  // Ověření přihlášeného uživatele
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  // Přístup pouze pro administrátora
  const adminId = process.env.ADMIN_USER_ID;

  if (!adminId || user.id !== adminId) {
    redirect("/unauthorized");
  }

  return (
    <main className="platform-page">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link href="/platform" className="brand">
            SPRINTUY<span className="brand-dot">.</span>
          </Link>

          <p className="sidebar-caption">WORKSPACE</p>

          <nav className="sidebar-nav">
            <Link href="/platform" className="nav-item active">
              <Activity size={17} />
              <span>Přehled</span>
            </Link>

            <Link href="/platform/zavody" className="nav-item">
              <Flag size={17} />
              <span>Závody</span>
            </Link>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">
              {(user.email || "A").slice(0, 1).toUpperCase()}
            </div>

            <div className="user-meta">
              <strong>Administrator</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <form action={logout}>
            <button type="submit" className="logout-button">
              <LogOut size={16} />
              Odhlásit se
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <section className="platform-main">
        <header className="platform-header">
          <span>Platforma / Přehled</span>

          <span className="admin-label">
            <ShieldCheck size={15} />
            Administrátor
          </span>
        </header>

        <div className="dashboard-content">
          {/* WELCOME */}
          <div className="dashboard-heading">
            <span className="eyebrow">SPRINTUY PLATFORM</span>

            <h1>Vítej ve Sprintuy.</h1>

            <p>
              Administrace závodů a správa dat propojených
              s mobilní aplikací.
            </p>
          </div>

          {/* STATUS CARDS */}
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="card-top">
                <div className="card-icon">
                  <Database size={19} />
                </div>

                <ArrowUpRight size={18} className="muted" />
              </div>

              <div>
                <h2>Supabase Auth</h2>

                <p>
                  Připojení k autentizační službě je aktivní.
                  Tvoje identita byla úspěšně ověřena.
                </p>
              </div>

              <div className="status-row">
                <span className="status-dot" />
                <span>Připojeno</span>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-top">
                <div className="card-icon">
                  <ShieldCheck size={19} />
                </div>
              </div>

              <div>
                <h2>Zabezpečení platformy</h2>

                <p>
                  Administrace je dostupná pouze
                  autorizovanému administrátorskému účtu.
                </p>
              </div>

              <div className="status-row">
                <span className="status-dot" />
                <span>Chráněno</span>
              </div>
            </div>
          </div>

          {/* RACE MANAGEMENT */}
          <div className="next-section">
            <span className="eyebrow">SPRÁVA ZÁVODŮ</span>

            <h2>Všechny závody na jednom místě.</h2>

            <p>
              Procházej závody podle měsíců, upravuj jejich
              informace, trasy, ceny a registrační odkazy.
            </p>

            <Link
              href="/platform/zavody"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#171717] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
            >
              <Flag size={16} />
              Otevřít závody
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
