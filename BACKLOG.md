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
| E9.0 Começo limpo | Feito: sem projeto de exemplo; `getActiveProject` pode ser `null`; tela inicial funciona com zero projetos (`NoticeToast` extraído para reaproveitar); "Limpar tudo" virou "Apagar todos os projetos" com confirmação; `resetForOfficialTests` removido; helper `getActiveSessionContext`. Os 2 projetos que existiam foram apagados do navegador, com backup (Plataforma completa em Downloads; dados escritos pelo usuário do Healthtech em `backup-projetos/`, fora do Git). 156 testes, 3 deles de ponta a ponta do app vazio |
| E5.1 Dividir o `geminiService` | Feito: 663 → 127 linhas. Novos: `ai/types.ts`, `ai/normalizers.ts`, `ai/prompts.ts`, `ai/heuristics.ts` (todos abaixo de 400). A fachada manteve a API pública. 21 testes de caracterização escritos antes e passando depois; texto dos prompts verificado idêntico ao original |
| E5.2 `AgentStudioView` sem `callAI` | Feito: novo `studioAgentService` (`runStudioAgent`, 5 agentes) e `studioTemplates`; os 5 handlers do componente viraram 4 linhas cada. Zero imports de `callAI` em `components/`. 15 testes novos; verificado no app com o Story Slicer |
| E5.4 Heurística sem o rótulo do falante | Feito: a heurística offline analisa só o texto das falas. O teste que documentava o defeito foi invertido e há testes de que a regra de cliente ainda dispara quando a fala é sobre cliente e de que todas as falas recentes são analisadas |
| E5.5 Aviso de texto de exemplo nos agentes | Feito: `ExampleResultNotice` aparece sobre o resultado quando `source === 'template'`. 3 testes de tela (Testing Library); verificado no app com o Story Slicer sem chave |
| E11 Sala ao vivo: tópicos, mapa, jornada, ata e voz | Feito: `topicService` (assuntos da conversa e perguntas pelo que falta, sem repetir), `mindMapService` + `MindMapCanvas` (árvore assuntos → dores/JTBDs, clicável com a fala de origem, editável), `journeyService` + `UserFlowView` (etapas lado a lado com fricção, dor, fala e oportunidade; editar/mover/apagar), `minutesService` + `MinutesPanel` (ata com decisões, ações com dono e prazo, perguntas em aberto, Markdown), `speakerService` (sugere quem falou pelo texto; atribuição por fala), `closeMeeting` (Encerrar reunião). Layout: barra fixa, preparação recolhível, transcrição à esquerda e abas à direita. **Limite conhecido:** o navegador não separa vozes pelo som. Falta: extrair a sala do `App.tsx` (E4.3 parte 3), ata editável, versão com IA da ata e da jornada |

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
| E4.2 | Router com rotas por área | M | M | E4.1 | **Feito**, sem biblioteca: a tela ativa vive no hash da URL (`#/backlog`, `#/agenda`…) via `state/useHashView`. O botão voltar/avançar do navegador troca de tela, recarregar mantém a tela, e dá para abrir um link direto; hash desconhecido cai na tela inicial. O registro de telas é exaustivo (TypeScript acusa se uma tela nova faltar). Verificado no navegador. Não há rota por projeto: o projeto ativo continua vindo do armazenamento. |
| E4.3 | Quebrar `App.tsx` em hooks (`useRecording`, `useShortcuts`, `useNotices`) | G | M | E4.1 | `App.tsx` com menos de 300 linhas |
| E5.1 | Dividir `geminiService.ts` em `prompts/`, `heuristics/` e `provider` | M | M | E2.3 | Nenhum arquivo acima de 400 linhas |
| E5.2 | `AgentStudioView` chama a IA via service, nunca `callAI` direto | M | B | E5.1 | Zero imports de `callAI` em `components/` |
| E5.5 | Rotular o texto de exemplo dos agentes do Studio. Sem chave de IA (ou com a IA falhando), os 5 agentes mostram texto fixo de um caso fictício de conciliação financeira como se fosse gerado para a entrada do usuário. `runStudioAgent` já devolve `source: 'template'`; a tela deve exibir "Exemplo ilustrativo, configure uma chave de IA para gerar o seu" quando for o caso | P | B | E5.2 | Sem chave, o resultado de qualquer agente vem com um aviso visível de que é exemplo |
| E5.4 | Corrigir a heurística offline, que analisa o texto **com o rótulo do falante** (`Usuário: "fala"`). Como "usuário" é palavra-chave da regra de cliente, toda fala de "Usuário / Stakeholder" gera "Atrito com o Cliente", a pergunta de churn e um job, qualquer que seja o conteúdo. Analisar só o texto da fala. O teste que documenta o comportamento atual (`geminiService.test.ts`) deve ser invertido | P | B | E5.1 | Uma fala sem assunto de cliente não gera itens de cliente, mesmo vinda de "Usuário / Stakeholder" |
| E5.3 | Dividir `DiscoveryToDoneView`, `AgentStudioView` e `Header` | G | M | E4.3 | Todos com menos de 400 linhas |

