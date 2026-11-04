"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./CookieNotice.module.css";

const STORAGE_KEY = "sprintuy-cookie-notice-v1";

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { setVisible(localStorage.getItem(STORAGE_KEY) !== "acknowledged"); }
    catch { setVisible(true); }

    // Delegace kliknutí umožňuje otevřít lištu i z odkazu ve footeru.
    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-cookie-settings-link="true"]')) {
        setVisible(true);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  function acknowledge() {
    try { localStorage.setItem(STORAGE_KEY, "acknowledged"); } catch { /* úložiště může být blokované */ }
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <aside className={styles.notice} aria-label="Informace o cookies">
      <div className={styles.copy}>
        <strong>Cookies na Sprintuy</strong>
        <p>Používáme nezbytné technologie pro fungování webu a přihlášení. Volbu zavření této lišty si zapamatujeme v prohlížeči. Volitelné analytické ani reklamní cookies tato lišta nepovoluje.</p>
        <Link href="/cookies">Více o cookies</Link>
      </div>
      <button type="button" onClick={acknowledge}>Rozumím</button>
    </aside>
  );
}
