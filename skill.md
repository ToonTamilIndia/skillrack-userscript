# skill.md: SkillRack autonomous solving, end to end

This is the playbook for the repository. It describes how SkillRack is laid out,
how a problem is solved and verified, how a solution is contributed, and how the
userscript consumes the result. `tools/README.md` documents the command line
toolkit; `README.md` documents the userscript for end users.

The rule that makes the bank useful: one contributor solves a problem once, with
a verified answer, and every user of the userscript gets it from then on.

## 1. Site structure

SkillRack is a JSF / PrimeFaces application. Almost every click is a POST that
carries a `jakarta.faces.ViewState` token taken from the previous response.

### Entry points

| Level | URL | Content |
|-------|-----|---------|
| Level 1 | `codeprogramgroup.xhtml?gt=CODETUTOR` | Seven language packs: C, Java, Python, C++, SQL, Data Structures in C, Data Structures in Java. Each pack has about 23 sub-challenges (INTRO, STARTER, VERY-EASY, EASY, EASY ADD-ON, AVERAGE, LAB ADD-ON, practice, videos). Some problems are fill-in-the-blank (MFIB). |
| Level 2 | `codeprogramgroup.xhtml?gt=CODETRACK&lev=2` | KICKSTART for absolute beginners, including a Recursion sub-challenge. |
| Level 3 | `codeprogramgroup.xhtml?gt=CODETRACK&lev=3` | MNC Companies: Cognizant CTS 35 programs, InfyTQ, MNC Companies Programs SET 001 to 020. |
| Level 4 | `codeprogramgroup.xhtml?gt=CODETRACK&lev=4` | Data Structures and Algorithms: Stack, Queue, Binary Tree, Sorting. |
| Level 5 | `codeprogramgroup.xhtml?gt=CODETRACK&lev=5` | Product Companies. Wallet-gated kit: the list shows names only, no ProgramIDs, until points are spent. |
| Level 6 | `codeprogramgroup.xhtml?gt=CODETRACK&lev=6` | Dream Product Companies and Mini Projects. Wallet-gated. |
| Prime | `codeprogramgroup.xhtml?gt=CODETRACK&lev=100` | Dream Companies Placement Pack. Wallet-gated. |
| LACS | `webinarcodetrack.xhtml` | Live assisted coding sessions. |
| LAB | `labcodeprograms.xhtml?type=LAB` | Lab programs. |
| Daily | `dailychallenge.xhtml?k=DC` and `k=DT` | Daily Challenge and Daily Test. One problem each, always behind a captcha. Excluded from the incomplete scanner. |

### Navigating a pack (Level 1)

Pack buttons on the centre page: `pkglistform:cttbl:<idx>:j_id_41` with
`0=C 1=Java 2=Python 3=C++ 4=SQL 5=DS-C 6=DS-Java`.

Inside a pack: sub-challenge buttons `pkglistform:j_id_49:<sidx>:j_id_4h`
(labelled Show). Inside a sub-challenge: part cards with a View button
`cttbl:<row>:j_id_4u`. A part page (`codeprogram.xhtml`) lists only the unsolved
problems, each with a Solve button, and every card shows `ProgramID- <id>`. The
list is live: a solved problem disappears from it.

Completed parts show a Completed tag and a feedback form instead of a View
button. The hands-on courses (`H001` style names) open `tutorprogram.xhtml`
lessons rather than problem lists.

### The problem page

`codeprogram.xhtml` (tracks) and `tutorprogram.xhtml` (tutorials) show the full
statement, sample input and output, and a captcha panel:

* image `j_id_51` (350 by 50, white on black, roll number on line one and an
  expression such as `23+7=` on line two)
* input `capval`
* button `proceedbtn`, a PrimeFaces AJAX call that re-renders `programgrid`

A wrong answer keeps the same image and shows an "Incorrect Captcha Value"
growl. A correct answer replaces the panel with the ACE editor, the language
selector and the Run and Save buttons. Only submission is captcha-gated; the
statement is readable without solving it.

### Authentication for the tools

The tools need a logged-in session. Copy `JSESSIONID`, `oam.Flash.RENDERMAP.TOKEN`
and the `AWSALB*` cookies from a browser tab into `tools/cookie.txt` (gitignored)
or export `SKILLRACK_COOKIE`. The login form itself posts `j_username` and
`j_password` to `j_security_check`; the login page is served at any URL without
a redirect, so detect it by the presence of the `j_username` input.

## 2. Solution file format

One markdown file per problem per language at `solutions/<lang>/<ProgramID>.md`:

````md
# Id 12345 - Problem Name

```c
<full source code>
```

Verified: <sample input> -> <sample output>
````

* The ProgramID is the stable key. The userscript requests
  `solutions/<lang>/<ProgramID>.md` by it.
* The fence language tag (`c`, `cpp`, `java`, `python`, `sql`) selects the
  toolchain for `verify.py` and tells the userscript which editor language to
  expect.
* The `Verified:` line records what was actually confirmed: the sample you ran,
  or the judge result when the file was produced by the auto solver.
* Store the full program. When a problem has pre-code and post-code the
  userscript strips them and inserts only the middle.
* Never use `head` or `tail` as identifiers; the judge rejects them. Use
  `lhead` and `ltail`.

## 3. Solving a batch

1. Enumerate. `python3 tools/enum.py <idx> --json /tmp/enum.json` for a Level 1
   pack, or `python3 tools/enum.py 0 --lev <2..6|100> --json /tmp/enum.json` for
   a track level. Output: `{section: {part: [{row, id, name}]}}`.
