# Backlog: Discovery ao Done

Gerado a partir de três diagnósticos (arquitetura, revisão React, mapa de produto) e consolidado em duas visões: **PO** (o que o produto precisa garantir) e **PM** (em que ordem entregar). Itens sem marca abaixo estão `Pendente`.

## Progresso

| Item | Status |
|---|---|
| E1.1 Remover a chave do código | Código feito; **revogar a chave no painel da OpenAI continua com o dono do projeto** |
| E1.2 App abre sem chave | Feito (fallback vazio, análise offline) |
| E1.3 Aviso do `localStorage` | Feito |
| E2.1 Git | Feito (remote `origin`, branch `main`) |
| E2.2 Vitest | Feito (`npm test`, `npm run coverage`) |
| E2.3 Testes de caracterização | Feito: `storageService` 81%, `exportService` 97%, `parseJsonLoose` coberto |
| E2.4 Backup JSON | Já existia no `ApiKeyModal`; agora com teste do ciclo exportar e reimportar. Só `id`, `name` e `updatedAt` mudam na importação |
| E3.1 Closure da gravação | Feito: fala gravada na hora, análise mesclada depois (`sessionService`). Verificado na simulação da Sala ao Vivo (0 → 6 falas) |
| E3.2 Storage respeita `projectId` | Feito (`updateProject` imutável) |
| E3.6 Ids únicos | Feito (`crypto.randomUUID` com fallback) |
| E3.3 IndexedDB como fallback | Feito: o espelho substitui o conteúdo (exclusões chegam), grava em fila e fecha as conexões; `restoreFromIndexedDb` roda no carregamento; em estouro de cota a leitura usa a cópia em memória. Verificado no app: apagando os projetos do `localStorage` e recarregando, voltam com conteúdo idêntico |
| E3.4 Atalhos de teclado | Feito: handlers estáveis (`useCallback`) lendo do storage; sem avisos de hooks em `App.tsx`. Verificado no app com Alt+M |
| E3.5 Gerador de backlog com merge | Feito (`planBacklogMerge`): incremento entra direto, alteração de item existente pede confirmação. Coberto por testes; não verificado no navegador (o `confirm()` trava a automação) |
| E4.1 Fonte única de estado | Feito: hook `useProjects` (15 testes) guarda uma só lista e **deriva** o projeto ativo; o `App` perdeu os estados `projects`/`activeProject` e o `syncAfterCommit`; 25 pontos de escrita viraram `select`/`create`/`importFromJson`/`remove`/`reset`/`saveProject`/`update`/`refresh`. O checklist DoR/DoD deixou de mutar o estado. As duas funções que duplicavam o merge da análise (~170 linhas) passaram a usar o `sessionService`, o que também corrige o dado velho depois do `await`. `App.tsx`: 1221 → 1017 linhas. Verificado no app: carga, troca de projeto, checklist (persistiu e voltou) e "Analisar com IA" |
| E5.1 Dividir o `geminiService` | Feito: 663 → 127 linhas. Novos: `ai/types.ts`, `ai/normalizers.ts`, `ai/prompts.ts`, `ai/heuristics.ts` (todos abaixo de 400). A fachada manteve a API pública. 21 testes de caracterização escritos antes e passando depois; texto dos prompts verificado idêntico ao original |
| E5.2 `AgentStudioView` sem `callAI` | Feito: novo `studioAgentService` (`runStudioAgent`, 5 agentes) e `studioTemplates`; os 5 handlers do componente viraram 4 linhas cada. Zero imports de `callAI` em `components/`. 15 testes novos; verificado no app com o Story Slicer |
| E5.4 Heurística sem o rótulo do falante | Feito: a heurística offline analisa só o texto das falas. O teste que documentava o defeito foi invertido e há testes de que a regra de cliente ainda dispara quando a fala é sobre cliente e de que todas as falas recentes são analisadas |
| E5.5 Aviso de texto de exemplo nos agentes | Feito: `ExampleResultNotice` aparece sobre o resultado quando `source === 'template'`. 3 testes de tela (Testing Library); verificado no app com o Story Slicer sem chave |

**Fase 1 concluída.** Próxima: Fase 2 (arquitetura), começando por E5.1 (dividir o `geminiService`) e E4.1 (fonte única de estado).
| Fix: Sala ao Vivo em branco em projeto sem sessão | Feito (estado vazio com botão "Iniciar primeira sessão") |

