"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, ExternalLink, Plus, Search, Trash2, Save, Flag, Pencil } from "lucide-react";
import { saveRoute, saveTier, deleteRoute, deleteTier, deleteSelectedTiers, setRaceStatus, updateRaceDetails, deleteRace, type ActionResult } from "@/app/platform/zavody/actions";
import styles from "./RacesManager.module.css";

type Row = Record<string, unknown>;
const val = (x: unknown) => x == null ? "" : String(x);
const shown = (x: unknown, fallback = "—") => val(x) || fallback;
const monthKey = (v: unknown) => /^\d{4}-\d{2}/.test(val(v)) ? val(v).slice(0,7) : "unknown";
const monthName = (k: string) => k === "unknown" ? "Bez data" : new Intl.DateTimeFormat("cs-CZ", {month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(k + "-01T12:00:00Z"));
const dateLabel = (x: unknown) => /^\d{4}-\d{2}-\d{2}/.test(val(x)) ? `${val(x).slice(8,10)}.${val(x).slice(5,7)}.${val(x).slice(0,4)}` : "Bez data";
function pragueDate(x: unknown) {
  if (!x) return "";
  const d = new Date(val(x));
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("sv-SE", {timeZone:"Europe/Prague",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
}
function safeUrl(s: unknown) { try { const u = new URL(val(s)); return ["http:","https:"].includes(u.protocol) ? u.href : null; } catch { return null; } }
const localToday = () => new Intl.DateTimeFormat("sv-SE", {timeZone:"Europe/Prague",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

function Feedback({ value }: { value: ActionResult | null }) {
  return value ? <span role={value.ok ? "status" : "alert"} className={value.ok ? styles.actionSuccess : styles.rowError}>{value.message}</span> : null;
}
function useSave(onSuccess: (message: string) => void) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  function perform(fn: () => Promise<ActionResult>) {
    setFeedback(null);
    start(async () => {
      try {
        const r = await fn(); setFeedback(r);
        if (r.ok) { onSuccess(r.message); router.refresh(); }
      } catch(e) { setFeedback({ok:false,message: e instanceof Error ? e.message : "Chyba spojení."}); }
    });
  }
  return { pending, feedback, perform };
}
function PriceLine({ race, tier, routeId, routes, onSuccess, onCancel, checked, onCheckedChange, bulkPending }: {
  race: Row; tier?: Row; routeId: string; routes: Row[];
  onSuccess: (message: string) => void; onCancel?: () => void;
  checked?: boolean; onCheckedChange?: (value: boolean) => void; bulkPending?: boolean;
}) {
  const { pending, feedback, perform } = useSave(onSuccess);
  const registration = val(tier?.registration_url) ||
    val(routes.find(r => val(r.id) === routeId)?.registration_url) || val(race.registration_url);
  return <div className={`${styles.priceLineWrap} ${checked ? styles.selectedPriceLine : ""}`}>
    <form className={styles.simplePriceRow} onSubmit={e => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      perform(() => saveTier(data));
    }}>
      {tier && <label className={styles.bulkCheckbox} title="Označit cenovou vlnu ke smazání">
        <input type="checkbox" aria-label={`Označit ke smazání: ${shown(tier.label, "Cena")} ${shown(tier.price)} Kč`} checked={!!checked} disabled={!!bulkPending} onChange={e => onCheckedChange?.(e.target.checked)} />
      </label>}
      {!tier && <span className={styles.bulkCheckboxSpacer} />}
      <input type="hidden" name="race_id" value={val(race.id)} />
      <input type="hidden" name="tier_id" value={val(tier?.id)} />
      <input type="hidden" name="label" value={val(tier?.label) || "Startovné"} />
      <input type="hidden" name="valid_from" value={pragueDate(tier?.valid_from)} />
      <input type="hidden" name="audience_label" value={val(tier?.audience_label)} />
      <label className={styles.simpleField}>
        <span>Trasa</span>
        <select name="route_id" defaultValue={routeId}>
          <option value="">Obecné startovné</option>
          {routes.map(r => <option key={val(r.id)} value={val(r.id)}>{shown(r.label)}</option>)}
        </select>
      </label>
      <label className={styles.simpleField}><span>Cena (Kč)</span>
        <input name="price" type="number" min="0" step="any" required defaultValue={val(tier?.price)} placeholder="790" />
      </label>
      <label className={styles.simpleField}><span>Platí do</span>
        <input name="valid_until" type="date" defaultValue={pragueDate(tier?.valid_until)} />
      </label>
      <label className={styles.simpleField}><span>Odkaz na registraci</span>
        <input name="registration_url" type="url" defaultValue={registration} placeholder="https://..." />
      </label>
      <div className={styles.simpleActions}>
        <button type="submit" className={styles.simpleSave} disabled={pending} title="Uložit cenovou vlnu" aria-label="Uložit cenovou vlnu"><Save size={15}/></button>
        {tier && <button type="button" className={styles.deleteButton} disabled={pending} title="Smazat cenu" aria-label="Smazat cenu" onClick={() => {
          if (confirm("Opravdu smazat tuto cenovou vlnu?")) perform(() => deleteTier(val(race.id), val(tier.id)));
        }}><Trash2 size={15}/></button>}
        {onCancel && <button type="button" className={styles.simpleCancel} disabled={pending} onClick={onCancel} aria-label="Zrušit" title="Zrušit">×</button>}
      </div>
    </form>
    <Feedback value={feedback}/>
  </div>;
}
function Editor({ race, distances, prices }: { race: Row; distances: Row[]; prices: Row[] }) {
  const [addingPrice, setAddingPrice] = useState(false);
  const [addingRoute, setAddingRoute] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { pending: bulkPending, feedback: bulkFeedback, perform: performBulk } = useSave(message => {
    setNotice(message);
    setSelected([]);
  });
  const existingIds = prices.map(p => val(p.id));
  const selectedIds = selected.filter(id => existingIds.includes(id));
  const allSelected = existingIds.length > 0 && selectedIds.length === existingIds.length;
  function removeSelected() {
    const ids = [...selectedIds];
    if (!ids.length || bulkPending) return;
    if (!confirm(`Opravdu nenávratně smazat ${ids.length} označených cenových vln? Trasy a závod zůstanou zachované.`)) return;
    performBulk(() => deleteSelectedTiers(val(race.id), ids));
  }
  const { pending, feedback, perform } = useSave(message => { setNotice(message); setAddingRoute(false); });
  const routeIds = new Set(distances.map(d => val(d.id)));
  const sortedPrices = [...prices].sort((a, b) => {
    const nameA = val(distances.find(d => val(d.id) === val(a.race_distance_id))?.label);
    const nameB = val(distances.find(d => val(d.id) === val(b.race_distance_id))?.label);
    return nameA.localeCompare(nameB, "cs") || val(a.valid_until).localeCompare(val(b.valid_until));
  });
  return <div className={styles.simpleEditor}>
    {notice && <div className={styles.success} role="status">{notice}</div>}
    <div className={styles.bulkToolbar}>
      <div className={styles.simpleEditorHeading}>Trasa <span>·</span> cena <span>·</span> platí do <span>·</span> registrace</div>
      {existingIds.length > 0 && <div className={styles.bulkControls}>
        <label className={styles.bulkSelectAll}>
          <input type="checkbox" checked={allSelected} disabled={bulkPending} onChange={e => setSelected(e.target.checked ? existingIds : [])} />
          Vybrat vše
        </label>
        <button type="button" className={styles.bulkDeleteButton} disabled={!selectedIds.length || bulkPending} onClick={removeSelected}>
          <Trash2 size={14}/> {bulkPending ? "Mažu…" : `Smazat označené (${selectedIds.length})`}
        </button>
      </div>}
    </div>
    {sortedPrices.map(t => <PriceLine key={val(t.id)} race={race} tier={t}
      routeId={routeIds.has(val(t.race_distance_id)) ? val(t.race_distance_id) : ""}
      routes={distances} onSuccess={message => { setNotice(message); setSelected(s => s.filter(id => id !== val(t.id))); }}
      checked={selectedIds.includes(val(t.id))}
      onCheckedChange={yes => setSelected(old => yes ? [...new Set([...old, val(t.id)])] : old.filter(id => id !== val(t.id)))}
      bulkPending={bulkPending}/>) }
    {addingPrice && <PriceLine race={race} routeId={distances.length === 1 ? val(distances[0].id) : ""}
      routes={distances} onSuccess={s => { setNotice(s); setAddingPrice(false); }} onCancel={() => setAddingPrice(false)}/>}
    {!prices.length && !addingPrice && <p className={styles.simpleEmpty}>Zatím bez cen. Přidej první řádek.</p>}
    <div className={styles.simpleToolbar}>
      <button type="button" className={styles.secondaryButton} onClick={() => setAddingPrice(v => !v)}><Plus size={14}/> Přidat řádek</button>
      <button type="button" className={styles.secondaryButton} onClick={() => setAddingRoute(v => !v)}><Plus size={14}/> Přidat trasu</button>
    </div>
    {addingRoute && <form className={styles.simpleAddRoute} onSubmit={e => {
      e.preventDefault(); const data = new FormData(e.currentTarget); perform(() => saveRoute(data));
    }}>
      <input type="hidden" name="race_id" value={val(race.id)}/>
      <input name="label" required placeholder="Název trasy, např. 10 km nebo dětské běhy" aria-label="Název nové trasy" />
      <button type="submit" disabled={pending} className={styles.simpleSave}><Save size={15}/><span>Vytvořit</span></button>
    </form>}
    {distances.length > 0 && <details className={styles.simpleRouteDetails}>
      <summary>Spravovat názvy / mazat trasy</summary>
      {distances.map(route => <form key={val(route.id)} className={styles.simpleRouteRow} onSubmit={e => {
        e.preventDefault(); const data = new FormData(e.currentTarget); perform(() => saveRoute(data));
      }}>
        <input type="hidden" name="race_id" value={val(race.id)}/>
        <input type="hidden" name="route_id" value={val(route.id)}/>
        <input type="hidden" name="distance_km" value={val(route.distance_km)}/>
        <input type="hidden" name="registration_url" value={val(route.registration_url)}/>
        <input name="label" aria-label="Název trasy" defaultValue={val(route.label)} required/>
        <button type="submit" className={styles.simpleSave} disabled={pending} title="Uložit název"><Save size={15}/></button>
        <button type="button" className={styles.deleteButton} disabled={pending} title="Smazat trasu a její ceny" onClick={() => {
          const related = prices.filter(t => val(t.race_distance_id) === val(route.id)).length;
          if (confirm(`Smazat trasu „${shown(route.label)}“${related ? ` včetně ${related} cenových vln` : ""}? Tuto akci nelze vrátit.`)) perform(() => deleteRoute(val(race.id), val(route.id)));
        }}><Trash2 size={15}/></button>
      </form>)}
    </details>}
    <Feedback value={feedback}/>
    <Feedback value={bulkFeedback}/>
  </div>;
}
function StatusSelect({race}:{race:Row}) {
  const router=useRouter(); const [status,setStatus]=useState(val(race.status)); const {pending,feedback,perform}=useSave(()=>router.refresh());
  return <div className={styles.inlineStatus}><select value={status} disabled={pending} aria-label={`Stav ${val(race.name)}`} onChange={e=>{
    const next=e.target.value; const old=status;setStatus(next);perform(async()=>{const r=await setRaceStatus(val(race.id),next);if(!r.ok)setStatus(old);return r;});
  }}>{!["published","archived"].includes(status)&&<option value={status}>{status}</option>}<option value="published">Published</option><option value="archived">Archived</option></select><Feedback value={feedback}/></div>;
}
function RaceRow({ race, distances, prices, expanded, onToggle }: {
  race: Row; distances: Row[]; prices: Row[]; expanded: boolean; onToggle: () => void;
}) {
  const { pending, feedback, perform } = useSave(() => {});
  const id = val(race.id);
  const editName = () => {
    const next = window.prompt("Upravit název závodu:", val(race.name));
    if (next === null || next.trim() === val(race.name)) return;
    perform(() => updateRaceDetails(id, "name", next));
  };
  const editUrl = (field: "website_url" | "registration_url") => {
    const next = window.prompt(field === "website_url" ? "Web závodu (https://…):" : "Odkaz na registraci (https://…):", val(race[field]));
    if (next === null || next.trim() === val(race[field])) return;
    perform(() => updateRaceDetails(id, field, next));
  };
  const remove = () => {
    if (!window.confirm(`TRVALE SMAZAT závod „${val(race.name)}“?\n\nSmažou se také jeho trasy, ceny a záznamy uživatelů přiřazené k závodu. Tuto operaci nelze vrátit.\n\nPokud chceš závod jen skrýt, změň jeho stav na Archived.`)) return;
    perform(() => deleteRace(id));
  };
  const iconButton: React.CSSProperties = { display:"inline-flex",alignItems:"center",justifyContent:"center",border:0,background:"transparent",padding:3,cursor:"pointer",color:"#747e8d" };
  return <div className={styles.raceGroup}>
    <div className={`${styles.tableRow} ${expanded ? styles.tableRowOpen : ""}`} style={{gridTemplateColumns:"105px minmax(220px,1fr) 90px 50px 50px 116px 125px 28px"}}>
      <div className={styles.rowMain}>
        <button type="button" className={styles.date} onClick={onToggle} style={{border:0,background:"transparent",padding:0,textAlign:"left",cursor:"pointer"}}>{dateLabel(race.start_date)}</button>
        <span className={styles.raceTitle}>
          <span style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}>
            <button type="button" onClick={onToggle} style={{fontWeight:750,fontSize:13,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left",background:"none",border:0,padding:0,cursor:"pointer",color:"inherit"}}>{shown(race.name)}</button>
            <button type="button" style={iconButton} onClick={editName} disabled={pending} aria-label={`Upravit název ${val(race.name)}`} title="Upravit název"><Pencil size={13}/></button>
            <Link href={`/platform/zavody/${id}`} style={{fontSize:11,color:"#2563eb",whiteSpace:"nowrap",textDecoration:"underline"}} title="Kompletní editor závodu">Detail / upravit</Link>
          </span>
          <small>{[race.city,race.region].map(val).filter(Boolean).join(" · ")}</small>
        </span>
        <span className={styles.cell}>{shown(race.sport)}</span>
        <span className={styles.cell}>{distances.length}</span>
        <span className={styles.cell}>{prices.length}</span>
      </div>
      <StatusSelect race={race}/>
      <div className={styles.links} style={{gap:5,alignItems:"center"}}>
        {safeUrl(race.website_url) && <a href={safeUrl(race.website_url)!} target="_blank" rel="noopener noreferrer" title="Otevřít web závodu"><ExternalLink size={15}/></a>}
        <button type="button" onClick={() => editUrl("website_url")} disabled={pending} style={iconButton} title="Upravit nebo vložit web závodu" aria-label="Upravit web závodu"><Pencil size={13}/></button>
        <button type="button" onClick={() => editUrl("registration_url")} disabled={pending} style={iconButton} title="Upravit odkaz na registraci" aria-label="Upravit odkaz na registraci"><ExternalLink size={13}/></button>
        <button type="button" onClick={remove} disabled={pending} style={{...iconButton,color:"#bd2d2d"}} title="Trvale smazat závod" aria-label={`Smazat závod ${val(race.name)}`}><Trash2 size={14}/></button>
      </div>
      <button className={styles.chevron} type="button" onClick={onToggle} aria-label={expanded?"Sbalit":"Rozbalit"}>{expanded?<ChevronDown size={18}/>:<ChevronRight size={18}/>}</button>
    </div>
    <Feedback value={feedback}/>
    {expanded && <Editor race={race} distances={distances} prices={prices}/>}
  </div>;
}
export default function RacesManager({races,distances,prices,initiallyOpen,saved}:{races:Row[];distances:Row[];prices:Row[];initiallyOpen:string;saved:boolean}) {
  const [query,setQuery]=useState("");const [sport,setSport]=useState("");const [organizer,setOrganizer]=useState("");const [status,setStatus]=useState("");const [month,setMonth]=useState("");const [open,setOpen]=useState(initiallyOpen);
  const sports=useMemo(()=>[...new Set(races.map(r=>val(r.sport)).filter(Boolean))].sort(),[races]);
  const organizers=useMemo(()=>[...new Set(races.map(r=>val(r.organizer_name)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"cs")),[races]);
  const months=useMemo(()=>[...new Set(races.map(r=>monthKey(r.start_date)))].sort(),[races]);
  const byRace = (rows: Row[]) => { const m=new Map<string,Row[]>();for(const r of rows){const id=val(r.race_id);m.set(id,[...(m.get(id)??[]),r]);}return m; };
  const distancesMap=useMemo(()=>byRace(distances),[distances]);
  const pricesMap=useMemo(()=>byRace(prices),[prices]);
  const filtered=useMemo(()=>races.filter(r=>{
    const searchable=[r.name,r.city,r.region,r.organizer_name].map(val).join(" ").toLocaleLowerCase("cs");
    return (!query||searchable.includes(query.toLocaleLowerCase("cs")))&&(!sport||val(r.sport)===sport)&&(!organizer||val(r.organizer_name)===organizer)&&(!status||val(r.status)===status)&&(!month||monthKey(r.start_date)===month);
  }).sort((a,b)=>val(a.start_date).localeCompare(val(b.start_date))||val(a.name).localeCompare(val(b.name),"cs")),[races,query,sport,organizer,status,month]);
  const grouped=useMemo(()=>{const m=new Map<string,Row[]>();for(const r of filtered){const k=monthKey(r.start_date);m.set(k,[...(m.get(k)??[]),r]);}return [...m.entries()];},[filtered]);
  return <div className={styles.page} style={{minHeight: "auto", background: "transparent", padding: 0, width: "100%"}}><div className={styles.container} style={{maxWidth: "none", padding: 0, margin: 0, width: "100%"}}>
    <header className={styles.header}><div><div className={styles.eyebrow}><Flag size={13}/>SPRINTUY / PLATFORMA</div><h1>Závody</h1><Link href="/platform/pridat-zavody" style={{display:"inline-flex",marginTop:9,padding:"9px 13px",borderRadius:8,background:"#171717",color:"white",fontSize:12,textDecoration:"none"}}>+ Přidat závod</Link><p>Archivace přímo v seznamu. Po otevření spravuješ trasy, kategorie a jejich cenové vlny.</p></div><div className={styles.counter}><span>Celkem závodů</span><strong>{races.length}</strong></div></header>
    {saved&&<div className={styles.success}>Změny byly uloženy.</div>}
    <div className={styles.filters}><label className={styles.search}><Search size={17}/><input aria-label="Hledat" value={query} placeholder="Hledat závod, město nebo pořadatele…" onChange={e=>setQuery(e.target.value)}/></label>
      <select value={sport} onChange={e=>setSport(e.target.value)} aria-label="Sport"><option value="">Všechny sporty</option>{sports.map(s=><option key={s} value={s}>{s}</option>)}</select>
      <select value={organizer} onChange={e=>setOrganizer(e.target.value)} aria-label="Pořadatel"><option value="">Všichni pořadatelé</option>{organizers.map(o=><option key={o} value={o}>{o}</option>)}</select>
      <select value={month} onChange={e=>setMonth(e.target.value)} aria-label="Měsíc"><option value="">Všechny měsíce</option>{months.map(m=><option key={m} value={m}>{monthName(m)}</option>)}</select>
      <select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Stav"><option value="">Všechny stavy</option><option value="published">Published</option><option value="archived">Archived</option><option value="draft">Draft</option></select>
    </div>
    <div className={styles.resultCount}>Zobrazeno {filtered.length} z {races.length} · chronologicky · dnešní datum {localToday()}</div>
    {grouped.map(([key,items])=><section key={key} className={styles.month}><div className={styles.monthHeading}><h2>{monthName(key)}</h2><span>{items.length} závodů</span></div>
      <div className={styles.tableWrap}><div className={styles.tableHeader} style={{gridTemplateColumns:"105px minmax(220px,1fr) 90px 50px 50px 116px 125px 28px"}}><span>Datum</span><span>Závod</span><span>Sport</span><span>Trasy</span><span>Ceny</span><span>Stav (upravit)</span><span>Odkazy</span><span/></div>
      {items.map(r => { const id = val(r.id); return <RaceRow key={id} race={r} distances={distancesMap.get(id) ?? []} prices={pricesMap.get(id) ?? []} expanded={id===open} onToggle={() => setOpen(id===open ? "" : id)}/>; })}</div></section>)}
    {!filtered.length&&<div className={styles.empty}>Žádné závody nenalezeny.</div>}
  </div></div>;
}
