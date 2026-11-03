"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type FeedbackStatus = "new" | "in_progress" | "resolved" | "dismissed";
export async function updateFeedback(id: string, status: FeedbackStatus, note: string): Promise<{ok:boolean;message:string}> {
  try {
    const db = await createClient();
    const {data:{user},error:authError} = await db.auth.getUser();
    if (authError || !user || !process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) throw Error("Nemáš oprávnění.");
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) throw Error("Neplatné ID.");
    if (!["new","in_progress","resolved","dismissed"].includes(status)) throw Error("Neplatný status.");
    if (note.length > 5000) throw Error("Poznámka je příliš dlouhá.");
    const {data,error} = await db.from("app_feedback").update({
      status, admin_note:note.trim() || null,
      resolved_at:status === "resolved" || status === "dismissed" ? new Date().toISOString() : null,
    }).eq("id",id).select("id").maybeSingle();
    if (error || !data) throw Error(error?.message || "Zápis zamítla databáze.");
    revalidatePath("/platform/feedback");
    return {ok:true,message:"Zpětná vazba aktualizována."};
  } catch(e) { return {ok:false,message:e instanceof Error ? e.message : "Neznámá chyba."}; }
}
