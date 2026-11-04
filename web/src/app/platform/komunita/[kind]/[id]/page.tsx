import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlatformContentShell from "@/components/PlatformContentShell";
import CommunityDetail from "@/components/CommunityDetail";

export const dynamic = "force-dynamic";
type Kind = "runclubs" | "events" | "competitions";
const tables: Record<Kind,string> = { runclubs: "runclubs", events: "community_events", competitions: "competitions" };
type R = Record<string,unknown>;
const val = (v:unknown)=>typeof v==="string"?v:"";

export default async function CommunityDetailPage({params,searchParams}:{params:Promise<{kind:string;id:string}>;searchParams:Promise<{new?:string}>}) {
  const {kind,id}=await params;
  const query=await searchParams;
  if(!(kind in tables) || !/^[\da-f]{8}-[\da-f-]{27,}$/i.test(id)) notFound();
  const k=kind as Kind;
  const db=await createClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user) redirect("/login");
  if(!process.env.ADMIN_USER_ID||user.id!==process.env.ADMIN_USER_ID) redirect("/unauthorized");
  const {data:item,error:readError}=await db.from(tables[k]).select("*").eq("id",id).maybeSingle();
  if(readError) throw new Error(`Načítání detailu: ${readError.message}`);
  if(!item) notFound();
  let runs:R[]=[];let requests:R[]=[];let participants:R[]=[];
  const counts:Record<string,number>={};
  if(k==="runclubs") {
    const {data,error}=await db.from("runclub_runs").select("*").eq("runclub_id",id).order("starts_at",{ascending:true});
    if(error) throw new Error(`Výběhy: ${error.message}`);
    runs=(data||[]) as R[];
    const ids=runs.map(r=>val(r.id));
    if(ids.length){
      const {data:entries,error:e}=await db.from("runclub_run_participants").select("run_id").in("run_id",ids);
      if(e) throw new Error(`Účastníci výběhů: ${e.message}`);
      for(const p of entries||[]) counts[p.run_id]=(counts[p.run_id]||0)+1;
    }
  }
  if(k==="events") {
    const {data,error}=await db.from("community_event_requests").select("*").eq("event_id",id).order("created_at",{ascending:false});
    if(error) throw new Error(`Žádosti: ${error.message}`);
    requests=(data||[]) as R[];
  }
  if(k==="competitions") {
    const {data,error}=await db.from("competition_entries").select("*").eq("competition_id",id).order("created_at",{ascending:false});
    if(error) throw new Error(`Přihlášky: ${error.message}`);
    participants=(data||[]) as R[];
  }
  const all=[...requests,...participants];
  const userIds=[...new Set(all.map(row=>val(row.user_id)).filter(Boolean))];
  if(userIds.length){
    const {data:profiles,error}=await db.from("user_profiles").select("user_id,username,full_name").in("user_id",userIds);
    if(error) console.warn("Sprintuy: profily účastníků nejsou dostupné, použiji ID.", error.message);
    const indexed=new Map((profiles||[]).map(p=>[p.user_id,p]));
    requests=requests.map(p=>({...p,...(indexed.get(val(p.user_id))||{})}));
    participants=participants.map(p=>({...p,...(indexed.get(val(p.user_id))||{})}));
  }
  return <PlatformContentShell active="komunita" email={user.email||""}>
    <div className="dashboard-heading"><span className="eyebrow">SPRINTUY / KOMUNITA</span><h1>{k==="runclubs"?"Runclub":k==="events"?"Event":"Soutěž"}</h1></div>
    <CommunityDetail kind={k} item={item as R} runs={runs} requests={requests} participants={participants} counts={counts} initialNew={query.new === "1"}/>
  </PlatformContentShell>;
}
