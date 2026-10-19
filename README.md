# Discovery ao Done

Segundo Cérebro de Product Management: capture entrevistas de discovery (voz, texto ou transcrição importada), receba perguntas táticas em tempo real (Mom Test, JTBD, 5 Porquês), e transforme as dores validadas em **OKRs, épicos, user stories com Gherkin, tasks e PRD**.

Roda 100% no navegador. Os dados ficam no `localStorage`; a IA é o Google Gemini com a **sua** chave.

## Como usar

```bash
npm install
npm run dev
```

1. Abra o app e clique em **Configurações** (ícone de engrenagem).
2. Cole sua chave do [Google AI Studio](https://aistudio.google.com/app/apikey), clique em **Testar Conexão** e salve.
3. Na **Sala ao Vivo**, grave (microfone/aba), digite notas ou importe uma transcrição.
4. Em **Backlog**, clique em gerar para criar OKRs, épicos, histórias e PRD.
5. Exporte pelo cabeçalho (Markdown / CSV para Jira) ou faça backup em JSON nas Configurações.

## Comportamento sem chave ou com erro

- Sem chave, o app usa uma análise heurística offline (perguntas e dores por palavras-chave) e backlog de exemplo.
- Se a IA falhar (chave inválida, cota, rede), um aviso aparece na tela. Com chave configurada, uma falha **não** sobrescreve seu backlog existente.

## Limitações

- Captura de voz usa a Web Speech API: funciona melhor em Chrome/Edge.
- Dados ficam só neste navegador. Use **Exportar JSON** para backup.
- A chave de API fica no `localStorage` do seu navegador e é enviada apenas ao Google.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Type-check e build de produção |
| `npm run lint` | Lint com Oxlint |
| `npm run preview` | Pré-visualiza o build |
