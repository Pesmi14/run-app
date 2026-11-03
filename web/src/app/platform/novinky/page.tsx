import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContentAdmin, { type Item } from "@/components/ContentAdmin";
import PlatformContentShell from "@/components/PlatformContentShell";

export const dynamic = "force-dynamic";

export default async function NovinkyPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  if (!process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) redirect("/unauthorized");
  const { data, error: queryError } = await supabase.from("app_news").select("*")
    .order("published_at", { ascending: false }).limit(500);
  return <PlatformContentShell active="novinky" email={user.email || ""}>
    <div className="dashboard-heading"><span className="eyebrow">SPRINTUY / OBSAH</span><h1>Novinky</h1>
      <p>Spravuj obsah, který se zobrazuje v mobilní aplikaci. Skryté novinky běžní uživatelé neuvidí.</p></div>
    {queryError ? <p style={{ color: "#b91c1c", marginTop: 30 }}>Načítání novinek: {queryError.message}. Zkontroluj administrátorské SELECT RLS.</p> :
      <ContentAdmin kind="news" items={(data || []) as Item[]}/>}
  </PlatformContentShell>;
}
