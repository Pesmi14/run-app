import Link from "next/link";
import CookieNotice from "./CookieNotice";
import styles from "./PublicFooter.module.css";

const links = [
  { href: "/privacy", label: "Zásady ochrany osobních údajů" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Podmínky použití" },
  { href: "/community-guidelines", label: "Pravidla komunity" },
  { href: "/delete-account", label: "Smazání účtu a dat" },
];

export default function PublicFooter() {
  return (
    <>
      <footer className={styles.footer}>
        <div className={styles.inner}>
          <div className={styles.columns}>
            <div className={styles.brand}>
              <strong>Sprintuy</strong>
              <p>Tvůj další závod začíná tady. Sleduj nás a nenech si ujít novinky.</p>
              <a
                className={styles.social}
                href="https://www.instagram.com/sprintuy_/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sprintuy na Instagramu (otevře se v nové záložce)"
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
            <div className={styles.col}>
              <strong>PROVOZOVATEL</strong>
              <span>Petr Šmíd</span>
              <span>Česká republika</span>
              <a href="mailto:sprintuy@lokinstudio.com">sprintuy@lokinstudio.com</a>
            </div>
            <nav className={styles.col} aria-label="Právní a informační stránky">
              <strong>INFORMACE</strong>
              {links.map(({ href, label }) => (
                <Link key={href} href={href}>{label}</Link>
              ))}
              <button
                type="button"
                className={styles.cookieSettings}
                data-cookie-settings-link="true"
              >
                Nastavení cookies
              </button>
            </nav>
          </div>
          <div className={styles.bottom}>
            <span>Copyright © 2026 <Link href="/">sprintuy.cz</Link>. Veškerý obsah webu (pokud není uvedeno jinak) je zakázáno kopírovat.</span>
          </div>
        </div>
      </footer>
      <CookieNotice />
    </>
  );
}
