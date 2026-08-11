# -*- coding: utf-8 -*-
"""Cold-read validator for Tinta / Naomilingo study packs.

Checks, per pack:
  - JSON serialisable, required keys present
  - resumen_es: exactly 2 paragraphs, 110-150 words
  - summary_en: exactly 2 paragraphs, 100-180 words
  - vocab 10-14 items with all fields
  - grammar 2-3 items, each sentence a VERBATIM substring of resumen_es
  - idioms 1-2, comprehension 3, opinion_prompt present
  - no em dash (U+2014), no en dash oddities, no curly apostrophes/quotes
  - accents actually present (target language must not be accent-stripped)
Plus a cross-feed topical guard: a new title must not share 2+ significant
words with any of the 40 existing titles in EITHER feed.
"""
import json, re, sys, unicodedata

EM_DASH = "—"
CURLY = ["‘", "’", "“", "”"]

STOP_ES = set("""el la los las un una unos unas de del al a en y o u que se su sus por para con sin sobre
como mas más pero no ni es son ha han fue era este esta estos estas lo le les yo tu tú él ella
nos nuestro entre desde hasta cuando donde cual cuales quien quienes ya muy tras tan todo toda
todos todas otro otra ser estar hacer tener e si sí""".split())
STOP_IT = set("""il lo la i gli le un uno una di del della dei delle da a al alla ai alle in con su per
tra fra e o che chi cui non ne si sono e' è ha hanno era erano questo questa questi queste
piu più ma anche come dove quando quale quali suo sua suoi sue nel nella nei nelle dal dalla
essere avere fare gli un' dell dall all sul sulla""".split())
STOP = STOP_ES | STOP_IT | set("the of and to in a for on with is are new".split())


def words(s):
    return [w for w in re.findall(r"[^\W\d_]+", s, re.UNICODE) if w]


def paras(s):
    p = [x for x in s.split("\n\n") if x.strip()]
    return p


def sig_words(title):
    out = set()
    for w in words(title.lower()):
        if len(w) < 4 or w in STOP:
            continue
        out.add(w)
    return out


def has_accents(s):
    return any(unicodedata.combining(c) for c in unicodedata.normalize("NFD", s))


def check_pack(p, lang, errors, warns):
    pid = p.get("pack_id", "<no id>")

    def err(m):
        errors.append("%s: %s" % (pid, m))

    for k in ["pack_id", "revision", "meta", "summary_en", "resumen_es",
              "vocab", "grammar", "idioms", "comprehension", "opinion_prompt"]:
        if k not in p:
            err("missing key %s" % k)
            return
    for k in ["title", "source", "url", "date_published", "date_processed", "tags", "level"]:
        if k not in p["meta"]:
            err("meta missing %s" % k)

    r = p["resumen_es"]
    pr = paras(r)
    if len(pr) != 2:
        err("resumen has %d paragraphs, need exactly 2" % len(pr))
    wc = len(words(r))
    if not (110 <= wc <= 150):
        err("resumen word count %d, need 110-150" % wc)

    s = p["summary_en"]
    ps = paras(s)
    if len(ps) != 2:
        err("summary_en has %d paragraphs, need exactly 2" % len(ps))
    swc = len(words(s))
    if not (100 <= swc <= 180):
        err("summary_en word count %d, need 100-180" % swc)

    v = p["vocab"]
    if not (10 <= len(v) <= 14):
        err("vocab has %d items, need 10-14" % len(v))
    for i, it in enumerate(v):
        for k in ["front", "pos", "back", "example", "tier"]:
            if not it.get(k):
                err("vocab[%d] missing %s" % (i, k))

    g = p["grammar"]
    if not (2 <= len(g) <= 3):
        err("grammar has %d items, need 2-3" % len(g))
    for i, it in enumerate(g):
        for k in ["sentence", "point", "explanation", "why_tricky"]:
            if not it.get(k):
                err("grammar[%d] missing %s" % (i, k))
        if it.get("sentence") and it["sentence"] not in r:
            err("grammar[%d] sentence NOT a verbatim substring of resumen" % i)

    if not (1 <= len(p["idioms"]) <= 2):
        err("idioms has %d, need 1-2" % len(p["idioms"]))
    if len(p["comprehension"]) != 3:
        err("comprehension has %d, need 3" % len(p["comprehension"]))
    for c in p["comprehension"]:
        if c.get("type") != "open":
            err("comprehension item not type open")

    blob = json.dumps(p, ensure_ascii=False)
    if EM_DASH in blob:
        err("contains em dash U+2014")
    for c in CURLY:
        if c in blob:
            err("contains curly quote/apostrophe %r" % c)

    if not has_accents(r):
        err("resumen has NO accented characters, likely accent-stripped")

    lvl = p["meta"]["level"]
    want = "B1-B2" if lang == "es" else "A2-B1"
    if lvl != want:
        err("level %s, expected %s" % (lvl, want))


