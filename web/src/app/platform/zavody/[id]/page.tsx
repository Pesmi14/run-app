import Link from "next/link";
import { redirect } from "next/navigation";
import { editRace, editRoute, editTier, createOrganizer } from "./actions";
import { createClient } from "@/lib/supabase/server";
import PlatformContentShell from "@/components/PlatformContentShell";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date=/^\d{4}-\d{2}-\d{2}$/;
const txt=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const nullable=(v:string)=>v || null;
const asDate=(v:string)=>v && date.test(v) && !Number.isNaN(Date.parse(v))?v:null;
const url=(v:string)=>{if(!v)return null;const u=new URL(v);if(u.protocol!=="https:"&&u.protocol!=="http:")throw Error("Odkaz musí být https:// nebo http://.");return v;};
function timestamp(s:string){ if(!s)return null;const d=new Date(s);if(Number.isNaN(d.valueOf()))throw Error("Neplatné datum nebo čas.");return d.toISOString(); }
function dateInput(v:unknown){return typeof v==="string"?v.slice(0,10):"";}
function timeInput(v:unknown){
 if(!v || typeof v!=="string")return "";
 const d=new Date(v);if(Number.isNaN(d.getTime()))return "";
 const s=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Prague",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(d);
 return s.replace(" ","T");
}
const str=(v:unknown)=>v===null||v===undefined?"":String(v);
async function admin(){ const db=await createClient();const {data:{user},error}=await db.auth.getUser();if(error||!user)redirect("/login");if(!process.env.ADMIN_USER_ID||user.id!==process.env.ADMIN_USER_ID)redirect("/unauthorized");return {db,user}; }
const field:React.CSSProperties={padding:"10px 12px",border:"1px solid #d9dee5",borderRadius:8,background:"#fff",fontSize:13,minWidth:0,width:"100%"};
const label:React.CSSProperties={fontSize:12,fontWeight:650,color:"#64748b",display:"grid",gap:5};
const section:React.CSSProperties={background:"white",border:"1px solid #e5e7eb",borderRadius:12,padding:20,display:"grid",gap:15};
const grid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12};
const button:React.CSSProperties={padding:"10px 16px",borderRadius:8,background:"#171717",color:"white",fontWeight:650,fontSize:13,border:0,cursor:"pointer",width:"fit-content"};
const L=({title,children}:{title:string;children:React.ReactNode})=><label style={label}>{title}{children}</label>;

