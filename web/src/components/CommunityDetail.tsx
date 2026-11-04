"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { saveRun, setRunActive, deleteRun, decideEventRequest } from "@/app/platform/komunita/actions";
import styles from "./CommunityDetail.module.css";

type Row = Record<string, unknown>;
type Kind = "runclubs" | "events" | "competitions";
const str = (x: unknown) => typeof x === "string" ? x : "";
const format = (x: unknown) => x ? new Date(String(x)).toLocaleString("cs-CZ", { dateStyle: "medium", timeStyle: "short" }) : "—";
function inputDate(x: unknown) {
  if (!x) return "";
  const d = new Date(String(x));
  return Number.isNaN(d.getTime()) ? "" : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
const label = (row: Row) => str(row.full_name) || str(row.username) || str(row.user_id);

function RunForm({club, run, finish, report}:{club:Row;run:Row|null;finish:()=>void;report:(message:string)=>void}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [error, setError] = useState("");
  return <form className={styles.editor} onSubmit={e=>{
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    for (const field of ["starts_at", "ends_at"]) {
      const v=String(f.get(field)||""); if(v)f.set(field,new Date(v).toISOString());
    }
    start(async()=>{
      const result=await saveRun(f);
      if(result.ok){finish();report(result.message);router.refresh();}
      else setError(result.message);
    });
  }}>
    <input type="hidden" name="runclub_id" value={str(club.id)}/>
    <input type="hidden" name="id" value={str(run?.id)}/>
    <div className={styles.formHead}><h3>{run ? "Upravit výběh" : "Nový výběh"}</h3><button type="button" onClick={finish} aria-label="Zavřít"><X size={17}/></button></div>
    <div className={styles.fields}>
      <label>Název<input name="title" maxLength={180} defaultValue={str(run?.title)} required/></label>
      <label>Město<input name="city" defaultValue={str(run?.city)||str(club.city)}/></label>
      <label>Datum a čas výběhu<input name="starts_at" type="datetime-local" defaultValue={inputDate(run?.starts_at)} required/></label>
      <label>Konec (nepovinné)<input name="ends_at" type="datetime-local" defaultValue={inputDate(run?.ends_at)}/></label>
      <label>Místo srazu<input name="meeting_point" defaultValue={str(run?.meeting_point)}/></label>
      <label>Vzdálenost (km)<input name="distance_km" type="number" min="0.01" step="0.01" defaultValue={run?.distance_km==null?"":String(run.distance_km)}/></label>
      <label>Kapacita (nepovinné)<input name="capacity" type="number" min="1" step="1" defaultValue={run?.capacity==null?"":String(run.capacity)}/></label>
    </div>
    <label className={styles.full}>Popis<textarea name="description" rows={4} defaultValue={str(run?.description)}/></label>
    <label className={styles.check}><input type="checkbox" name="is_active" value="true" defaultChecked={run ? run.is_active===true : true}/> Aktivní výběh</label>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.actions}><button className={styles.primary} disabled={pending}><Save size={15}/> {pending ? "Ukládám…" : "Uložit výběh"}</button></div>
  </form>;
}

