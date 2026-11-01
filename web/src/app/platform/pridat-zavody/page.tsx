import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as cheerio from "cheerio";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import ManualRaceForm from "@/components/ManualRaceForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCES = [
  { id: "bezeckyzavod26", name: "Běžeckýzávod.cz – 2026", year: 2026, url: "https://www.bezeckyzavod.cz/zavody/?rocnik=2026" },
  { id: "bezeckyzavod27", name: "Běžeckýzávod.cz – 2027", year: 2027, url: "https://www.bezeckyzavod.cz/zavody/?rocnik=2027" },
] as const;

type RaceCandidate = {
  key: string; name: string; start_date: string; city: string;
  source_name: string; source_url: string; source_event_url: string;
};
type Existing = { id: string; name: string; start_date: string; city: string | null; source_event_url: string | null };
type Scanned = { name: string; rows: RaceCandidate[]; error: string; diagnostic: string };

type ManualRoute = { label: string; km: number | null; price: number | null; valid_until: string | null; registration_url: string | null };

function normalized(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function similarity(a: string, b: string) {
  const x = normalized(a), y = normalized(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const A = new Set(x.split(" ")), B = new Set(y.split(" "));
  return [...A].filter(v => B.has(v)).length / Math.max(A.size, B.size);
}
function validIso(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
}
const MONTHS: Record<string, number> = {
  led: 1, leden: 1, uno: 2, unor: 2, bre: 3, brezen: 3, dub: 4, duben: 4,
  kve: 5, kveten: 5, cer: 6, cerven: 6, cervenec: 7, srp: 8, srpen: 8,
  zar: 9, zari: 9, rij: 10, rijen: 10, lis: 11, listopad: 11, pro: 12, prosinec: 12,
};
function readDate(text: string, year: number): string | null {
  const iso = text.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
  if (iso && validIso(iso)) return iso;
  const dotted = text.match(/\b(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(20\d{2})\b/);
  if (dotted) {
    const d = `${dotted[3]}-${dotted[2].padStart(2,"0")}-${dotted[1].padStart(2,"0")}`;
    return validIso(d) ? d : null;
  }
  const s = normalized(text);
  // Na termínovce je datum ve formátu „Led 16“, případně „Led 16–17“.
  const monthFirst = s.match(/\b(led|leden|uno|unor|bre|brezen|dub|duben|kve|kveten|cer|cervenec|cerven|srp|srpen|zar|zari|rij|rijen|lis|listopad|pro|prosinec)\s+(\d{1,2})\b/);
  const dayFirst = s.match(/\b(\d{1,2})\s+(led|leden|uno|unor|bre|brezen|dub|duben|kve|kveten|cer|cervenec|cerven|srp|srpen|zar|zari|rij|rijen|lis|listopad|pro|prosinec)\b/);
  const month = monthFirst ? MONTHS[monthFirst[1]] : dayFirst ? MONTHS[dayFirst[2]] : null;
  const day = monthFirst ? Number(monthFirst[2]) : dayFirst ? Number(dayFirst[1]) : null;
  if (!month || !day) return null;
  const result = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  return validIso(result) ? result : null;
}
function absUrl(href: string, base: string) {
  try {
    const u = new URL(href, base);
    if (!(["http:", "https:"].includes(u.protocol))) return null;
    u.hash = "";
    return u.href;
  } catch { return null; }
}
function sourceHost(url: string) { return new URL(url).hostname.replace(/^www\./, ""); }
function parseCalendar(html: string, source: (typeof SOURCES)[number]): RaceCandidate[] {
  const $ = cheerio.load(html);
  const collected: RaceCandidate[] = [];
  const sourceHostName = sourceHost(source.url);
  $("a[href]").each((_, el) => {
    const a = $(el);
    const href = absUrl(a.attr("href") || "", source.url);
    if (!href || sourceHost(href) !== sourceHostName) return;
    const u = new URL(href);
    // Kalendáře, měsíční filtry, články a navigaci nebereme za závod.
    if (/\b(login|registrace|kontakt|clanek|blog|kalkulator|predikce)\b/i.test(u.pathname)) return;
    if (u.pathname === "/" || /^\/zavody\/?$/.test(u.pathname) || u.searchParams.has("rocnik")) return;
    const name = a.text().replace(/\s+/g, " ").trim();
    if (name.length < 5 || name.length > 150 || /^(led|uno|bre|dub|kve|cer|srp|zar|rij|lis|pro)\s+\d{1,2}$/i.test(normalized(name))) return;
    if (/^(domu|terminovka|pridat zavod|zobrazit|detail|dalsi|2026|2027)$/i.test(normalized(name))) return;

    // Kalendář používá propojené datum a název akce, oba mohou mířit na stejný detail.
    // Záměrně jen nejbližší malé bloky, nikdy celou stránku – jinak se datum přiřadí špatně.
    let context = "";
    const parents = a.parents().toArray();
    for (const parent of parents.slice(0, 5)) {
      const elText = $(parent).text().replace(/\s+/g, " ").trim();
      if (elText.length > 220) break;
      if (readDate(elText, source.year)) { context = elText; break; }
    }
    if (!context) {
      const before = a.prevAll().slice(0, 3).text() || a.parent().prev().text();
      context = before.replace(/\s+/g, " ").trim().slice(0, 120);
    }
    const date = readDate(context, source.year);
    if (!date) return;
    const key = `${source.id}:${href}`;
    collected.push({ key, name, start_date: date, city: "", source_name: source.id,
      source_url: source.url, source_event_url: href });
  });
  return [...new Map(collected.map(c => [c.key, c])).values()];
}
async function scan(): Promise<Scanned[]> {
  return Promise.all(SOURCES.map(async source => {
    try {
      const response = await fetch(source.url, {
        cache: "no-store", signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SprintuyAdmin/1.0)" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      if (html.length > 8_000_000) throw new Error("Odpověď zdroje je příliš velká");
      const rows = parseCalendar(html, source);
      return { name: source.name, rows, error: "", diagnostic: rows.length === 0
        ? "Stránka se načetla, ale její strukturu se nepodařilo rozpoznat. Neznamená to, že neobsahuje závody."
        : "" };
    } catch (e) {
      return { name: source.name, rows: [], error: e instanceof Error ? e.message : "Neznámá chyba", diagnostic: "" };
    }
  }));
}
async function adminDb() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect("/");
  if (!process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) redirect("/unauthorized");
  return db;
}
async function allExisting(db: Awaited<ReturnType<typeof createClient>>): Promise<Existing[]> {
  const result: Existing[] = [];
  for (let offset = 0;;offset += 500) {
    const {data,error} = await db.from("races").select("id,name,start_date,city,source_event_url").order("start_date").range(offset,offset+499);
    if (error) throw new Error(error.message);
    result.push(...(data || []));
    if ((data || []).length < 500) break;
  }
  return result;
}
function duplicate(c: Pick<RaceCandidate,"name"|"start_date"|"city"|"source_event_url">, existing: Existing[]) {
  return existing.find(r =>
    (c.source_event_url && r.source_event_url === c.source_event_url) ||
    (r.start_date === c.start_date && similarity(r.name,c.name) >= 0.78 &&
      (!c.city || !r.city || similarity(c.city,r.city) >= 0.6))
  ) || null;
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
    const date = String(o.valid_until ?? "").trim();
    if (date && !validIso(date)) throw new Error("Neplatné datum ceny");
    const url = String(o.registration_url ?? "").trim();
    if (url && !/^https?:\/\//i.test(url)) throw new Error("Registrační odkaz musí začínat http:// nebo https://");
    return { label, km, price, valid_until: date || null, registration_url: url || null };
  });
}
async function createManual(form: FormData) {
  "use server";
  const db = await adminDb();
  const name = String(form.get("name") ?? "").trim();
  const start_date = String(form.get("start_date") ?? "");
  const city = String(form.get("city") ?? "").trim();
  const region = String(form.get("region") ?? "").trim();
  const organizer_name = String(form.get("organizer_name") ?? "").trim();
  const website_url = String(form.get("website_url") ?? "").trim();
  const registration_url = String(form.get("registration_url") ?? "").trim();
  if (name.length < 3 || name.length > 180 || !validIso(start_date) || city.length > 120 || region.length > 120) redirect("/platform/pridat-zavody?error=invalid");
  if ([website_url,registration_url].some(u => u && !/^https?:\/\//i.test(u))) redirect("/platform/pridat-zavody?error=url");
  let routes: ManualRoute[];
  try { routes = parseManualRoutes(String(form.get("routes") ?? "[]")); }
  catch { redirect("/platform/pridat-zavody?error=routes"); }
  const previous = await allExisting(db);
  if (duplicate({name,start_date,city,source_event_url:""}, previous)) redirect("/platform/pridat-zavody?error=duplicate");
  const {data:race,error:raceError} = await db.from("races").insert({
    name, start_date, city:city || null, region:region || null, organizer_name:organizer_name || null,
    website_url:website_url || null, registration_url:registration_url || null,
    sport:"running", country_code:"CZ", status:"draft", verification_status:"needs_review", admin_checked:false,
    source_name:"sprintuy_manual", source_url:"manual", source_event_url:`manual:${randomUUID()}`,
    raw_data: {created_via:"sprintuy_platform", manual:true},
  }).select("id").single();
  if (raceError || !race) { console.error("manual race insert",raceError); redirect("/platform/pridat-zavody?error=insert"); }
  for (const route of routes) {
    const {data:distance,error:distanceError} = await db.from("race_distances").insert({
      race_id:race.id, label:route.label, distance_km:route.km,
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
async function approve(form: FormData) {
  "use server";
  const db = await adminDb();
  const name = String(form.get("name")??"").trim();
  const date = String(form.get("start_date")??"");
  const event = String(form.get("source_event_url")??"");
  const sourceName = String(form.get("source_name")??"");
  const source = SOURCES.find(s => s.id === sourceName);
  const eventUrl = source ? absUrl(event,source.url) : null;
  if (!source || !eventUrl || sourceHost(eventUrl) !== sourceHost(source.url) || !validIso(date) || name.length < 4 || name.length > 180) redirect("/platform/pridat-zavody?error=invalid");
  const existing = await allExisting(db);
  if (duplicate({name,start_date:date,city:"",source_event_url:eventUrl},existing)) redirect("/platform/pridat-zavody?error=duplicate");
  const {error} = await db.from("races").insert({
    name, start_date:date, sport:"running", country_code:"CZ", status:"published",
    verification_status:"needs_review", admin_checked:false,
    source_name:source.id, source_url:source.url, source_event_url:eventUrl,
    website_url:eventUrl,
  });
  if (error) { console.error("approve imported race",error);redirect("/platform/pridat-zavody?error=insert"); }
  revalidatePath("/platform/zavody");
  redirect("/platform/pridat-zavody?approved=1");
}

export default async function AddRacesPage({searchParams}: {searchParams:Promise<{created?:string;approved?:string;error?:string;id?:string}>}) {
  const db = await adminDb();
  const params = await searchParams;
  const [sources,existing] = await Promise.all([scan(),allExisting(db)]);
  const candidates = [...new Map(sources.flatMap(s=>s.rows).map(r=>[r.key,r])).values()]
    .filter(r=>r.start_date >= "2026-11-01")
    .sort((a,b)=>a.start_date.localeCompare(b.start_date));
  const fresh = candidates.filter(r=>!duplicate(r,existing));
  const matches = candidates.filter(r=>duplicate(r,existing));
  const card: React.CSSProperties = {background:"#fff",border:"1px solid #e2e5e9",borderRadius:12,padding:18};
  return <main style={{maxWidth:1250,margin:"auto",padding:"36px 24px 110px"}}>
    <Link href="/platform" style={{color:"#667085",textDecoration:"none"}}>← Zpět na platformu</Link>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap",margin:"28px 0"}}>
      <div><p style={{fontSize:12,fontWeight:700,letterSpacing:2,color:"#929292"}}>SPRINTUY / PLATFORMA</p>
        <h1 style={{fontSize:38,margin:"6px 0"}}>Přidat závody</h1>
        <p style={{color:"#667085"}}>Ruční přidání do konceptů a hledání závodů na Běžeckýzávod.cz.</p></div>
      <Link href="/platform/pridat-zavody" style={{background:"#171717",color:"white",textDecoration:"none",padding:"12px 18px",borderRadius:9}}>↻ Znovu prohledat</Link>
    </div>
    {params.created && <p style={{color:"#166534",background:"#eefbf2",padding:14,borderRadius:9}}>✓ Závod i jeho trasy byly založeny jako Draft. V mobilní aplikaci zatím není publikovaný.</p>}
    {params.approved && <p style={{color:"#166534",background:"#eefbf2",padding:14,borderRadius:9}}>✓ Nalezený závod byl publikován s červeným křížkem.</p>}
    {params.error && <p style={{color:"#991b1b",background:"#fef2f2",padding:14,borderRadius:9}}>{params.error === "partial" ? `Závod vznikl jako Draft, ale nepodařilo se vložit všechny trasy/ceny. Závod ID: ${params.id ?? "neznámé"}. Zkontroluj ho v administraci.` : params.error === "duplicate" ? "Závod s podobným názvem a datem už pravděpodobně existuje." : params.error === "routes" ? "Zkontroluj vyplněné trasy a ceny." : params.error === "url" ? "Odkazy musí začínat https:// nebo http://." : params.error === "invalid" ? "Vyplň název a platné datum." : "Uložení selhalo. Zkontroluj RLS pro INSERT na závody, trasy a ceny a log serveru."}</p>}
    <section style={{...card,marginBottom:30}}>
      <h2 style={{fontSize:22,margin:"0 0 6px"}}>+ Ručně přidat závod</h2>
      <p style={{color:"#667085",fontSize:14}}>Nový závod se vždy uloží jako <strong>Draft</strong>. Trasy můžeš přidat rovnou; cena je nepovinná.</p>
      <ManualRaceForm action={createManual}/>
    </section>
    <section>
      <h2 style={{fontSize:22,marginBottom:14}}>Vyhledávání na Běžeckýzávod.cz</h2>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}}>
        {[`Rozpoznáno ${candidates.length}`,`Nové návrhy ${fresh.length}`,`Možné shody ${matches.length}`,`V databázi ${existing.length}`].map(t=><strong key={t} style={{...card,padding:"10px 14px",background:"#f6f7f8"}}>{t}</strong>)}
      </div>
      <div style={{...card,marginBottom:22,fontSize:13,color:"#667085"}}>
        {sources.map(s=><div key={s.name} style={{marginBottom:5}}>{s.name}: {s.error ? <span style={{color:"#b91c1c"}}>Chyba načtení: {s.error}</span> : s.diagnostic ? <span style={{color:"#b45309"}}>{s.diagnostic}</span> : `${s.rows.length} rozpoznaných závodů`}</div>)}
        <p style={{marginBottom:0}}>Kontrolují se jen uvedené ročníky a jen závody, které parser dokáže bezpečně přečíst. Nula není důkaz, že nové závody neexistují.</p>
      </div>
      <h3>Nové návrhy ({fresh.length})</h3>
      {!fresh.length && <p style={{color:"#667085"}}>Žádné nové návrhy se nepodařilo identifikovat. Zkontroluj stav načítání výše.</p>}
      <div style={{display:"grid",gap:9}}>{fresh.slice(0,250).map(c=><div key={c.key} style={{...card,display:"flex",gap:15,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
        <div><strong>{c.name}</strong><div style={{fontSize:13,color:"#667085",marginTop:5}}>{c.start_date}</div><a target="_blank" rel="noreferrer" href={c.source_event_url} style={{fontSize:13,color:"#2563eb"}}>Otevřít zdroj ↗</a></div>
        <form action={approve}><input type="hidden" name="name" value={c.name}/><input type="hidden" name="start_date" value={c.start_date}/><input type="hidden" name="source_name" value={c.source_name}/><input type="hidden" name="source_event_url" value={c.source_event_url}/>
          <button type="submit" style={{background:"#171717",color:"white",padding:"10px 15px",border:0,borderRadius:8,cursor:"pointer"}}>Schválit a publikovat</button></form>
      </div>)}</div>
      <h3 style={{marginTop:32}}>Možné shody ({matches.length})</h3>
      <p style={{fontSize:13,color:"#667085"}}>Tyto závody se nevkládají automaticky. Porovnává se zdroj, datum a podobnost názvu.</p>
      <div style={{display:"grid",gap:6}}>{matches.slice(0,80).map(c=><div key={c.key} style={{...card,padding:12}}><strong>{c.name}</strong> · {c.start_date} · podobný záznam: {duplicate(c,existing)?.name}</div>)}</div>
    </section>
  </main>;
}