### Fase 3: Produto e UX (Sprints 5-6)

| ID | Item | Esforço | Risco | Depende de | Aceite |
|---|---|---|---|---|---|
| E6.1 | Navegação em 5 áreas (Visão, Captura, Análise, Backlog, Entrega) + menu Copiloto & Biblioteca | M | M | E4.2 | **Feito.** O menu lateral é o único menu: Visão (Hub, Stakeholders, Anotações), Captura (Agenda, Sala ao Vivo, Histórico), Análise (Segundo Cérebro, Banca Validadora), Backlog (Backlog, Fatiar & Refinar), Entrega (PRD & SPEC, Agentes & Git) e Apoio: Copiloto & Biblioteca (Copiloto me entrevista, Espaço do PO, Acervo). Saíram do cabeçalho a "Jornada do Projeto" e os atalhos duplicados "Gravação ao Vivo" e "Agentes IA & Git" (o Header perdeu ~100 linhas). Nenhuma tela foi removida (teste: cada tela aparece uma vez). Corrigido de passagem: o menu mostrava "Plataforma de Liquidação" como nome de reserva do projeto; agora "Projeto sem nome". **Não verificado no navegador** (a ferramenta travou); coberto por 6 testes do menu e pelo build. |
| E6.2 | Remover sobreposições: SPIDR só em `refine`, cada exportação (Jira, SPEC.md, PRD) em uma única tela, resumo só em `meetings` | M | M | E6.1 | Cada função existe em uma só tela |
| E6.3 | Fundir `po_space` e `product_audit` no Copiloto com papéis claros; `agent_studio` mantém agentes e crawler, sem as funções duplicadas; `knowledge_hub` vira Biblioteca | G | A | E5.2 | Usuário identifica o papel de cada agente; nada removido |
| E6.5 **(FEITO)** | **Feito.** `exportToPRD` e `exportToAISpec` deixaram de escrever conteúdo fixo: status "Rascunho" (o app não registra aprovação), campos que faltam saem como "Não informado", o roadmap vem dos épicos (status e data alvo), DoR/DoD vêm dos checklists reais das histórias, e a tabela de aprovação lista os decisores e patrocinadores cadastrados como "Pendente" (ou "Nenhuma aprovação registrada"). O SPEC perdeu o esquema de conciliação, a estrutura de diretórios e os requisitos de "50 mil linhas", e passou a trazer problema, escopo, métricas, premissas e riscos do projeto. Mesma limpeza na **Síntese Multi-Reuniões** (`MeetingsView`: temas, contagens, citações e "~40h/mês" eram fixos; agora vêm das dores mapeadas, agrupadas por assunto, `insightService`) e no **Segundo Cérebro** (sugestões de método com gatilhos fictícios, "Áreas" fixas, "PRD Versão 1.0.0" e piso de 35% no índice de clareza; agora derivam das dores, dos domínios das histórias, da versão do PRD, e o índice parte de zero). Testes de regressão para PRD, SPEC, insights e as duas telas. Original: Parar de exportar conteúdo fixo no PRD: `exportToPRD` escreve aprovações fictícias (Product Lead, Tech Lead, CFO com nomes e "Aprovado"), roadmap de conciliação financeira, DoR/DoD e não-audiência iguais para qualquer projeto. Gerar só a partir dos dados do projeto, com campos vazios quando faltar informação | M | M | - | PRD de um projeto novo não contém nomes, aprovações nem roadmap que o usuário não escreveu |
| E6.4 | Gerar o backlog a partir de várias sessões selecionadas | M | M | E3.5 | **Feito.** Na tela de Backlog, com 2+ reuniões, o seletor "Reuniões usadas para gerar o backlog" deixa marcar quais entram (ou "Selecionar todas com falas"); sem nenhuma marcada, vale só a sala ativa, como antes. A IA recebe as falas de cada reunião sob o título dela, e dores e JTBDs repetidos entram uma vez só (`generationInput`). O resultado continua passando pela revisão: nada entra sem aceite. |

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

