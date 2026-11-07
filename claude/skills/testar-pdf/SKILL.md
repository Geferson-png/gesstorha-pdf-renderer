---
name: testar-pdf
description: Gera e valida localmente o PDF do certificado Visual V3 com um certificado fictício. Use depois de mexer em render.js ou render-production.js, ou quando pedirem para testar, conferir ou visualizar o PDF.
---

# Testar o PDF localmente (dados fictícios)

Roda os renderizadores contra `fixture/index.html`. Essa casca imita o Apps Script e
carrega `fixture/certificado.html`, com 2 folhas fictícias, dentro de um iframe.
**Nunca use uma URL ou um ID reais aqui.**

## Passos

Rode a partir da raiz do repositório. Grave a saída fora do repositório (scratchpad ou
`/tmp`) para o PDF nunca ser commitado.

1. **Ambiente.** Nas sessões do Claude Code na nuvem, `require('playwright')` já funciona.
   Não rode `npm install` nem `playwright install`. Em uma máquina local, rode `npm install`
   e depois `npx playwright install chromium`.

2. **Render de produção** (o mais importante, porque é o que vai para os clientes):
   ```bash
   OUT="${TMPDIR:-/tmp}/gesstorha-teste"; mkdir -p "$OUT"
   GESSTORHA_APPS_SCRIPT_URL="file://$PWD/.claude/skills/testar-pdf/fixture/index.html" \
   CERTIFICATE_ID=a1b2c3d4 OUTPUT_PDF="$OUT/producao.pdf" \
   node render-production.js
   ```

3. **Render de teste** (se `render.js` mudou):
   ```bash
   CERTIFICATE_URL="file://$PWD/.claude/skills/testar-pdf/fixture/index.html" \
   OUTPUT_FILE="$OUT/teste.pdf" node render.js
   ```

4. **Validar** cada PDF gerado:
   ```bash
   head -c 5 "$OUT/producao.pdf"                         # tem que imprimir %PDF-
   pdfinfo "$OUT/producao.pdf" | grep -E 'Pages|Page size'  # Pages: 2, A4 (841.92 x 594.96 pts)
   ```
   Se não tiver `pdfinfo`, confira só a assinatura `%PDF-` e se o tamanho é maior que zero.

5. **Conferir o visual.** Converta em imagem (`pdftoppm -r 50 -png "$OUT/producao.pdf" "$OUT/pag"`)
   e olhe as duas páginas. Verifique se cada folha ocupa uma página inteira, sem cortes,
   sem página em branco no meio e sem fonte distorcida.

## Critério de aprovação

- O script termina com exit code 0.
- O arquivo começa com `%PDF-`, tem **2 páginas** e está em **A4 horizontal**.
- As páginas não têm cortes nem margens brancas inesperadas.

## Se falhar

- `Iframe interno do certificado não encontrado`: a casca não tem iframe, ou o último frame
  não é o certificado.
- `Não foram encontrados os dois blocos visuais`: as folhas têm menos de 700×350px ou estão
  uma dentro da outra. O `render.js` imprime `DOM_DIAGNOSTICO=` para ajudar a investigar.

## Limitação

O fixture é uma aproximação, não o HTML real do Visual V3. Mudanças de escala e enquadramento
ainda precisam de uma rodada no workflow **Testar retorno privado do PDF (DADOS FICTICIOS)**
no GitHub Actions antes de ir para produção. Se ajudar a reproduzir um problema, atualize o
fixture, sempre com dados fictícios.
