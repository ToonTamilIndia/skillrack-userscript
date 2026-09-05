# SkillRack Userscript and Solution Bank

<p>
  <img alt="Version" src="https://img.shields.io/badge/userscript-v7.0-2563eb?style=flat-square">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-16a34a?style=flat-square">
  <img alt="Solutions" src="https://img.shields.io/badge/solutions-410%2B-7c3aed?style=flat-square">
  <img alt="AI" src="https://img.shields.io/badge/AI-DuckDuckGo%20(no%20key)-f97316?style=flat-square">
</p>

A Tampermonkey userscript for SkillRack plus a shared bank of verified solutions.
The script restores clipboard and tab behaviour in the editor, solves the math
captcha with OCR, fetches solved answers from this repository by ProgramID, and
falls back to a free AI provider when no saved answer exists. The auto solver can
work through a whole problem list on its own and parks anything it cannot solve.

Please disable the script during invigilated tests. Use it at your own academic
discretion. See the Disclaimer section.

## Contents

1. [What is in this repository](#what-is-in-this-repository)
2. [Version 7.0](#version-70)
3. [Installation](#installation)
4. [How a problem gets solved](#how-a-problem-gets-solved)
5. [Auto solver](#auto-solver)
6. [Captcha solver](#captcha-solver)
7. [AI providers](#ai-providers)
8. [Settings reference](#settings-reference)
9. [Anti-cheat bypasses](#anti-cheat-bypasses)
10. [Contributing solutions](#contributing-solutions)
11. [Troubleshooting](#troubleshooting)
12. [Testing with Playwright](#testing-with-playwright)
13. [Remote control](#remote-control)
14. [Disclaimer](#disclaimer)
15. [Changelog](#changelog)
16. [Credits](#credits)

## What is in this repository

| Path | Purpose |
|------|---------|
| `userscript.user.js` | The Tampermonkey script (client). |
| `solutions/<ProgramID>.md` | One verified solution per problem, keyed by SkillRack ProgramID. |
| `skill.md` | The playbook: site structure, solving loop, verification, contribution rules. |
| `tools/` | Python and curl toolkit to enumerate, fetch, verify and track problems. |
| `tools/playwright/` | Browser harness used to test the userscript against the live site. |
| `duckduckgo-api/` | Cloudflare Worker that proxies DuckDuckGo AI Chat (keyless AI provider). |
| `document.md` | Generated tracker of solved and pending problems. |
| `solutions-server.js` | Optional local static server for `solutions/` during development. |
| `kill.txt` | Remote kill switch read by the script. |

## Version 7.0

Version 7.0 is a reliability release. Every change below was verified against the
live site with the Playwright harness in `tools/playwright/`.

### Captcha solver rewritten

* The Proceed button on SkillRack is a PrimeFaces AJAX call. A wrong answer does
  not reload the page; it re-renders the panel and shows an "Incorrect Captcha
  Value" growl. Earlier versions only detected failure on page load, so after one
  wrong guess nothing happened. The solver now watches the DOM after each submit
  and retries in place.
* The retry counter is no longer reset by the page load handler, so the limit of
  three attempts is honoured. After three rejections a manual prompt appears and
  keeps asking until the captcha is accepted.
* OCR runs once per page. The old code started two concurrent OCR passes and
  submitted twice.
* Tesseract.js v7 ignores recognition parameters passed to `Tesseract.recognize`.
  The solver now uses a persistent worker with `setParameters`, so the digit
  whitelist and single-line mode actually apply.
* The image is cropped to the expression line, inverted, upscaled four times and
  read by three image variants with a majority vote. Answers the server already
  rejected are excluded from later votes. In testing this reads fresh captchas
  correctly on the first attempt in well over 95 percent of loads.

### Auto solver: skip and move on

* When a problem exhausts its retries it is recorded as "temporarily cannot
  solve" and the solver clicks Back, returns to the list and opens the next
  problem that is not on that list.
* A problem on the list is never re-attempted, even if the solver lands on it
  again. A pass resets the streak; after `autoSolverMaxSkips` (default 5) skips in
  a row the solver stops instead of looping.
* The status pill has a SKIP button for manual skips and a CLEAR SKIPS button that
  also appears in the stopped state next to RESUME.
* Settings, Auto Solver section, lists the skipped problems with reason and time,
  a retry link per problem and a Clear list button.

### Saved solutions from GitHub now work

The "Solved Solutions" feature never worked in 6.x. Its fetch helper only existed
inside the Find Incomplete module, so every call threw a ReferenceError, and the
request sent cookies to `raw.githubusercontent.com`, whose `*` CORS header makes
browsers reject credentialed requests. Both are fixed and the feature is on by
default. Roughly 390 solutions are tried before any AI call.

### Keyless AI by default

The default provider is now DuckDuckGo AI through the proxy worker. No API key
is required. The default model is `claude-haiku-4-5` with automatic fallback to
`gpt-oss-120b` and others when DuckDuckGo retires a model. Users who never set a
Gemini key are migrated automatically.

### Stronger system prompt

The default prompt targets hidden test cases: 64-bit overflow, time limits,
SkillRack input quirks, exact output formatting, the `head`/`tail` identifier
ban, pre and post code handling, MFIB line counts and a self-verification pass.
Existing custom prompts are preserved.

### Auto solver reliability

* Saved solutions were inserted and then wiped by SkillRack's editor hooks a
  moment later; insertion now targets the visible editor and re-applies itself.
* The auto solver treated an instantly inserted saved solution as a failed
  generation because the button never showed "Generating"; a changed editor
  now counts as a completed generation.
* Run is never clicked on an empty editor or on SkillRack's untouched template.
* List cards are parsed by their `(Id-1234)` suffix, so parked problems are
  skipped reliably and re-landing on one no longer burns the skip streak.
* Backoff and delays are configurable (`autoSolverBackoffBase`,
  `autoSolverDelayBeforeNext`) for batch runs.

### Find Incomplete

* Scans the level of the current page first and renders after every level.
* Request pacing reduced from 300 to 500 ms to 100 to 200 ms per request.
* A level that fails to scan (wallet-gated kits) no longer aborts the others.

### Providers

* DuckDuckGo worker: syntax error fixed, token fetch retries on both
  `duck.ai` and `duckduckgo.com`. Note that DuckDuckGo rate limits and
  sometimes blocks the shared Cloudflare egress IP; self-hosting the worker
  gives you your own quota.
* Default model ids refreshed against the live endpoints: OpenRouter
  `z-ai/glm-5.2:free`, NVIDIA `deepseek-ai/deepseek-v4-pro-0813`.

### Other fixes

* A `mutation.addNodes` typo that raised "not iterable" errors on every DOM change.
* Version and banner updated to 7.0.

### Known limitation

Function-style problems whose saved `.md` holds a full program while the page
supplies pre and post code can still fail; the middle-code extraction is not
yet reliable for those files.

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Edge, Firefox, Safari).
2. Open `userscript.user.js` in this repository and copy its contents into a new
   Tampermonkey script, or install it from the raw URL:
   `https://raw.githubusercontent.com/ToonTamilIndia/skillrack-userscript/main/userscript.user.js`
3. Log in to SkillRack. Accept the disclaimer on first run.
4. Open the settings panel with the gear button in the bottom right corner.
   Everything works with default settings; no API key is needed.

## How a problem gets solved

When you press AI Solution, or when the auto solver runs, the script tries these
sources in order and stops at the first one that produces code:

1. SkillRack's own View Solution button, when the site offers one.
2. `solutions/<ProgramID>.md` from this repository (or your local server).
3. The configured AI provider, with the problem statement, sample I/O and any
   pre or post code.

If the inserted code fails the judge, the next attempt skips the saved answer and
sends the failing code together with the judge output (input, expected, actual)
to the AI provider so it can fix the real cause. After the retry limit the
problem is parked on the skip list and the solver moves on.

## Auto solver

Enable "Enable AI Solver" and "Auto Solver" in settings, then open a problem list
or a problem page. The solver:

1. Opens the first problem on the list that is not on the skip list.
2. Waits for the captcha solver to pass the captcha.
3. Generates a solution, inserts it and presses Run.
4. On success presses Proceed Next and continues.
5. On failure retries with the judge output as context, up to
   `autoSolverMaxRetries` times, then skips the problem and goes back to the list.

Controls on the status pill: STOP, SKIP, CLEAR SKIPS and, when stopped, RESUME.
The stop state persists across reloads.

## Captcha solver

The captcha image is 350 by 50 pixels, white text on black, with the roll number
on the first line and an expression such as `23+7=` on the second. The solver
crops the second line, inverts it, upscales it and reads it with Tesseract.js
using a whitelist of digits, plus and equals. Three image variants vote; the
majority answer is submitted. Rejected answers are excluded from later votes.
After three rejections a prompt asks you to type the answer.

The username field in settings is optional. The username is detected from the
page header and stripped from any full-image OCR pass automatically.

## AI providers

| Provider | Key | Notes |
|----------|-----|-------|
| DuckDuckGo AI (default) | none | Proxied through a Cloudflare Worker. Models: `claude-haiku-4-5`, `gpt-oss-120b`, `gpt-5.4-mini`, `gpt-5.4-nano`, `gemma-4-31b`, `mistral-small-4`, `mistral-small-2603`, `claude-4-5-haiku`. Availability changes without notice; the script falls back automatically. |
| Google Gemini | free tier | Key from Google AI Studio. |
| OpenAI | paid | Key from platform.openai.com. |
| OpenRouter | free and paid | Dynamic model list with search and a free-only filter. |
| G4F | account | g4f.space. |
| Puter.js | none | Loaded from js.puter.com. |
| OpenAI-compatible | optional | Any `/v1` endpoint: OpenAI, OpenRouter, LM Studio, Ollama, local servers. |
| NVIDIA NIM | free tier | Keys start with `nvapi-`. |

### Self-hosting the DuckDuckGo proxy

```bash
cd duckduckgo-api
npm install
wrangler login
wrangler deploy
```

Set the worker URL in settings under "DuckDuckGo API URL". See
`duckduckgo-api/README.md` for the API key option and endpoints.

## Settings reference

### Anti-cheat bypasses

| Setting | Default |
|---------|---------|
| Tab Detection Bypass | on |
| Copy/Paste Bypass | on |
| Fullscreen Bypass | on |
| Multi-Monitor Bypass | on |
| Block Telemetry | on |

### Editor features

| Setting | Default |
|---------|---------|
| Drag and Drop | on |
| Text Selection | on |
| Context Menu | on |
| Full Screen Copy Mode | off |
| Popup Mode (status pills) | off |

### Captcha solver

| Setting | Default |
|---------|---------|
| Auto-Solve Captcha | on |
| Username (optional) | empty, auto-detected |

### AI and auto solver

| Setting | Default |
|---------|---------|
| Enable AI Solver | on |
| AI Provider | DuckDuckGo AI |
| DuckDuckGo Model | claude-haiku-4-5 |
| DuckDuckGo API URL | default proxy |
| System prompt | v7 default (editable) |
| Auto Solver | off |
| Auto Solver max retries | 3 |
| Auto Solver max skips in a row | 5 |
| Solved Solutions (GitHub / local server) | on |
| Solutions Base URL | GitHub raw URL of this repository |
| Incomplete Question scanner | on |

Reload the page after changing settings.

## Anti-cheat bypasses

| Area | Method |
|------|--------|
| Tab switching | `document.visibilityState` and `document.hidden` are spoofed; `visibilitychange` listeners are blocked. |
| Clipboard | Capture-phase listeners run before the site's jQuery handlers; ACE command registration for `bte` is intercepted; late-injected blocking scripts are neutralised. |
| Drag and drop, selection | Inline `ondragstart`, `ondrop` and `onselectstart` attributes are removed; `user-select: text` is forced. |
| Fullscreen | `fscr()` and the fullscreen dialog are neutralised so Proceed still submits. |
| Multi-monitor | `window.screen` position properties are normalised. |
| Telemetry | Heartbeat and proctoring endpoints receive a fake successful response. |

## Contributing solutions

One problem is one file, `solutions/<ProgramID>.md`:

````md
# Id 12345 - Problem Name

```c
<full source code>
```

Verified: <sample input> -> <sample output>
````

Workflow: fork, branch `add/<id>`, add the file, run
`python3 tools/verify.py solutions/<id>.md <stmts.json>`, regenerate the tracker
with `python3 tools/status.py --md document.md`, open a pull request with the
passing verify line in the body. The full process, including enumeration and
fetching statements, is in `skill.md`.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Script does not load | Accept the disclaimer; look for kill switch messages in the console. |
| Captcha not solved | Wait for Tesseract to download on first run (a few seconds). Console lines start with `[Captcha]`. After three rejections a prompt appears. |
| Saved solution not used | The console shows `[Solutions] Used <url>` on success or `[LocalServer] Failed` with the reason. A 404 means no file exists for that ProgramID yet. |
| AI returns nothing | Console lines start with `[AI]` or `[DuckDuckGo]`. A 429 means the proxy is rate limited; wait a minute. |
| Auto solver keeps stopping | Open Settings, Auto Solver, and clear the skip list, or raise `autoSolverMaxSkips`. |
| Clipboard still blocked | Confirm the script runs at `document-start` and reload. |

## Testing with Playwright

`tools/playwright/` contains the harness used to verify the script. It logs in
with credentials from environment variables, injects Tesseract and the
userscript, opens the Daily Challenge page (which always shows a captcha) and
records what the script does.

```bash
cd tools/playwright
npm install
npx playwright install chromium
SKILLRACK_USER=... SKILLRACK_PASS=... node repro.js        # captcha happy path
SKILLRACK_USER=... SKILLRACK_PASS=... node ocrbench.js     # OCR accuracy on fresh captchas
SKILLRACK_USER=... SKILLRACK_PASS=... node autotest.js     # auto solver with DuckDuckGo
```

See `tools/README.md` for details.

## Remote control

The script reads `kill.txt` from this repository on start. `true` allows the
script to run; `false` disables it with a message. It also compares its version
with the `@version` of the script on GitHub and asks the user to update when a
newer version exists. Both checks fail open when GitHub is unreachable.

## Disclaimer

This script is provided as is, without warranty of any kind. The authors are not
responsible for any consequences of its use, including academic penalties,
account suspension or legal consequences. Bypassing anti-cheat measures may
violate your institution's academic integrity policy. You are solely responsible
for your actions. Disable the script during tests and examinations.

## Changelog

### v7.0

* Captcha solver rewritten: AJAX-aware retry, three attempts then manual prompt,
  single OCR run, real Tesseract parameters, cropped and voted OCR.
* Auto solver parks unsolvable problems and moves on; skip list with clear and
  retry controls; stop after a configurable number of consecutive skips.
* Solved Solutions from GitHub fixed (scope and CORS) and enabled by default.
* DuckDuckGo AI is the default provider; model list refreshed; automatic model
  fallback; users without a Gemini key migrated.
* New default system prompt aimed at hidden test cases.
* Fixed the `addNodes` typo that spammed console errors.

### v6.1

* Judge failures on saved solutions fall back to the AI fixer.
* Level 3 answers cross-checked against reference implementations.

### v6.0

* Multi fill-in-the-blank support, incomplete-track scanner, provider and
  settings improvements. Contributed by Aron-2005 and Vishnu-tppr.

### v4.6 and earlier

* Update check, disclaimer, kill switch, OpenRouter and G4F providers, settings
  panel, AI solution generator, captcha solver.

## License

MIT

## Credits

* ToonTamilIndia: main development.
* [Aron-2005](https://github.com/Aron-2005) and [Vishnu-tppr](https://github.com/Vishnu-tppr): MFIB support, incomplete-track scanner, provider improvements.
* [adithyagenie](https://github.com/adithyagenie/skillrack-captcha-solver): original captcha solver.
