# SPEC.md — AI Autonomous Implementation Specification

> **Project:** Plataforma de Liquidação & Conciliação Inteligente  
> **Target AI Coding Agents:** Claude Code, Antigravity, Cursor Agent, GitHub Copilot Workspace, OpenAI o3/Codex  
> **Version:** 1.0.0-PROD  
> **Date:** 18 de Outubro de 2026  
> **Execution Mode:** Autonomous Full-Stack Development & Verification  

---

## 1. System Execution Directives for AI Coding Agent

```text
You are an autonomous Principal Software Engineer tasked with implementing the technical specification below.
Strictly adhere to the following non-negotiable engineering principles:

1. ZERO PLACEHOLDERS: Every function, parser, data mapper, state machine, and test must be fully implemented.
   Never write "// TODO: implement later" or stubbed dummy returns.
2. STRICT TYPESCRIPT COMPLIANCE: TypeScript strict mode is enabled. No 'any' types where concrete domain interfaces exist.
3. FINANCIAL NUMERIC PRECISION: Never use floating-point math (IEEE-754) for monetary calculations.
   Represent and compute all monetary values in integer cents (e.g. R$ 10,50 -> 1050 cents).
4. DEFENSIVE STREAMING: Handle malformed CSVs, BOM headers, missing columns, and dropped network connections gracefully.
   One bad line must not crash the entire ingestion batch.
5. IMMUTABLE AUDIT TRAIL: Every automatic tolerance approval and parameter adjustment must emit an append-only audit event.
6. TEST-DRIVEN COMPLETION: Every BDD Gherkin scenario defined in this spec must have a corresponding passing unit or integration test assertion.
```

---

## 2. Architecture & Directory Blueprint

```text
c:/Users/User/Discovery ao Done/
├── src/
│   ├── core/
│   │   ├── parsers/
│   │   │   ├── csvStreamingParser.ts      # Chunked streaming reader for Cielo, Stone, Rede
│   │   │   ├── cnab240Parser.ts           # Banking CNAB 240 format parser
│   │   │   └── normalizer.ts              # Normalizes acquirer records into CanonicalTransaction
│   │   ├── matchingEngine.ts              # Multi-pass matching algorithm (exact NSU + tolerant cents)
│   │   ├── toleranceResolver.ts           # Dynamic tolerance threshold & merchant cumulative quota check
│   │   └── auditLogger.ts                 # Cryptographically signed / append-only event trail
│   ├── types/
│   │   └── reconciliation.ts              # Canonical financial domain types & schemas
│   ├── services/
│   │   ├── reconciliationService.ts       # Orchestrates upload, matching, batch approval, notifications
│   │   ├── storageService.ts              # Reactive persistent state with migration handling
│   │   └── webhookNotificationService.ts  # Merchant webhook & email notification dispatcher
│   └── components/
│       ├── reconciliation/
│       │   ├── AcquirerUploadDropzone.tsx # Drag-and-drop parser with live streaming progress
│       │   ├── ToleranceConfigPanel.tsx   # CFO threshold controls (max per store, monthly cumulative, 2FA)
│       │   ├── ReconciliationBatchView.tsx# Batch summary, matched vs held stores, auto-approved cent count
│       │   └── AuditTrailDrawer.tsx       # Immutable history of all cent adjustments
```

---

## 3. Domain Model & TypeScript Schemas

```typescript
/**
 * Canonical currency representation in integer cents (1 Real = 100 cents)
 */
export type Cents = number;

export type AcquirerId = 'cielo' | 'stone' | 'rede' | 'getnet' | 'generic';

export type TransactionStatus = 
  | 'pending'
  | 'matched'
  | 'approved_by_tolerance'
  | 'held_divergent'
  | 'chargeback_retained';

export interface CanonicalTransaction {
  id: string;
  acquirer: AcquirerId;
  merchantId: string;
  authorizationCode: string; // NSU or TID
  grossAmountCents: Cents;
  feeAmountCents: Cents;
  netAmountCents: Cents;
  transactionDate: string;   // ISO-8601
  status: TransactionStatus;
  divergenceCents?: Cents;
  rawPayloadHash: string;
}

export interface InternalOrderRecord {
  id: string;
  orderNumber: string;
  merchantId: string;
  expectedNetCents: Cents;
  authorizationCode: string;
  orderDate: string;
}

export interface ToleranceRulesConfig {
  maxCentDifferencePerStore: Cents;      // Default: 100 (R$ 1,00)
  maxMonthlyCumulativePerStore: Cents;   // Default: 2000 (R$ 20,00)
  autoReleaseBatchEnabled: boolean;      // Default: true
  adjustmentAccountCode: string;         // Default: 'CTA-TRANSITORIA-AJUSTES-01'
  requiresCFOApprovalThreshold: Cents;   // Default: 500 (R$ 5,00)
}

export interface BatchReconciliationReport {
  batchId: string;
  processedAt: string;
  totalTransactionsProcessed: number;
  totalVolumeCents: Cents;
  perfectMatchesCount: number;
  autoApprovedTolerantCount: number;
  totalToleranceAbsorbedCents: Cents;
  heldStoresCount: number;
  heldStoresList: {
    merchantId: string;
    divergenceCents: Cents;
    reason: string;
  }[];
  isBatchReleasedForPayment: boolean;
  auditTrailReferenceId: string;
}

export interface AuditEventRecord {
  id: string;
  timestamp: string;
  eventType: 'TOLERANCE_APPROVED' | 'THRESHOLD_UPDATED' | 'BATCH_RELEASED' | 'STORE_HELD';
  actor: string;
  merchantId?: string;
  batchId: string;
  differenceCents: Cents;
  details: string;
}
```

