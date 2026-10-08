# Segurança e produção

## Regra obrigatória

Este repositório é público. Portanto:

- não enviar certificados reais como artifacts;
- não armazenar CPF, assinatura, nome de colaborador ou dados de empresa em commits, logs ou artifacts;
- o workflow `render-test.yml` é exclusivamente para dados fictícios/de teste;
- a integração de produção deve transportar o PDF diretamente para um destino privado e não usar `actions/upload-artifact`;
- credenciais e tokens nunca devem ser versionados.

## Estado atual

O Chromium/Playwright já foi validado para o Visual V3 em A4 horizontal e duas páginas. A etapa seguinte é criar o canal privado de retorno do PDF antes de habilitar certificados reais.
