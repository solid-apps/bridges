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

  window.Bridges = { keysInProfile, verifyWebId, resolvePodFromKey, podRoot };
})();
