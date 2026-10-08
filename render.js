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
    console.log(`PDF gerado: ${output} (${stat.size} bytes)`);
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
