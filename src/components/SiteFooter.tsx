import Link from "next/link";
import { DEVICES } from "@/config/devices";
import { SITE } from "@/config/site";
import { GENERATORS } from "@/generators";
import { Logo } from "./Logo";

const AUTHOR = { name: "Suryansh Chaudhary", url: "https://suryansh.work/" } as const;

/** Same profiles as suryansh.work. Paths are the brands' own simple glyphs (24×24). */
const SOCIALS = [
  {
    label: "X (Twitter)",
    handle: "@Suryansh_2001",
    href: "https://x.com/Suryansh_2001",
    d: "M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L2.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18.1h1.7L8.3 3.8H6.5l11.3 16.3Z",
  },
  {
    label: "LinkedIn",
    handle: "suryansh-chaudhary-2209",
    href: "https://www.linkedin.com/in/suryansh-chaudhary-2209/",
    d: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  },
  {
    label: "GitHub",
    handle: "Suryansh-Codes2209",
    href: "https://github.com/Suryansh-Codes2209",
    d: "M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57v-2.1c-3.34.73-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3Z",
  },
] as const;

function Socials() {
  return (
    <ul className="socials" aria-label="Suryansh on social media">
      {SOCIALS.map((s) => (
        <li key={s.label}>
          <a href={s.href} target="_blank" rel="noreferrer me" aria-label={`${s.label} — ${s.handle}`} title={`${s.label} · ${s.handle}`}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
              <path d={s.d} fill="currentColor" />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Decorative cutting-mat ruler: numbered major ticks, plain minor ticks. */
function Ruler() {
  const majors = Array.from({ length: 21 }, (_, i) => i);
  return (
    <div className="footer-ruler" aria-hidden="true">
      {majors.map((i) => (
        <span key={i} style={{ left: `${i * 5}%` }}>{i * 5}</span>
      ))}
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const presetCount = GENERATORS.reduce((n, g) => n + g.presets.length, 0);

  return (
    <footer className="site-footer">
      <Ruler />
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link href="/" aria-label="Seedwall home" className="footer-logo">
            <Logo size={30} />
          </Link>
          <p>
            Wallpapers grown from a seed. Every one is a few hundred lines of TypeScript that turn colours, words and a single
            number into an SVG — the same seed always grows the same wallpaper.
          </p>
          <dl className="footer-stats">
            <div><dt>Generators</dt><dd>{GENERATORS.length}</dd></div>
            <div><dt>Presets</dt><dd>{presetCount}</dd></div>
            <div><dt>Devices</dt><dd>{DEVICES.length}+</dd></div>
            <div><dt>Seeds</dt><dd>10⁶</dd></div>
          </dl>
        </div>

        <nav className="footer-col" aria-label="Explore">
          <span className="label">Explore</span>
          <Link href="/studio">Studio</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/today">Today&apos;s seed</Link>
          <Link href="/mac">Mac app</Link>
          <Link href="/#generators">All generators</Link>
          {SITE.driveUrl ? (
            <a href={SITE.driveUrl} target="_blank" rel="noreferrer">Full pack on Drive ↗</a>
          ) : (
            <span className="muted">Full pack — coming soon</span>
          )}
        </nav>

        <nav className="footer-col" aria-label="Generators">
          <span className="label">Generators</span>
          {GENERATORS.map((g) => (
            <Link key={g.id} href={`/generators/${g.id}`}>{g.name}</Link>
          ))}
        </nav>

        <div className="footer-col">
          <span className="label">Start here</span>
          <Link href="/studio?g=cutting-mat&p=blue-bold">Blue cutting mat</Link>
          <Link href="/studio?g=cutting-mat&p=black-light&d=iphone">Black mat for iPhone</Link>
          <Link href="/studio?g=aurora&p=borealis&d=4k">4K aurora</Link>
          <Link href="/studio?g=terminal&p=github-dark&d=ultrawide">Ultrawide terminal</Link>
          <Link href="/studio?g=minimal-type&p=paper">Just a quote</Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <div className="credit-row">
          <p className="credit">
            Designed &amp; developed by{" "}
            <a href={AUTHOR.url} target="_blank" rel="noreferrer" className="credit-link">
              {AUTHOR.name}
            </a>
          </p>
          <Socials />
        </div>
        <p className="mono">© {year} Seedwall · <a href={SITE.url}>{SITE.url.replace(/^https?:\/\//, "")}</a></p>
      </div>
    </footer>
  );
}
