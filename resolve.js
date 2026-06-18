/* resolve.js — shared Nostr⇄Solid resolver (used by bridges + telegram).
 * Exposes window.Bridges = { keysInProfile, verifyWebId, resolvePodFromKey, podRoot }.
 * No build step, no deps. Same-origin load (e.g. ../bridges/resolve.js). */
(function () {
  function podRoot(webId) { try { return new URL(webId).origin + '/'; } catch { return null; } }

  // pubkeys a profile (turtle/json-ld text) declares: fe70102… Multikey + did:nostr forms
  function keysInProfile(text) {
    return [...new Set(
      [...String(text).toLowerCase().matchAll(/(?:fe70102|did:nostr:)([0-9a-f]{64})/g)].map(m => m[1])
    )];
  }

  // Does the WebID profile actually list this pubkey? (the backlink)
  async function verifyWebId(webId, pubkey) {
    try {
      const r = await fetch(webId, { headers: { Accept: 'text/turtle, application/ld+json;q=0.9, */*;q=0.8' } });
      if (!r.ok) return { ok: false, readable: false, keys: [] };
      const t = (await r.text()).toLowerCase();
      const keys = keysInProfile(t);
      const pk = pubkey.toLowerCase();
      return { ok: keys.includes(pk) || t.includes(pk), readable: true, keys };
    } catch { return { ok: false, readable: false, keys: [] }; }
  }

  // key -> {webId, pod, verified, doc}. Resolves did:nostr via <resolver>/.well-known,
  // reads alsoKnownAs, then (by default) verifies the WebID lists the key.
  async function resolvePodFromKey(pubkey, opts) {
    opts = opts || {};
    const resolver = (opts.resolver || 'https://nostr.social').replace(/\/+$/, '');
    let doc = null;
    try {
      const r = await fetch(resolver + '/.well-known/did/nostr/' + pubkey + '.json', { headers: { Accept: 'application/json' } });
      if (r.ok) doc = await r.json();
    } catch {}
    const webId = doc ? [].concat(doc.alsoKnownAs || []).filter(Boolean)[0] : null;
    if (!webId) return { webId: null, pod: null, verified: false, doc };
    let verified = true;
    if (opts.verify !== false) { const v = await verifyWebId(webId, pubkey); verified = v.ok || !v.readable; }
    return { webId, pod: podRoot(webId), verified, doc };
  }

  // best-effort display name from a WebID profile (foaf:name / vcard:fn / schema:name)
  async function profileName(webId) {
    try {
      const r = await fetch(webId, { headers: { Accept: 'text/turtle, application/ld+json;q=0.9, */*;q=0.8' } });
      if (!r.ok) return null;
      const t = await r.text();
      const pats = [
        /"(?:foaf:)?name"\s*:\s*"([^"]{1,80})"/i,
        /"vcard:fn"\s*:\s*"([^"]{1,80})"/i,
        /"schema:name"\s*:\s*"([^"]{1,80})"/i,
        /\bfoaf:name\s+"([^"]{1,80})"/i,
        /\bvcard:fn\s+"([^"]{1,80})"/i
      ];
      for (const p of pats) { const m = t.match(p); if (m && m[1].trim()) return m[1].trim(); }
      return null;
    } catch { return null; }
  }

  // One-stop resolve via an aggregating resolver (nostr.social): ONE fetch returns
  // profile (name/picture) + pod (alsoKnownAs) + follows. No relays, no per-follow kind-0.
  // bridged = a real alsoKnownAs http WebID (resolver already backlink-checked it).
  async function resolveDid(pubkey, opts) {
    opts = opts || {};
    const resolver = (opts.resolver || 'https://nostr.social').replace(/\/+$/, '');
    let doc = null;
    try {
      const r = await fetch(resolver + '/.well-known/did/nostr/' + pubkey + '.json', { headers: { Accept: 'application/json' } });
      if (r.ok) doc = await r.json();
    } catch {}
    if (!doc) return { pubkey, name: null, picture: null, about: null, website: null, pod: null, bridged: false, follows: [], doc: null };
    const prof = doc.profile || {};
    const aka = [].concat(doc.alsoKnownAs || []).filter(x => typeof x === 'string' && /^https?:\/\//i.test(x)); // real WebIDs only (skip "#me")
    const pod = aka[0] || null;
    const follows = (doc.follows || []).map(f => String(f).replace(/^did:nostr:/, '')).filter(x => /^[0-9a-f]{64}$/i.test(x));
    return { pubkey, name: prof.name || null, picture: prof.picture || null, about: prof.about || null, website: prof.website || null, pod, bridged: !!pod, follows, doc };
  }

  window.Bridges = { keysInProfile, verifyWebId, resolvePodFromKey, podRoot, profileName, resolveDid };
})();
