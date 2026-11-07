# Launch kit

Drafts only. Rewrite them in your own voice, post the screenshots *you* use, and check each community's current rules before you post.

## Before launch

- [ ] Set `GITHUB_TOKEN` in Vercel (fine-grained, no permissions). Without it, `/u/<name>` hits GitHub's 60/hour anonymous limit within minutes of a launch spike.
- [ ] Build, sign and notarise `mac/` (Developer ID), and attach `Seedwall.zip` to a GitHub release (the `/mac` page links to `releases/latest`).
- [ ] Make `/u/<you>` look great: it's your demo. Have 3–4 friends' `/u/` links ready as proof it works for anyone.
- [ ] Assets: a 20–30s screen recording (type username → skyline appears → theme chips → Download), 5 gallery images at 1270×760 for Product Hunt, and a real desktop photo with the wallpaper on.
- [ ] Check share cards: paste `/s/48213` and `/u/<you>` into X/LinkedIn/Slack card validators.

## Product Hunt

**Name:** Seedwall
**Tagline (≤60):** Your GitHub year as a wallpaper, plus a new one every day
**Topics:** Developer Tools, Design Tools, Mac, Open Source

**Description:**
Seedwall turns code into wallpapers. Type a GitHub username and it draws your real contribution graph as a grid, dots or a 3D skyline, or your recent commits as a branch graph, in any editor theme (Dracula, Tokyo Night, Nord…). Every other wallpaper comes from a seed: /s/48213 looks the same for everyone, so you can share "here's my seed". A tiny Mac menu-bar app sets a fresh one every morning. Free, no account, open source.

**Maker's first comment:**
> Hey PH 👋 I made Seedwall because I wanted a wallpaper that was actually *mine*. It started as one cutting-mat generator and grew to 20. Everything is a pure TypeScript function from (parameters, seed) → SVG, so the same seed renders identically in your browser, on the server and in the Mac app.
>
> Three things I'd love you to try:
> 1. **seedwall.suryansh.work/u/YOUR-GITHUB**: your year of commits as a skyline.
> 2. **/today**: everyone gets the same seed today. Tomorrow it changes.
> 3. **The Mac app**: picks a new one at midnight, rendered at your display's native resolution.
>
> What would you want it to draw next?

## Reddit

Post the image itself, not just a link. Put the link in a comment unless the subreddit allows link posts. Space posts days apart, reply to every comment, and don't cross-post the same text everywhere.

**r/macsetups / r/desktops** (photo of a real desk setup):
> Title: My wallpaper is my last year of commits, drawn as a skyline
> Comment: Made it with a little side project. It reads your public GitHub contribution graph and renders it at your screen's native res. There's also a menu-bar app that swaps in a new generative one every day. Happy to share the link if anyone wants theirs.

**r/github / r/programming-adjacent communities** (only where self-made tools are allowed):
> Title: I turned GitHub contribution graphs into desktop wallpapers (grid, dots, 3D skyline, commit graph)
> Body: what it reads (public data only, nothing stored), how it renders (deterministic SVG → PNG), the link, and one honest limitation.

**r/webdev Showoff Saturday** (Saturdays only): lead with how it works. Pure functions → SVG, one renderer for browser, server (resvg) and Mac app, and frozen seed pools so links never change.

**r/wallpapers / r/wallpaper**: post 3–4 of the best seed renders as an album, with seed numbers in the title ("Seeds #48213, #772316…"). Tell people any seed works.

## After launch

- Reply to everything in the first 6 hours.
- Each day, post the daily seed with its number (X / Bluesky / Threads): "Today's seed is #772316".
- Watch Vercel logs for `/api/u` 429s. If you see them, the token isn't set or the cache isn't working.
