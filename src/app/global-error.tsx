"use client";

/** Last resort when the root layout itself fails: plain HTML, no site chrome. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const mail = `mailto:suryansh.codes2001@gmail.com?subject=${encodeURIComponent("Seedwall: the site failed to load")}&body=${encodeURIComponent(
    `Page: ${typeof window !== "undefined" ? window.location.href : ""}\nError: ${error.message}\nDigest: ${error.digest ?? ""}`,
  )}`;
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "64px 20px", maxWidth: 640, margin: "0 auto", lineHeight: 1.5 }}>
        <h1>Seedwall hit a problem.</h1>
        <p>The page couldn&apos;t load. Try again; if it keeps happening, please let Suryansh know.</p>
        <p>
          <button type="button" onClick={reset} style={{ padding: "8px 14px", marginRight: 8 }}>Try again</button>
          <a href={mail}>Email the details</a>
        </p>
      </body>
    </html>
  );
}
