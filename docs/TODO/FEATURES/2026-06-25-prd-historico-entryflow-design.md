# Design: PRD histórico do EntryFlow para a equipa de negócio

## Contexto e objetivo

A equipa de negócio do EntryFlow não tem hoje nenhum PRD nem CHANGELOG que documente o que já foi construído. O produto evoluiu organicamente através de commits e feature branches, sem registo formal de requisitos, user stories ou critérios de aceitação. Este design define como gerar, retroativamente, um conjunto de PRDs que documentem o estado atual do produto, usando o agente `.claude/agents/prd.md`, e como publicá-los no Notion para consumo da equipa de negócio.

Este é documentação retroativa (já implementado), não planeamento de trabalho futuro.

## Levantamento do estado atual

- **Guard pages** (`src/pages/*.tsx`, 12 ficheiros): Dashboard, NewEntry, DailyList, Incidents, ResidentSearch, News, Settings, Setup, Login, UserManual, PrivacyPolicy, AccountDeletion.
- **Admin pages** (`src/pages/admin/*.tsx`, 18 ficheiros): AdminDashboard, AdminCondominiums, AdminDevices, AdminDeviceRegistrationErrors, AdminStaff, AdminUnits, AdminResidents, AdminRestaurants, AdminSports, AdminNews, AdminEvents, AdminVisits, AdminIncidents, AdminVisitTypes, AdminServiceTypes, AdminAnalytics, AdminAuditLogs, AdminSubscriptions.
- Não existem ainda `docs/ARCHITECTURE.md`, `docs/PAGES.md`, `docs/FEATURES.md`, `docs/DATA_MODELS.md`, `docs/DEPLOYMENT.md`, `docs/OBSERVABILITY.md`, `docs/TROUBLESHOOTING.md` — todos referenciados em CLAUDE.md mas nunca criados.
- Não existe CHANGELOG.md nem PRD histórico prévio.
- O repositório git real está em `src/` (confirmado via `git rev-parse --is-inside-work-tree`), não na raiz do projeto.
- O histórico de commits revela fases identificáveis por feature branch: `feature_device_approval_settings` → `feature_calling_twilio` (chamadas telefónicas) → `feature_video_call_v1`/`feature_video_call_v3` (WebRTC) → resident lookup e botões de comunicação na DailyList.
- Já existe infraestrutura Notion ativa (`mcp__notion__*` e `mcp__claude_ai_Notion__*`) e uma página-mãe "EntryFlow — Claude Automation Reports" (ID `36d350f2-7ede-8177-901b-c464c88c7ee2`), usada exclusivamente para relatórios técnicos diários de automação — não deve ser reutilizada para PRDs de produto, para não misturar audiências (técnica vs. negócio).

## Decisão de formato

### 1. Granularidade: PRD-mãe + 5 PRDs de módulo

Em vez de um único PRD monolítico (difícil de manter e de ler de uma vez) ou um PRD por página individual (demasiado granular, 30 documentos), dividimos em:

1. **PRD-mãe**: visão geral do produto, personas, goals de negócio, arquitetura de alto nível, link para os 5 módulos.
2. **Guard App**: Dashboard, NewEntry, DailyList, Incidents, ResidentSearch, News, Settings, Setup, Login.
3. **Admin Panel**: as 18 páginas de administração.
4. **Resident Communication & Video Calls**: chamadas telefónicas (Twilio), WebRTC video calls, resident lookup.
5. **Sync & Offline-First Architecture**: DataService, IndexedDB/Dexie, health checks, device configuration.
6. **Páginas públicas/legais**: UserManual, PrivacyPolicy, AccountDeletion.

Esta divisão segue os limites de módulo já existentes no código (rotas, pastas `pages/` vs `pages/admin/`, serviços dedicados como `videoCallService.ts`), facilitando que o agente `prd.md` analise cada módulo isoladamente sem precisar carregar o produto inteiro de uma vez.

### 2. Tratamento de secções retroativas do `prd_outline`

O agente `prd.md` foi desenhado para planeamento futuro. Como este uso é retroativo, duas secções do outline mudam de sentido:

- **"Milestones & sequencing"** → renomeada para **"Histórico de entregas"**, organizada pelas fases reais observadas no git log (ex.: Fase 1: Core Visit Management, Fase 2: Device Approval, Fase 3: Phone Calls via Twilio, Fase 4: Video Calls WebRTC + Resident Lookup). Sem estimativas de tempo futuras — apenas a sequência real.
- **"Success metrics"** → passam a descrever as métricas que cada feature foi desenhada para impactar (ex.: tempo médio de registo de visita, taxa de incidentes resolvidos), não metas de crescimento futuras em aberto.

Todas as outras secções do outline (user stories, acceptance criteria, technical considerations, user personas, role-based access) mantêm-se, apenas reescritas no passado/presente descritivo em vez de prescritivo.

### 3. Destino: Notion, página-mãe dedicada

Cria-se uma nova página-mãe **"EntryFlow — PRDs"** no Notion, irmã (não filha) de "EntryFlow — Claude Automation Reports". Cada um dos 6 documentos (PRD-mãe + 5 módulos) torna-se uma subpágina dessa nova página-mãe.

Justificação: a audiência dos relatórios de automação é técnica (recomendações de hooks/MCP/skills); a audiência dos PRDs é a equipa de negócio. Misturar as duas reduziria a clareza de navegação para quem só quer ver produto.

### 4. Fluxo de geração e publicação

1. O agente `prd.md` gera cada PRD em Markdown, no seu comportamento nativo (sem modificações ao agente).
2. Cada PRD é revisto e aprovado pelo utilizador antes de avançar (o próprio agente já pede confirmação).
3. Fora do agente, as tools `mcp__notion__*` (ex.: `API-post-page`) publicam o conteúdo Markdown aprovado como subpágina da página-mãe "EntryFlow — PRDs".
4. O agente `prd.md` também oferece criar GitHub issues a partir das user stories — **esta etapa é explicitamente recusada** em todos os 6 documentos, porque o trabalho já está implementado; não há issues a abrir para trabalho concluído.

## Fora de âmbito

- Não se cria CHANGELOG.md formal nesta iteração (poderia ser um passo futuro separado).
- Não se cria nenhuma GitHub issue.
- Não se altera o agente `.claude/agents/prd.md` — usa-se como está.
- Não se documentam módulos fora do produto EntryFlow em si (ex.: o app de residentes "APPRESIDENT" tem o seu próprio repositório e ficaria fora deste PRD histórico, a menos que pedido separadamente).

## Critério de sucesso

- 6 documentos PRD existem em Markdown, revistos e aprovados pelo utilizador.
- 6 subpáginas publicadas no Notion sob a nova página-mãe "EntryFlow — PRDs".
- Nenhuma GitHub issue criada como efeito colateral.
- As secções de histórico/métricas em cada PRD refletem fases e métricas reais, não planeamento futuro.
