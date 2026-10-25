/* The original app calls POST /api/grade and POST /api/solve on a Flask server.
   On this site there is no server: those two calls are answered by the Python engine
   running in a Web Worker (engine-worker.js). Every other request goes to the network
   as usual. Load this script before the app's own scripts. */
(function () {
  "use strict";

  const ROUTES = { "/api/grade": "grade", "/api/solve": "solve" };
  const status = document.getElementById("engine-status");
  function setStatus(state, text) {
    if (!status) return;
    status.dataset.state = state;
    status.textContent = text;
  }

  let worker = null, nextId = 1;
  const pending = new Map();
  let readyResolve, readyReject;
  const engineReady = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });
  engineReady.catch(() => {});

  function startWorker() {
    if (worker) return;
    setStatus("loading", "Loading the Python engine…");
    try {
      worker = new Worker("engine-worker.js");
    } catch (err) {
      setStatus("failed", "This browser could not start the engine.");
      readyReject(err);
      return;
    }
    worker.onmessage = (e) => {
      const msg = e.data || {};
      if (msg.ready) { setStatus("ready", "Engine ready"); readyResolve(); return; }
      if (msg.failed) { setStatus("failed", "The engine failed to load. Reload the page to try again."); readyReject(new Error(msg.failed)); return; }
      const p = pending.get(msg.id);
      if (p) { pending.delete(msg.id); p(msg); }
    };
    worker.onerror = (e) => {
      setStatus("failed", "The engine failed to load. Reload the page to try again.");
      readyReject(new Error(e.message || "Worker error"));
    };
  }

  function call(op, body) {
    startWorker();
    return new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      worker.postMessage({ id, op, body });
    });
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const op = ROUTES[path];
    if (!op) return realFetch(input, init);
    const body = (init && typeof init.body === "string") ? init.body : "{}";
    if (op === "solve") setStatus("busy", "Searching for a realization…");
    if (op === "grade") setStatus("busy", "Grading…");
    try { await engineReady; } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: "The engine is not available: " + err.message }),
        { status: 503, headers: { "Content-Type": "application/json" } });
    }
    const t0 = performance.now();
    const out = await call(op, body);
    const ms = performance.now() - t0;
    const took = ms < 100 ? "under 0.1 s" : (ms / 1000).toFixed(1) + " s";
    setStatus("ready", (op === "solve" ? "Solved in " : "Graded in ") + took);
    return new Response(JSON.stringify(out.body), { status: out.status, headers: { "Content-Type": "application/json" } });
  };

  // Warm the engine up in the background so the first Solve is quick.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startWorker);
  else startWorker();
})();
