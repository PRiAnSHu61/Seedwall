"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

const LOGIN_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** "Type your GitHub username" → /u/<login>. */
export function GitHubForm({ initial = "", cta = "Make my wallpaper" }: { initial?: string; cta?: string }) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="gh-form"
      onSubmit={(e) => {
        e.preventDefault();
        const login = value.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/.*$/, "");
        if (!LOGIN_RE.test(login)) {
          setError("That doesn't look like a GitHub username.");
          return;
        }
        setError("");
        setPending(true);
        router.push(`/u/${login}`);
      }}
    >
      <label className="visually-hidden" htmlFor={id}>GitHub username</label>
      <div className="gh-row">
        <span className="gh-at mono" aria-hidden="true">github.com/</span>
        <input
          id={id}
          className="input mono"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="your-username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Reading your graph…" : cta}</button>
      </div>
      {error && <small id={`${id}-err`} className="form-error">{error}</small>}
    </form>
  );
}
