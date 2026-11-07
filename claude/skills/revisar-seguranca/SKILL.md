---
name: revisar-seguranca
description: Revisa as mudanças pendentes antes de commit ou push, procurando dados sensíveis e quebras das regras de segurança deste repositório público (URLs do Apps Script, IDs reais, segredos, dados pessoais, artifacts de produção, logs que vazam informação). Use antes de qualquer commit ou PR.
---

# Revisão de segurança (repositório público)

Este repositório é **público** e o sistema de certificados é privado. Toda mudança passa
por esta checagem antes do commit. As regras completas estão em `SECURITY.md` e `CLAUDE.md`.

## 1. Ver o que vai entrar

```bash
git status --short
git diff HEAD            # mudanças ainda não commitadas
git diff origin/main...  # tudo o que a branch adiciona em relação à main
```

Confira também se arquivos novos não rastreados vão ser adicionados.

## 2. Procurar vazamentos

Rode em tudo o que difere da `main`, incluindo arquivos novos:

```bash
git add -N .              # faz os arquivos novos aparecerem no diff (não faz commit)
git diff origin/main | grep -nEi \
  'script\.google\.com|macros/s/|AKfy|googleusercontent|idCertificado=[^"'"'"' +]|secret\s*[:=]\s*["'"'"'][^"'"'"'$]|token\s*[:=]|bearer |[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2}|[0-9]{2}\.?[0-9]{3}\.?[0-9]{3}/?[0-9]{4}-?[0-9]{2}'
git status --short | grep -Ei '\.pdf$|\.env|\.csv$|\.xlsx?$'
```

O que cada padrão pega:
- **URL real do Apps Script** (`script.google.com/macros/s/...`, IDs `AKfy...`).
- **ID real de certificado.** Só o fictício `a1b2c3d4` é permitido.
- **Segredos e tokens com valor literal.** Usar `${{ secrets.X }}` ou `process.env.X` está certo.
- **CPF ou CNPJ**, além de nomes de pessoas ou empresas reais (esses é preciso conferir lendo).
- **Arquivos proibidos**: PDFs gerados, `.env`, planilhas.

Um resultado do grep não prova vazamento. Leia o trecho e decida.

## 3. Conferir as regras dos workflows e scripts

- [ ] Os workflows de produção (`render-production*.yml`) **não** usam `actions/upload-artifact`.
- [ ] O PDF temporário é apagado num passo com `if: always()`.
- [ ] Segredos vêm só de `secrets.*`. Nenhum `echo` imprime variável sensível nem `set -x`
      fica ativo perto delas.
- [ ] `permissions:` continua mínimo (`contents: read`).
- [ ] O `render-test.yml` continua avisando "SEM DADOS REAIS" e com `retention-days: 1`.
- [ ] Os logs de produção (`console.log` e `console.error`) não imprimem a URL, o ID, o
      segredo, o base64 do PDF nem o conteúdo do DOM. `render-production.js` não pode ter o
      diagnóstico `FRAMES=` ou `DOM_DIAGNOSTICO=` do `render.js`.
- [ ] As mensagens de erro vindas do receptor continuam mascarando o segredo e cortadas em
      300 caracteres (`deliver-production.js`).
- [ ] Não foram adicionadas dependências sem necessidade. Se foram, a versão está fixada.

## 4. Resultado

Informe ao usuário:
- ✅ **Aprovado**, se nada for encontrado; ou
- ❌ **Bloqueado**, listando `arquivo:linha`, o problema e a correção sugerida.

Se algo sensível **já foi commitado ou enviado**, não basta apagar num novo commit: o dado
continua no histórico público. Avise o usuário para **trocar o segredo ou a URL** (gerar
uma nova implantação do Apps Script ou um novo `GESSTORHA_PDF_CALLBACK_SECRET`) e
considerar reescrever o histórico.
