"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId = (id: string) => { if (!UUID.test(id)) throw new Error("Neplatné ID."); return id; };
const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
const required = (value: string, title: string) => { if (!value) throw new Error(`Vyplň ${title}.`); return value; };
const numeric = (s: string, title: string, nullable = false) => {
  if (!s && nullable) return null;
  const n = Number(s.replace(",", "."));
  if (!s || !Number.isFinite(n) || n < 0) throw new Error(`Neplatná hodnota: ${title}.`);
  return n;
};
const link = (s: string) => {
  if (!s) return null;
  try { const parsed = new URL(s); if (["https:", "http:"].includes(parsed.protocol)) return s; } catch {}
  throw new Error("Registrační odkaz musí začínat https:// nebo http://.");
};
function pragueMoment(date: string, end: boolean) {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Neplatné datum platnosti.");
  const midday = new Date(date + (end ? "T12:00:00Z" : "T00:00:00Z"));
  if (Number.isNaN(midday.getTime()) || midday.toISOString().slice(0, 10) !== date) throw new Error("Neplatné datum platnosti.");
  const offsetString = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Prague", timeZoneName: "shortOffset" })
    .formatToParts(midday).find(p => p.type === "timeZoneName")?.value ?? "GMT+1";
  const match = offsetString.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) throw new Error("Neznámé časové pásmo.");
  const offset = `${match[1]}${match[2].padStart(2, "0")}:${match[3] || "00"}`;
  return new Date(`${date}T${end ? "23:59:59" : "00:00:00"}${offset}`).toISOString();
}
async function admin() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user || !process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID)
    throw new Error("Nemáš administrátorská oprávnění.");
  return db;
}
function result(error: unknown): ActionResult { return { ok: false, message: error instanceof Error ? error.message : "Neznámá chyba Supabase." }; }
function changed(message: string): ActionResult { revalidatePath("/platform/zavody"); return { ok: true, message }; }

export async function setRaceStatus(raceId: string, status: string): Promise<ActionResult> {
  try {
    const db = await admin(); validId(raceId);
    if (!["published", "archived"].includes(status)) throw new Error("Neplatný stav.");
    const { data, error } = await db.from("races").update({ status }).eq("id", raceId).select("id").maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Změnu stavu zamítlo RLS.");
    return changed(status === "archived" ? "Závod přesunut do archivu." : "Závod znovu publikován.");
  } catch (e) { return result(e); }
}

export async function saveRoute(form: FormData): Promise<ActionResult> {
  try {
    const db = await admin();
    const raceId = validId(text(form,"race_id"));
    const id = text(form,"route_id"); if (id) validId(id);
    const label = required(text(form,"label"), "název trasy (např. Dětské běhy nebo 21,1 km)");
    const km = numeric(text(form,"distance_km"), "délka trasy", true);
    const url = link(text(form,"registration_url"));
    const payload = { label, distance_km: km, registration_url: url };
    if (id) {
      const { data, error } = await db.from("race_distances").update(payload).eq("race_id",raceId).eq("id",id).select("id").maybeSingle();
      if (error || !data) throw new Error(error?.message ?? "Trasu se nepodařilo změnit.");
      return changed(`Trasa „${label}“ změněna.`);
    }
    const { data, error } = await db.from("race_distances").insert({ ...payload, race_id: raceId, raw_text: label, data_source: "admin" }).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Trasu se nepodařilo vytvořit.");
    return changed(`Trasa „${label}“ vytvořena.`);
  } catch (e) { return result(e); }
}

export async function deleteRoute(raceId: string, routeId: string): Promise<ActionResult> {
  try {
    const db = await admin(); validId(raceId); validId(routeId);
    // Kvůli FK ON DELETE CASCADE by odstranění trasy smazalo také její ceny.
    // Vyžadujeme explicitní potvrzení v UI a ověření počtu před smazáním.
    const { count, error: countError } = await db.from("race_price_tiers").select("id", { count: "exact", head: true }).eq("race_id",raceId).eq("race_distance_id",routeId);
    if (countError) throw new Error(countError.message);
    const { data, error } = await db.from("race_distances").delete().eq("id",routeId).eq("race_id",raceId).select("id").maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Trasu se nepodařilo smazat. Zkontroluj DELETE RLS.");
    return changed(`Trasa odstraněna${count ? ` včetně ${count} navázaných cen` : ""}.`);
  } catch (e) { return result(e); }
}

