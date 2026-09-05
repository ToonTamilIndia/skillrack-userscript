const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const USER = process.env.SKILLRACK_USER, PASS = process.env.SKILLRACK_PASS;
if (!USER || !PASS) { console.error('Set SKILLRACK_USER and SKILLRACK_PASS'); process.exit(1); }
const STATE = path.join(__dirname, 'state.json');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
async function open({ inject = false, script = process.env.SCRIPT || path.join(__dirname, '..', '..', 'userscript.user.js'), headless = true } = {}) {
  const browser = await chromium.launch({ headless });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: fs.existsSync(STATE) ? STATE : undefined });
  // Block the remote kill switch / update check so the script fails open; with SOLUTIONS_OK=1 the
  // solutions/<id>.md files are still allowed through, with NOBLOCK=1 nothing is blocked.
  if (!process.env.NOBLOCK) {
    if (process.env.SOLUTIONS_OK) await ctx.route(/raw\.githubusercontent\.com\/.*\/(kill\.txt|userscript\.user\.js)/, r => r.abort());
    else await ctx.route(/raw\.githubusercontent\.com/, r => r.abort());
  }
  await ctx.route(/js\.puter\.com/, r => r.abort());
  const wrong = parseInt(process.env.WRONG || '0');
  await ctx.addInitScript((w) => { try { localStorage.setItem('skillrack_bypass_disclaimer_accepted', 'true'); localStorage.removeItem('skillrack_captcha_retries'); localStorage.removeItem('skillrack_captcha_pending'); localStorage.removeItem('skillrack_captcha_failed'); } catch (e) {} if (window.__wrongLeft === undefined) window.__wrongLeft = w; }, wrong);
  if (inject) {
    const tess = fs.readFileSync(path.join(__dirname, 'tesseract.min.js'), 'utf8');
    const us = fs.readFileSync(script, 'utf8');
    await ctx.addInitScript({ content: tess + '\n;' + us });
  }
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(60000);
  page.on('console', m => { const t = m.text(); if (/Captcha|SkillRack|Anti-cheat|Tesseract|worker/i.test(t) && !/Mixed Content/.test(t)) console.log('[con]', t.slice(0, 400)); });
  page.on('dialog', async d => { console.log('[dialog]', d.type(), d.message().replace(/\n/g,' ').slice(0, 200)); await d.dismiss(); });
  page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 300)));
  page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('[nav]', f.url()); });
  return { browser, ctx, page };
}
async function ensureLogin(page, ctx) {
  await page.goto('https://www.skillrack.com/faces/candidate/codeprogramgroup.xhtml?gt=CODETUTOR', { waitUntil: 'domcontentloaded' });
  if (await page.$('input[name=j_username]')) {
    await page.fill('input[name=j_username]', USER); await page.fill('input[name=j_password]', PASS);
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}), page.click('input[type=submit][value=Login]')]);
    await page.waitForTimeout(1500);
    await page.goto('https://www.skillrack.com/faces/candidate/codeprogramgroup.xhtml?gt=CODETUTOR', { waitUntil: 'domcontentloaded' });
  }
  await ctx.storageState({ path: STATE });
}
async function dump(page, name) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  fs.writeFileSync(path.join(OUT, name + '.html'), await page.content());
  const info = await page.evaluate(() => {
    const q = s => [...document.querySelectorAll(s)];
    return {
      title: document.title, url: location.href,
      buttons: q('button, input[type=submit]').slice(0, 60).map(b => ({ id: b.id, text: (b.textContent || b.value || '').trim().slice(0, 40), onclick: (b.getAttribute('onclick') || '').slice(0, 160) })),
      links: q('a[href]').filter(a => !/^(#|javascript)/.test(a.getAttribute('href'))).slice(0, 40).map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 40) })),
      imgs: q('img').map(i => ({ id: i.id, w: i.width, h: i.height, src: i.src.slice(0, 60), len: i.src.length })),
      inputs: q('input').map(i => ({ id: i.id, name: i.name, type: i.type })),
      growl: q('.ui-growl-item, .ui-messages, .ui-message').map(e => e.textContent.trim().slice(0, 100)),
    };
  });
  console.log('== ' + name, JSON.stringify(info, null, 1).slice(0, 6000));
  return info;
}
module.exports = { open, ensureLogin, dump, OUT };
