#!/usr/bin/env python3
"""Enumerate unsolved problems for a language pack.

Usage: python3 enum.py <pack_index> [--json <out.json>]

pack_index (CODETUTOR):
  0 = C         1 = Java         2 = Python
  3 = C++       4 = SQL          5 = Data Structures in C
  6 = Data Structures in Java

Outputs a JSON dict: { "<section name>": { "<part name>": [ {row, id, name} ] } }
Only unsolved problems are shown by SkillRack.
The site's problem list is LIVE/rotating (solved entries disappear).
"""
import re, json, sys, time
import sack

PACKS = {0: 'C', 1: 'Java', 2: 'Python', 3: 'C++', 4: 'SQL', 5: 'DS-C', 6: 'DS-Java'}


def part_cards(list_html):
    cards = []
    for m in re.finditer(r'<button id="cttbl:(\d+):j_id_4u"', list_html):
        idx = m.start()
        seg = list_html[max(0, idx - 1800):idx]
        nm = re.findall(r'<b>([^<]+)</b>', seg)
        cards.append({'row': int(m.group(1)), 'name': nm[-1].strip() if nm else '?'})
    return sorted(cards, key=lambda c: c['row'])


def extract_problems(list_html):
    probs = []
    for m in re.finditer(r'<button id="pctbl:(\d+):j_id_5w"', list_html):
        idx = m.start()
        seg = list_html[max(0, idx - 900):idx]
        idm = re.search(r'\(Id-(\d+)\)', seg)
        nm = re.search(r'>\s*([^<>]*?)\s*\(Id-', seg)
        probs.append({'row': int(m.group(1)),
                      'id': idm.group(1) if idm else None,
                      'name': nm.group(1).strip() if nm else '?'})
    return sorted(probs, key=lambda p: p['row'])


def main():
    pack = int(sys.argv[1])
    global PACK_BTN
    PACK_BTN = pack
    outjson = None
    if '--json' in sys.argv:
        outjson = sys.argv[sys.argv.index('--json') + 1]
    print('Pack', pack, '=', PACKS.get(pack), flush=True)
    sack.get(sack.BASE, name='pack_root.html')  # warm session, grab cookie
    out = {}
    for sidx in range(23):
        body = sack.get(sack.BASE, name='e{}.html'.format(sidx))
        body = open_pack(body)
        if len(body) < 1000:
            print('[{s}] SHORT'.format(s=sidx)); continue
        subname = sack.crumb(body)
        cards = part_cards(body)
        sub_vs = sack.viewstate(body)
        out[subname] = {}
        for card in cards:
            b2 = sack.get(sack.CODENV, {
                'codetracks_SUBMIT': '1',
                'cttbl:{r}:j_id_4u'.format(r=card['row']): 'cttbl:{r}:j_id_4u'.format(r=card['row']),
                'jakarta.faces.ViewState': sub_vs}, referer=sack.BASE,
                name='part_{s}_{c}.html'.format(s=sidx, c=card['row']))
            if len(b2) < 1000:
                print('  part', card['name'], 'short'); continue
            probs = extract_problems(b2)
            out[subname][card['name']] = probs
            first = probs[0]['name'] if probs else 'NONE'
            print('[{s}] {c} => {n} first={f}'.format(s=sidx, c=card['name'], n=len(probs), f=first))
            time.sleep(0.15)
        # save incrementally
        json.dump(out, open(outjson or '/tmp/sack_enum.json', 'w'), indent=1)
    if outjson:
        json.dump(out, open(outjson, 'w'), indent=1)
        print('wrote', outjson)


def open_pack(body):
    vs = sack.viewstate(body)
    return sack.get(sack.BASE, {
        'pkglistform_SUBMIT': '1',
        'pkglistform:cttbl:{p}:j_id_41'.format(p=PACK_BTN): 'pkglistform:cttbl:{p}:j_id_41'.format(p=PACK_BTN),
        'jakarta.faces.ViewState': vs}, name='pack.html')


if __name__ == '__main__':
    main()