"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { deleteContent, saveContent, toggleContent, type ContentKind, type ContentResult } from "@/app/platform/content/actions";
import styles from "./ContentAdmin.module.css";

export type Item = Record<string, unknown>;
const cfg: Record<ContentKind, { singular: string; plural: string; image: string }> = {
  news: { singular: "novinku", plural: "Novinky", image: "image_url" },
  runclubs: { singular: "runclub", plural: "Runcluby", image: "logo_url" },
  events: { singular: "event", plural: "Eventy", image: "image_url" },
  competitions: { singular: "soutěž", plural: "Soutěže", image: "image_url" },
};
const s = (v: unknown) => typeof v === "string" ? v : "";
const displayDate = (v: unknown) => v ? new Date(String(v)).toLocaleString("cs-CZ", { dateStyle: "medium", timeStyle: "short" }) : "—";
function dateInput(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function Field({ label, name, value, required, type = "text", placeholder }: {
  label: string; name: string; value?: unknown; required?: boolean; type?: string; placeholder?: string;
}) {
  return <label className={styles.field}><span>{label}</span><input name={name} type={type} required={required}
    defaultValue={type === "datetime-local" ? dateInput(value) : s(value)} placeholder={placeholder} /></label>;
}
function TextArea({ label, name, value, required, rows = 4 }: {
  label: string; name: string; value?: unknown; required?: boolean; rows?: number;
}) {
  return <label className={styles.field}><span>{label}</span><textarea name={name} defaultValue={s(value)} rows={rows} required={required} /></label>;
}
function Editor({ kind, item, done, respond }: { kind: ContentKind; item: Item | null; done: () => void; respond: (v: ContentResult) => void }) {
  const [busy, start] = useTransition();
  const [fileSelected, setFileSelected] = useState(false);
  const router = useRouter();
  const imageField = cfg[kind].image;
  const existing = s(item?.[imageField]);
  const title = kind === "runclubs" ? "name" : "title";
  return <form className={styles.editor} onSubmit={event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    for (const key of ["published_at", "starts_at", "ends_at"]) {
      const raw = String(form.get(key) || "");
      if (raw) form.set(key, new Date(raw).toISOString());
    }
    start(async () => {
      const res = await saveContent(form);
      respond(res);
      if (res.ok) { done(); router.refresh(); }
    });
  }}>
    <input type="hidden" name="kind" value={kind} />
    <input type="hidden" name="id" value={s(item?.id)} />
    <input type="hidden" name="existing_image" value={existing} />
    <div className={styles.editorTop}><h3>{item ? "Upravit" : "Přidat"} {cfg[kind].singular}</h3><button type="button" className={styles.iconButton} onClick={done} aria-label="Zavřít"><X size={17}/></button></div>
    <div className={styles.twoCols}>
      <Field label="Název" name={title} value={item?.[title]} required />
      {kind !== "news" && <Field label="Slug" name="slug" value={item?.slug} placeholder="Automaticky z názvu, pokud prázdné" />}
      {kind !== "news" && <Field label="Město" name="city" value={item?.city} />}
      {kind === "news" && <Field label="Datum publikace" name="published_at" type="datetime-local" value={item?.published_at ?? new Date().toISOString()} required />}
      {(kind === "events" || kind === "competitions") && <><Field label="Začátek" name="starts_at" type="datetime-local" value={item?.starts_at}/><Field label="Konec" name="ends_at" type="datetime-local" value={item?.ends_at}/></>}
    </div>
    {kind === "news" ? <><TextArea label="Krátký perex" name="excerpt" rows={2} value={item?.excerpt}/><TextArea label="Celý obsah" name="content" value={item?.content} required rows={8}/></>
      : <TextArea label="Popis" name="description" value={item?.description} rows={5}/>}
    {kind === "runclubs" && <Field label="Instagram URL" name="instagram_url" value={item?.instagram_url} type="url" />}
    {kind === "competitions" && <TextArea label="Výhra" name="prize" value={item?.prize} rows={2} />}
    {kind === "news" && <div className={styles.twoCols}><Field label="CTA – text tlačítka" name="link_label" value={item?.link_label} placeholder="Zobrazit závod"/><Field label="CTA – odkaz" name="link_url" value={item?.link_url} type="url" placeholder="https://..."/></div>}
    <div className={styles.twoCols}>
      <Field label={kind === "runclubs" ? "URL loga" : "URL obrázku"} name={imageField} value={item?.[imageField]} type="url" placeholder="https://..." />
      <label className={styles.field}><span>Nebo nahrát obrázek (max 5 MB)</span><input type="file" name="image_file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => setFileSelected(!!e.target.files?.length)} /></label>
    </div>
    {(existing || fileSelected) && <div className={styles.imageActions}>{existing && <a target="_blank" rel="noreferrer" href={existing}>Zobrazit stávající obrázek</a>}<label><input name="remove_image" type="checkbox" value="true"/> Odebrat obrázek</label></div>}
    <label className={styles.activeField}><input type="checkbox" name="is_active" value="true" defaultChecked={item ? item.is_active === true : false} /> Aktivní – viditelné v mobilní aplikaci</label>
    <div className={styles.actions}><button className={styles.primary} disabled={busy} type="submit"><Save size={15}/>{busy ? "Ukládám..." : "Uložit"}</button><button type="button" onClick={done} className={styles.secondary}>Zrušit</button></div>
  </form>;
}