**Decisões do PO (respondidas):** 1) definições de validação e verificação aprovadas; 2) a revisão aceita proposta por proposta **e** em pacote ("aceitar tudo"); 3) desfazer **não** é obrigatório na primeira versão (E8.7 fica depois); 4) itens contestados e invalidados **ficam visíveis**, marcados; 5) ordem a critério do time: E8.1 e E8.6 primeiro (não mudam o que já existe), depois E8.2, E8.4, E8.5, E8.3, E8.7, E8.8.

**Progresso do E8:** **E8.1 feito** (tipos `BacklogMeta`, todos opcionais nos 4 níveis, sem migração; `backlogItemService`: estado de validação, evidências, origem, histórico). **E8.6 feito** (`verificationService`: bloqueios e avisos por história, "pronto para dev?"). O painel "Saúde do backlog" aparece na tela de Backlog com contagem de validação, histórias prontas, lacunas e itens contestados com a citação. **E8.2 feito** (`backlogProposals`): o motor gera propostas item a item nos 4 níveis e nos OKRs (adicionar ou atualizar com o diff por campo; task nova numa história existente não marca a história como alterada; título parecido, a 80% das palavras, é o mesmo item), aplica só as aceitas, marca itens novos com origem "IA" e a reunião, registra a atualização no histórico do item, e acha/mescla histórias duplicadas (`findDuplicateStories`, `mergeStories`). **E8.4 feito em parte**: a geração de backlog com IA deixou de usar `window.confirm` tudo-ou-nada; agora abre a tela "Revisar o que a IA propõe" (itens novos já marcados, alterações em itens seus desmarcadas, antes → depois por campo, "Aplicar selecionadas", "Aceitar tudo", "Descartar tudo"). Nada muda no backlog sem aceite; verificado no navegador. **Falta do E8.4:** o pacote ainda nasce do botão "Gerar / Refinar Backlog com IA", não automaticamente ao encerrar a sala, a revisão não filtra por tipo de conversa, o pacote pendente não sobrevive a recarregar a página, e não há botão para mesclar duplicados na tela. **E8.5 feito, com ressalva** (`evidenceService`): o botão "Buscar evidências nas reuniões" (no painel Saúde do backlog) varre as falas de todas as reuniões, ignora as do entrevistador, acha trechos que falam de um épico, feature ou história (2+ palavras em comum) e trazem sinal de necessidade ("preciso", "toda semana", "perco tempo"…) ou de rejeição ("não preciso", "ninguém usa"…). Cada sugestão mostra a citação, quem falou (nome do stakeholder quando a sala sabia), reunião e minuto; o PO marca/desmarca e só então registra. O item passa a validado ou contestado pela evidência mais recente, item invalidado continua invalidado, o registro entra no histórico do item e a mesma fala não é sugerida de novo. Verificado no navegador. **Ressalva:** a detecção é por palavras-chave, sem IA, e pode errar (a tela avisa); uma versão com IA para classificar confirma/contesta fica para depois. A validação também não é automática ao encerrar a sala.