---

## 4. Core Algorithms & Logic

### 4.1 Matching & Cent Tolerance Algorithm (`matchingEngine.ts`)

```typescript
/**
 * Executes two-phase matching:
 * Phase 1: Exact Key Matching (Merchant ID + Authorization Code / NSU)
 * Phase 2: Cent Difference Evaluation against Tolerance Rules
 */
export function matchBatch(
  transactions: CanonicalTransaction[],
  orders: InternalOrderRecord[],
  config: ToleranceRulesConfig,
  currentMerchantMonthlyCumulative: Record<string, Cents>
): BatchReconciliationReport {
  let perfectMatches = 0;
  let autoApprovedTolerant = 0;
  let totalToleranceAbsorbed: Cents = 0;
  const heldStoresMap = new Map<string, { divergenceCents: Cents; reason: string }>();

  // Index internal orders by authorizationCode for O(1) lookup
  const orderIndex = new Map<string, InternalOrderRecord>();
  orders.forEach(o => orderIndex.set(o.authorizationCode, o));

  transactions.forEach(tx => {
    const matchedOrder = orderIndex.get(tx.authorizationCode);

    if (!matchedOrder) {
      tx.status = 'held_divergent';
      heldStoresMap.set(tx.merchantId, {
        divergenceCents: tx.netAmountCents,
        reason: 'NSU / Autorização não encontrada nos pedidos internos'
      });
      return;
    }

    const differenceCents = Math.abs(tx.netAmountCents - matchedOrder.expectedNetCents);

    if (differenceCents === 0) {
      tx.status = 'matched';
      perfectMatches++;
      return;
    }

    // Check if within store tolerance
    const merchantCumulative = currentMerchantMonthlyCumulative[tx.merchantId] || 0;
    const isUnderStoreThreshold = differenceCents <= config.maxCentDifferencePerStore;
    const isUnderMonthlyLimit = (merchantCumulative + differenceCents) <= config.maxMonthlyCumulativePerStore;

    if (config.autoReleaseBatchEnabled && isUnderStoreThreshold && isUnderMonthlyLimit) {
      tx.status = 'approved_by_tolerance';
      tx.divergenceCents = differenceCents;
      autoApprovedTolerant++;
      totalToleranceAbsorbed += differenceCents;
      currentMerchantMonthlyCumulative[tx.merchantId] = merchantCumulative + differenceCents;
    } else {
      tx.status = 'held_divergent';
      tx.divergenceCents = differenceCents;
      const reason = !isUnderStoreThreshold
        ? `Divergência de R$ ${(differenceCents / 100).toFixed(2)} excede teto unitário de R$ ${(config.maxCentDifferencePerStore / 100).toFixed(2)}`
        : `Divergência excede teto mensal cumulativo do lojista`;

      heldStoresMap.set(tx.merchantId, { divergenceCents: differenceCents, reason });
    }
  });

  return {
    batchId: `batch-${Date.now()}`,
    processedAt: new Date().toISOString(),
    totalTransactionsProcessed: transactions.length,
    totalVolumeCents: transactions.reduce((acc, t) => acc + t.netAmountCents, 0),
    perfectMatchesCount: perfectMatches,
    autoApprovedTolerantCount: autoApprovedTolerant,
    totalToleranceAbsorbedCents: totalToleranceAbsorbed,
    heldStoresCount: heldStoresMap.size,
    heldStoresList: Array.from(heldStoresMap.entries()).map(([merchantId, info]) => ({
      merchantId,
      divergenceCents: info.divergenceCents,
      reason: info.reason
    })),
    // Crucial rule: The batch as a whole is released for the non-divergent stores!
    isBatchReleasedForPayment: transactions.length > 0 && heldStoresMap.size < transactions.length,
    auditTrailReferenceId: `audit-ref-${Date.now()}`
  };
}
```

---

## 5. Step-by-Step Implementation Plan for AI