export default function ContentAdmin({ kind, items, entryCounts = {} }: { kind: ContentKind; items: Item[]; entryCounts?: Record<string, number> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [filter, setFilter] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [feedback, setFeedback] = useState<ContentResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const visible = items.filter(item => {
    if (visibility === "active" && item.is_active !== true) return false;
    if (visibility === "hidden" && item.is_active === true) return false;
    const title = s(item[kind === "runclubs" ? "name" : "title"]);
    return `${title} ${s(item.city)}`.toLocaleLowerCase("cs").includes(filter.toLocaleLowerCase("cs"));
  });
  async function perform(id: string, fn: () => Promise<ContentResult>) {
    setBusyId(id);
    try { const result = await fn(); setFeedback(result); if (result.ok) router.refresh(); }
    catch (err) { setFeedback({ ok: false, message: err instanceof Error ? err.message : "Operace selhala." }); }
    finally { setBusyId(null); }
  }
  return <div className={styles.root}>
    <div className={styles.toolbar}>
      <div className={styles.counter}>{cfg[kind].plural} <strong>{items.length}</strong> <span>· Aktivní {items.filter(x => x.is_active).length}</span></div>
      <button className={styles.primary} onClick={() => { setEditing("new"); setFeedback(null); }}><Plus size={16}/> Přidat {cfg[kind].singular}</button>
    </div>
    {feedback && <div role="status" className={feedback.ok ? styles.success : styles.error}>{feedback.message}<button type="button" onClick={() => setFeedback(null)} aria-label="Skrýt zprávu"><X size={14}/></button></div>}
    {editing === "new" && <Editor kind={kind} item={null} done={() => setEditing(null)} respond={setFeedback}/>}
    <div className={styles.filters}><input aria-label="Hledat" placeholder="Hledat podle názvu nebo města..." value={filter} onChange={e => setFilter(e.target.value)}/><select aria-label="Viditelnost" value={visibility} onChange={e => setVisibility(e.target.value)}><option value="all">Všechny</option><option value="active">Aktivní</option><option value="hidden">Skryté</option></select></div>
    <div className={styles.list}>
      {visible.length === 0 && <div className={styles.empty}>Žádné záznamy.</div>}
      {visible.map(item => {
        const id = s(item.id);
        const name = s(item[kind === "runclubs" ? "name" : "title"]);
        const date = kind === "news" ? item.published_at : kind === "runclubs" ? null : item.starts_at;
        const image = s(item[cfg[kind].image]);
        return <div className={styles.record} key={id}>
          <div className={styles.recordLine}>
            {image && <img alt="" src={image} className={styles.thumb} />}
            <div className={styles.recordInfo}><strong>{name}</strong><span>{kind !== "news" ? [s(item.city), date ? displayDate(date) : ""].filter(Boolean).join(" · ") : displayDate(date)}</span><small>Upraveno: {displayDate(item.updated_at)}{kind === "competitions" ? ` · Přihlášeno: ${entryCounts[id] ?? 0}` : ""}</small></div>
            <span className={item.is_active ? styles.active : styles.inactive}>{item.is_active ? "Aktivní" : "Skryté"}</span>
            <div className={styles.recordActions}>
              <button disabled={busyId === id} title={item.is_active ? "Skrýt" : "Aktivovat"} aria-label={item.is_active ? "Skrýt" : "Aktivovat"} onClick={() => perform(id, () => toggleContent(kind, id, item.is_active !== true))}>{item.is_active ? <X size={16}/> : <Check size={16}/>}</button>
              <button title="Upravit" aria-label="Upravit" onClick={() => setEditing(editing === id ? null : id)}><Pencil size={16}/></button>
              <button disabled={busyId === id} title="Smazat" aria-label="Smazat" onClick={() => {
                if (window.confirm(`Opravdu TRVALE smazat ${name}?\nTato akce nejde vrátit.`)) perform(id, () => deleteContent(kind, id));
              }}><Trash2 size={16}/></button>
            </div>
          </div>
          {editing === id && <Editor key={id} kind={kind} item={item} done={() => setEditing(null)} respond={setFeedback}/>}
        </div>;
      })}
    </div>
  </div>;
}