**E8 concluído (todos os itens), verificado no navegador:**
- **E8.7 desfazer** (`backlogHistoryService`): cada mudança grande (aplicar revisão, registrar evidências, fatiar, mesclar) guarda uma cópia do backlog antes (até 5); o botão "Desfazer: …" no painel de saúde devolve o backlog exatamente ao estado anterior, sem mexer no resto do projeto.
- **E8.3 fatiamento** (`slicingService`, janela "Fatiar história"): a história grande demais (mais de 8 pontos) ganha o botão "Fatiar"; o app sugere uma filha por critério de aceite, o PO ajusta títulos e pontos, e **não deixa confirmar** se um critério ficar sem destino ou se os pontos não somarem os da original. Cada filha guarda `sliceOf`, herda texto, citação, checklists e validação, e registra "Fatiada de …"; tasks sem destino ficam com a primeira filha. Também há fatiar épico em features, feature em histórias e história em tasks (serviço e testes; **sem tela própria ainda**, só a história tem janela). A tela antiga do Fatiador SPIDR (`refine`) continua existindo em paralelo: a unificação fica no E6.2.
- **E8.8 exportações** (`exportTrace`): Jira CSV/JSON, GitHub, Linear levam estado de validação, citação (reunião e minuto), origem e fatiamento quando o item os tem; itens invalidados ficam de fora de todos os formatos (opção `includeInvalidated`); projetos sem esses dados exportam como antes. Corrigido de passagem: o Linear marcava toda história com `discovery-validated`; agora o rótulo reflete o estado real.
- **E8.4 completo**: o botão "Gerar propostas para o backlog" no painel de fechamento da sala; a revisão mostra primeiro o que importa para o tipo da conversa (discovery: itens novos; alinhamento: alterações em itens existentes; refinamento: histórias e tasks) com "Mostrar todas"; o pacote pendente sobrevive a recarregar a página; botão "Mesclar duplicada" no painel de saúde.
- **Limites conhecidos do E8:** a detecção de evidências (E8.5) é por palavras-chave, sem IA; o PRD gerado só preenche um rascunho vazio (não entra na revisão); o instantâneo guarda as 5 últimas mudanças.

**Decisões pendentes (PO) — já respondidas acima, mantidas para histórico**
1. As definições de **validação** e **verificação** acima estão certas? Em especial: validação é sobre a **necessidade** (evidência de reunião) e verificação é sobre a **qualidade do item**.
2. A revisão aceita **proposta por proposta** (recomendado) ou também em **pacote único**, com "aceitar tudo"?
3. **Desfazer** (E8.7) é obrigatório já na primeira versão? Recomendo que sim, porque a IA passa a alterar o backlog.
4. Itens `contestado` ou `invalidado` **somem** do backlog ou ficam visíveis, marcados?
5. A **ordem**: sugiro E8.1 e E8.2 antes de E4.3 (quebrar o `App`) e E4.2 (router), porque são eles que mudam o que o produto faz. E8.4 vem junto do E7.1, que define o tipo de conversa.

### Épico E9: Começar do zero e conduzir o projeto de ponta a ponta (pedido do PO)

Pedido: os projetos que existiam eram **de exemplo** e o PO precisa de um app **limpo** para criar o próprio projeto, dar as informações dele, cadastrar **stakeholders**, iniciar o backlog, fazer **anotações**, **marcar reuniões**, extrair informações delas, ter **mapa mental** e **jornada do usuário**. E um **copiloto bem funcional, inclusive entrevistando o PO**.

**Onde estamos hoje** (código lido):
- **Existe:** criar projeto, sala de reunião ao vivo (gravar, anotar, importar), análise com perguntas, dores, JTBD, mapa mental e fluxo do usuário, backlog, PRD, copiloto de chat (`po_space`).
- **Não existe:** cadastro de **stakeholders** (só uma lista de nomes dentro de cada reunião e as personas); **agenda** de reuniões futuras (a sala só nasce na hora de usar, com a data de criação); **anotações do projeto** fora de uma sala; e um copiloto que **conduza uma entrevista** em vez de só responder.
- **Dado fictício na tela de um projeto novo:** o Hub do Projeto mostra uma calculadora de ROI com números fixos (160h economizadas, R$ 24.000, 12,4x ROI, 92% de clareza), uma North Star e um público-alvo de conciliação financeira, e os campos de criação têm exemplos do mesmo caso fictício. Um projeto novo, de qualquer área, nasce parecendo ter métricas.

