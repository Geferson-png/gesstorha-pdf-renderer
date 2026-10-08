const fs = require('fs');

(async () => {
  const callbackUrl = process.env.GESSTORHA_APPS_SCRIPT_URL;
  const callbackSecret = process.env.GESSTORHA_PDF_CALLBACK_SECRET;
  const certificateId = process.env.CERTIFICATE_ID;
  const outputFile = process.env.OUTPUT_FILE || 'certificado.pdf';

  if (!callbackUrl || !callbackSecret || !certificateId) {
    throw new Error('Configuracao privada de entrega incompleta.');
  }

  if (!fs.existsSync(outputFile)) {
    throw new Error('PDF de producao nao encontrado.');
  }

  const pdfBase64 = fs.readFileSync(outputFile).toString('base64');

  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'receberPdfCertificado',
      callbackSecret: callbackSecret,
      idCertificado: certificateId,
      pdfBase64: pdfBase64
    })
  });

  const body = await response.text();

  let result;

  try {
    result = JSON.parse(body);
  } catch (_) {
    throw new Error('Resposta invalida do receptor privado.');
  }

  if (!response.ok || !result.sucesso) {
    const motivo = String(result.erro || result.error || result.mensagem || result.message || 'motivo nao informado')
      .replace(/GESSTORHA_PDF_CALLBACK_SECRET/gi, '[SECRET]')
      .replace(/callbackSecret/gi, '[SECRET]')
      .slice(0, 300);
    throw new Error('O receptor privado recusou o PDF: ' + motivo);
  }

  console.log('PDF entregue com sucesso ao ambiente privado.');
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
