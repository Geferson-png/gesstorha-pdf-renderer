const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const baseUrl = process.env.GESSTORHA_APPS_SCRIPT_URL;
  const id = process.env.CERTIFICATE_ID;
  const output = process.env.OUTPUT_PDF || process.env.OUTPUT_FILE || 'certificado.pdf';

  if (!baseUrl || !id) throw new Error('Configuracao de producao incompleta.');

  const sourceUrl = baseUrl + '?idCertificado=' + encodeURIComponent(id);
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1131 },
      deviceScaleFactor: 1
    });

    await page.goto(sourceUrl, { waitUntil: 'networkidle', timeout: 120000 });
    await page.emulateMedia({ media: 'screen' });

    // Mantém o mesmo viewport do Visual V3 aprovado. Não converte o layout
    // para milímetros antes da captura; isso alterava escala/tipografia.

    const frames = page.frames();
    const certFrame = frames[frames.length - 1];
    if (!certFrame || certFrame === page.mainFrame()) {
      throw new Error('Conteudo interno do certificado nao encontrado.');
    }

    const result = await certFrame.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      const all = [...document.querySelectorAll('body *')];
      const candidates = all
        .map(el => ({ el, r: el.getBoundingClientRect() }))
        .filter(x => x.r.width > 700 && x.r.height > 350)
        .sort((a, b) => a.r.top - b.r.top || b.r.width * b.r.height - a.r.width * a.r.height);

      const sheets = [];
      for (const item of candidates) {
        if (!sheets.some(el => el.contains(item.el) || item.el.contains(el))) sheets.push(item.el);
        if (sheets.length === 2) break;
      }

      if (sheets.length !== 2) return { ok: false };

      document.documentElement.style.background = '#fff';
      document.body.style.margin = '0';
      document.body.style.padding = '0';

      // Mantém a geometria CSS original do Visual V3.
      // Não força 1600x1131 nem 297x210 sobre os blocos: o HTML aprovado
      // já contém o enquadramento correto das duas folhas.
      sheets.forEach((el, i) => {
        el.style.margin = '0';
        el.style.boxSizing = 'border-box';
        el.style.overflow = 'hidden';
        el.style.breakInside = 'avoid';
        el.style.pageBreakInside = 'avoid';
        el.style.breakAfter = i === 0 ? 'page' : 'auto';
        el.style.pageBreakAfter = i === 0 ? 'always' : 'auto';
      });

      const style = document.createElement('style');
      style.textContent =
        '@page { size: A4 landscape; margin: 0; } ' +
        'html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }';
      document.head.appendChild(style);
      return { ok: true };
    });

    if (!result.ok) throw new Error('As duas paginas do certificado nao foram encontradas.');

    const innerHtml = await certFrame.content();
    await page.setContent(innerHtml, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    });

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
    console.log('PDF de producao gerado com sucesso.');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
