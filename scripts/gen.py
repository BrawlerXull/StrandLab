import json, sys
sys.path.insert(0, ".")
import yc
name, prompt = sys.argv[1], sys.argv[2]
d = yc.task("text-to-image/youcam", {"model": "youcam-image-v2", "prompt": prompt, "size": "1104*1472", "prompt_extend": False,
  "negative_prompt": "hat, headscarf, hair covered, cropped hair, blurry, low quality, distorted face, extra people, text, watermark"})
print(json.dumps(d)[:600])
url = d["results"]["url"] if isinstance(d["results"].get("url"), str) else d["results"]
yc.fetch(url if isinstance(url, str) else d["results"]["urls"][0], f"../fixtures/{name}.jpg")
