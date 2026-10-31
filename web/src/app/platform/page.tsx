
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Database,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { logout } from "../actions";

export default async function PlatformPage() {
  const supabase = await createClient();

  // Ověření aktuálně přihlášeného uživatele
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Nepřihlášený uživatel se vrátí na login
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
          <div className="brand">
            SPRINTUY<span className="brand-dot">.</span>
          </div>

          <p className="sidebar-caption">WORKSPACE</p>

          <nav className="sidebar-nav">
            <div className="nav-item active">
              <Activity size={17} />
              <span>Overview</span>
            </div>
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
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <section className="platform-main">
        <header className="platform-header">
          <span>Workspace / Overview</span>

          <span className="admin-label">
            <ShieldCheck size={15} />
            Admin access
          </span>
        </header>

        <div className="dashboard-content">
          {/* WELCOME */}
          <div className="dashboard-heading">
            <span className="eyebrow">YOUR WORKSPACE</span>

            <h1>Welcome to Sprintuy.</h1>

            <p>
              Everything starts here. Your platform is ready
              for the next step.
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
                  Authentication service is connected and your
                  identity has been verified.
                </p>
              </div>

              <div className="status-row">
                <span className="status-dot" />
                <span>Connected</span>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-top">
                <div className="card-icon">
                  <ShieldCheck size={19} />
                </div>
              </div>

              <div>
                <h2>Access control</h2>

                <p>
                  This workspace is restricted to your
                  authorized administrator account.
                </p>
              </div>

              <div className="status-row">
                <span className="status-dot" />
                <span>Protected</span>
              </div>
            </div>
          </div>

          {/* NEXT STEPS */}
          <div className="next-section">
            <span className="eyebrow">COMING NEXT</span>

            <h2>Ready to build something great.</h2>

            <p>
              Race management, events, users, registrations
              and analytics will live here.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