def topical_guard(new_titles, existing_titles, label, warns):
    for nt in new_titles:
        ns = sig_words(nt)
        for et in existing_titles:
            shared = ns & sig_words(et)
            if len(shared) >= 2:
                warns.append("TOPIC OVERLAP [%s]\n   new: %s\n   old: %s\n   shared: %s"
                             % (label, nt, et, sorted(shared)))


def main():
    sys.path.insert(0, ".")
    from packs_es import ES
    from packs_it import IT

    errors, warns = [], []
    for p in ES:
        check_pack(p, "es", errors, warns)
    for p in IT:
        check_pack(p, "it", errors, warns)

    import glob as _glob, os as _os
    def _find(app):
        pats = ["/sessions/*/mnt/%s/public/feed/index.json" % app,
                _os.path.expanduser("~/Documents/Claude/Projects/%s/public/feed/index.json" % app)]
        for pat in pats:
            hits = sorted(_glob.glob(pat))
            if hits:
                return hits[-1]
        raise SystemExit("cannot locate feed for %s" % app)
    feeds = {"TINTA": _find("SPANISH APP"), "NAOMI": _find("NAOMILINGO")}
    existing = {}
    for k, path in feeds.items():
        d = json.load(open(path))
        existing[k] = d.get("packs", [])

    all_titles = []
    all_urls = set()
    for k, ps in existing.items():
        for e in ps:
            all_titles.append(e.get("title", ""))
            u = (e.get("pack", {}).get("meta", {}) or {}).get("url")
            if u:
                all_urls.add(u)
    all_ids = set()
    for k, ps in existing.items():
        for e in ps:
            all_ids.add(e.get("pack_id"))

    new = ES + IT
    for p in new:
        if p["meta"]["url"] in all_urls:
            errors.append("%s: URL already published in an existing feed" % p["pack_id"])
        if p["pack_id"] in all_ids:
            errors.append("%s: pack_id already exists" % p["pack_id"])
    ids = [p["pack_id"] for p in new]
    if len(set(ids)) != len(ids):
        errors.append("duplicate pack_id within this run")
    urls = [p["meta"]["url"] for p in new]
    if len(set(urls)) != len(urls):
        errors.append("duplicate url within this run")

    # two-feed topical guard, per the 2026-08-08 lesson
    topical_guard([p["meta"]["title"] for p in new], all_titles, "both feeds, all 80", warns)

    print("=== WORD COUNTS ===")
    for p in new:
        print("%-46s resumen=%3d  summary=%3d  vocab=%2d  gram=%d"
              % (p["pack_id"][:46], len(words(p["resumen_es"])),
                 len(words(p["summary_en"])), len(p["vocab"]), len(p["grammar"])))

    print("\n=== WARNINGS (%d) ===" % len(warns))
    for w in warns:
        print(" ! " + w)

    print("\n=== ERRORS (%d) ===" % len(errors))
    for e in errors:
        print(" X " + e)

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
