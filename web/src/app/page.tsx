import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/LoginForm";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    user &&
    process.env.ADMIN_USER_ID &&
    user.id === process.env.ADMIN_USER_ID
  ) {
    redirect("/platform");
  }

  return (
    <main className="login-page">
      <header className="login-header">
        <div className="brand">
          SPRINTUY<span className="brand-dot">.</span>
        </div>

        <span className="header-tag">ADMIN PORTAL</span>
      </header>

      <div className="login-center">
        <LoginForm />
      </div>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Sprintuy</span>
        <span>Built for what&apos;s next.</span>
      </footer>
    </main>
  );
}