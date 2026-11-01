"""Tiny YouCam CLI helper for fixtures/smoke tests. Reads keys from ../.env.local.
usage: python3 yc.py get PATH | task FEATURE JSON [--upload FEATURE_FOR_FILES=img1,img2..] | upload FEATURE IMG"""
import json, os, sys, time, urllib.request, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
env = dict(l.split("=", 1) for l in (ROOT / ".env.local").read_text().splitlines() if "=" in l and not l.startswith("#"))
BASE, KEY = env["YOUCAM_BASE_URL"], env["YOUCAM_API_KEY"]

def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{path} -> {e.code} {e.read()[:400]!r}")

def upload(feature, img):
    data = pathlib.Path(img).read_bytes()
    ct = "image/png" if img.endswith(".png") else "image/jpeg"
    r = call("POST", f"/s2s/v2.0/file/{feature}", {"files": [{"content_type": ct, "file_name": os.path.basename(img), "file_size": len(data)}]})
    f = r["data"]["files"][0]; u = f["requests"][0]
    urllib.request.urlopen(urllib.request.Request(u["url"], method=u["method"], data=data, headers=u["headers"]))
    return f["file_id"]

def task(feature, body, timeout=180):
    tid = call("POST", f"/s2s/v2.0/task/{feature}", body)["data"]["task_id"]
    t0 = time.time()
    while time.time() - t0 < timeout:
        time.sleep(2)
        d = call("GET", f"/s2s/v2.0/task/{feature}/{tid}")["data"]
        if d["task_status"] != "running": return d
    raise SystemExit("timeout")

def fetch(url, out):
    with urllib.request.urlopen(url) as r: pathlib.Path(out).write_bytes(r.read())

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "get": print(json.dumps(call("GET", sys.argv[2]), indent=1)[:4000])
    elif cmd == "upload": print(upload(sys.argv[2], sys.argv[3]))
    elif cmd == "task": print(json.dumps(task(sys.argv[2], json.loads(sys.argv[3])), indent=1))
