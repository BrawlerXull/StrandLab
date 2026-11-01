"""Build public/samples/<id>/ by running each fixture persona through the live app API (dev server on :3100).
Face boxes come from OpenCV here (the browser uses MediaPipe). Run with a python that has opencv + pillow + requests-free urllib."""
import json, sys, uuid, urllib.request, pathlib, shutil
import cv2

ROOT = pathlib.Path(__file__).resolve().parent.parent
FIX, OUT = ROOT / "fixtures", ROOT / "public" / "samples"
API = "http://localhost:3100"

PERSONAS = {
    "maya": dict(name="Maya", blurb="Frizzy ringlets in a humid city", src="curly", porosity="normal",
                 climate=dict(place="Miami, US (sample)", dewPointC=22, humidity=78, dewMax3d=24, dewMin3d=13, band="humid",
                                 days=[dict(date="2026-11-02", dewMax=23, dewMin=20, band="humid"), dict(date="2026-11-03", dewMax=24, dewMin=21, band="humid"),
                                       dict(date="2026-11-04", dewMax=17, dewMin=13, band="humid"), dict(date="2026-11-05", dewMax=14, dewMin=11, band="ideal")])),
    "lena": dict(name="Lena", blurb="Fine, flat hair through a dry winter", src="lena", porosity="low",
                 climate=dict(place="Oslo, NO (sample)", dewPointC=-3, humidity=71, dewMax3d=5, dewMin3d=-6, band="dry",
                                 days=[dict(date="2026-11-02", dewMax=-1, dewMin=-4, band="dry"), dict(date="2026-11-03", dewMax=0, dewMin=-6, band="dry"),
                                       dict(date="2026-11-04", dewMax=5, dewMin=1, band="ideal"), dict(date="2026-11-05", dewMax=2, dewMin=-2, band="dry")])),
    "zola": dict(name="Zola", blurb="Dense coils that drink up moisture", src="zola", porosity="high",
                 climate=dict(place="London, GB (sample)", dewPointC=8, humidity=82, dewMax3d=10, dewMin3d=3, band="ideal",
                                 days=[dict(date="2026-11-02", dewMax=9, dewMin=6, band="ideal"), dict(date="2026-11-03", dewMax=10, dewMin=7, band="ideal"),
                                       dict(date="2026-11-04", dewMax=6, dewMin=3, band="ideal"), dict(date="2026-11-05", dewMax=3, dewMin=0, band="dry")])),
}
FRONT_CASC = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
PROF_CASC = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")

def box(path):
    g = cv2.cvtColor(cv2.imread(str(path)), cv2.COLOR_BGR2GRAY); H, W = g.shape
    cands = list(FRONT_CASC.detectMultiScale(g, 1.1, 5, minSize=(W // 8, W // 8)))
    if not cands:
        cands = list(PROF_CASC.detectMultiScale(g, 1.1, 4, minSize=(W // 8, W // 8)))
        cands += [(W - x - w, y, w, h) for (x, y, w, h) in PROF_CASC.detectMultiScale(cv2.flip(g, 1), 1.1, 4, minSize=(W // 8, W // 8))]
    if not cands: return None
    x, y, w, h = max(cands, key=lambda c: c[2] * c[3])
    return dict(x=x / W, y=y / H, w=w / W, h=h / H)

def post(path, fields, files):
    b = uuid.uuid4().hex; body = b""
    for k, v in fields.items(): body += f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    for k, p in files.items():
        body += f'--{b}\r\nContent-Disposition: form-data; name="{k}"; filename="{k}.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode() + pathlib.Path(p).read_bytes() + b"\r\n"
    body += f"--{b}--\r\n".encode()
    req = urllib.request.Request(API + path, data=body, headers={"Content-Type": f"multipart/form-data; boundary={b}"})
    with urllib.request.urlopen(req, timeout=180) as r: return json.loads(r.read())

def templates_for(family):
    if family in ("curly", "coily"): return [("hair-vol", "female_subtle"), ("hair-vol", "female_maximized"), ("hair-vol", "female_natural")]
    if family == "wavy": return [("hair-curl", "female_subtle_waves_"), ("hair-curl", "female_defined_waves_"), ("hair-vol", "female_natural")]
    return [("hair-vol", "female_natural"), ("hair-vol", "female_maximized"), ("hair-vol", "female_medium")]

for pid in (sys.argv[1:] or PERSONAS):
    P = PERSONAS[pid]; s = P["src"]
    files = {"front": FIX / f"{s}_front2.jpg", "right": FIX / f"{s}_right.jpg", "left": FIX / f"{s}_left.jpg", "tilt": FIX / f"{s}_bow.jpg"}
    boxes = {k: box(v) for k, v in files.items()}
    print(pid, "boxes", {k: (round(v["w"], 2) if v else None) for k, v in boxes.items()})
    m = post("/api/analyze", {"boxes": json.dumps(boxes)}, files)["measured"]
    print(pid, json.dumps({k: m[k] for k in ("type", "frizz", "density", "length", "issues")}))
    d = OUT / pid; d.mkdir(parents=True, exist_ok=True)
    for k, v in files.items(): shutil.copy(v, d / f"{k}.jpg")
    previews = {}
    fam = (m.get("type") or {}).get("family", "wavy")
    for feat, tpl in templates_for(fam):
        r = post("/api/preview", {"feature": feat, "template": tpl}, {"image": files["front"]})
        if "url" not in r: print("  preview fail", feat, tpl, r); continue
        import base64
        raw = base64.b64decode(r["url"].split(",", 1)[1]); fn = f"vto_{feat}_{tpl}.jpg"
        (d / fn).write_bytes(raw); previews[f"{feat}:{tpl}"] = fn
        print("  preview", feat, tpl)
    data = dict(id=pid, name=P["name"], blurb=P["blurb"], measured=m, porosity=P["porosity"], climate=P["climate"], previews=previews)
    (d / "data.json").write_text(json.dumps(data, indent=1))
