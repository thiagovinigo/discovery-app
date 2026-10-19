// Textos de exemplo dos agentes do Studio, usados quando não há chave de API ou a IA falha.
// Hoje são conteúdo fixo de um caso fictício de conciliação financeira.

/** Síntese de discovery de exemplo. */
export const synthesizerTemplate = (): string =>
  `🎯 **Síntese Autônoma de Discovery & JTBD:**\n\n` +
  `**1. Job To Be Done Principal (JTBD):**\n` +
  `"Quando fecho as transações do mês, Quero conciliar e liquidar os repasses de 200 lojistas em menos de 1 hora com precisão centesimal, Para que eu encerre o fechamento contábil sem horas extras nem atrito com fornecedores."\n\n` +
  `**2. Dores Críticas Mapeadas (Pain Points):**\n` +
  `• Bloqueio em cascata: 1 divergência isolada de R$ 0,05 paralisa o pagamento de todos os outros 199 lojistas saudáveis.\n` +
  `• Retrabalho manual: 4 dias desperdiçados cruzando planilhas manuais no Excel com relatórios bancários.\n` +
  `• Chamados de suporte: Lojistas sem visibilidade do status do repasse sobrecarregando o time de atendimento.\n\n` +
  `**3. Oportunidades Priorizadas (Opportunity Tree):**\n` +
  `• Oportunidade A: Regra de tolerância parametrizável para diferenças menores que R$ 1,00.\n` +
  `• Oportunidade B: Motor de conciliação assíncrono que processa lojistas válidos em lote e isola apenas as exceções.\n` +
  `• Oportunidade C: Portal de autoatendimento e webhook de extrato para o lojista.\n\n` +
  `**4. Hipótese Falsificável:**\n` +
  `"Acreditamos que implementar o isolamento automático de exceções reduzirá o tempo de fechamento de 4 dias para 30 minutos. Saberemos que tivemos sucesso se o volume de tickets de reclamação de atraso cair em 80% nos primeiros 30 dias."`;

/** Fatiamento SPIDR de exemplo. */
export const slicerTemplate = (): string =>
  `🔪 **Histórias Fatiadas via Método SPIDR & PBB:**\n\n` +
  `**História 1 (Caminho Feliz - Paths):**\n` +
  `Como Analista Financeiro, Quero processar o split para lojistas com dados válidos, Para que recebam em D+0.\n` +
  `*BDD Dado/Quando/Então:* Dado que o arquivo de extrato não tem divergência, Quando o lote rodar, Então 100% dos lojistas são liquidados com log emitido.\n\n` +
  `**História 2 (Regra de Tolerância - Rules):**\n` +
  `Como CFO, Quero aprovar divergências de centavos até R$ 1,00 automaticamente, Para que o lote global de 200 lojas não fique congelado.\n` +
  `*BDD Dado/Quando/Então:* Dado que a diferença é de R$ 0,18, Quando o lote processar, Então o pagamento segue e a diferença é debitada em conta transitória.\n\n` +
  `**História 3 (Notificação Assíncrona - Interfaces):**\n` +
  `Como Lojista B2B, Quero receber um webhook e email com o comprovante do repasse, Para ter transparência financeira sem abrir chamado no suporte.`;

