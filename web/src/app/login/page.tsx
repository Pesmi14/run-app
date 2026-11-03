import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Přihlášení | Sprintuy Platforma" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && process.env.ADMIN_USER_ID && user.id === process.env.ADMIN_USER_ID) redirect("/platform");

  return (
    <main className="minimal-landing" style={{ position: "relative" }}>
      <Link href="/" style={{ position: "absolute", top: 25, left: 30, fontSize: 13, color: "#777", textDecoration: "none" }}>
        ← Zpět na Sprintuy
      </Link>
      <div className="minimal-landing-content">
        <LoginForm />
      </div>
    </main>
  );
}
