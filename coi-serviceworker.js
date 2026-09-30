/* Cross-origin isolation for static hosts.
 *
 * wllama runs multi-threaded only when SharedArrayBuffer exists, and browsers
 * expose SharedArrayBuffer only on cross-origin-isolated pages: the document
 * must be served with Cross-Origin-Opener-Policy and Cross-Origin-Embedder-
 * Policy headers. GitHub Pages cannot set headers, so this worker adds them to
 * every response it handles. The page registers it and reloads once; from then
 * on the model runs on hardwareConcurrency/2 threads instead of one.
 *
 * Every cross-origin resource the page uses (the wllama script and wasm from
 * jsDelivr, the model from Hugging Face) is fetched with CORS and served with
 * Access-Control-Allow-Origin, which COEP require-corp accepts. The worker also
 * stamps Cross-Origin-Resource-Policy on what passes through it.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
  e.respondWith((async () => {
    const res = await fetch(req);
    // Opaque responses cannot be re-headed; let them through untouched.
    if (res.status === 0) return res;
    const headers = new Headers(res.headers);
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  })());
});
