import json, sys, subprocess
import yc
src, name, prompt = sys.argv[1], sys.argv[2], sys.argv[3]
fid = yc.upload("image-to-image/youcam", src)
d = yc.task("image-to-image/youcam", {"src_file_ids": [fid], "model": "youcam-image-v2", "prompt": prompt, "size": "1104*1472", "prompt_extend": False,
    "negative_prompt": "different person, changed hairstyle, straightened hair, hat, blurry, low quality, distorted face, text, watermark"})
print(json.dumps(d)[:300])
out = f"../fixtures/{name}.jpg"
yc.fetch(d["results"]["url"], out)
subprocess.run(["sips", "-s", "format", "jpeg", "-Z", "900", out, "--out", out], capture_output=True)