/** SPEC.md de exemplo; usa a entrada no título. */
export const specArchitectTemplate = (specInput: string): string =>
  `# SPEC.md: ${specInput}\n` +
  `> **Documento Canônico de Arquitetura & Implementação para Agentes de Codificação de IA**\n` +
  `> Gerado pelo Principal Tech Architect AI • Padrão Antigravity\n\n` +
  `## 1. Princípios de Engenharia & SLA\n` +
  `- **Precisão Monetária Centesimal:** Aritmética estritamente inteira (centavos inteiros \`BigInt\` ou \`number\` escalado). Proibido usar float/double IEEE 754.\n` +
  `- **Performance:** Processamento de lote com 200 transações em < 30 segundos.\n` +
  `- **Idempotência:** Todo lote de liquidação possui um \`idempotencyKey\` único.\n\n` +
  `## 2. Modelos Canônicos de Dados (TypeScript)\n` +
  `\`\`\`typescript\n` +
  `export interface SettlementBatch {\n` +
  `  batchId: string;\n` +
  `  createdAt: string;\n` +
  `  toleranceLimitCents: number; // ex: 100 centavos = R$ 1,00\n` +
  `  totalAmountCents: number;\n` +
  `  items: SettlementItem[];\n` +
  `}\n\n` +
  `export interface SettlementItem {\n` +
  `  id: string;\n` +
  `  merchantId: string;\n` +
  `  grossAmountCents: number;\n` +
  `  feeAmountCents: number;\n` +
  `  netAmountCents: number;\n` +
  `  discrepancyCents: number;\n` +
  `  status: 'RECONCILED' | 'AUTO_APPROVED_TOLERANCE' | 'MANUAL_HOLD';\n` +
  `}\n` +
  `\`\`\`\n\n` +
  `## 3. Endpoints REST & Contratos de Serviço\n` +
  `- \`POST /api/v1/settlements/batches\` -> Submete novo lote para conciliação em background.\n` +
  `- \`GET /api/v1/settlements/batches/:id/discrepancies\` -> Retorna transações isoladas para auditoria.\n` +
  `- \`POST /api/v1/settlements/batches/:id/approve-tolerances\` -> Libera pagamento com provisão contábil.\n\n` +
  `## 4. Cenários de Validação Automatizada (Gherkin BDD)\n` +
  `\`\`\`gherkin\n` +
  `Scenario: Conciliação automática com divergência aceitável de R$ 0,18\n` +
  `  Given que o lojista possui extrato com divergência de 18 centavos (<= 100 centavos)\n` +
  `  When o motor executar a reconciliação do lote em D+0\n` +
  `  Then a transação é marcada como AUTO_APPROVED_TOLERANCE\n` +
  `  And o repasse de 199 lojistas saudáveis não é paralisado\n` +
  `  And um lançamento de débito de R$ 0,18 é registrado na conta transitória de perdas operacionais\n` +
  `\`\`\``;

/** Prescrição de coach ágil de exemplo. */
export const coachTemplate = (): string =>
  `🎯 **Diagnóstico do Agile Coach AI:**\n\n` +
  `**Problema Raiz Identificado:** Falta de visualização de dependências entre times (Silos Operacionais no Flight Level 1).\n\n` +
  `**Prática Recomendada do Acervo:** **Flight Levels Nível 2 (Coordenação entre Times - Klaus Leopold)** combinado com o ritual de **Scrum of Scrums / PI Planning do SAFe**.\n\n` +
  `**Plano de Ação Imediato:**\n` +
  `1. Montar um Board Kanban L2 compartilhado entre os 6 squads listando apenas as entregas com dependência mútua.\n` +
  `2. Limitar o WIP de projetos simultâneos em andamento no nível da coordenação para no máximo 3.\n` +
  `3. Estabelecer reunião rápida de alinhamento L2 de 15 minutos às terças e quintas com 1 representante de cada squad (PO ou Tech Lead).`;

/** Payload Jira de exemplo, com a chave do projeto informada. */
export const jiraSyncTemplate = (jiraProjectKey: string): string => {
  const payload = {
    projectKey: jiraProjectKey,
    generatedAt: new Date().toISOString(),
    issues: [
      {
        issueType: "Epic",
        summary: "Motor de Conciliação e Split Inteligente",
        description: "Permite a conciliação automática de extratos e liquidação em lote com isolamento de divergências.",
        labels: ["discovery-to-done", "wave-1", "fintech"],
        customFields: {
          targetRelease: "2026-Q4",
          wsjfScore: 8.5
        }
      },
      {
        issueType: "Story",
        epicLink: `${jiraProjectKey}-101`,
        summary: "Como Analista Financeiro, quero conciliar lotes automaticamente",
        storyPoints: 5,
        acceptanceCriteria: "Scenario: Conciliação com arquivo 100% válido\nGiven um extrato bancário de 200 transações\nWhen o motor executar a correspondência\nThen 200 transações recebem status CONCILIADO em menos de 30 segundos",
        labels: ["mvp", "automated-flow"]
      },
      {
        issueType: "Story",
        epicLink: `${jiraProjectKey}-101`,
        summary: "Como CFO, quero aprovar tolerância de centavos sem travar o lote",
        storyPoints: 3,
        acceptanceCriteria: "Scenario: Divergência dentro da margem de tolerância\nGiven uma diferença de R$ 0,15 em uma transação\nWhen o lote de liquidação for processado\nThen o split do lojista é concluído e a diferença é alocada na conta de provisão transitória",
        labels: ["mvp", "rules-engine"]
      }
    ]
  };
  return JSON.stringify(payload, null, 2);
};