### Phase 1: Core Engine & Streaming Parser (Sprint 1)
- [x] **Task 1.1:** Implement `csvStreamingParser.ts` supporting chunked reading of Cielo, Stone, and Rede files with UTF-8 BOM auto-detection.
- [x] **Task 1.2:** Implement `toleranceResolver.ts` with integer cent arithmetic and monthly cumulative bounds.
- [x] **Task 1.3:** Implement `matchingEngine.ts` following Section 4.1 logic with 100% test coverage.

### Phase 2: Reactive User Interface & CFO Controls (Sprint 2)
- [x] **Task 2.1:** Implement `AcquirerUploadDropzone.tsx` with drag-and-drop, line-by-line streaming progress bar, and schema validation error badges.
- [x] **Task 2.2:** Implement `ToleranceConfigPanel.tsx` with sliders for unit store tolerance (R$ 0,10 to R$ 5,00) and cumulative monthly ceiling.
- [x] **Task 2.3:** Implement `ReconciliationBatchView.tsx` with high-visibility metrics (Total conciliado, Autoliberadas por centavos, Lojas retidas para análise individual).

### Phase 3: Delivery Integrations & Autonomous Export (Sprint 3)
- [x] **Task 3.1:** Implement `exportService.exportToPRD` and `exportService.exportToAISpec` in `src/services/exportService.ts`.
- [x] **Task 3.2:** Wire up 1-click modal exports in `DiscoveryToDoneView.tsx` and full documentation rendering in `ProjectDocumentationView.tsx`.
- [x] **Task 3.3:** Run automated build and e2e browser verification.

---

## 6. Executable BDD Acceptance Criteria (Test Scenarios)

### Suite A: Parser Multiformato
```gherkin
Feature: Parsing de Extratos de Adquirentes
  Scenario: Ingestão de CSV da Stone com UTF-8 BOM
    Given um arquivo CSV da Stone contendo 50.000 linhas com cabeçalho UTF-8 BOM
    When o parser de streaming processa o arquivo
    Then todas as 50.000 linhas devem ser normalizadas para CanonicalTransaction
    And o tempo de execução total deve ser inferior a 3.000 milissegundos
    And nenhum erro de estouro de memória (Heap Out of Memory) deve ocorrer.

  Scenario: Linha com coluna obrigatória nula
    Given um arquivo CSV com 100 linhas onde a linha 42 possui o NSU vazio
    When o parser de streaming processa o arquivo
    Then 99 transações devem ser normalizadas com status 'pending'
    And a linha 42 deve ser registrada no log de quarentena sem interromper o processamento das restantes.
```

### Suite B: Tolerância de Centavos e Resolução de Lotes
```gherkin
Feature: Tolerância Adaptativa de Centavos
  Scenario: Autoliberação de microdivergência de R$ 0,15
    Given que a regra de tolerância está configurada para teto de R$ 1,00
    And o pedido interno espera R$ 150,00
    And o extrato da adquirente reporta R$ 149,85 (diferença de 15 centavos)
    When o motor de matching processa a transação
    Then a transação deve ser classificada como 'approved_by_tolerance'
    And o valor de 15 centavos deve ser registrado na conta transitória de ajuste
    And o lote da loja deve ser liberado para pagamento.

  Scenario: Divergência de R$ 5,00 isola apenas a loja divergente
    Given um lote contendo 200 lojas
    And 199 lojas possuem diferença zero ou inferior a R$ 1,00
    And a Loja 77 possui diferença de R$ 5,00
    When o motor processa a conciliação do lote
    Then 199 lojas devem ser liberadas imediatamente para pagamento em D+0
    And a Loja 77 deve ser retida com status 'held_divergent'
    And um alerta de auditoria deve ser enviado para o analista de tesouraria.
```

---

## 7. Non-Functional & Security Requirements

1. **Numeric Integrity:** Zero floating point division anomalies. All math operations must use integer cents:
   ```typescript
   const centDifference = Math.abs(acquirerNetCents - orderNetCents);
   ```
2. **Local-First Persistence:** Project backlogs, personas, and historical meeting evidence must persist reliably in local storage with automatic JSON schema migration.
3. **Audit Trail Security:** Every tolerance event record contains a SHA-256 integrity hash of previous events to prevent retro-active manipulation.
4. **Token & Performance Guardrails:** Background AI synthesis routines must respect the "Modo Bate-Papo Informal" pause state to prevent unnecessary LLM token consumption.

---

## 8. AI Agent Verification & Completion Checklist

- [x] TypeScript compiler passes cleanly: `tsc -b` exits with code 0.
- [x] Vite production build succeeds: `npm run build` generates optimized bundle with 0 errors.
- [x] PRD and SPEC documents generated and synchronized with project backlog.
- [x] Browser visual verification confirms seamless UI interaction in all tabs.
