"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ContentKind = "news" | "runclubs" | "events" | "competitions";
export type ContentResult = { ok: boolean; message: string };

const tables: Record<ContentKind, string> = {
  news: "app_news",
  runclubs: "runclubs",
  events: "community_events",
  competitions: "competitions",
};

async function admin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) {
    throw new Error("Nemáš oprávnění k úpravě obsahu.");
  }
  return supabase;
}

function kindOf(value: FormDataEntryValue | null): ContentKind {
  if (typeof value === "string" && Object.prototype.hasOwnProperty.call(tables, value)) {
    return value as ContentKind;
  }
  throw new Error("Neplatná sekce obsahu.");
}

function clean(form: FormData, field: string, max = 10000): string {
  return String(form.get(field) || "").trim().slice(0, max);
}

function nullable(value: string): string | null { return value || null; }
function validUrl(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch { throw new Error("Odkaz musí začínat https:// nebo http://."); }
}
function timestamp(value: string, required = false): string | null {
  if (!value) {
    if (required) throw new Error("Vyplň datum publikace.");
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error("Neplatné datum.");
  return date.toISOString();
}
function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function payload(kind: ContentKind, form: FormData): Record<string, unknown> {
  const active = form.get("is_active") === "true";
  const title = clean(form, kind === "runclubs" ? "name" : "title", 180);
  if (!title) throw new Error("Vyplň název.");
  if (kind === "news") {
    const content = clean(form, "content", 50000);
    if (!content) throw new Error("Vyplň obsah novinky.");
    return {
      title, excerpt: nullable(clean(form, "excerpt", 400)), content,
      published_at: timestamp(clean(form, "published_at"), true), is_active: active,
    };
  }
  const slug = slugify(clean(form, "slug") || title);
  if (!slug) throw new Error("Vyplň platný slug.");
  if (kind === "runclubs") {
    if (!clean(form, "region", 120)) throw new Error("Vyber kraj runclubu.");
    return {
      name: title, slug, city: nullable(clean(form, "city", 120)),
      region: clean(form, "region", 120) || null,
      description: nullable(clean(form, "description", 15000)),
      instagram_url: validUrl(clean(form, "instagram_url", 1000)), is_active: active,
    };
  }
  const starts = timestamp(clean(form, "starts_at"));
  const ends = timestamp(clean(form, "ends_at"));
  if (starts && ends && new Date(ends) < new Date(starts)) throw new Error("Konec nesmí být před začátkem.");
  const common = {
    title, slug, city: nullable(clean(form, "city", 120)),
    description: nullable(clean(form, "description", 15000)),
    starts_at: starts, ends_at: ends, is_active: active,
  };
  if (kind === "events") {
    const priceRaw = clean(form, "price", 30);
    const capRaw = clean(form, "capacity", 30);
    const price = priceRaw ? Number(priceRaw.replace(",", ".")) : null;
    const capacity = capRaw ? Number(capRaw) : null;
    if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error("Neplatná cena eventu.");
    if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) throw new Error("Neplatná kapacita.");
    const regStart = timestamp(clean(form, "registration_opens_at"));
    const regEnd = timestamp(clean(form, "registration_closes_at"));
    if (regStart && regEnd && regEnd < regStart) throw new Error("Konec registrací je před začátkem.");
    const status = clean(form, "status");
    if (!["draft", "published", "cancelled"].includes(status)) throw new Error("Neplatný stav eventu.");
    return { ...common, venue: nullable(clean(form, "venue", 300)), price, capacity,
      currency: "CZK", registration_opens_at: regStart, registration_closes_at: regEnd, status };
  }
  const status = clean(form, "status");
  if (!["draft", "active", "ended", "cancelled"].includes(status)) throw new Error("Neplatný stav soutěže.");
  const maxRaw = clean(form, "max_participants", 30);
  const maxParticipants = maxRaw ? Number(maxRaw) : null;
  if (maxParticipants !== null && (!Number.isInteger(maxParticipants) || maxParticipants <= 0)) throw new Error("Neplatná kapacita soutěže.");
  if (!ends) throw new Error("Vyplň datum a čas konce soutěže.");
  return { ...common, prize: nullable(clean(form, "prize", 3000)),
    rules: nullable(clean(form, "rules", 15000)), max_participants: maxParticipants, status };
}

function paths() {
  revalidatePath("/platform/novinky");
  revalidatePath("/platform/komunita");
}

