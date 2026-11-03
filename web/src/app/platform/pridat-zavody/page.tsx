import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import ManualRaceForm from "@/components/ManualRaceForm";
import PlatformContentShell from "@/components/PlatformContentShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManualRoute = { label: string; km: number | null; price: number | null; valid_until: string | null; event_date: string | null; registration_url: string | null };

function validIso(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
}
async function adminDb() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect("/login");
  if (!process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) redirect("/unauthorized");
  return db;
}
function parseManualRoutes(value: string): ManualRoute[] {
  const input: unknown = JSON.parse(value);
  if (!Array.isArray(input) || input.length > 40) throw new Error("Neplatné trasy");
  return input.map((v: unknown) => {
    if (!v || typeof v !== "object") throw new Error("Neplatná trasa");
    const o = v as Record<string, unknown>;
    const label = String(o.label ?? "").trim();
    if (!label || label.length > 120) throw new Error("Vyplň název každé trasy");
    const rawKm = String(o.km ?? "").trim().replace(",", ".");
    const km = rawKm === "" ? null : Number(rawKm);
    if (km !== null && (!Number.isFinite(km) || km <= 0 || km > 1000)) throw new Error("Neplatná délka trasy");
    const rawPrice = String(o.price ?? "").trim().replace(",", ".");
    const price = rawPrice === "" ? null : Number(rawPrice);
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1000000)) throw new Error("Neplatná cena");
    const event = String(o.event_date ?? "").trim();
    if (event && !validIso(event)) throw new Error("Neplatné datum trasy");
    const date = String(o.valid_until ?? "").trim();
    if (date && !validIso(date)) throw new Error("Neplatné datum ceny");
    const url = String(o.registration_url ?? "").trim();
    if (url && !/^https?:\/\//i.test(url)) throw new Error("Registrační odkaz musí začínat http:// nebo https://");
    return { label, km, price, valid_until: date || null, event_date: event || null, registration_url: url || null };
  });
}
async function createManual(form: FormData) {
  "use server";
  const db = await adminDb();
  const name = String(form.get("name") ?? "").trim();
  const start_date = String(form.get("start_date") ?? "");
  const end_date = String(form.get("end_date") ?? "").trim();
  const sport = String(form.get("sport") ?? "running").trim();
  const organizer_id = String(form.get("organizer_id") ?? "").trim();
  const parent_event_id = String(form.get("parent_event_id") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();
  const region = String(form.get("region") ?? "").trim();

  const website_url = String(form.get("website_url") ?? "").trim();
  const registration_url = String(form.get("registration_url") ?? "").trim();
  if (name.length < 3 || name.length > 180 || !validIso(start_date) || city.length > 120 || region.length > 120) redirect("/platform/pridat-zavody?error=invalid");
  if ((end_date && (!validIso(end_date) || end_date < start_date)) || !["running","trail","triathlon","cycling","obstacle","other"].includes(sport)) redirect("/platform/pridat-zavody?error=invalid");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if ((organizer_id && !uuid.test(organizer_id)) || (parent_event_id && !uuid.test(parent_event_id))) redirect("/platform/pridat-zavody?error=invalid");
  if ([website_url,registration_url].some(u => u && !/^https?:\/\//i.test(u))) redirect("/platform/pridat-zavody?error=url");
  let routes: ManualRoute[];
  try { routes = parseManualRoutes(String(form.get("routes") ?? "[]")); }
  catch { redirect("/platform/pridat-zavody?error=routes"); }
  if (organizer_id) {
    const {data:org,error:orgError} = await db.from("organizers").select("id").eq("id",organizer_id).maybeSingle();
    if (orgError || !org) redirect("/platform/pridat-zavody?error=invalid");
  }
  const {data:race,error:raceError} = await db.from("races").insert({
    name, start_date, end_date:end_date || null, city:city || null, region:region || null, organizer_id: organizer_id || null, parent_event_id:parent_event_id || null,
    website_url:website_url || null, registration_url:registration_url || null,
    sport, country_code:"CZ", status:"draft", verification_status:"needs_review", admin_checked:false,
    source_name:"sprintuy_manual", source_url:"manual", source_event_url:`manual:${randomUUID()}`,
    raw_data: {created_via:"sprintuy_platform", manual:true},
  }).select("id").single();
  if (raceError || !race) { console.error("manual race insert",raceError); redirect("/platform/pridat-zavody?error=insert"); }
  for (const route of routes) {
    const {data:distance,error:distanceError} = await db.from("race_distances").insert({
      race_id:race.id, label:route.label, distance_km:route.km, event_date:route.event_date,
      registration_url:route.registration_url || registration_url || null,
    }).select("id").single();
    if (distanceError || !distance) {
      console.error("manual route insert",distanceError);
      redirect(`/platform/pridat-zavody?error=partial&id=${race.id}`);
    }
    if (route.price !== null) {
      const valid_until = route.valid_until ? new Date(`${route.valid_until}T23:59:59+01:00`).toISOString() : null;
      const {error:priceError} = await db.from("race_price_tiers").insert({
        race_id:race.id, race_distance_id:distance.id, label:route.label,
        price:route.price, currency:"CZK", valid_until,
        registration_url:route.registration_url || registration_url || null,
      });
      if (priceError) {
        console.error("manual price insert",priceError);
        redirect(`/platform/pridat-zavody?error=partial&id=${race.id}`);
      }
    }
  }
  revalidatePath("/platform/zavody");
  redirect("/platform/pridat-zavody?created=1");
}
export default async function AddRacesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string; id?: string }>;
}) {
  const db = await adminDb();
  const { data: { user } } = await db.auth.getUser();
  const params = await searchParams;
  const {data:organizers,error:organizersError} = await db.from("organizers").select("id,name").order("name").limit(1000);

  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e2e5e9",
    borderRadius: 12,
    padding: 18,
  };

  const errorMessage: Record<string, string> = {
    partial: `Závod vznikl jako Draft, ale nepodařilo se vložit všechny trasy nebo ceny. ID závodu: ${params.id ?? "neznámé"}. Zkontroluj ho ve správě závodů.`,
    routes: "Zkontroluj vyplněné trasy a ceny.",
    url: "Odkazy musí začínat https:// nebo http://.",
    invalid: "Vyplň název a platné datum závodu.",
    insert: "Uložení se nepodařilo. Zkontroluj databázová oprávnění (RLS) a log serveru.",
  };

  return (
    <PlatformContentShell active="pridat-zavody" email={user?.email || ""}>
    <div style={{ width: "100%", maxWidth: 1250, padding: "0 0 70px" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", margin: "0 0 28px" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#929292" }}>
            SPRINTUY / PLATFORMA
          </p>
          <h1 style={{ fontSize: 38, margin: "6px 0" }}>Přidat závod</h1>
          <p style={{ color: "#667085" }}>
            Vytvoř nový závod ručně. Uloží se jako koncept a nebude viditelný v mobilní aplikaci.
          </p>
        </div>
        <Link href="/platform/zavody" style={{ background: "#171717", color: "white", textDecoration: "none", padding: "12px 18px", borderRadius: 9 }}>
          Správa závodů
        </Link>
      </div>

      {params.created === "1" && (
        <p style={{ color: "#166534", background: "#eefbf2", padding: 14, borderRadius: 9 }}>
          ✓ Závod a jeho trasy byly uloženy jako Draft. Publikovat ho můžeš ve správě závodů.
        </p>
      )}
      {params.error && (
        <p style={{ color: "#991b1b", background: "#fef2f2", padding: 14, borderRadius: 9 }}>
          {errorMessage[params.error] ?? "Při ukládání nastala chyba."}
        </p>
      )}

      <section style={card}>
        <h2 style={{ fontSize: 22, margin: "0 0 6px" }}>+ Ručně přidat závod</h2>
        <p style={{ color: "#667085", fontSize: 14 }}>
          Zadej základní údaje, trasy a případně startovné. Nový závod se vždy uloží jako <strong>Draft</strong>.
        </p>
        {organizersError && <p style={{color:"#b91c1c"}}>Nelze načíst pořadatele: {organizersError.message}</p>}
        <ManualRaceForm action={createManual} organizers={organizers ?? []} />
      </section>
    </div>
    </PlatformContentShell>
  );
}
