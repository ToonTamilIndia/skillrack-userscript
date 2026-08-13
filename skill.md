# skill.md — SkillRack autonomous solving, end to end

> Version: CODETUTOR structure as of the latest session.
> Read `tools/README.md` for the CLI toolkit; this file is the playbook +
> contribution guide. Contributors: **you solve a problem once, we all get it.**

## 1. Site structure (things that rarely change)

- Centre: `codeprogramgroup.xhtml?gt=CODETUTOR` → **7 language packs**.
- The account must be logged in. Grab `JSESSIONID` (+ `oam.Flash.RENDERMAP.TOKEN`,
  + the `AWSALB*` cookies) from a logged-in browser tab and put it in
  `tools/cookie.txt` (gitignored) or `$SKILLRACK_COOKIE`.
- **Pack indexes** (button id `pkglistform:cttbl:<idx>:j_id_41`):

  | idx | Pack | | idx | Pack |
  |-----|------|---|-----|------|
  | 0 | C Programming | | 4 | SQL |
  | 1 | Java Programming | | 5 | Data Structures in C |
  | 2 | Python Programming | | 6 | Data Structures in Java |
  | 3 | C++ Programming |

- Each pack = ~23 sub-challenges (`pkglistform:j_id_49:<sidx>:j_id_4h`), each with
  parts (`cttbl:<row>:j_id_4u`) and each part shows **only the unsolved problems**
  (`pctbl:<row>:j_id_5w`). The list is LIVE/rotating — solve one and it disappears.
- Every click is a PrimeFaces POST carrying its own `jakarta.faces.ViewState`
  (fresh per page/form — `tools/sack.py` extracts it from the last response).
- The problem page shows the full statement + samples WITHOUT solving a captcha;
  only server-side **submission** is captcha-gated.

## 2. Solution file format (the one true contract)

One markdown file per problem in `solutions/<ProgramID>.md`:

```md
# Id <id> — <Problem Name>

```c
<full source code>
```

Verified: `<sample input> → <sample output>`
```

- **ProgramID** is the stable key — the userscript looks up `solutions/<pid>.md`
  by it.
- The code fence language tag (`c`, `cpp`, `java`, `python`) is what the userscript
  and `verify.py` use to pick the toolchain.
- `Verified:` line: paste the sample input→output you actually confirmed.

## 3. Solving a batch (the loop)

1. Enumerate: `python3 tools/enum.py <idx> --json /tmp/sack_enum.json`
   (fills `{<section>:{<part>:[{row,id,name}]}}`).
2. Fetch statements: `python3 tools/fetch.py /tmp/sack_enum.json <idx> --out /tmp/sack_stmts.json`
3. Split: `python3 tools/mkbatch.py /tmp/sack_stmts.json --n 8 --outdir /tmp/sack_batches`
4. Solve each batch (agents or humans), then verify:
   `python3 tools/verify.py solutions/<id>.md /tmp/sack_stmts.json`
   - C/C++ compile w/ `gcc`/`g++ -w -O2`; Java `javac`; Python `python3`.
   - Exit 0 = all samples PASS. Iterate until green.
5. Commit the `.md` (see §5). That's the whole contribution.

## 4. Verification pitfalls (read before trusting a FAIL)

- Scraped sample `output` is **polluted**: appended `Explanation:` prose, `&nbsp;`,
  `&#39;`, leading newlines/tabs. `verify.py` normalises whitespace but not prose,
  so many "FAIL"s are the record, not the code. Check the clean output prefix.
- Function/no-I/O problems have NO samples → cannot be auto-verified; eyeball
  the signature/format against the statement.
- Fixed-width / precision outputs: print exactly the requested decimals.

## 5. Contribution / collaboration model

- **Rules:** one problem = one `solutions/<id>.md`; real code only (compiles);
  `Verified` line reflects a real run; never edit someone else's file without
  adding a note; no personal data, no cookies in any committed file.
- **Flow:** fork → branch `add/<id>` → add `solutions/<id>.md` → run
  `verify.py` → PR. A passing verify line in the PR body is the acceptance bar.
- The repo's userscript auto-pulls solved answers straight from this repo
  (`raw.githubusercontent.com/ToonTamilIndia/skillrack-userscript/main/solutions/<id>.md`),
  with a fallback to a self-hosted local server and then AI. So a merged
  solution is instantly live for every user.
- Keep the solution bank moving: when a challenge rotates to a new unsolved set,
  re-enumerate (§3) and claim a batch.

## 6. Key invariants
- **ProgramID** is the join key between `solutions/`, `stmts_all.json`, and the live page.
- The unsolved list rotates — always enumerate fresh before bulk solving.
- `cookie.txt`, `context.md`, `docs/`, `tools/data/` are never committed.
- Bash tool timeout: run long crawls with `nohup ... &`; cap each request with
  curl `--max-time 20` (both already in `tools/sack.py`).