export async function saveTier(form: FormData): Promise<ActionResult> {
  try {
    const db = await admin();
    const raceId = validId(text(form,"race_id"));
    const id = text(form,"tier_id"); if (id) validId(id);
    const routeId = text(form,"route_id"); if (routeId) validId(routeId);
    const title = text(form,"label") || "Startovné";
    const price = numeric(text(form,"price"), "cena");
    const validUntil = text(form,"valid_until") ? pragueMoment(text(form,"valid_until"), true) : null;
    const validFrom = text(form,"valid_from") ? pragueMoment(text(form,"valid_from"), false) : null;
    if (validFrom && validUntil && validFrom > validUntil) throw new Error("Platnost od nesmí být po datu platnosti do.");
    const regUrl = link(text(form,"registration_url"));
    const audience = text(form,"audience_label") || null;
    if (routeId) {
      const { data, error } = await db.from("race_distances").select("id").eq("race_id",raceId).eq("id",routeId).maybeSingle();
      if (error || !data) throw new Error("Vybraná trasa nepatří tomuto závodu.");
    }
    const payload = { race_distance_id: routeId || null, label: title, price, valid_from: validFrom,
      valid_until: validUntil, registration_url: regUrl, audience_label: audience };
    if (id) {
      const { data, error } = await db.from("race_price_tiers").update(payload).eq("id",id).eq("race_id",raceId).select("id").maybeSingle();
      if (error || !data) throw new Error(error?.message ?? "Cenovou vlnu se nepodařilo změnit.");
      return changed(`Cenová vlna „${title}“ upravena.`);
    }
    const { data, error } = await db.from("race_price_tiers")
      .insert({ ...payload, race_id: raceId, currency: "CZK", data_source: "admin", status: "upcoming" }).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Cenovou vlnu se nepodařilo přidat.");
    return changed(`Cenová vlna „${title}“ vytvořena.`);
  } catch (e) { return result(e); }
}

export async function deleteTier(raceId: string, tierId: string): Promise<ActionResult> {
  try {
    const db = await admin(); validId(raceId); validId(tierId);
    const { data, error } = await db.from("race_price_tiers").delete().eq("id",tierId).eq("race_id",raceId).select("id").maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Cenu se nepodařilo odstranit. Zkontroluj DELETE RLS.");
    return changed("Cenová vlna odstraněna.");
  } catch (e) { return result(e); }
}


// Hromadné mazání POUZE jednotlivých cenových vln (nikoli tras či závodů).
export async function deleteSelectedTiers(raceId: string, tierIds: string[]): Promise<ActionResult> {
  try {
    const db = await admin();
    validId(raceId);
    if (!Array.isArray(tierIds)) throw new Error("Neplatný výběr cen.");
    const ids = [...new Set(tierIds)];
    if (!ids.length) throw new Error("Nejsou vybrané žádné cenové vlny.");
    if (ids.length > 200) throw new Error("Najednou lze smazat nejvýše 200 cenových vln.");
    ids.forEach(validId);

    // Před mazáním ověř přesnou množinu záznamů, včetně příslušnosti k závodu.
    const { data: owned, error: readError } = await db.from("race_price_tiers")
      .select("id").eq("race_id", raceId).in("id", ids);
    if (readError) throw new Error(readError.message);
    if (!owned || owned.length !== ids.length) {
      throw new Error("Některé vybrané ceny neexistují nebo nepatří tomuto závodu. Obnov stránku.");
    }
    const { data: deleted, error } = await db.from("race_price_tiers")
      .delete().eq("race_id", raceId).in("id", ids).select("id");
    if (error) throw new Error(error.message);
    if (!deleted || deleted.length !== ids.length) {
      throw new Error(`Odstraněno ${deleted?.length ?? 0} z ${ids.length} cenových vln. Obnov stránku a zkontroluj zbývající záznamy.`);
    }
    return changed(`Úspěšně smazáno ${deleted.length} cenových vln.`);
  } catch (e) { return result(e); }
}

