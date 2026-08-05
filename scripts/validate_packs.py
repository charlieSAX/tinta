#!/usr/bin/env python3
"""Validate a feed index.json for Tinta / Naomilingo.

Usage: python3 scripts/validate_packs.py public/feed/index.json [n_new]

Checks (on the first n_new packs, default 3):
  - JSON parses, packs array capped at 40, unique pack_id and meta.url
  - resumen_es: exactly two paragraphs, 110-150 words
  - summary_en: exactly two paragraphs, 100-180 words
  - vocab 10-14, grammar 2-3, idioms 1-2, comprehension exactly 3
  - every grammar sentence is a verbatim substring of resumen_es
  - no em dash (U+2014) anywhere in the file
  - topic-overlap guard: new title sharing 2+ significant words with any
    of the following 20 titles in the feed is flagged
Exit code 1 on any failure.
"""
import json, re, sys, unicodedata

STOP = set("""el la los las un una uno de del al a y o en con por para que se su sus es son ser
como mas más lo le les no ni sin sobre entre desde hasta cuando quien quién cual cuál este esta
esto ese esa aquel il lo gli le i dei delle degli di da in per tra fra su e che non si sono
essere più anche nel nella dal alla ai alle questo questa quel suo sua the of and to is for on
with""".split())

def words(s):
    return len(re.findall(r"[\wÀ-ÿ'’]+", s))

def sig(title):
    t = unicodedata.normalize('NFKD', title.lower())
    t = ''.join(c for c in t if not unicodedata.combining(c))
    return {w for w in re.findall(r"[a-z0-9]+", t) if w not in STOP and len(w) > 3}

def main():
    path = sys.argv[1]
    n_new = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    raw = open(path, encoding='utf-8').read()
    errs = []
    if '—' in raw:
        errs.append('em dash (U+2014) present in file')
    d = json.loads(raw)
    packs = d['packs']
    if len(packs) > 40:
        errs.append('packs array over cap: %d' % len(packs))
    ids = [e['pack_id'] for e in packs]
    urls = [e['pack']['meta']['url'] for e in packs]
    if len(set(ids)) != len(ids):
        errs.append('duplicate pack_id')
    if len(set(urls)) != len(urls):
        errs.append('duplicate meta.url')

    new = packs[:n_new]
    later_titles = [e['title'] for e in packs[n_new:n_new + 20]]
    for e in new:
        p = e['pack']
        pid = p['pack_id']
        def bad(m): errs.append('%s: %s' % (pid, m))
        r, s = p['resumen_es'], p['summary_en']
        if len(r.split('\n\n')) != 2: bad('resumen not exactly 2 paragraphs')
        if len(s.split('\n\n')) != 2: bad('summary_en not exactly 2 paragraphs')
        if not 110 <= words(r) <= 150: bad('resumen words=%d' % words(r))
        if not 100 <= words(s) <= 180: bad('summary_en words=%d' % words(s))
        if not 10 <= len(p['vocab']) <= 14: bad('vocab=%d' % len(p['vocab']))
        if not 2 <= len(p['grammar']) <= 3: bad('grammar=%d' % len(p['grammar']))
        if not 1 <= len(p['idioms']) <= 2: bad('idioms=%d' % len(p['idioms']))
        if len(p['comprehension']) != 3: bad('comprehension=%d' % len(p['comprehension']))
        for g in p['grammar']:
            if g['sentence'] not in r:
                bad('grammar sentence not verbatim: %s' % g['sentence'][:60])
        n = sig(p['meta']['title'])
        for t in later_titles:
            ov = n & sig(t)
            if len(ov) >= 2:
                bad('topic overlap with "%s" (shared: %s)' % (t[:60], ', '.join(sorted(ov))))

    if errs:
        print('FAIL (%d)' % len(errs))
        for e in errs: print(' -', e)
        sys.exit(1)
    print('OK: %d new packs valid, %d total in feed' % (len(new), len(packs)))

if __name__ == '__main__':
    main()
