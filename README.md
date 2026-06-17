# Bridges — Nostr ⇄ Solid

Universal one-page bridge between a **Nostr identity** and **Solid storage** — from both sides.
Sign in with your Nostr key and it finds your pod (or guides you to add one); paste a WebID/pod and it finds your linked Nostr key. No build step, single static page.

**Live:** https://solid-apps.github.io/bridges/

## What it does

- **Nostr → Solid** — `window.nostr.getPublicKey()` (or paste an `npub`/hex) → resolves
  `<resolver>/.well-known/did/nostr/<pubkey>.json` → if the DID document has an
  `alsoKnownAs` WebID, you **have storage** (shows your pod); otherwise it guides you to add one.
- **Solid → Nostr** — paste a WebID or pod URL → reads the profile → finds a linked
  `did:nostr` / `npub`.
- **Guides** — a 3-step coach with the next concrete action; if you have no storage it hands you
  `npx jspod` (self-host in 60s) plus hosted options, then a re-check.
- **Remembers** — recent identities (with storage status) and your resolver choice, in `localStorage`.

## Run it

No build. Any static host (or open `index.html` directly — CDN-free):

```bash
npx serve .          # or
python3 -m http.server 8080
```

It also runs from a Solid pod — drop the files at `<pod>/public/apps/bridges/`.

## Configuration

- `resolver` (footer field, persisted): the `did:nostr` resolver host. Defaults to the
  served-from origin when on `http(s)`, else `https://nostr.social`.

## Status

**0.0.1 — proof of concept.** Resolution + guidance + memory work end-to-end.
Following JSS's `0.0.x` versioning (small, frequent bumps).

### Roadmap

- **0.0.2** — actually *write* the link (`alsoKnownAs`) into the DID document (auth via xlogin / NIP-98), so "add storage" becomes one click instead of guidance.
- **0.0.3** — Solid-OIDC login on the Solid side; `npub` display encoding; optional directory cache.

## Part of [solid-apps](https://github.com/solid-apps)

Composes with [jspod](https://jspod.org) (storage), [JSS SSO](https://jss.live/sso) (resolution), and `xlogin` (auth).