| ID | Item | Esforço | Risco | Depende de | Aceite |
|---|---|---|---|---|---|
| E9.0 | **Começo limpo**: o app não semeia mais projeto de exemplo; `getActiveProject` pode ser `null`; a tela inicial funciona com zero projetos; "Limpar tudo" virou "Apagar todos os projetos", com confirmação | M | M | E4.1 | **Feito.** App abre vazio, sem tela em branco; criar o primeiro projeto funciona; 3 testes de ponta a ponta |
| E9.0b | **Remover o dado fictício do Hub do Projeto** e dos exemplos de formulário: campos vazios para preencher, ROI e North Star só aparecem quando o usuário informa os dados que os alimentam | P | B | E9.0 | **Feito.** Um projeto novo não exibe nenhuma métrica, meta ou público que o usuário não escreveu. A calculadora de ROI (números fixos) saiu; a North Star agora é salva (`prd.northStarMetric`, antes era só estado local e se perdia); o texto de preenchimento do PRD virou vazio e a tela mostra "Ainda não informado"; exemplos dos formulários são neutros; o Hub reinicia ao trocar de projeto. 6 testes novos; verificado no app |
| E9.1 | **Stakeholders do projeto**: cadastro de pessoas com nome, papel, organização, interesse, influência, como prefere ser contatado e observações; matriz interesse × influência; ligar stakeholders às reuniões (quem participa) e às falas (quem disse) | M | B | E9.0 | **Feito.** Cadastrar, editar e remover stakeholders (com matriz interesse × influência); escolher quem participa da reunião e quem está falando; a fala guarda o autor pelo nome |
| E9.2 | **Agenda de reuniões**: marcar reunião futura com data, hora, tipo (E7), pauta, objetivo e participantes; listar próximas e passadas; iniciar a sala a partir de uma reunião agendada; lembrete de pauta | M | M | E9.1, E7.1 | **Feito.** Menu "Agenda de Reuniões": marcar com título, tipo, data/hora, objetivo, pauta (uma por linha) e participantes; próximas (mais cedo primeiro, com selo "Atrasada") e passadas; "Iniciar reunião" abre a sala ativa já com tipo, participantes, objetivo e pauta (cartão "Pauta da reunião" na sala); reabrir a sala de uma reunião realizada sem duplicar; cancelar (com confirmação) e remover. Lembrete automático de pauta ainda não existe |
| E9.3 | **Anotações do projeto**: notas livres ligadas ao projeto (e opcionalmente a um stakeholder, reunião ou item do backlog), com busca e etiquetas; uma nota pode virar item de backlog ou decisão | M | B | E9.0 | **Feito.** Menu "Anotações": criar, editar e excluir (com confirmação); etiquetas; ligar a um stakeholder; buscar sem diferenciar acento/maiúscula; filtrar por etiqueta e por stakeholder; "Virar decisão" (Decision Log) e "Virar história" (épico "Anotações do projeto"), sem duplicar ao repetir. Ligar a reunião/história específica fica para quando a Agenda (E9.2) existir |
| E9.4 | **Copiloto entrevistador**: o copiloto conduz uma entrevista com o PO, **uma pergunta por vez**, e grava as respostas nos campos certos (objetivo, problema, público, stakeholders, restrições, riscos, métricas, hipóteses, premissas). Funciona **sem chave de IA** (roteiro fixo de perguntas) e, **com chave**, faz perguntas de aprofundamento a partir da resposta. Mostra o que entendeu e **pede confirmação** antes de salvar; pode ser pausada e retomada | G | M | E9.0b, E9.1 | **Feito.** Menu "Copiloto me entrevista" (e atalho em Stakeholders). 10 perguntas, uma por vez, com dica; pula o que o projeto já tem; resposta curta gera pergunta de aprofundamento (regra local sem chave, IA com chave); mostra "Entendi assim" e onde vai salvar, e só grava após "Salvar" (ou "Editar"); pode pular e retomar. Preenche problema, público, valor, North Star, métricas, stakeholders, escopo, fora do escopo, premissas e riscos |
| E9.5 | **Copiloto prepara e fecha reuniões**: antes, monta pauta e perguntas a partir do que falta saber (lacunas da entrevista, hipóteses sem validação do E8); depois, entrevista o PO sobre o que ficou claro e o que ficou em aberto | M | M | E9.4, E9.2, E8.5 | **Feito, com ressalva.** *Antes:* botão "Sugerir pauta" na Agenda monta a pauta a partir do que falta saber (pontos da entrevista do PRD sem resposta, perguntas de reuniões anteriores que ficaram sem ser feitas, e itens do tipo: caso concreto no discovery, decisões em revisão no alinhamento, histórias sem critério de aceite no refinamento), sem repetir o que o PO já digitou. *Depois:* painel "Encerrar reunião com o copiloto" na sala (o que ficou claro, o que ficou em aberto, próxima ação) grava uma anotação `#fechamento` ligada à sala; fechar de novo atualiza a mesma. **Ressalva:** as hipóteses sem validação dependem do E8, que ainda não existe, então ficam de fora da pauta por enquanto |
| E9.6 | **Copiloto com contexto do projeto**: o chat conhece stakeholders, notas, reuniões e backlog, cita de onde tirou cada informação e diz quando não sabe | M | M | E9.1, E9.3 | **Feito.** O chat do Espaço do PO funciona **sem chave de IA**: responde pela busca no projeto (falas, anotações, stakeholders, dores, decisões, backlog, PRD) citando a fonte, ou diz "Não encontrei nada registrado"; a resposta é marcada "Resposta da busca no projeto, sem IA". Com chave, os trechos encontrados vão para o prompt com a instrução de citar a fonte e dizer quando não há registro; se a IA falhar, entrega a busca local avisando. O contexto enviado à IA agora inclui stakeholders, anotações, reuniões marcadas e decisões, e deixou de imprimir campos do PRD em branco |
| E10 | **Assistente da conversa** (pedido do PO): ligado na sala ao vivo, acompanha cada fala e age conforme o tipo da conversa: *entrevista* responde às perguntas feitas ao PO e dá exemplo; *alinhamento* organiza tópicos com ideias embaixo; *discovery* faz perguntas profundas pensando em PRD e SPEC | M | M | E9.1 | **Feito.** Tipo da conversa (discovery, entrevista, alinhamento, refinamento) na sessão; funciona sem IA (regras locais, sinalizado) e com IA, que cai nas regras locais se falhar; guarda as últimas análises. 27 testes de serviço + 8 do painel |

**E4.3 (em andamento, 2 de 3 partes):** (1) os handlers das telas do PO (stakeholders, entrevista, anotações, agenda, fechamento) saíram do `App.tsx` para `state/projectActions.ts`; (2) os do backlog (gerar propostas, revisão, evidências, fatiar, mesclar, desfazer) para `state/backlogActions.ts`. Ambos são fábricas puras com dependências explícitas e testes (8 e 15). O `App.tsx` tem hoje 1.213 linhas, apesar de ter absorvido o E8 inteiro. **Falta (3):** a sala ao vivo e a gravação (`useRecording`, atalhos de teclado, importação de áudio e transcrição, ~40 handlers e ~370 linhas de JSX), que mexem em áudio e em estado que muda durante a gravação e hoje quase não têm teste de ponta a ponta; a meta de 300 linhas só se alcança com esse corte, e convém escrever os testes dessa área antes.

**Ordem sugerida:** E9.0b → E9.1 → E9.4 → E9.3 → E9.2 → E9.5 → E9.6. O E9.4 vem logo depois dos stakeholders porque é ele que ajuda o PO a preencher o projeto do zero.

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