O teste `it.fails` de `addBugReport` (em `storageService.test.ts`) documenta o bug de E3.2 e deve virar teste normal quando E3.2 for corrigido.

Esforço: P (pequeno), M (médio), G (grande). Risco: B (baixo), M (médio), A (alto).

## Visão PO: capacidade e restrições

**Capacidade.** Um PM captura entrevistas de discovery (voz, texto ou transcrição), recebe perguntas táticas e transforma as dores validadas em OKRs, épicos, histórias com Gherkin e PRD, sem sair do navegador e sem perder dados.

**Restrições fixas**
- App 100% client-side; dados em `localStorage` com espelho em IndexedDB.
- A IA usa a chave do próprio usuário (OpenAI ou Gemini). Sem chave, o app funciona com heurística offline.
- Uma falha de IA não pode sobrescrever o backlog existente do usuário.
- Interface e prompts em português do Brasil.

**Não-objetivos desta rodada:** backend próprio, contas de usuário, colaboração em tempo real.

**Fluxo do produto:** Captura → Análise → Backlog → Entrega (PRD, Jira, SPEC.md).

**Decisões do PO**
1. **Merge por padrão.** O gerador de backlog nunca sobrescreve sem aviso: se a geração só acrescenta itens novos (incremento), adiciona direto; se for substituir ou alterar itens existentes, pede confirmação. (E3.5)
2. **Várias sessões como entrada.** O backlog pode ser gerado a partir de N sessões selecionadas. (E6.4)
3. **Chaves em `localStorage`.** Sem opção de sessão; mantém o aviso ao usuário. (E1.3)
4. **Exportações sem área fixa.** Cada função de exportação existe em uma única tela, na que fizer mais sentido no fluxo (não precisa ser Entrega). (E6.2)
5. **`knowledge_hub` e `agent_studio` ficam**, fora do fluxo principal, no menu Copiloto & Biblioteca. `knowledge_hub` vira a Biblioteca (referência estática). `agent_studio` perde o que duplica outras telas (SPIDR, Jira, SPEC.md) e mantém os agentes especialistas e o crawler de GitHub. Nada é removido nesta rodada. (E6.3)

## Visão PM: fases e itens

### Fase 0: Segurança e rede de proteção (Sprint 1)

| ID | Item | Esforço | Risco | Depende de | Aceite |
|---|---|---|---|---|---|
| E1.1 | Revogar a chave OpenAI e removê-la de `storageService.ts:12/26`; apagar a chave do bundle em `dist/` ao rebuildar | P | A | - | Busca por `sk-` em `src/` e `dist/` sem resultado; chave antiga dá 401 |
| E1.2 | Tratar ausência de chave: heurística offline e aviso para configurar | P | B | E1.1 | App abre sem chave e não quebra |
| E1.3 | Avisar que a chave fica em `localStorage` (decisão: sem opção de sessão) | P | B | - | Aviso visível em Configurações |
| E2.1 | `git init`, `.gitignore` (dist, node_modules, .env), commit inicial | P | B | - | Repositório limpo, sem segredos |
| E2.2 | Configurar Vitest e Testing Library (`test`, `coverage`) | P | B | E2.1 | `npm test` passa |
| E2.3 | Testes de caracterização: `storageService`, `parseJsonLoose`, `exportService` | M | M | E2.2 | 80% de cobertura nesses serviços |
| E2.4 | Exportar e importar backup JSON | P | B | - | Exportar e reimportar devolve dados idênticos |

### Fase 1: Bugs de integridade (Sprint 2)

| ID | Item | Esforço | Risco | Depende de | Aceite |
|---|---|---|---|---|---|
| E3.1 | Corrigir closure obsoleta da gravação (`App.tsx:319,359,398`) | M | A | E2.3 | Teste com 50 falas rápidas não perde nenhuma |
| E3.2 | Storage respeita `projectId` e para de mutar (`storageService.ts:326-386`) | M | A | E2.3 | Teste com 2 projetos: um não afeta o outro |
| E3.3 | Ler do IndexedDB quando o `localStorage` estiver vazio ou sem espaço | M | M | E3.2 | Com `localStorage` limpo, os projetos voltam |
| E3.4 | Completar deps dos atalhos de teclado (`App.tsx:113-156`) | P | B | - | `npm run lint` sem erro de hooks |
| E3.6 | Evitar colisão de ids: `'proj-' + Date.now()` (e `sess-`, `bug-`) repete o id quando dois itens nascem no mesmo milissegundo. Usar `crypto.randomUUID()` | P | M | E3.2 | Dois projetos criados em sequência têm ids diferentes |
| E3.5 | Gerador de backlog faz merge: acrescenta itens novos direto; pede confirmação só ao substituir ou alterar itens existentes | M | M | E3.2 | Backlog existente preservado; incrementos não pedem confirmação |

