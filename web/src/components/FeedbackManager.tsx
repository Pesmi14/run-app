"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { updateFeedback } from "@/app/platform/feedback/actions";

type Item = Record<string, unknown>;
type FeedbackStatus = "new" | "in_progress" | "resolved" | "dismissed";
const S: Record<string,string> = {new:"Nové",in_progress:"Řeší se",resolved:"Vyřešeno",dismissed:"Zamítnuto"};
const R: Record<string,string> = {missing_race:"Chybějící závod",improvement:"Nápad na zlepšení",other:"Jiné"};
const field: React.CSSProperties = {border:"1px solid #e2e5e9",borderRadius:9,padding:"10px 12px",fontSize:13,background:"white",width:"100%"};
const card: React.CSSProperties = {background:"white",border:"1px solid #e5e7eb",borderRadius:12,padding:18};
const value = (v:unknown) => typeof v === "string" ? v : "";
const fmt = (v:unknown) => {const d=new Date(value(v));return Number.isNaN(d.valueOf()) ? "—" : d.toLocaleString("cs-CZ",{dateStyle:"medium",timeStyle:"short"});};
export default function FeedbackManager({initial}:{initial:Item[]}) {
  const [items,setItems] = useState(initial);
  const [statusFilter,setStatusFilter] = useState("all");
  const [reasonFilter,setReasonFilter] = useState("all");
  const [opened,setOpened] = useState<string|null>(null);
  const [draftStatus,setDraftStatus] = useState<FeedbackStatus>("new");
  const [note,setNote] = useState("");
  const [message,setMessage] = useState("");
  const [pending,start] = useTransition();
  const selected = items.find(x=>value(x.id)===opened);
  const filtered = useMemo(()=>items.filter(x=>(statusFilter==="all" || x.status===statusFilter) && (reasonFilter==="all" || x.reason===reasonFilter)),[items,statusFilter,reasonFilter]);
  const newCount=items.filter(x=>x.status==="new").length;
  function open(x:Item){setOpened(value(x.id));setDraftStatus((value(x.status)||"new") as FeedbackStatus);setNote(value(x.admin_note));setMessage("");}
  function save(status:FeedbackStatus=draftStatus){if(!selected)return;start(async()=>{
    const result=await updateFeedback(value(selected.id),status,note);
    setMessage(result.message);
    if(result.ok){setDraftStatus(status);setItems(prev=>prev.map(x=>x.id===selected.id?{...x,status,admin_note:note,resolved_at:["resolved","dismissed"].includes(status)?new Date().toISOString():null}:x));}
  });}
  return <div style={{display:"grid",gap:16,marginTop:24}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
      <div style={{fontWeight:700}}>Celkem: {items.length} · Nové: <strong style={{color:"#dc2626"}}>{newCount}</strong></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <select aria-label="Filtrovat podle statusu" style={{...field,width:"auto"}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">Všechny stavy</option>{Object.entries(S).map(([v,k])=><option key={v} value={v}>{k}</option>)}
        </select>
        <select aria-label="Filtrovat podle důvodu" style={{...field,width:"auto"}} value={reasonFilter} onChange={e=>setReasonFilter(e.target.value)}>
          <option value="all">Všechny důvody</option>{Object.entries(R).map(([v,k])=><option key={v} value={v}>{k}</option>)}
        </select>
      </div>
    </div>
    <div style={{...card,overflowX:"auto",padding:0}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:690}}><thead><tr style={{background:"#fafafa",textAlign:"left"}}>{["Datum","Uživatel","Důvod","Zpráva","Stav"].map(t=><th key={t} style={{padding:"14px 15px",color:"#667085"}}>{t}</th>)}</tr></thead>
        <tbody>{filtered.map(x=><tr key={value(x.id)} onClick={()=>open(x)} style={{borderTop:"1px solid #edf0f3",cursor:"pointer",background:opened===x.id?"#f0f6ff":undefined}}>
          <td style={{padding:14,whiteSpace:"nowrap"}}>{fmt(x.created_at)}</td>
          <td style={{padding:14}}>{value(x.username)||value(x.full_name)||"Uživatel"}</td>
          <td style={{padding:14,whiteSpace:"nowrap"}}>{R[value(x.reason)]||value(x.reason)}</td>
          <td style={{padding:14,maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value(x.message)}</td>
          <td style={{padding:14}}><span style={{background:x.status==="new"?"#fef2f2":"#f1f5f9",color:x.status==="new"?"#b91c1c":"#334155",borderRadius:20,padding:"5px 10px",fontWeight:700,whiteSpace:"nowrap"}}>{S[value(x.status)]||value(x.status)}</span></td>
        </tr>)}</tbody></table>
      {filtered.length===0 && <p style={{padding:24,color:"#667085"}}>Žádné záznamy pro vybrané filtry.</p>}
    </div>
    {selected && <section style={{...card,display:"grid",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><h2 style={{fontSize:20,fontWeight:750}}>Detail zpětné vazby</h2><button type="button" onClick={()=>setOpened(null)} style={{...field,width:"auto"}}>Zavřít</button></div>
      <p style={{fontSize:13,color:"#64748b"}}>{fmt(selected.created_at)} · {R[value(selected.reason)]||value(selected.reason)} · {value(selected.username)||value(selected.full_name)||"Uživatel"}</p>
      <div style={{padding:16,whiteSpace:"pre-wrap",overflowWrap:"anywhere",border:"1px solid #e5e7eb",borderRadius:9,fontSize:14}}>{value(selected.message)}</div>
      {selected.reason==="missing_race" && <Link href="/platform/races/new" style={{width:"fit-content",background:"#171717",color:"white",padding:"10px 14px",borderRadius:8,textDecoration:"none",fontSize:13}}>+ Přidat závod</Link>}
      <label style={{display:"grid",gap:5,fontSize:13}}>Status<select style={field} value={draftStatus} onChange={e=>setDraftStatus(e.target.value as FeedbackStatus)}>{Object.entries(S).map(([v,k])=><option key={v} value={v}>{k}</option>)}</select></label>
      <label style={{display:"grid",gap:5,fontSize:13}}>Interní poznámka<textarea style={{...field,minHeight:100}} maxLength={5000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Viditelné jen administrátorovi" /></label>
      {message && <p role="status" style={{fontSize:13,color:"#334155"}}>{message}</p>}
      <div style={{display:"flex",gap:9,flexWrap:"wrap"}}><button type="button" disabled={pending} onClick={()=>save()} style={{...field,width:"auto",background:"#171717",color:"white"}}>Uložit</button>
        <button type="button" disabled={pending} onClick={()=>save("in_progress")} style={{...field,width:"auto"}}>Začít řešit</button>
        <button type="button" disabled={pending} onClick={()=>save("resolved")} style={{...field,width:"auto"}}>Označit jako vyřešené</button>
        <button type="button" disabled={pending} onClick={()=>save("dismissed")} style={{...field,width:"auto"}}>Zamítnout</button></div>
    </section>}
  </div>;
}
