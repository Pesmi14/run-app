"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; message: string };
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const get = (f: FormData, key: string, limit = 10000) => String(f.get(key) ?? "").trim().slice(0, limit);
const nullable = (v: string) => v || null;
async function requireAdmin() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user || !process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) throw new Error("Administrátorské oprávnění chybí.");
  return db;
}
function iso(v: string, required = false) {
  if (!v) {
    if (required) throw new Error("Datum a čas je povinné.");
    return null;
  }
  const d = new Date(v);
  if (Number.isNaN(d.valueOf())) throw new Error("Neplatný datum nebo čas.");
  return d.toISOString();
}
function num(v: string, field: string, integer = false): number | null {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || (integer && !Number.isInteger(n))) throw new Error(`Neplatná hodnota: ${field}.`);
  return n;
}
function refresh() { revalidatePath("/platform/komunita"); }

export async function saveRun(form: FormData): Promise<Result> {
  try {
    const db = await requireAdmin();
    const runclubId = get(form, "runclub_id", 36);
    const id = get(form, "id", 36);
    if (!validId(runclubId) || (id && !validId(id))) throw new Error("Neplatné ID výběhu nebo runclubu.");
    const title = get(form, "title", 180);
    if (!title) throw new Error("Vyplň název výběhu.");
    const starts = iso(get(form, "starts_at"), true);
    const ends = iso(get(form, "ends_at"));
    if (ends && starts && ends < starts) throw new Error("Konec nemůže být před začátkem.");
    const data = {
      runclub_id: runclubId, title, starts_at: starts, ends_at: ends,
      meeting_point: nullable(get(form, "meeting_point", 300)),
      city: nullable(get(form, "city", 120)),
      description: nullable(get(form, "description", 10000)),
      distance_km: num(get(form, "distance_km"), "vzdálenost"),
      capacity: num(get(form, "capacity"), "kapacita", true),
      is_active: get(form, "is_active") === "true",
      updated_at: new Date().toISOString(),
    };
    const q = id ? db.from("runclub_runs").update(data).eq("id", id).eq("runclub_id", runclubId) : db.from("runclub_runs").insert(data);
    const { data: saved, error } = await q.select("id").maybeSingle();
    if (error) throw error;
    if (!saved) throw new Error("Výběh se neuložil (zkontroluj RLS).");
    refresh();
    revalidatePath(`/platform/komunita/runclubs/${runclubId}`);
    return { ok: true, message: "Výběh byl uložen." };
  } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Uložení selhalo." }; }
}

export async function setRunActive(runId: string, runclubId: string, isActive: boolean): Promise<Result> {
  try {
    const db = await requireAdmin();
    if (!validId(runId) || !validId(runclubId)) throw new Error("Neplatné ID.");
    const { data, error } = await db.from("runclub_runs").update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", runId).eq("runclub_id", runclubId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Výběh nebyl nalezen.");
    revalidatePath(`/platform/komunita/runclubs/${runclubId}`);
    return { ok: true, message: isActive ? "Výběh aktivován." : "Výběh deaktivován." };
  } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Změna selhala." }; }
}

export async function deleteRun(runId: string, runclubId: string): Promise<Result> {
  try {
    const db = await requireAdmin();
    if (!validId(runId) || !validId(runclubId)) throw new Error("Neplatné ID.");
    const { count, error: countErr } = await db.from("runclub_run_participants").select("id", { count: "exact", head: true }).eq("run_id", runId);
    if (countErr) throw countErr;
    if ((count || 0) > 0) throw new Error("Výběh už má účastníky. Místo mazání ho deaktivuj.");
    const { data, error } = await db.from("runclub_runs").delete().eq("id", runId).eq("runclub_id", runclubId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Výběh nebyl nalezen.");
    revalidatePath(`/platform/komunita/runclubs/${runclubId}`);
    return { ok: true, message: "Výběh smazán." };
  } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Mazání selhalo." }; }
}

export async function decideEventRequest(requestId: string, eventId: string, nextStatus: "approved" | "rejected"): Promise<Result> {
  try {
    const db = await requireAdmin();
    if (!validId(requestId) || !validId(eventId) || !["approved", "rejected"].includes(nextStatus)) throw new Error("Neplatná žádost.");
    const { data: changed, error } = await db.rpc("sprintuy_decide_event_request", {
      p_request_id: requestId, p_event_id: eventId, p_next_status: nextStatus,
    });
    if (error) throw error;
    if (!changed) throw new Error("Žádost už byla vyřízena. Obnov stránku.");
    revalidatePath(`/platform/komunita/events/${eventId}`);
    return { ok: true, message: nextStatus === "approved" ? "Žádost schválena." : "Žádost zamítnuta." };
  } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Rozhodnutí selhalo." }; }
}