export async function saveContent(form: FormData): Promise<ContentResult> {
  try {
    const supabase = await admin();
    const kind = kindOf(form.get("kind"));
    const id = clean(form, "id", 80);
    const data = payload(kind, form);
    const oldImage = clean(form, "existing_image", 2000);
    const urlField = kind === "runclubs" ? "logo_url" : "image_url";
    const providedUrl = clean(form, urlField, 2000);
    const image = form.get("image_file");
    let imageUrl = validUrl(providedUrl) ?? validUrl(oldImage);
    if (image instanceof File && image.size > 0) {
      if (image.size > 5 * 1024 * 1024) throw new Error("Obrázek může mít maximálně 5 MB.");
      const suffixes: Record<string, string> = {
        "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
      };
      const ext = suffixes[image.type];
      if (!ext) throw new Error("Podporované obrázky: JPG, PNG, WebP, GIF.");
      const path = `${kind}/${crypto.randomUUID()}.${ext}`;
      const result = await supabase.storage.from("sprintuy-content").upload(path, image, {
        contentType: image.type, upsert: false,
      });
      if (result.error) throw new Error(`Nahrávání obrázku: ${result.error.message}`);
      imageUrl = supabase.storage.from("sprintuy-content").getPublicUrl(path).data.publicUrl;
    }
    data[urlField] = form.get("remove_image") === "true" ? null : imageUrl;
    if (kind === "news") {
      // CTA je volitelné a používá dva dodatečné sloupce přidané přiloženou SQL migrací.
      data.link_url = validUrl(clean(form, "link_url", 2000));
      data.link_label = nullable(clean(form, "link_label", 120));
      if (data.link_url && !data.link_label) throw new Error("K CTA odkazu zadej text tlačítka.");
    }
    if (id && !/^[\da-f]{8}-[\da-f-]{27,}$/i.test(id)) throw new Error("Neplatné ID záznamu.");
    const table = supabase.from(tables[kind]);
    const now = new Date().toISOString();
    const writing = { ...data, updated_at: now };
    if (id) {
      const { data: edited, error } = await table.update(writing).eq("id", id).select("id").maybeSingle();
      if (error) throw error;
      if (!edited) throw new Error("Záznam se nepodařilo aktualizovat (zkontroluj RLS).");
    } else {
      const { data: inserted, error } = await table.insert({ ...writing, id: crypto.randomUUID(), created_at: now }).select("id").maybeSingle();
      if (error) throw error;
      if (!inserted) throw new Error("Záznam se nepodařilo vytvořit (zkontroluj RLS).");
    }
    paths();
    return { ok: true, message: id ? "Změny byly uloženy." : "Nový obsah byl vytvořen." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Ukládání selhalo." };
  }
}

export async function toggleContent(kind: ContentKind, id: string, nextActive: boolean): Promise<ContentResult> {
  try {
    const supabase = await admin();
    if (!tables[kind]) throw new Error("Neplatná sekce.");
    const { data, error } = await supabase.from(tables[kind]).update({ is_active: nextActive })
      .eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Změna se neuložila (zkontroluj RLS).");
    paths();
    return { ok: true, message: nextActive ? "Obsah byl aktivován." : "Obsah byl skryt." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Změna selhala." };
  }
}

export async function deleteContent(kind: ContentKind, id: string): Promise<ContentResult> {
  try {
    const supabase = await admin();
    if (!tables[kind]) throw new Error("Neplatná sekce.");
    // Chraň navázané účasti před nechtěným CASCADE smazáním.
    if (kind === "runclubs") {
      const { count, error } = await supabase.from("runclub_runs")
        .select("id", { count: "exact", head: true }).eq("runclub_id", id);
      if (error) throw error;
      if ((count ?? 0) > 0) throw new Error("Runclub má naplánované výběhy. Nejprve je vyřeš nebo runclub deaktivuj.");
    }
    if (kind === "events") {
      const { count, error } = await supabase.from("community_event_requests")
        .select("id", { count: "exact", head: true }).eq("event_id", id);
      if (error) throw error;
      if ((count ?? 0) > 0) throw new Error("Event má žádosti o účast. Místo mazání ho deaktivuj.");
    }
    // Soutěž s přihlášenými uživateli nesmažeme, aby se neodstranily přihlášky.
    if (kind === "competitions") {
      const { count, error } = await supabase.from("competition_entries")
        .select("id", { count: "exact", head: true }).eq("competition_id", id);
      if (error) throw error;
      if ((count ?? 0) > 0) throw new Error("Soutěž má přihlášené uživatele. Místo mazání ji skryj.");
    }
    const { data, error } = await supabase.from(tables[kind]).delete().eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Záznam se nepodařilo smazat (zkontroluj RLS).");
    paths();
    return { ok: true, message: "Záznam byl trvale smazán." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Mazání selhalo." };
  }
}
