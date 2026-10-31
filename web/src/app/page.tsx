
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/LoginForm";
import SprintuyRun from "@/components/SprintuyRun";

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
    <main className="minimal-landing">
      <div className="minimal-landing-content">
        <LoginForm />
        <SprintuyRun />
      </div>
    </main>
  );
}
