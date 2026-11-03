"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import styles from "./WaitlistForm.module.css";

type System = "ios" | "android";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [system, setSystem] = useState<System>("ios");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || complete) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, operating_system: system, website }),
      });
      const data: { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "Přihlášení se nepodařilo.");
      setComplete(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Přihlášení se nepodařilo.");
    } finally {
      setBusy(false);
    }
  }

  if (complete) {
    return (
      <div className={styles.success} role="status">
        <CheckCircle2 size={23} />
        <div><strong>Jsi na čekací listině!</strong><span>O spuštění Sprintuy ti dáme vědět e-mailem.</span></div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.label} htmlFor="waitlist-email">TVŮJ E-MAIL</label>
      <input
        id="waitlist-email" type="email" name="email" autoComplete="email" required
        maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="tvuj@email.cz" className={styles.email}
      />
      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>TVŮJ OPERAČNÍ SYSTÉM</legend>
        <div className={styles.options}>
          <label className={system === "ios" ? styles.selected : styles.option}>
            <input type="radio" name="operating_system" value="ios" checked={system === "ios"} onChange={() => setSystem("ios")} />
            <span className={styles.radio} /> iOS / iPhone
          </label>
          <label className={system === "android" ? styles.selected : styles.option}>
            <input type="radio" name="operating_system" value="android" checked={system === "android"} onChange={() => setSystem("android")} />
            <span className={styles.radio} /> Android
          </label>
        </div>
      </fieldset>
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="waitlist-website">Web</label>
        <input id="waitlist-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <button className={styles.button} type="submit" disabled={busy}>
        <span>{busy ? "Přihlašuji..." : "Připojit se na čekací listinu"}</span>
        <ArrowRight size={19} aria-hidden="true" />
      </button>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}