export default async function RaceDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{done?:string;error?:string}>}) {
 const {id}=await params; if(!uuid.test(id))redirect("/platform/zavody");
 const {db,user}=await admin();
 const [raceQuery,routesQuery,tiersQuery,organizerQuery]=await Promise.all([
  db.from("races").select("*").eq("id",id).maybeSingle(),
  db.from("race_distances").select("*").eq("race_id",id).order("created_at"),
  db.from("race_price_tiers").select("*").eq("race_id",id).order("sort_order"),
  db.from("organizers").select("id,name").order("name").limit(1000),
 ]);
 if(raceQuery.error||!raceQuery.data)redirect("/platform/zavody");
 const r=raceQuery.data as Record<string,unknown>;
 const routes=(routesQuery.data??[]) as Record<string,unknown>[];
 const tiers=(tiersQuery.data??[]) as Record<string,unknown>[];
 const organizers=(organizerQuery.data??[]) as {id:string;name:string}[];
 const qs=await searchParams;
 return <PlatformContentShell active="zavody" email={user.email||""}>
 <div style={{display:"grid",gap:20}}>
 <div><Link href="/platform/zavody" style={{fontSize:13,color:"#64748b"}}>← Zpět na závody</Link><h1 style={{fontSize:30,fontWeight:800,marginTop:10}}>{str(r.name)}</h1><p style={{color:"#64748b",fontSize:13}}>Editace závodu · {id}</p></div>
 {qs.done&&<p role="status" style={{padding:12,background:"#ecfdf5",borderRadius:8,color:"#166534"}}>✓ Uloženo ({qs.done}).</p>}
 {qs.error&&<p role="alert" style={{padding:12,background:"#fef2f2",borderRadius:8,color:"#991b1b"}}>Ukládání selhalo: {qs.error}</p>}
 {(routesQuery.error||tiersQuery.error||organizerQuery.error)&&<p style={{color:"#b91c1c"}}>Některá navázaná data se nepodařilo načíst. Před editací zkontroluj RLS: {[routesQuery.error?.message,tiersQuery.error?.message,organizerQuery.error?.message].filter(Boolean).join("; ")}</p>}
 <form action={editRace} style={section}><input type="hidden" name="race_id" value={id}/><h2 style={{fontSize:19,fontWeight:750}}>Základní informace</h2>
 <div style={grid}>
 <L title="Název *"><input style={field} name="name" required defaultValue={str(r.name)} /></L>
 <L title="Sport"><select style={field} name="sport" defaultValue={str(r.sport)||"running"}>{["running","trail","triathlon","cycling","obstacle","other"].map(v=><option value={v} key={v}>{v}</option>)}</select></L>
 <L title="Začátek *"><input style={field} type="date" name="start_date" required defaultValue={dateInput(r.start_date)}/></L>
 <L title="Konec"><input style={field} type="date" name="end_date" defaultValue={dateInput(r.end_date)}/></L>
 <L title="Město"><input style={field} name="city" defaultValue={str(r.city)}/></L>
 <L title="Kraj"><input style={field} name="region" defaultValue={str(r.region)}/></L>
 <L title="Pořadatel"><select style={field} name="organizer_id" defaultValue={str(r.organizer_id)}><option value="">— Bez vazby —</option>{organizers.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></L>
 <L title="Vzdálenosti (souhrn)"><input style={field} name="distance_text" defaultValue={str(r.distance_text)}/></L>
 <L title="Web"><input style={field} type="url" name="website_url" defaultValue={str(r.website_url)}/></L>
 <L title="Registrace"><input style={field} type="url" name="registration_url" defaultValue={str(r.registration_url)}/></L>
 <L title="Stav registrace"><select style={field} name="registration_status" defaultValue={str(r.registration_status)}>{["","open","closed","sold_out","not_open","unknown"].map(v=><option value={v} key={v}>{v||"—"}</option>)}</select></L>
 <L title="Publikace"><select style={field} name="status" defaultValue={str(r.status)}>{["draft","published","archived","cancelled","postponed"].map(v=><option value={v} key={v}>{v}</option>)}</select></L>
 <L title="Nadřazený závod (UUID)"><input style={field} name="parent_event_id" defaultValue={str(r.parent_event_id)} placeholder="Prázdné = hlavní závod"/></L>
 </div><p style={{fontSize:12,color:"#64748b"}}>`parent_event_id` propojuje samostatné podzávody. Jednotlivé trasy zůstávají v `race_distances`. Přehled registrací se dopočítává a neupravuje se přímo.</p><button style={button}>Uložit závod</button></form>
 <section style={section}><h2 style={{fontSize:19,fontWeight:750}}>Pořadatelé</h2><form action={createOrganizer} style={{...grid,alignItems:"end"}}><input type="hidden" name="race_id" value={id}/><L title="Nový pořadatel"><input style={field} name="organizer_name" required placeholder="Jméno pořadatele"/></L><L title="Slug"><input style={field} name="organizer_slug" required placeholder="nazev-poradatele"/></L><button style={button}>+ Přidat pořadatele</button></form></section>
 <section style={section}><h2 style={{fontSize:19,fontWeight:750}}>Trasy ({routes.length})</h2>
 {[...routes,{id:"",label:"",distance_km:null,raw_text:null,event_date:null,registration_status:null,capacity:null,registered_count:null,registration_url:null}].map((route,index)=><form key={str(route.id)||"new"} action={editRoute} style={{display:"grid",gap:11,borderTop:"1px solid #e5e7eb",paddingTop:16}}><input type="hidden" name="race_id" value={id}/>
 <input type="hidden" name="route_id" value={str(route.id)}/><strong style={{fontSize:14}}>{route.id?`Trasa ${index+1}`:"+ Přidat trasu"}</strong>
 <div style={grid}><L title="Název trasy *"><input style={field} name="label" defaultValue={str(route.label)} required/></L><L title="Km"><input style={field} name="distance_km" type="number" min="0.001" step="any" defaultValue={str(route.distance_km)}/></L>
 <L title="Původní text"><input style={field} name="raw_text" defaultValue={str(route.raw_text)}/></L><L title="Datum trasy"><input style={field} type="date" name="event_date" defaultValue={dateInput(route.event_date)}/></L>
 <L title="Stav registrace"><select name="registration_status" style={field} defaultValue={str(route.registration_status)}>{["","open","closed","sold_out","not_open","unknown"].map(v=><option value={v} key={v}>{v||"—"}</option>)}</select></L>
 <L title="Kapacita"><input style={field} type="number" min="0" name="capacity" defaultValue={str(route.capacity)}/></L><L title="Přihlášení"><input style={field} type="number" min="0" name="registered_count" defaultValue={str(route.registered_count)}/></L><L title="Registrační odkaz"><input style={field} type="url" name="registration_url" defaultValue={str(route.registration_url)}/></L></div><button style={button}>{route.id?"Uložit trasu":"+ Vytvořit trasu"}</button></form>)}
 </section>
 <section style={section}><h2 style={{fontSize:19,fontWeight:750}}>Startovné ({tiers.length})</h2>
 {[...tiers,{id:"",label:"",race_distance_id:null,price:"",currency:"CZK",variant_label:null,phase_label:null,valid_from:null,valid_until:null,sort_order:0,note:null,source_url:null,status:"upcoming"}].map((tier,index)=><form key={str(tier.id)||"new"} action={editTier} style={{display:"grid",gap:11,borderTop:"1px solid #e5e7eb",paddingTop:16}}><input type="hidden" name="race_id" value={id}/>
 <input type="hidden" name="tier_id" value={str(tier.id)}/><strong style={{fontSize:14}}>{tier.id?`Cena ${index+1}`:"+ Přidat cenu"}</strong>
 <div style={grid}><L title="Název"><input style={field} name="label" defaultValue={str(tier.label)}/></L>
 <L title="Trasa"><select style={field} name="race_distance_id" defaultValue={str(tier.race_distance_id)}><option value="">Celý závod</option>{routes.map(route=><option value={str(route.id)} key={str(route.id)}>{str(route.label)}</option>)}</select></L>
 <L title="Cena *"><input style={field} type="number" min="0" step="0.01" required name="price" defaultValue={str(tier.price)}/></L>
 <L title="Měna"><input style={field} name="currency" defaultValue={str(tier.currency)||"CZK"}/></L>
 <L title="Varianta"><input style={field} name="variant_label" defaultValue={str(tier.variant_label)}/></L>
 <L title="Cenová fáze"><input style={field} name="phase_label" defaultValue={str(tier.phase_label)}/></L>
 <L title="Platnost od"><input style={field} name="valid_from" type="datetime-local" defaultValue={timeInput(tier.valid_from)}/></L>
 <L title="Platnost do"><input style={field} name="valid_until" type="datetime-local" defaultValue={timeInput(tier.valid_until)}/></L>
 <L title="Limit registrací"><input style={field} name="registration_limit" type="number" min="0" defaultValue={str(tier.registration_limit)}/></L>
 <L title="Pořadí"><input style={field} name="sort_order" type="number" defaultValue={str(tier.sort_order)}/></L>
 <L title="Stav ceny"><select style={field} name="price_status" defaultValue={str(tier.status)||"upcoming"}>{["upcoming","active","expired","sold_out"].map(v=><option value={v} key={v}>{v}</option>)}</select></L>
 <L title="Zdroj URL"><input style={field} type="url" name="source_url" defaultValue={str(tier.source_url)}/></L>
 <L title="Poznámka"><input style={field} name="note" defaultValue={str(tier.note)}/></L>
 </div><button style={button}>{tier.id?"Uložit cenu":"+ Vytvořit cenu"}</button></form>)}
 </section>
 </div></PlatformContentShell>;
}
