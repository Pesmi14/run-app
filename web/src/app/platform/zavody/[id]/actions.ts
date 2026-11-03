"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date=/^\d{4}-\d{2}-\d{2}$/;
const txt=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const nullable=(v:string)=>v||null;
const asDate=(v:string)=>v&&date.test(v)&&!Number.isNaN(Date.parse(v))?v:null;
const url=(v:string)=>{if(!v)return null;const u=new URL(v);if(!["https:","http:"].includes(u.protocol))throw Error("Odkaz musí být https:// nebo http://.");return v;};
function timestamp(s:string){
 if(!s)return null;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s))throw Error("Neplatné datum nebo čas.");
 const wall = new Date(s+":00Z");
 if(Number.isNaN(wall.valueOf()))throw Error("Neplatné datum nebo čas.");
 const tz = new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Prague",timeZoneName:"shortOffset"})
  .formatToParts(wall).find(x=>x.type==="timeZoneName")?.value??"GMT+1";
 const match=tz.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
 if(!match)throw Error("Nelze určit české časové pásmo.");
 const minutes=(Number(match[2])*60+Number(match[3]||0))*(match[1]==="+"?1:-1);
 return new Date(wall.getTime()-minutes*60000).toISOString();
}
async function admin(){const db=await createClient();const {data:{user},error}=await db.auth.getUser();if(error||!user||!process.env.ADMIN_USER_ID||user.id!==process.env.ADMIN_USER_ID)throw Error("Nemáš oprávnění.");return {db,user};}
function done(id:string,code:string){revalidatePath(`/platform/zavody/${id}`);revalidatePath("/platform/zavody");redirect(`/platform/zavody/${id}?done=${code}`);}
function fail(id:string,error:unknown){const message=error instanceof Error?error.message:"Neznámá chyba";redirect(`/platform/zavody/${id}?error=${encodeURIComponent(message.slice(0,220))}`);}
export async function editRace(form:FormData){const {db}=await admin();const id=txt(form,"race_id");if(!uuid.test(id))throw Error("Neplatné ID závodu.");try{
  const name=txt(form,"name");const start=asDate(txt(form,"start_date"));const end=asDate(txt(form,"end_date"));
  if(!name||!start || (txt(form,"end_date")&&!end) || (end&&end<start))throw Error("Zkontroluj název a datum závodu.");
  const status=txt(form,"status");if(!["draft","published","archived","cancelled","postponed"].includes(status))throw Error("Neplatný status.");
  const organizer=txt(form,"organizer_id");if(organizer&&!uuid.test(organizer))throw Error("Neplatný pořadatel.");
  const parent=txt(form,"parent_event_id");if(parent&&(!uuid.test(parent)||parent===id))throw Error("Neplatný nadřazený závod.");
  const payload={name,start_date:start,end_date:end,city:nullable(txt(form,"city")),region:nullable(txt(form,"region")),sport:txt(form,"sport")||"running",distance_text:nullable(txt(form,"distance_text")),website_url:url(txt(form,"website_url")),registration_url:url(txt(form,"registration_url")),organizer_id:organizer||null,parent_event_id:parent||null,status,registration_status:nullable(txt(form,"registration_status"))};
  const {data,error}=await db.from("races").update(payload).eq("id",id).select("id").maybeSingle();if(error||!data)throw Error(error?.message||"Nepodařilo se uložit závod.");
 }catch(e){fail(id,e);}done(id,"race");}
export async function editRoute(form:FormData){const {db}=await admin();const id=txt(form,"race_id");if(!uuid.test(id))throw Error("Neplatné ID závodu.");try{
  const routeId=txt(form,"route_id");if(routeId&&!uuid.test(routeId))throw Error("Neplatná trasa.");
  const name=txt(form,"label");if(!name)throw Error("Vyplň název trasy.");
  const km=txt(form,"distance_km").replace(",",".");const n=km?Number(km):null;if(n!==null&&(!Number.isFinite(n)||n<=0))throw Error("Neplatná vzdálenost.");
  const capacity=txt(form,"capacity");const registered=txt(form,"registered_count");
  for(const v of [capacity,registered])if(v&&(!/^\d+$/.test(v)||Number(v)>100000000))throw Error("Neplatná kapacita nebo počet přihlášených.");
  const eventDate=txt(form,"event_date");if(eventDate&&!asDate(eventDate))throw Error("Neplatné datum trasy.");
  const payload={label:name,distance_km:n,raw_text:nullable(txt(form,"raw_text")),event_date:eventDate||null,registration_status:nullable(txt(form,"registration_status")),capacity:capacity?Number(capacity):null,registered_count:registered?Number(registered):null,registration_url:url(txt(form,"registration_url"))};
  const q=routeId?db.from("race_distances").update(payload).eq("id",routeId).eq("race_id",id):db.from("race_distances").insert({...payload,race_id:id,data_source:"admin"});
  const {data,error}=await q.select("id").maybeSingle();if(error||!data)throw Error(error?.message||"Trasu se nepodařilo uložit.");
 }catch(e){fail(id,e);}done(id,"route");}
export async function editTier(form:FormData){const {db}=await admin();const id=txt(form,"race_id");if(!uuid.test(id))throw Error("Neplatné ID závodu.");try{
  const tid=txt(form,"tier_id");if(tid&&!uuid.test(tid))throw Error("Neplatná cena.");
  const routeId=txt(form,"race_distance_id");if(routeId&&!uuid.test(routeId))throw Error("Neplatná trasa.");
  if(routeId){const {data}=await db.from("race_distances").select("id").eq("id",routeId).eq("race_id",id).maybeSingle();if(!data)throw Error("Trasa nepatří tomuto závodu.");}
  const price=Number(txt(form,"price").replace(",","."));if(!Number.isFinite(price)||price<0||!txt(form,"price"))throw Error("Neplatná cena.");
  const from=timestamp(txt(form,"valid_from"));const until=timestamp(txt(form,"valid_until"));if(from&&until&&from>until)throw Error("Platnost od je po platnosti do.");
  const sort=txt(form,"sort_order");if(sort&&!/^-?\d+$/.test(sort))throw Error("Neplatné pořadí.");
  const payload={label:txt(form,"label")||"Startovné",race_distance_id:routeId||null,price,currency:txt(form,"currency")||"CZK",variant_label:nullable(txt(form,"variant_label")),phase_label:nullable(txt(form,"phase_label")),valid_from:from,valid_until:until,registration_limit:txt(form,"registration_limit")?Number(txt(form,"registration_limit")):null,sort_order:sort?Number(sort):0,note:nullable(txt(form,"note")),source_url:url(txt(form,"source_url")),status:txt(form,"price_status")||"upcoming"};
  const q=tid?db.from("race_price_tiers").update(payload).eq("id",tid).eq("race_id",id):db.from("race_price_tiers").insert({...payload,race_id:id,data_source:"admin"});
  const {data,error}=await q.select("id").maybeSingle();if(error||!data)throw Error(error?.message||"Cenu nelze uložit.");
 }catch(e){fail(id,e);}done(id,"price");}
export async function createOrganizer(form:FormData){const {db}=await admin();const id=txt(form,"race_id");if(!uuid.test(id))throw Error("Neplatné ID závodu.");try{
  const name=txt(form,"organizer_name");if(!name)throw Error("Název pořadatele je povinný.");
  const slug=txt(form,"organizer_slug").toLowerCase();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw Error("Slug musí obsahovat pouze malá písmena, čísla a pomlčky.");
  const {error}=await db.from("organizers").insert({name,slug});if(error)throw Error(error.message);
 }catch(e){fail(id,e);}done(id,"organizer");}