export default function CommunityDetail({kind,item,runs=[],requests=[],participants=[],counts={},initialNew=false}:{kind:Kind;item:Row;runs?:Row[];requests?:Row[];participants?:Row[];counts?:Record<string,number>;initialNew?:boolean}) {
  const [editing,setEditing]=useState<string|null>(initialNew && kind === "runclubs" ? "new" : null);
  const [message,setMessage]=useState("");
  const [busy,start]=useTransition();
  const router=useRouter();
  function runAction(fn:()=>Promise<{ok:boolean;message:string}>){start(async()=>{
    try {const r=await fn();setMessage(r.message);if(r.ok)router.refresh();}
    catch(e){setMessage(e instanceof Error?e.message:"Operace selhala.");}
  });}
  const id=str(item.id);
  const name=str(kind==="runclubs"?item.name:item.title);
  const ended = item.ends_at && new Date(String(item.ends_at)).getTime() <= Date.now();
  return <div className={styles.root}>
    <Link className={styles.back} href={`/platform/komunita?sekce=${kind}`}><ArrowLeft size={16}/> Zpět na {kind==="runclubs"?"Runcluby":kind==="events"?"Eventy":"Soutěže"}</Link>
    <div className={styles.heading}><div><h2>{name}</h2><p>{str(item.city) || "Město neuvedeno"} · {item.is_active ? "Aktivní" : "Skryté"}</p></div>
      {kind==="competitions" && <strong className={ended?styles.ended:styles.status}>{ended?"Soutěž skončila":item.is_active?"Probíhá / naplánována":"Neaktivní"}</strong>}
    </div>
    {message && <div role="status" className={styles.notice}>{message}<button type="button" onClick={()=>setMessage("")}><X size={15}/></button></div>}
    {kind==="runclubs" && <>
      <div className={styles.sectionHead}><h3>Výběhy runclubu <span>{runs.length}</span></h3><button className={styles.primary} onClick={()=>setEditing("new")}><Plus size={16}/> Přidat výběh</button></div>
      {editing==="new" && <RunForm club={item} run={null} finish={()=>setEditing(null)} report={setMessage}/>}
      <div className={styles.list}>{runs.length===0 && <p className={styles.empty}>Runclub zatím nemá žádné výběhy.</p>}{runs.map(run=><div className={styles.row} key={str(run.id)}>
        <div className={styles.rowTop}><div><strong>{str(run.title)}</strong><p>{format(run.starts_at)} · {str(run.meeting_point)||str(run.city)||"Místo neuvedeno"}{run.distance_km!=null?` · ${run.distance_km} km`:""}</p><small>{run.is_active?"Aktivní":"Neaktivní"} · Účastníků: {counts[str(run.id)]||0}</small></div>
        <div className={styles.buttons}><button title="Upravit" onClick={()=>setEditing(editing===str(run.id)?null:str(run.id))}><Pencil size={16}/></button><button disabled={busy} title={run.is_active?"Deaktivovat":"Aktivovat"} onClick={()=>runAction(()=>setRunActive(str(run.id),id,run.is_active!==true))}>{run.is_active?<X size={16}/>:<Check size={16}/>}</button><button disabled={busy} title="Smazat" onClick={()=>{if(window.confirm("Smazat tento výběh?"))runAction(()=>deleteRun(str(run.id),id));}}><Trash2 size={16}/></button></div></div>
        {editing===str(run.id)&&<RunForm club={item} run={run} finish={()=>setEditing(null)} report={setMessage}/>}
      </div>)}</div>
    </>}
    {kind==="events" && <>
      <div className={styles.sectionHead}><h3>Žádosti o účast <span>{requests.length}</span></h3></div>
      <div className={styles.stats}><div>Čekající<strong>{requests.filter(x=>x.status==="pending").length}</strong></div><div>Schválené<strong>{requests.filter(x=>x.status==="approved").length}</strong></div><div>Zamítnuté<strong>{requests.filter(x=>x.status==="rejected").length}</strong></div></div>
      <div className={styles.list}>{requests.length===0 && <p className={styles.empty}>Zatím nikdo nepožádal o účast.</p>}{requests.map(req=><div className={styles.row} key={str(req.id)}><div className={styles.rowTop}><div><strong>{label(req)}</strong><p>{format(req.created_at)}</p><small>Stav: {req.status==="pending"?"Čeká":req.status==="approved"?"Schváleno":"Zamítnuto"}</small></div>{req.status==="pending" && <div className={styles.buttons}><button disabled={busy} onClick={()=>runAction(()=>decideEventRequest(str(req.id),id,"approved"))} title="Schválit"><Check size={17}/> Schválit</button><button disabled={busy} onClick={()=>runAction(()=>decideEventRequest(str(req.id),id,"rejected"))} title="Zamítnout"><X size={17}/> Zamítnout</button></div>}</div></div>)}</div>
    </>}
    {kind==="competitions" && <>
      <div className={styles.stats}><div>Přihlášení<strong>{participants.length}</strong></div><div>Datum konce<strong className={styles.dateValue}>{format(item.ends_at)}</strong></div><div>Stav<strong className={styles.dateValue}>{ended?"Ukončena":item.is_active?"Aktivní":"Neaktivní"}</strong></div></div>
      <p className={styles.help}>Datum konce, pravidla a další informace upravíš v seznamu soutěží tlačítkem Upravit.</p>
      <div className={styles.sectionHead}><h3>Přihlášení uživatelé</h3></div>
      <div className={styles.list}>{participants.length===0 && <p className={styles.empty}>Zatím nikdo není přihlášený.</p>}{participants.map(p=><div className={styles.row} key={str(p.id)}><div className={styles.rowTop}><div><strong>{label(p)}</strong><p>{format(p.created_at)}</p></div></div></div>)}</div>
    </>}
  </div>;
}
