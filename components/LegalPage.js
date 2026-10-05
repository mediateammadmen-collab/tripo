import Link from "next/link";
import { site } from "@/lib/tripo/config";

export function ContactLine() {
  return site.contactEmail ? (
    <>
      email us at <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
    </>
  ) : (
    <>
      message us through <b>Help &amp; support</b> in the app
    </>
  );
}

export default function LegalPage({ title, updated, children }) {
  return (
    <main className="legal">
      <header className="legal-top">
        <Link href="/" className="legal-brand">
          <span className="home-logo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFC00" aria-hidden="true">
              <path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4z" />
            </svg>
          </span>
          Tripo
        </Link>
        <Link href="/" className="legal-back">
          ← Back to Tripo
        </Link>
      </header>
      <article className="legal-card">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: {updated}</p>
        {children}
      </article>
      <footer className="legal-foot">
        <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/">Tripo</Link>
      </footer>
    </main>
  );
}