### Fase 2: Arquitetura (Sprints 3-4)

| ID | Item | Esforço | Risco | Depende de | Aceite |
|---|---|---|---|---|---|
| E4.1 | Fonte única de estado (contexto/reducer) para projetos | G | A | E3 | Existe um único `activeProject` |
| E4.2 | Router com rotas por área | M | M | E4.1 | Deep links e botão voltar funcionam |
| E4.3 | Quebrar `App.tsx` em hooks (`useRecording`, `useShortcuts`, `useNotices`) | G | M | E4.1 | `App.tsx` com menos de 300 linhas |
| E5.1 | Dividir `geminiService.ts` em `prompts/`, `heuristics/` e `provider` | M | M | E2.3 | Nenhum arquivo acima de 400 linhas |
| E5.2 | `AgentStudioView` chama a IA via service, nunca `callAI` direto | M | B | E5.1 | Zero imports de `callAI` em `components/` |
| E5.5 | Rotular o texto de exemplo dos agentes do Studio. Sem chave de IA (ou com a IA falhando), os 5 agentes mostram texto fixo de um caso fictício de conciliação financeira como se fosse gerado para a entrada do usuário. `runStudioAgent` já devolve `source: 'template'`; a tela deve exibir "Exemplo ilustrativo, configure uma chave de IA para gerar o seu" quando for o caso | P | B | E5.2 | Sem chave, o resultado de qualquer agente vem com um aviso visível de que é exemplo |
| E5.4 | Corrigir a heurística offline, que analisa o texto **com o rótulo do falante** (`Usuário: "fala"`). Como "usuário" é palavra-chave da regra de cliente, toda fala de "Usuário / Stakeholder" gera "Atrito com o Cliente", a pergunta de churn e um job, qualquer que seja o conteúdo. Analisar só o texto da fala. O teste que documenta o comportamento atual (`geminiService.test.ts`) deve ser invertido | P | B | E5.1 | Uma fala sem assunto de cliente não gera itens de cliente, mesmo vinda de "Usuário / Stakeholder" |
| E5.3 | Dividir `DiscoveryToDoneView`, `AgentStudioView` e `Header` | G | M | E4.3 | Todos com menos de 400 linhas |

### Fase 3: Produto e UX (Sprints 5-6)

| ID | Item | Esforço | Risco | Depende de | Aceite |
|---|---|---|---|---|---|
| E6.1 | Navegação em 5 áreas (Visão, Captura, Análise, Backlog, Entrega) + menu Copiloto & Biblioteca | M | M | E4.2 | Um único menu (Sidebar ou Header) |
| E6.2 | Remover sobreposições: SPIDR só em `refine`, cada exportação (Jira, SPEC.md, PRD) em uma única tela, resumo só em `meetings` | M | M | E6.1 | Cada função existe em uma só tela |
| E6.3 | Fundir `po_space` e `product_audit` no Copiloto com papéis claros; `agent_studio` mantém agentes e crawler, sem as funções duplicadas; `knowledge_hub` vira Biblioteca | G | A | E5.2 | Usuário identifica o papel de cada agente; nada removido |
| E6.5 | Parar de exportar conteúdo fixo no PRD: `exportToPRD` escreve aprovações fictícias (Product Lead, Tech Lead, CFO com nomes e "Aprovado"), roadmap de conciliação financeira, DoR/DoD e não-audiência iguais para qualquer projeto. Gerar só a partir dos dados do projeto, com campos vazios quando faltar informação | M | M | - | PRD de um projeto novo não contém nomes, aprovações nem roadmap que o usuário não escreveu |
| E6.4 | Gerar o backlog a partir de várias sessões selecionadas | M | M | E3.5 | Dá para escolher N sessões como entrada |

### Épico E7: Tipo de conversa e foco da sessão (pedido do PO)

Hoje toda sala é tratada como entrevista de discovery: as perguntas sugeridas, a análise e as heurísticas offline assumem Mom Test, JTBD e 5 Porquês. Uma reunião de alinhamento ou de refinamento precisa de perguntas e de saídas diferentes.

