const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const sourceUrl = process.env.CERTIFICATE_URL;
  const output = process.env.OUTPUT_FILE || 'certificado.pdf';

  if (!sourceUrl) throw new Error('CERTIFICATE_URL não informada.');

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1131 },
      deviceScaleFactor: 1
    });

    await page.goto(sourceUrl, { waitUntil: 'networkidle', timeout: 120000 });
    await page.emulateMedia({ media: 'screen' });

    const frames = page.frames();
    const certFrame = frames.find(f => f !== page.mainFrame() && f.url() && !f.url().startsWith('about:blank'));
    if (!certFrame) throw new Error('Iframe do certificado não encontrado.');

    const diagnostico = await certFrame.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      const mm = v => String(v) + 'mm';
      const all = [...document.querySelectorAll('body *')];
      const candidates = all
        .map(el => ({ el, r: el.getBoundingClientRect() }))
        .filter(x => x.r.width > 700 && x.r.height > 350)
        .sort((a, b) => a.r.top - b.r.top || b.r.width * b.r.height - a.r.width * a.r.height);

      const sheets = [];
      for (const item of candidates) {
        if (!sheets.some(el => el.contains(item.el) || item.el.contains(el))) {
          sheets.push(item.el);
        }
        if (sheets.length === 2) break;
      }

      if (sheets.length < 2) {
        const diagnostic = all.map(el => {
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className : '',
            width: Math.round(r.width),
            height: Math.round(r.height),
            top: Math.round(r.top),
            text: (el.innerText || '').replace(/\\s+/g, ' ').slice(0, 120)
          };
        }).filter(x => x.width > 200 && x.height > 100);
        return { ok: false, diagnostic };
      }

      document.documentElement.style.background = '#fff';
      document.body.style.margin = '0';
      document.body.style.padding = '0';

      sheets.forEach((el, i) => {
        el.style.width = mm(297);
        el.style.height = mm(210);
        el.style.minHeight = mm(210);
        el.style.maxHeight = mm(210);
        el.style.margin = '0';
        el.style.boxSizing = 'border-box';
        el.style.overflow = 'hidden';
        el.style.breakInside = 'avoid';
        el.style.pageBreakInside = 'avoid';
        if (i === 0) {
          el.style.breakAfter = 'page';
          el.style.pageBreakAfter = 'always';
        } else {
          el.style.breakAfter = 'auto';
          el.style.pageBreakAfter = 'auto';
        }
      });

      const style = document.createElement('style');
      style.textContent = `
        @page { size: A4 landscape; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      `;
      document.head.appendChild(style);
      return { ok: true };
    });

    if (!diagnostico.ok) {
      console.log('DOM_DIAGNOSTICO=' + JSON.stringify(diagnostico.diagnostic));
      throw new Error('Não foram encontrados os dois blocos visuais do certificado.');
    }

    await page.pdf({
      path: output,
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    const stat = fs.statSync(output);
    if (!stat.size) throw new Error('PDF gerado vazio.');
    console.log(`PDF gerado: ${output} (${stat.size} bytes)`);
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