2. Fetch statements. `python3 tools/fetch.py /tmp/enum.json <idx> --out /tmp/stmts.json`
   for Level 1, or `python3 tools/fetchlev.py /tmp/enum.json --lev <N> --out /tmp/stmts.json`
   for track levels.
3. Split. `python3 tools/mkbatch.py /tmp/stmts.json --n 8 --outdir /tmp/batches`.
4. Search first. For each problem search GitHub and the web for the exact
   problem name (`"<problem name>" skillrack`, `site:github.com "<problem name>"`).
   A found reference is cross-checked against the statement. Only when nothing
   is found, or the reference fails, write the solution yourself or with AI.
5. Verify. `python3 tools/verify.py solutions/<lang>/<id>.md /tmp/stmts.json`. C and C++
   compile with `gcc`/`g++ -w -O2`, Java with `javac`, Python with `python3`.
   Exit code 0 means every sample passed. Function-only problems have no `main`
   and cannot link; build a small harness that reads the sample input, calls the
   function and compares with the clean expected output, and save only the
   function in the `.md`.
6. Track. `python3 tools/status.py /tmp/stmts.json --md document.md` regenerates
   the solved and pending report.
7. Commit the `.md` (section 5).

### Batch solving with the userscript

`tools/playwright/autosolve.js` drives the real site in headless Chromium: it
logs in, opens a part list, turns on the userscript's auto solver with the
keyless DuckDuckGo provider, and writes every solution that passes the judge to
`solutions/<lang>/<ProgramID>.md` with a `Verified:` line. Problems the solver cannot
pass after three attempts are parked on its skip list and become the to-do list
for a human contributor.

```
cd tools/playwright && npm install && npx playwright install chromium
export SKILLRACK_USER='rollno@college' SKILLRACK_PASS='...'
TRACK=1 SUB=1 PART=0 N=15 SOLUTIONS_DIR=../../solutions node autosolve.js
```

`TRACK` is the pack index, `SUB` the sub-challenge index (in Show button order)
and `PART` the part index (in View button order).

## 4. Verification pitfalls

* Scraped sample output is polluted: appended `Explanation:` prose, `&nbsp;`,
  `&#39;`, leading newlines or tabs. `verify.py` normalises whitespace but not
  prose, so a FAIL can be the record rather than the code. Compare the clean
  prefix by eye before trusting it.
* Function-only problems have no samples and cannot be auto-verified; check the
  signature and output format against the statement.
* Fixed-width and precision output must match exactly; print the requested
  number of decimals.
* Inputs may arrive on one line or several with stray carriage returns. Read
  tokens, not lines, unless a line legitimately contains spaces.
* Use 64-bit accumulators. Overflow is the most common hidden-test failure.

## 5. Contribution model

Rules: one problem is one `solutions/<lang>/<id>.md`; real code that compiles; a
`Verified` line that reflects a real run; do not edit someone else's file
without adding a note; no personal data and no cookies in any committed file.

Flow: fork, branch `add/<id>`, add the file, run `verify.py`, regenerate the
tracker with `tools/status.py --md document.md`, open a pull request with the
passing verify line in the body. That line is the acceptance bar.

Once merged, a solution is live for every user immediately. The userscript
fetches `raw.githubusercontent.com/<owner>/skillrack-userscript/main/solutions/<lang>/<id>.md`
with `credentials: 'omit'` (GitHub answers `Access-Control-Allow-Origin: *`, so
a credentialed request would be rejected). For development the "Solutions Base
URL" setting can point at `http://localhost:3000` with `node solutions-server.js`.

## 6. How the userscript uses the bank

Order of sources when a solution is requested:

1. SkillRack's own View Solution, when present.
2. `solutions/<lang>/<ProgramID>.md` from GitHub or the local server (by editor language).
3. The AI provider (DuckDuckGo by default, no key), with statement, samples and
   pre or post code.

If inserted code fails the judge, the next attempt skips the saved answer and
sends the failing code plus the judge output to the AI provider. After
`autoSolverMaxRetries` failures the problem goes on the skip list
(`localStorage.autosolver_skipped_problems`) and the solver presses Back and
opens the next unsolved problem. Nothing on the list is retried until the user
clears it (Settings, Auto Solver, Clear list) or clicks retry on one entry.
After `autoSolverMaxSkips` consecutive skips the solver stops.

Run is never clicked on an empty editor. SkillRack's reset hooks can wipe a
programmatically inserted solution in the gap between generation and submit, so
the solver keeps the last inserted code, re-asserts it in the live editor (ACE
session or plain `#txtCode` textarea) and syncs ACE → `#txtCode` immediately
before the Run click; if the editor still cannot hold the code the attempt is
retried rather than submitted empty. A missing AI or Run button during a retry
re-adds the button and counts as a failed attempt instead of aborting.

The captcha solver crops the expression line, inverts and upscales it, reads it
with a Tesseract worker restricted to digits, plus and equals, and votes across
three image variants. It watches the DOM after each submit, retries up to three
times excluding rejected sums, then asks the user.

The incomplete scanner (Find Incomplete in the top menu) crawls every level in
section 1 with its own fetch queue and ViewState replay, scanning the level of
the current page first and rendering results after each level. Wallet-gated
levels report a scan failure for that level without stopping the others.

## 7. Key invariants

* ProgramID joins `solutions/`, the statement caches and the live page.
* The unsolved list rotates; always enumerate fresh before a bulk solve.
* `cookie.txt`, `context.md`, `docs/`, `tools/data/`, `tools/playwright/state.json`
  and `tools/playwright/out/` are never committed.
* Long crawls run with `nohup ... &`; every request is capped with
  `--max-time 20` in `tools/sack.py`.
