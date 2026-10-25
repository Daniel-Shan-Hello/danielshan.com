/* Runs the Python SATB engine (voice_grader.py, voice_solver.py) in a Web Worker
   with Pyodide, so the page stays responsive while the solver searches.
   Messages in:  { id, op: "grade" | "solve", body: <request JSON string> }
   Messages out: { id, status, body } for a request, or { ready: true } / { failed: msg } at start-up. */
"use strict";

importScripts("pyodide/pyodide.js");

const ENGINE_FILES = ["voice_grader.py", "voice_solver.py", "web_api.py"];

const ready = (async () => {
  const pyodide = await loadPyodide({ indexURL: new URL("pyodide/", self.location).href });
  pyodide.FS.mkdirTree("/engine");
  for (const name of ENGINE_FILES) {
    const resp = await fetch("engine/" + name);
    if (!resp.ok) throw new Error("Could not load " + name);
    pyodide.FS.writeFile("/engine/" + name, await resp.text());
  }
  pyodide.runPython("import sys\nsys.path.insert(0, '/engine')\nimport web_api");
  const api = pyodide.pyimport("web_api");
  return api;
})();

ready.then(
  () => self.postMessage({ ready: true }),
  (err) => self.postMessage({ failed: String(err && err.message || err) })
);

self.onmessage = async (event) => {
  const { id, op, body } = event.data || {};
  try {
    const api = await ready;
    if (op !== "grade" && op !== "solve") throw new Error("Unknown operation: " + op);
    const out = JSON.parse(api[op](body));
    self.postMessage({ id, status: out.status, body: out.body });
  } catch (err) {
    self.postMessage({ id, status: 500, body: { ok: false, error: String(err && err.message || err) } });
  }
};
