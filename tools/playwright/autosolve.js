// Batch auto-solve: navigate to a problem list, let the userscript's Auto Solver (DuckDuckGo, no key)
// work through it, and save every passed solution as solutions/<lang>/<ProgramID>.md.
// Env: TRACK (pack index), SUB (sub-challenge index), PART (part button index), N (problems), WAIT (ms), SOLUTIONS_DIR
const { open, ensureLogin } = require('./lib');
const fs = require('fs'); const path = require('path');
const TRACK = parseInt(process.env.TRACK || '1'), SUB = parseInt(process.env.SUB || '1');
const PARTS = (process.env.PARTS || process.env.PART || '0').split(',').map(Number);
const N = parseInt(process.env.N || '15'), WAIT = parseInt(process.env.WAIT || '1500000');
const SOLUTIONS_DIR = process.env.SOLUTIONS_DIR || path.join(__dirname, 'solutions-out');
fs.mkdirSync(SOLUTIONS_DIR, { recursive: true });
const LANG_TAG = { c: 'c', 'c++': 'cpp', cpp: 'cpp', java: 'java', python: 'python', python3: 'python', sql: 'sql' };
(async () => {
  const { browser, ctx, page } = await open({ inject: true });
  await ctx.addInitScript(() => {
    try {
      const cur = JSON.parse(localStorage.getItem('skillrack_bypass_settings') || '{}');
      Object.assign(cur, { enableAISolver: true, enableAutoSolver: true, aiProvider: 'duckduckgo', duckduckgoModel: 'claude-haiku-4-5', enablePopupMode: true, autoSolverMaxRetries: parseInt(window.__maxRetries || '2'), autoSolverMaxSkips: 8, autoSolverBackoffBase: 1000, autoSolverDelay: 200, autoSolverDelayBeforeNext: 500, aiSystemPromptVersion: 7, v7ProviderMigrated: true, enableLocalServer: true, enableFindIncomplete: false });
      localStorage.setItem('skillrack_bypass_settings', JSON.stringify(cur));
      // keep the solver parked until the harness reaches the list page
      if (!sessionStorage.getItem('harness_go')) localStorage.setItem('autosolver_stopped', 'true');
    } catch (e) { }
  });
  page.removeAllListeners('console');
  page.on('console', m => { const t = m.text(); if (/\[AutoSolver\]|\[DuckDuckGo\]|\[Solutions\]|\[AI\]|\[Captcha\] \[(ok|fail|warn)\]/.test(t) && !/Generating solution|Retrying in|Backoff/.test(t)) console.log('[con]', t.replace(/\n/g, ' ').slice(0, 220)); });
  await ensureLogin(page, ctx);
  const clickNav = async (sel) => { await page.waitForSelector(sel, { timeout: 60000 }); await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}), page.$eval(sel, el => el.click())]); await page.waitForTimeout(1500); };
  const gotoPart = async (PART) => {
    await page.evaluate(() => { sessionStorage.removeItem('harness_go'); localStorage.setItem('autosolver_stopped', 'true'); });
    await page.goto('https://www.skillrack.com/faces/candidate/codeprogramgroup.xhtml?gt=CODETUTOR', { waitUntil: 'domcontentloaded' });
    await clickNav(`#pkglistform\\:cttbl\\:${TRACK}\\:j_id_41`);
    const showIds = await page.$$eval('button', els => els.filter(b => b.textContent.trim() === 'Show').map(b => b.id));
    await clickNav('#' + showIds[SUB].replace(/:/g, '\\:'));
    const partIds = await page.$$eval('button', els => els.map(b => ({ id: b.id, text: b.textContent.trim() })).filter(b => b.id && b.text === 'View').map(b => b.id));
    if (!partIds[PART]) { console.log(`No View button for part index ${PART}`); return 0; }
    await clickNav('#' + partIds[PART].replace(/:/g, '\\:'));
    const nSolve = await page.$$eval('button', els => els.filter(b => b.textContent.trim() === 'Solve').length);
    console.log(`Part ${PART}: list page ${page.url()} with ${nSolve} Solve buttons`);
    await page.evaluate(() => { sessionStorage.setItem('harness_go', '1'); localStorage.removeItem('autosolver_stopped'); localStorage.removeItem('autosolver_consecutive_skips'); if (window.AutoSolver) window.AutoSolver.solve(); });
    return nSolve;
  };
  const TAG = process.env.TAG ? `[${process.env.TAG}] ` : '';
  const t0 = Date.now(); const solved = {}; let candidate = null; let last = '';
  const snapshot = () => page.evaluate(() => {
    const body = document.body.innerText || '';
    const pid = (body.match(/Program\s*ID\s*[:#-]?\s*(\d{2,})/i) || [])[1] || null;
    let code = null;
    try { const el = document.querySelector('.ace_editor'); if (el && el.env && el.env.editor) code = el.env.editor.getValue(); } catch (e) { }
    if (!code) { try { const el = document.querySelector('.ace_editor'); if (el && window.ace) code = ace.edit(el).getValue(); } catch (e) { } }
    if (!code) { const ta = document.getElementById('txtCode') || document.querySelector('#codediv textarea'); if (ta && ta.value) code = ta.value; }
    if (!code) { const c = document.querySelector('.ace_editor .ace_content'); if (c) code = [...c.querySelectorAll('.ace_line')].map(l => l.textContent).join('\n'); }
    const allLabels = [...document.querySelectorAll('.ui.label')];
    const pidIdx = allLabels.findIndex(l => /Program\s*ID/i.test(l.textContent));
    const title = allLabels.slice(pidIdx + 1).map(l => l.textContent.trim()).find(t => t.length > 2 && t.length < 120 && !/Max Execution|^\d+$|^SkillRack$|Valid Till|Users$/i.test(t)) || '';
    let lang = ''; const sel = [...document.querySelectorAll('select')].find(s => /java|python|c\+\+|\bc\b/i.test(s.options[s.selectedIndex]?.text || '')); if (sel) lang = sel.options[sel.selectedIndex].text.trim();
    const status = (document.getElementById('auto-solver-text') || {}).textContent || '';
    const passed = /passed/i.test(body.slice(-4000)) && !/not passed|did not pass/i.test(body.slice(-4000));
    const samples = [...document.querySelectorAll('pre')].map(p => p.textContent.trim()).slice(0, 4);
    return { url: location.pathname, pid, code, title, lang, status, passed, samples: samples.join(' || ').slice(0, 300), skipped: Object.keys(JSON.parse(localStorage.getItem('autosolver_skipped_problems') || '{}')).length };
  }).catch(() => null);
  for (const PART of PARTS) {
    if (Object.keys(solved).length >= N) break;
    const n = await gotoPart(PART);
    if (!n) continue;
    let stoppedSince = 0;
    while (Date.now() - t0 < WAIT && Object.keys(solved).length < N) {
      await page.waitForTimeout(700);
      const st = await snapshot(); if (!st) continue;
      if (st.pid && st.code && st.code.trim().length > 10) candidate = { pid: st.pid, code: st.code, title: st.title, lang: st.lang, samples: st.samples };
      const brief = `${st.url} pid=${st.pid} status="${st.status}" skipped=${st.skipped} code=${st.code ? st.code.length : 0}`;
      if (brief !== last) { console.log(`[t+${((Date.now() - t0) / 1000).toFixed(0)}s] ${brief}`); last = brief; }
      if (/PASSED|Proceed Next|Moving to next/i.test(st.status) && candidate && candidate.pid && !solved[candidate.pid] && (!st.pid || st.pid === candidate.pid)) {
        const c = candidate; solved[c.pid] = c;
        const tag = LANG_TAG[(c.lang || '').toLowerCase().split(/[\s(]/)[0]] || (c.lang || 'text').toLowerCase().split(/[\s(]/)[0];
        const langDir = { c: 'c', cpp: 'cpp', java: 'java', python: 'python', sql: 'sql' }[tag] || tag;
        const outDir = path.join(SOLUTIONS_DIR, langDir);
        fs.mkdirSync(outDir, { recursive: true });
        const md = `# Id ${c.pid} - ${c.title || 'Untitled'}\n\n\`\`\`${tag}\n${c.code.trim()}\n\`\`\`\n\nVerified: passed the SkillRack judge sample test case(s) on ${new Date().toISOString().slice(0, 10)} via the userscript auto solver (DuckDuckGo claude-haiku-4-5)\n`;
        const outFile = path.join(outDir, `${c.pid}.md`);
        if (fs.existsSync(outFile)) console.log(`${TAG}kept existing ${c.pid}.md (bank solution)`); else fs.writeFileSync(outFile, md);
        console.log(`${TAG}SOLVED ${Object.keys(solved).length}/${N}: ProgramID ${c.pid} "${c.title}" (${tag})`);
      }
      const done = /Stopped|skipped in a row|All completed|No Solve button|are skipped|open the next problem manually/i.test(st.status);
      if (done) { if (!stoppedSince) stoppedSince = Date.now(); else if (Date.now() - stoppedSince > 6000) { console.log(`Part ${PART} finished: ${st.status}`); break; } } else stoppedSince = 0;
    }
  }
  console.log(`DONE: solved ${Object.keys(solved).length} problems in ${((Date.now() - t0) / 60000).toFixed(1)} min: ${Object.keys(solved).join(', ')}`);
  await page.screenshot({ path: 'out/autosolve-end.png', fullPage: true }).catch(() => {});
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