| ID | Item | Esforço | Risco | Depende de | Aceite |
|---|---|---|---|---|---|
| E7.1 | Campo `type` na sessão (`discovery`, `alignment`, `refinement`), escolhido ao criar a sala e editável na sala. Sessões antigas assumem `discovery` | P | B | E3.2 | Criar uma sala de cada tipo; as antigas abrem como discovery |
| E7.2 | Prompts e heurísticas offline por tipo. **Discovery:** Mom Test, JTBD, 5 Porquês. **Alinhamento:** decisões, responsáveis, prazos, bloqueios e riscos. **Refinamento:** critérios de aceite, escopo, dependências, estimativa e DoR | M | M | E7.1, E5.1 | A mesma fala gera perguntas diferentes conforme o tipo |
| E7.3 | Foco da sessão: campo editável ("o que queremos resolver agora") que entra no prompt, e botão **Propor novas perguntas** para o foco atual | M | M | E7.2 | Mudar o foco no meio da sala muda as próximas perguntas sugeridas, sem apagar as anteriores |
| E7.4 | Saídas por tipo. **Alinhamento:** ata, itens de ação e entradas no Decision Log. **Refinamento:** alimenta histórias e critérios no Backlog. **Discovery:** dores, JTBD e mapa mental, como hoje | M | M | E7.2, E6.2 | Cada tipo encerra com a saída própria, sem duplicar telas |

Perguntas em aberto (PO): outros tipos além dos três (retrospectiva, 1:1, planejamento)? O mapa mental e o fluxo do usuário aparecem só em discovery? O tipo pode mudar no meio da sala?

### Épico E8: Backlog vivo, com fatiar, mesclar, atualizar, incrementar, validar e verificar (pedido do PO)

Pedido: o backlog deve aceitar **fatiamento, merge, atualização e incremento** em todos os níveis (épico, feature, história **e task**), e a **cada reunião** deve haver **validação** e **verificação**.

**Onde estamos hoje** (código lido, não suposição):
- O `planBacklogMerge` (E3.5) faz **incremento** e **atualização com confirmação tudo-ou-nada** em épico, feature, história e OKR. **Task não é mesclada por conta própria**: só entra como parte da história (uma task nova numa história existente conta como "história alterada").
- **Não existe** fatiamento no modelo de dados: o Fatiador SPIDR (`refine` e `agent_studio`) gera texto solto e não cria histórias filhas nem guarda de onde vieram.
- **Não existe** merge de itens duplicados nem desfazer.
- A história tem uma única `evidenceQuote`; épico, feature e task não têm evidência. **Não há estado de validação nem de verificação** em nenhum nível, e nada liga um item à reunião que o originou ou o contestou.

**Definições propostas** (a confirmar pelo PO; ver "Decisões pendentes"):
- **Validação** responde "isso é uma necessidade real?". Cada item tem um estado: `hipótese` (veio da IA ou do PM, sem evidência), `validado` (uma reunião o confirmou, com citação, reunião e minuto), `contestado` (uma fala o contradiz) ou `invalidado`.
- **Verificação** responde "o item está bem formado e pronto?". São checagens de qualidade: INVEST, critérios Gherkin completos e testáveis, DoR/DoD, tasks que cobrem os critérios, estimativa, dependências. O resultado é uma lista de lacunas por item e um "pronto para dev?".
- **Revisão do backlog por reunião**: ao encerrar a sala (ou por botão), o app monta um pacote de **propostas tipadas** (incremento, atualização com diff por campo, fatiamento, merge de duplicados, validação, verificação). O usuário **aceita ou rejeita cada proposta**, e o motor aplica só as aceitas, registrando reunião, citação e data.

