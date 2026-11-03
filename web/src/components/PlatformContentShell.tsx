import Link from "next/link";
import { Activity, Flag, LogOut, Newspaper, PlusCircle, ShieldCheck, UsersRound, MessageSquare, ListChecks } from "lucide-react";
import { logout } from "@/app/actions";

export default function PlatformContentShell({ email, active, children }: {
  email: string; active: "novinky" | "komunita" | "feedback" | "waitlist" | "zavody" | "pridat-zavody"; children: React.ReactNode;
}) {
  const items = [
    { href: "/platform", label: "Přehled", icon: Activity },
    { href: "/platform/zavody", label: "Závody", icon: Flag },
    { href: "/platform/pridat-zavody", label: "Přidat závody", icon: PlusCircle },
    { href: "/platform/novinky", label: "Novinky", icon: Newspaper },
    { href: "/platform/komunita", label: "Komunita", icon: UsersRound },
    { href: "/platform/feedback", label: "Zpětná vazba", icon: MessageSquare },
    { href: "/platform/waitlist", label: "Waitlist", icon: ListChecks },
  ];
  return <main className="platform-page">
    <aside className="sidebar"><div className="sidebar-top">
      <Link href="/platform" className="brand">SPRINTUY<span className="brand-dot">.</span></Link>
      <p className="sidebar-caption">WORKSPACE</p>
      <nav className="sidebar-nav">{items.map(({ href, label, icon: Icon }) =>
        <Link key={href} href={href} className={`nav-item${(active === "novinky" && href === "/platform/novinky") || (active === "komunita" && href === "/platform/komunita") || (active === "feedback" && href === "/platform/feedback") || (active === "waitlist" && href === "/platform/waitlist") || ((active === "zavody" && href === "/platform/zavody") || (active === "pridat-zavody" && href === "/platform/pridat-zavody")) ? " active" : ""}`}>
          <Icon size={17}/><span>{label}</span>
        </Link>)}</nav>
    </div><div className="sidebar-bottom"><div className="sidebar-user">
      <div className="user-avatar">{(email || "A").slice(0, 1).toUpperCase()}</div>
      <div className="user-meta"><strong>Administrator</strong><span>{email}</span></div>
    </div><form action={logout}><button type="submit" className="logout-button"><LogOut size={16}/>Odhlásit se</button></form></div></aside>
    <section className="platform-main"><header className="platform-header"><span>Platforma / {active === "novinky" ? "Novinky" : active === "komunita" ? "Komunita" : active === "feedback" ? "Zpětná vazba" : active === "waitlist" ? "Waitlist" : active === "pridat-zavody" ? "Přidat závod" : "Závody"}</span><span className="admin-label"><ShieldCheck size={15}/> Administrátor</span></header>
      <div className="dashboard-content">{children}</div>
    </section>
  </main>;
}
