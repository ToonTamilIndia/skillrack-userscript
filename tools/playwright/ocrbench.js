// Run repro.js once first so state.json (logged-in session) exists.
const { chromium } = require('playwright'); const fs = require('fs');
const N = parseInt(process.env.N || '8');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const fs0 = require('fs'); const ctx = await browser.newContext({ storageState: fs0.existsSync('state.json') ? 'state.json' : undefined });
  await ctx.addInitScript({ content: fs.readFileSync('tesseract.min.js', 'utf8') });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 300)));
  const rows = [];
  for (let n = 0; n < N; n++) {
    await page.goto('https://www.skillrack.com/faces/candidate/dailychallenge.xhtml?k=' + (n % 2 ? 'DT' : 'DC'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const res = await page.evaluate(async () => {
      const img = document.querySelector('#codeeditorpanel img[src^="data:image"]');
      if (!img) return null;
      const W = img.naturalWidth, H = img.naturalHeight, y0 = Math.floor(H * 0.5), sh = H - y0;
      const thresh = (ctx, w, h, t, inv) => { const d = ctx.getImageData(0, 0, w, h); const a = d.data; for (let i = 0; i < a.length; i += 4) { const l = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]; const v = inv ? (l > t ? 0 : 255) : (l < t ? 0 : 255); a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 255; } ctx.putImageData(d, 0, 0); };
      const mk = (scale, mode, t) => {
        const pad = 10 * scale;
        // step 1: native-res crop canvas
        const c1 = document.createElement('canvas'); c1.width = W; c1.height = sh; const x1 = c1.getContext('2d');
        x1.fillStyle = '#000'; x1.fillRect(0, 0, W, sh); x1.drawImage(img, 0, y0, W, sh, 0, 0, W, sh);
        if (mode === 'thresh-first' || mode === 'nearest') thresh(x1, W, sh, t, true);
        const c2 = document.createElement('canvas'); c2.width = W * scale + pad * 2; c2.height = sh * scale + pad * 2; const x2 = c2.getContext('2d');
        x2.fillStyle = (mode === 'thresh-first' || mode === 'nearest') ? '#fff' : '#000'; x2.fillRect(0, 0, c2.width, c2.height);
        x2.imageSmoothingEnabled = mode !== 'nearest'; x2.imageSmoothingQuality = 'high';
        x2.drawImage(c1, pad, pad, W * scale, sh * scale);
        if (mode === 'smooth-then-thresh') thresh(x2, c2.width, c2.height, t, true);
        if (mode === 'nearest') { /* already binary */ }
        return c2.toDataURL();
      };
      const variants = {
        cur128: mk(4, 'smooth-then-thresh', 128),
        cur100: mk(4, 'smooth-then-thresh', 100),
        tf4: mk(4, 'thresh-first', 128),
        tf3: mk(3, 'thresh-first', 128),
        near4: mk(4, 'nearest', 128),
        near3: mk(3, 'nearest', 128),
      };
      const worker = await Tesseract.createWorker('eng', 1, {});
      await worker.setParameters({ tessedit_char_whitelist: '0123456789+=', tessedit_pageseg_mode: '7' });
      const out = {};
      for (const [k, v] of Object.entries(variants)) { const r = await worker.recognize(v); out[k] = r.data.text.trim(); }
      await worker.terminate();
      return { out, crop: variants.near3 };
    });
    if (!res) { console.log(n, 'no captcha'); continue; }
    fs.writeFileSync(`out/bench_${n}.png`, Buffer.from(res.crop.split(',')[1], 'base64'));
    console.log(n, JSON.stringify(res.out));
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
