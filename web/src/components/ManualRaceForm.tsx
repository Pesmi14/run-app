"use client";

import { useState, type CSSProperties } from "react";

type Route = { id: number; label: string; km: string; price: string; valid_until: string; registration_url: string };
let sequence = 0;
const blank = (): Route => ({id:++sequence,label:"",km:"",price:"",valid_until:"",registration_url:""});
const field: CSSProperties = {width:"100%",padding:"10px 12px",border:"1px solid #d5dbe2",borderRadius:8,background:"white",fontSize:14,boxSizing:"border-box"};
const label: CSSProperties = {display:"grid",gap:5,fontSize:12,fontWeight:600,color:"#64748b"};

export default function ManualRaceForm({action}:{action:(form:FormData)=>void | Promise<void>}) {
  const [routes,setRoutes] = useState<Route[]>([blank()]);
  const update = (id:number,key:keyof Omit<Route,"id">,value:string) => setRoutes(prev=>prev.map(r=>r.id===id?{...r,[key]:value}:r));
  const validRoutes = routes.filter(r=>r.label.trim());
  return <form action={action} style={{display:"grid",gap:16,marginTop:18}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
      <label style={label}>Název závodu *<input name="name" required maxLength={180} style={field} placeholder="Např. Jarní běh Libercem"/></label>
      <label style={label}>Datum konání *<input name="start_date" type="date" required style={field}/></label>
      <label style={label}>Město<input name="city" style={field} placeholder="Liberec"/></label>
      <label style={label}>Kraj<input name="region" style={field} placeholder="Liberecký kraj"/></label>
      <label style={label}>Pořadatel<input name="organizer_name" style={field} placeholder="Název pořadatele"/></label>
      <label style={label}>Web závodu<input name="website_url" type="url" style={field} placeholder="https://..."/></label>
      <label style={label}>Registrační odkaz (pro celý závod)<input name="registration_url" type="url" style={field} placeholder="https://..."/></label>
    </div>
    <div style={{borderTop:"1px solid #e5e7eb",paddingTop:16}}>
      <strong style={{fontSize:15}}>Trasy a startovné</strong>
      <p style={{fontSize:13,color:"#667085"}}>Můžeš přidat více tras. Datum platnosti a cena jsou volitelné; další cenové vlny doplníš ve správě závodů.</p>
      <div style={{display:"grid",gap:9}}>{routes.map(r=><div key={r.id} style={{display:"grid",gridTemplateColumns:"minmax(160px,2fr) minmax(90px,1fr) minmax(100px,1fr) minmax(135px,1fr) minmax(180px,2fr) 38px",gap:8,alignItems:"end",padding:10,border:"1px solid #e5e7eb",borderRadius:9,overflowX:"auto"}}>
        <label style={label}>Trasa / kategorie<input style={field} placeholder="5 km / Dětské běhy" value={r.label} onChange={e=>update(r.id,"label",e.target.value)}/></label>
        <label style={label}>Délka (km)<input style={field} inputMode="decimal" placeholder="5" value={r.km} onChange={e=>update(r.id,"km",e.target.value)}/></label>
        <label style={label}>Cena (Kč)<input style={field} inputMode="decimal" placeholder="790" value={r.price} onChange={e=>update(r.id,"price",e.target.value)}/></label>
        <label style={label}>Cena platí do<input type="date" style={field} value={r.valid_until} onChange={e=>update(r.id,"valid_until",e.target.value)}/></label>
        <label style={label}>Registrace trasy<input type="url" style={field} placeholder="https://..." value={r.registration_url} onChange={e=>update(r.id,"registration_url",e.target.value)}/></label>
        <button type="button" title="Odebrat trasu z formuláře" onClick={()=>setRoutes(old=>old.filter(x=>x.id!==r.id))} style={{...field,color:"#dc2626",cursor:"pointer"}}>×</button>
      </div>)}</div>
      <button type="button" onClick={()=>setRoutes(old=>[...old,blank()])} style={{marginTop:12,padding:"9px 12px",background:"#fff",border:"1px solid #d1d5db",borderRadius:8,cursor:"pointer"}}>+ Přidat trasu</button>
    </div>
    <input type="hidden" name="routes" value={JSON.stringify(validRoutes)}/>
    <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:12}}>
      <span style={{fontSize:13,color:"#667085"}}>Stav po uložení: <strong>Draft</strong></span>
      <button type="submit" style={{padding:"12px 18px",border:0,borderRadius:9,background:"#171717",color:"white",fontWeight:700,cursor:"pointer"}}>+ Vytvořit závod jako Draft</button>
    </div>
  </form>;
}
