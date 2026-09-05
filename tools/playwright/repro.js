const { open, ensureLogin } = require('./lib');
(async () => {
  const { browser, ctx, page } = await open({ inject: true, script: process.env.SCRIPT });
  await ensureLogin(page, ctx);
  await page.goto('https://www.skillrack.com/faces/candidate/dailychallenge.xhtml?k=DC', { waitUntil: 'domcontentloaded' });
  const t0 = Date.now();
  const deadline = t0 + (parseInt(process.env.WAIT || '60000'));
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    const st = await page.evaluate(() => ({ cap: !!document.getElementById('capval'), capv: (document.getElementById('capval') || {}).value, run: [...document.querySelectorAll('button')].some(b => /Run|Save/.test(b.textContent)), growl: [...document.querySelectorAll('.ui-growl-message')].map(e => e.textContent.trim()).join('|'), ls: { r: localStorage.getItem('skillrack_captcha_retries'), p: localStorage.getItem('skillrack_captcha_pending'), f: localStorage.getItem('skillrack_captcha_failed') } }));
    console.log(`[t+${((Date.now() - t0) / 1000).toFixed(0)}s]`, JSON.stringify(st));
    if (st.run) { console.log('SUCCESS: editor reached'); break; }
  }
  await page.screenshot({ path: 'out/repro-end.png', fullPage: true });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
