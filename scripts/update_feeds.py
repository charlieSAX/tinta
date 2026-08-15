# -*- coding: utf-8 -*-
"""Prepend the run's packs to both feeds, dedupe, cap at 40, stamp generated_at."""
import json, os, sys, datetime, shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from packs_es import ES
from packs_it import IT

HOME = os.path.expanduser("~")
FEEDS = {
    "TINTA": (os.path.join(HOME, "Documents/Claude/Projects/SPANISH APP/public/feed/index.json"), ES),
    "NAOMI": (os.path.join(HOME, "Documents/Claude/Projects/NAOMILINGO/public/feed/index.json"), IT),
}
stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

for name, (path, packs) in FEEDS.items():
    shutil.copyfile(path, path + ".bak_" + stamp.replace(":", "").replace("-", ""))
    d = json.load(open(path, encoding="utf-8"))
    old = d.get("packs", [])
    new_entries = []
    for p in packs:
        new_entries.append({
            "pack_id": p["pack_id"],
            "title": p["meta"]["title"],
            "source": p["meta"]["source"],
            "date": p["meta"]["date_published"],
            "level": p["meta"]["level"],
            "topics": p["meta"]["tags"],
            "pack": p,
        })
    merged, seen_ids, seen_urls = [], set(), set()
    for e in new_entries + old:
        pid = e.get("pack_id")
        url = (e.get("pack", {}).get("meta", {}) or {}).get("url")
        if pid in seen_ids or (url and url in seen_urls):
            continue
        seen_ids.add(pid)
        if url:
            seen_urls.add(url)
        merged.append(e)
    merged = merged[:40]
    d["packs"] = merged
    d["generated_at"] = stamp
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    json.load(open(tmp, encoding="utf-8"))
    os.replace(tmp, path)
    print("%s: %d packs, generated_at %s" % (name, len(merged), stamp))
    print("   top:", ", ".join(e["pack_id"] for e in merged[:3]))