// Upravuje pouze název nebo odkazy závodu, nikdy importní metadata.
export async function updateRaceDetails(
  raceId: string,
  field: "name" | "website_url" | "registration_url",
  value: string
): Promise<ActionResult> {
  try {
    const db = await admin();
    validId(raceId);
    if (!["name", "website_url", "registration_url"].includes(field)) throw new Error("Nepovolené pole.");
    const cleaned = value.trim();
    const payload = field === "name"
      ? { name: required(cleaned, "název závodu") }
      : { [field]: link(cleaned) };
    const { data, error } = await db.from("races").update(payload).eq("id", raceId).select("id").maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Změnu závodu zamítlo RLS.");
    return changed(field === "name" ? "Název závodu změněn." : "Odkaz závodu uložen.");
  } catch (e) { return result(e); }
}

// Trvalé mazání; FK CASCADE odstraní navázané trasy, ceny i uživatelské vazby.
export async function deleteRace(raceId: string): Promise<ActionResult> {
  try {
    const db = await admin();
    validId(raceId);
    const { data, error } = await db.from("races").delete().eq("id", raceId).select("id").maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Závod se nepodařilo smazat. Zkontroluj DELETE RLS.");
    return changed("Závod a jeho navázaná data byly trvale odstraněny.");
  } catch (e) { return result(e); }
}

// Změna názvu trasy přímo v řádku cenové vlny.
// Pokud má cena přiřazenou trasu, přejmenuje společný záznam race_distances.
// Pokud je cena obecná (race_distance_id IS NULL), vytvoří pro ni konkrétní trasu.
export async function renameTierRoute(raceId: string, tierId: string, name: string): Promise<ActionResult> {
  try {
    const db = await admin();
    validId(raceId);
    validId(tierId);
    const label = required(name.trim(), "název trasy");
    if (label.length > 180) throw new Error("Název trasy je příliš dlouhý.");
    const { data: tier, error: tierError } = await db.from("race_price_tiers")
      .select("id,race_distance_id").eq("id", tierId).eq("race_id", raceId).maybeSingle();
    if (tierError || !tier) throw new Error(tierError?.message ?? "Cenová vlna nebyla nalezena.");

    if (tier.race_distance_id) {
      const { data: updated, error } = await db.from("race_distances")
        .update({ label }).eq("race_id", raceId).eq("id", tier.race_distance_id)
        .select("id").maybeSingle();
      if (error || !updated) throw new Error(error?.message ?? "Trasu nelze přejmenovat. Zkontroluj UPDATE RLS.");
      return changed(`Trasa přejmenována na „${label}“. Název se změnil u všech jejích cen.`);
    }

    if (label === "Obecné startovné") return changed("Název trasy se nezměnil.");
    const { data: route, error: createError } = await db.from("race_distances")
      .insert({ race_id: raceId, label, raw_text: label, data_source: "admin" })
      .select("id").single();
    if (createError || !route) throw new Error(createError?.message ?? "Novou trasu nelze vytvořit.");
    const { data: assigned, error: assignError } = await db.from("race_price_tiers")
      .update({ race_distance_id: route.id }).eq("race_id", raceId).eq("id", tierId)
      .is("race_distance_id", null).select("id").maybeSingle();
    if (assignError || !assigned) {
      // Pokud přiřazení selže, pokusíme se odstranit právě vytvořený prázdný záznam.
      await db.from("race_distances").delete().eq("race_id", raceId).eq("id", route.id);
      throw new Error(assignError?.message ?? "Trasu se nepodařilo přiřadit k ceně.");
    }
    return changed(`Trasa „${label}“ vytvořena a přiřazena k cenové vlně.`);
  } catch (e) { return result(e); }
}

// Ruční kontrola závodu: stav zůstává uložený v races.admin_checked.
export async function setRaceReviewed(raceId: string, checked: boolean): Promise<ActionResult> {
  try {
    const db = await admin();
    validId(raceId);
    if (typeof checked !== "boolean") throw new Error("Neplatný stav kontroly.");
    const { data, error } = await db.from("races")
      .update({ admin_checked: checked })
      .eq("id", raceId)
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Stav kontroly se nepodařilo uložit. Zkontroluj UPDATE RLS.");
    return changed(checked ? "Závod označen jako zkontrolovaný." : "Závod označen jako nezkontrolovaný.");
  } catch (e) { return result(e); }
}
