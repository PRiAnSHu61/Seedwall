# Security

Please don't open a public issue for a security problem. Report it privately through [GitHub's private vulnerability reporting](../../security/advisories/new) instead. I'll reply as soon as I can.

Seedwall has no accounts and stores no personal data. The areas most worth a look are the image API (`/api/*`), the GitHub data fetch in `src/lib/server/github.ts`, and SVG output built from user text.
