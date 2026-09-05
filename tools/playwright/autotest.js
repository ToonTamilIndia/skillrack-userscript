const { open, ensureLogin } = require('./lib');
const K = process.env.K || 'DT';
(async () => {
  const { browser, ctx, page } = await open({ inject: true });
  await ctx.addInitScript(() => {
    try {
      const cur = JSON.parse(localStorage.getItem('skillrack_bypass_settings') || '{}');
      Object.assign(cur, { enableAISolver: true, enableAutoSolver: true, aiProvider: 'duckduckgo', duckduckgoModel: 'claude-haiku-4-5', enablePopupMode: true, autoSolverMaxRetries: 2, autoSolverMaxSkips: 5, aiSystemPromptVersion: 7, v7ProviderMigrated: true, enableLocalServer: true });
      localStorage.setItem('skillrack_bypass_settings', JSON.stringify(cur));
      localStorage.removeItem('autosolver_stopped');
    } catch (e) { }
  });
  page.removeAllListeners('console');
  page.on('console', m => { const t = m.text(); if (/\[AI\]|\[AutoSolver\]|\[DuckDuckGo\]|\[Solutions\]|\[LocalServer\]|Captcha\] ✓|Error|error/i.test(t) && !/Mixed Content|Failed to fetch|Kill switch|Version check|localStorage' property/.test(t)) console.log('[con]', t.replace(/\n/g, ' ').slice(0, 300)); });
  await ensureLogin(page, ctx);
  await page.goto('https://www.skillrack.com/faces/candidate/dailychallenge.xhtml?k=' + K, { waitUntil: 'domcontentloaded' });
  const t0 = Date.now(); const WAIT = parseInt(process.env.WAIT || '300000');
  let last = '';
  while (Date.now() - t0 < WAIT) {
    await page.waitForTimeout(3000);
    const st = await page.evaluate(() => ({
      url: location.pathname, status: (document.getElementById('auto-solver-text') || {}).textContent || '',
      editor: !!document.querySelector('.ace_editor'), skipped: localStorage.getItem('autosolver_skipped_problems'),
      result: (document.body.innerText.match(/(Compilation Error|Runtime Error|Wrong Answer|Test Case[^\n]{0,60}|Successfully|Congratulations|PASSED|All test cases passed)[^\n]{0,80}/i) || [''])[0],
    }));
    const line = JSON.stringify(st);
    if (line !== last) { console.log(`[t+${((Date.now() - t0) / 1000).toFixed(0)}s]`, line); last = line; }
    if (/Stopped|All completed|skipped in a row/i.test(st.status)) break;
  }
  await page.screenshot({ path: `out/autotest-${K}.png`, fullPage: true });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
