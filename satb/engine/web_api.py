"""Browser adapter for the SATB engine.

Replaces the two Flask routes in app.py (/api/grade, /api/solve) when the engine
runs inside Pyodide. Request and response shapes are identical to app.py, so the
front end does not change. voice_grader.py and voice_solver.py are used as they are.
"""

import contextlib
import io
import json

with contextlib.redirect_stdout(io.StringIO()):
    import voice_grader as _vg_module
    import voice_solver as _vs_module

voice_grader = _vg_module.voice_grader
voice_solver = _vs_module.voice_solver


def _parse_note(raw):
    if raw is None:
        return None
    if not (isinstance(raw, (list, tuple)) and len(raw) == 3):
        raise ValueError(f"Bad note format: {raw}")
    return (int(raw[0]), str(raw[1]), int(raw[2]))


def _parse_measure(m, idx):
    S = _parse_note(m.get("S"))
    A = _parse_note(m.get("A"))
    T = _parse_note(m.get("T"))
    B = _parse_note(m.get("B"))
    rn = m.get("romanNumeral", "") or ""
    key_raw = m.get("key", ["C", "major"])
    if not (isinstance(key_raw, (list, tuple)) and len(key_raw) == 2):
        raise ValueError(f"Measure {idx + 1}: invalid key")
    key = (str(key_raw[0]), str(key_raw[1]))
    return (S, A, T, B, rn, key)


def _measure_to_json(m):
    if not (isinstance(m, (list, tuple)) and len(m) >= 6):
        raise ValueError(f"Bad measure shape from solver: {m!r}")
    S, A, T, B, rn, key = m[0], m[1], m[2], m[3], m[4], m[5]

    def note_to_json(n):
        if n is None:
            return None
        if not (isinstance(n, (list, tuple)) and len(n) == 3):
            raise ValueError(f"Bad note shape from solver: {n!r}")
        return [int(n[0]), str(n[1]), int(n[2])]

    if not (isinstance(key, (list, tuple)) and len(key) == 2):
        raise ValueError(f"Bad key shape from solver: {key!r}")
    return {
        "S": note_to_json(S),
        "A": note_to_json(A),
        "T": note_to_json(T),
        "B": note_to_json(B),
        "romanNumeral": str(rn) if rn is not None else "",
        "key": [str(key[0]), str(key[1])],
    }


def grade(request_json):
    """Same contract as POST /api/grade. Returns a JSON string: {"status", "body"}."""
    data = json.loads(request_json)
    try:
        score = [_parse_measure(m, i) for i, m in enumerate(data.get("score", []))]
        with contextlib.redirect_stdout(io.StringIO()):
            results = voice_grader(score)
        body = {"ok": True, "results": {k: [list(e) for e in errors] for k, errors in results.items()}}
        return json.dumps({"status": 200, "body": body})
    except Exception as e:
        return json.dumps({"status": 400, "body": {"ok": False, "error": str(e)}})


def solve(request_json):
    """Same contract as POST /api/solve. Returns a JSON string: {"status", "body"}."""
    data = json.loads(request_json)
    raw_problem = data.get("harmony_problem", {})
    try:
        score = [_parse_measure(m, i) for i, m in enumerate(raw_problem.get("score", []))]
        cadences = [(int(c[0]), str(c[1])) for c in (raw_problem.get("cadences") or [])
                    if isinstance(c, (list, tuple)) and len(c) >= 2]
        fixed_notes = [(int(fn[0]), str(fn[1]), _parse_note(fn[2])) for fn in (raw_problem.get("fixed_notes") or [])
                       if isinstance(fn, (list, tuple)) and len(fn) >= 3]
        fixed_chords = [(int(fc[0]), str(fc[1])) for fc in (raw_problem.get("fixed_chords") or [])
                        if isinstance(fc, (list, tuple)) and len(fc) >= 2]
        problem = {"score": score, "cadences": cadences, "fixed_notes": fixed_notes, "fixed_chords": fixed_chords}
    except Exception as e:
        return json.dumps({"status": 400, "body": {"ok": False, "error": f"Invalid input: {e}"}})

    try:
        with contextlib.redirect_stdout(io.StringIO()):
            solved = voice_solver(problem)
    except Exception as e:
        return json.dumps({"status": 500, "body": {"ok": False, "error": f"Solver error: {e}"}})

    if solved is None:
        return json.dumps({"status": 200, "body": {"ok": True, "solved": False, "score": None}})
    try:
        json_score = [_measure_to_json(m) for m in solved]
    except Exception as e:
        return json.dumps({"status": 500, "body": {"ok": False, "error": f"Bad solver output: {e}"}})
    return json.dumps({"status": 200, "body": {"ok": True, "solved": True, "score": json_score}})
