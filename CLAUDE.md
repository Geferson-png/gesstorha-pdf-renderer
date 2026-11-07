# .CLAUDE.md

Guia para o Claude Code trabalhar neste repositório. Leia antes de qualquer mudança.

## O que é

Renderizador isolado que converte o certificado HTML **Visual V3** do Gesstorha em PDF
(A4 horizontal, **2 páginas**) usando Chromium/Playwright. O sistema principal de
certificados (Google Apps Script) é **privado**; este repositório é **público**.

## ⚠️ Regras de segurança (obrigatórias)

Este repositório é público. Ver `SECURITY.md`. Em resumo:

- **Nunca** commitar URLs reais do Apps Script, IDs reais de certificado, segredos ou tokens.
  Eles chegam só por `secrets.*` ou por input do `workflow_dispatch`.
- **Nunca** colocar CPF, assinatura, nome de colaborador ou dados de empresa em código,
  commits, logs ou artifacts. Para testar, use só dados fictícios (ex.: ID `a1b2c3d4`).
- Os workflows de produção **não podem** usar `actions/upload-artifact`: o PDF vai direto
  para o Apps Script privado e o arquivo é apagado no fim (`if: always()`).
- Mensagens de erro e logs de produção não podem expor a URL, o segredo nem o conteúdo do
  certificado. Veja como `deliver-production.js` mascara `callbackSecret`.
- Antes de commitar, rode a skill **`revisar-seguranca`**.

## Arquivos

| Arquivo | Papel |
|---|---|
| `render.js` | Render de **teste**. Lê `CERTIFICATE_URL` e `OUTPUT_FILE`. Imprime diagnóstico (`FRAMES=`, `DOM_DIAGNOSTICO=`). Só para dados fictícios. |
| `render-production.js` | Render de **produção**. Monta a URL com `GESSTORHA_APPS_SCRIPT_URL?idCertificado=<CERTIFICATE_ID>`, grava em `OUTPUT_PDF` (ou `OUTPUT_FILE`). Logs mínimos, sem diagnóstico do DOM. |
| `deliver-production.js` | Envia o PDF em base64 por POST (`action: receberPdfCertificado`) para `GESSTORHA_APPS_SCRIPT_URL`, autenticado com `GESSTORHA_PDF_CALLBACK_SECRET`. Espera `{ sucesso: true }`. |
| `.github/workflows/render-test.yml` | Manual. Recebe uma URL de teste e publica o PDF como artifact (1 dia). **Só dados fictícios.** |
| `.github/workflows/render-production-test.yml` | Manual. Testa o fluxo completo de render e entrega com o ID fictício `a1b2c3d4`. |
| `.github/workflows/render-production.yml` | Manual. Produção: recebe `certificate_id`, renderiza, valida `%PDF-`, entrega e apaga. |

## Como o render funciona

1. Abre a página com viewport **1600×1131**, `deviceScaleFactor: 1`, e espera `networkidle`.
2. O certificado vem num **iframe** (casca do Apps Script). O script usa o **último frame**.
3. Dentro do iframe, encontra as **2 folhas**: os maiores blocos com mais de 700×350px que
   não estão um dentro do outro, ordenados pela posição vertical.
4. Aplica quebra de página entre as folhas e `@page { size: A4 landscape; margin: 0 }`.
5. Copia o HTML do iframe para a página principal (`setContent`), espera as fontes e gera o PDF.

### Não regredir o enquadramento do Visual V3

Os commits `96ad91a` e `1edfa43` corrigiram a escala: **`render-production.js` não pode
forçar largura e altura** (nem `297mm×210mm`, nem `1600×1131`) nas folhas. O HTML aprovado
já traz a geometria certa, e forçar tamanho mudava a escala e a tipografia. Não troque o
viewport nem o `deviceScaleFactor` sem validar visualmente.

Divergência conhecida: `render.js` (teste) **ainda força** `297mm×210mm` nas folhas. Por
isso o PDF de teste pode sair diferente do de produção. Para validar o que vai para
produção, teste o `render-production.js`.

## Testar localmente

Use a skill **`testar-pdf`**. Ela roda os scripts contra um certificado fictício em
`.claude/skills/testar-pdf/fixture/` e confere se o resultado é um PDF A4 horizontal de 2 páginas.

- Nas sessões do Claude Code na nuvem, o Playwright e o Chromium já estão instalados.
  Não rode `npm install` nem `npx playwright install` lá.
- Os scripts não têm testes automatizados nem lint. Valide sempre gerando o PDF.

## Convenções

- CommonJS (`require`), Node 22 nos workflows, `playwright` fixado em `1.55.0`.
- Textos, logs e commits em português. Em produção, as mensagens não usam acentos.
- Mudanças pequenas e focadas. Explique no commit o motivo, principalmente quando mexer
  no layout ou na escala.