| ID | Item | Esforço | Risco | Depende de | Aceite |
|---|---|---|---|---|---|
| E8.1 | **Modelo comum de item de backlog** nos 4 níveis: `origin` (sessão, citação, autor: IA ou usuário), `validation` (estado e evidências), `verification` (checagens e data), `sliceOf` (item de origem do fatiamento) e `changes[]` (histórico). Migração: dados antigos assumem `hipótese`, sem origem | M | M | E3.2 | Projeto antigo abre sem perder nada; todo item novo nasce com origem e estado de validação |
| E8.2 | **Motor de merge em 4 níveis**, incluindo **task** como item próprio (hoje é só parte da história). Operações: incrementar, atualizar (diff por campo), mesclar duplicados (por título semelhante), aceitar **item a item** em vez de tudo-ou-nada. Evolui `planBacklogMerge` (E3.5) | M | M | E8.1 | Uma task nova entra numa história existente sem marcá-la como alterada; cada mudança proposta pode ser aceita ou rejeitada sozinha |
| E8.3 | **Fatiamento em 4 níveis**: épico em features, feature em histórias, história em histórias menores (SPIDR) e história em tasks, com `sliceOf`, critérios e evidência redistribuídos. Integra o Fatiador ao backlog e elimina a duplicação entre `refine` e `agent_studio` (E6.2) | G | A | E8.1, E8.2 | Fatiar uma história cria filhas com rastreio ao original, sem perder critério nem citação; o total de pontos é conferido |
| E8.4 | **Revisão do backlog por reunião**: pacote de propostas ao encerrar a sala, tela de revisão com aceitar/rejeitar, aplicação pelo motor do E8.2. O que a revisão propõe depende do **tipo de conversa** (E7): discovery propõe incrementos e validações; alinhamento, atualizações e decisões; refinamento, fatiamento e verificação | G | M | E8.2, E7.1 | Ao encerrar uma sala, aparece o pacote; nada muda no backlog sem aceite |
| E8.5 | **Validação por reunião**: a análise liga falas a itens (confirma ou contesta), cada ligação guarda citação, reunião e minuto; indicadores no backlog (validados, hipóteses, contestados) | M | M | E8.1, E8.4 | Uma fala que confirma uma história a marca como validada, com a citação visível; uma fala contrária a marca como contestada |
| E8.6 | **Verificação por reunião**: checagens determinísticas (INVEST, Gherkin completo, DoR/DoD, tasks vs critérios), mais sugestões da IA; "pronto para dev?" por item | M | B | E8.1 | Uma história sem critério de aceite aparece com a lacuna listada e não fica "pronta para dev" |
| E8.7 | **Histórico e desfazer**: cada aplicação grava um instantâneo antes de mudar o backlog, com botão para desfazer a última revisão, e o histórico por item é visível | M | M | E8.1 | Desfazer devolve o backlog exatamente ao estado anterior à revisão |
| E8.8 | Exportações (Jira, GitHub, Linear, PRD, SPEC) incluem estado de validação, origem e `sliceOf`; itens `invalidado` ficam de fora por padrão | P | B | E8.1, E6.2 | O export de um item validado traz a citação de origem |

**Decisões pendentes (PO)**
1. As definições de **validação** e **verificação** acima estão certas? Em especial: validação é sobre a **necessidade** (evidência de reunião) e verificação é sobre a **qualidade do item**.
2. A revisão aceita **proposta por proposta** (recomendado) ou também em **pacote único**, com "aceitar tudo"?
3. **Desfazer** (E8.7) é obrigatório já na primeira versão? Recomendo que sim, porque a IA passa a alterar o backlog.
4. Itens `contestado` ou `invalidado` **somem** do backlog ou ficam visíveis, marcados?
5. A **ordem**: sugiro E8.1 e E8.2 antes de E4.3 (quebrar o `App`) e E4.2 (router), porque são eles que mudam o que o produto faz. E8.4 vem junto do E7.1, que define o tipo de conversa.

### Fase 4: Acabamento (depois)

- Acessibilidade: `role="dialog"` e foco preso nos modais, `role="tab"` e `aria-selected` nas abas, `role="status"` no toast, `<label htmlFor>` nos inputs.
- Trocar `key={i}` por ids estáveis em listas dinâmicas.
- Trocar `any` por tipos (`catch (e: unknown)`, `useRef<ReturnType<typeof setTimeout>>`, união `Speaker`).
- `key={project.id}` em `ProjectHubView` e `POSpaceView` para resetar estado ao trocar de projeto.

## Maiores riscos

1. **Chave já exposta** (está no código e pode estar no `dist/`). Mitigação: revogar agora e monitorar o uso na OpenAI.
2. **Refatorar sem testes** com `App.tsx` monolítico. Mitigação: só refatorar depois de E2.3; mudanças pequenas.
3. **Perda de dados na migração do storage** (E3.2, E3.3, E4.1). Mitigação: backup automático antes de migrar e schema versionado.
4. **Regressão de UX ao fundir telas.** Mitigação: feature flag para a navegação nova e manter a antiga por um sprint.
5. **Saída da IA não determinística quebra os parsers.** Mitigação: validar com schema, manter fallback heurístico e testar com fixtures reais.
