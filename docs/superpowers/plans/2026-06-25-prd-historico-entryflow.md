# PRD Histórico do EntryFlow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar 6 documentos PRD retroativos (1 visão geral + 5 módulos) documentando o EntryFlow tal como já foi construído, com aprovação do utilizador a cada documento, e publicá-los no Notion sob uma nova página-mãe "EntryFlow — PRDs".

**Architecture:** Cada tarefa segue o ciclo: (1) extrair fases reais do git log relevantes ao módulo, (2) invocar o agente `prd` (`.claude/agents/prd.md`) com esse contexto pré-extraído para evitar que ele re-explore o código do zero, (3) o agente produz o PRD em Markdown e pede aprovação do utilizador, (4) após aprovação, publicar como subpágina Notion da página-mãe "EntryFlow — PRDs", (5) confirmar a publicação. O PRD-mãe é gerado por último, pois depende dos 5 PRDs de módulo já existirem para linkar/resumir.

**Tech Stack:** Agente `prd` (Claude Code agent), `git log` para extração de fases, Notion via `mcp__notion__API-post-page` / `mcp__notion__API-patch-block-children`, ficheiros Markdown em `src/docs/prd/`.

## Global Constraints

- Repositório git real está em `src/` — todos os comandos `git log` correm de `c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src`, e os paths dentro do repo NÃO têm prefixo `src/` (ex.: `pages/admin/AdminStaff.tsx`, não `src/pages/admin/AdminStaff.tsx`).
- Nenhum dos 6 PRDs deve disparar criação de GitHub issues — quando o agente `prd` perguntar no final, a resposta é sempre "não".
- "Milestones & sequencing" no outline do agente vira "Histórico de entregas" com fases reais (datas/PRs do git log), nunca estimativas futuras.
- "Success metrics" descreve métricas que a feature já impacta hoje, nunca metas de crescimento futuras.
- Página-mãe Notion existente "EntryFlow — Claude Automation Reports" (ID `36d350f2-7ede-8177-901b-c464c88c7ee2`) NÃO deve ser reutilizada — criar uma nova, irmã, chamada "EntryFlow — PRDs".
- Não alterar `.claude/agents/prd.md`.
- Não documentar o app de residentes separado (APPRESIDENT).

---

## Linha do tempo de fases (extraída do git log, reutilizável em todas as tarefas)

Executado via `git log --all --format="%h %ai %s" --reverse` em `src/`:

| Fase | Período | PRs / Branch | Áreas afetadas |
|---|---|---|---|
| Fase 0: Core MVP | 2025-11-29 → 2026-01-23 | commits diretos (sem PR nomeado) | Guard pages base, Admin pages base, DataService, db.ts — fundação do produto |
| Fase 1: Supabase Session | 2026-01-24 | PR #1 `feature_suapabase_session` | Sessão/autenticação Supabase |
| Fase 2: Observability | 2026-01-29 → 2026-01-30 | PRs #2–#8 `feature_observability` | Sentry, logger.ts, health checks |
| Fase 3: Device Approval Settings | 2026-04-24 → 2026-04-25 | PRs #9–#12 `feature_device_approval_settings` | Setup.tsx, configuração de dispositivos |
| Fase 4: Video Call (v0) | 2026-04-27 → 2026-04-30 | PRs #13–#18 `feature_video_call`, `feature_video_call_v1` (início) | Primeiras iterações de chamada de vídeo |
| Fase 5: Video Call v1 | 2026-04-30 → 2026-05-05 | PRs #18–#23 `feature_video_call_v1` | WebRTC, VideoCallModal inicial |
| Fase 6: Phone Calls (Twilio) | 2026-05-07 | PRs #24–#25 `feature_calling_twilio` | Chamadas telefónicas via Twilio |
| Fase 7: Video Call v3 + Resident Comms | 2026-05-25 → 2026-05-26 | PR #28 `feature_video_call_v3`, PR #29 `feature_video_call_ring`, commits `67cb649`, `9e44058`, `71d9fae`, `d505886`, `9f27c66` | VideoCallModal final, videoCallService.ts (WebRTC + Supabase signaling), audioService.ts, resident lookup, botões de comunicação na DailyList |

Esta tabela é reutilizada nas tarefas 2–6 (cada módulo usa o subconjunto de fases relevante).

---

### Task 1: Criar a página-mãe Notion "EntryFlow — PRDs"

**Files:** nenhum ficheiro local — ação só no Notion.

**Interfaces:**
- Produces: `notion_parent_page_id` (string, ID da página criada) — usado por todas as tarefas seguintes (3, 5, 7, 9, 11, 13) para publicar subpáginas.

- [ ] **Step 1: Localizar o workspace/página de topo onde "EntryFlow — Claude Automation Reports" vive**

Usar `mcp__notion__API-retrieve-a-page` com o ID conhecido `36d350f2-7ede-8177-901b-c464c88c7ee2` para ler o campo `parent` dessa página — isso dá o ID da página/workspace pai onde a nova página-mãe deve ser criada como irmã.

- [ ] **Step 2: Criar a página-mãe "EntryFlow — PRDs"**

Usar `mcp__notion__API-post-page` com:
- `parent`: o mesmo `parent` obtido no Step 1 (mesmo nível que "EntryFlow — Claude Automation Reports")
- `properties.title`: `"EntryFlow — PRDs"`
- Corpo inicial (children): um bloco de texto explicando o propósito:
  ```
  Histórico retroativo de PRDs do EntryFlow, documentando funcionalidades já implementadas para a equipa de negócio. Gerado via agente prd.md a partir do código e histórico de commits existentes.
  ```

- [ ] **Step 3: Confirmar e guardar o ID**

Guardar o `id` retornado pela API como `notion_parent_page_id`. Confirmar visualmente (via `mcp__notion__API-retrieve-a-page` ou pedindo ao utilizador para abrir o link) que a página aparece como irmã, não filha, de "EntryFlow — Claude Automation Reports".

- [ ] **Step 4: Reportar ao utilizador**

Mensagem: "Página-mãe 'EntryFlow — PRDs' criada no Notion: <url>. Vou agora gerar o primeiro PRD de módulo."

---

### Task 2: Gerar PRD do módulo "Guard App"

**Files:**
- Create: `docs/prd/guard-app.md` (dentro do repo git em `src/`, ou seja caminho absoluto `c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/docs/prd/guard-app.md`)

**Interfaces:**
- Consumes: tabela de fases da secção "Linha do tempo de fases" acima (linhas Fase 0, Fase 3 — únicas relevantes a páginas guard puras, excluindo comms que vai para Task 4).
- Produces: `guard_app_prd_markdown` (conteúdo do ficheiro gerado) — consumido pela Task 3 (publicação Notion) e pela Task 13 (PRD-mãe linka para este módulo).

- [ ] **Step 1: Levantar lista de ficheiros do módulo**

Ficheiros guard-core (excluindo páginas de comunicação/vídeo, que pertencem ao módulo da Task 4, e excluindo páginas públicas, que pertencem à Task 10):
- `pages/Dashboard.tsx`
- `pages/NewEntry.tsx`
- `pages/DailyList.tsx` (nota: a parte de botões de chamada/vídeo desta página é detalhada na Task 4, mas a página em si — lista diária — pertence a este módulo)
- `pages/Incidents.tsx`
- `pages/ResidentSearch.tsx`
- `pages/News.tsx`
- `pages/Settings.tsx`
- `pages/Setup.tsx`
- `pages/Login.tsx`

- [ ] **Step 2: Invocar o agente `prd`**

Invocar o agente com este prompt (contexto pré-extraído para evitar re-exploração):

```
Gera um PRD retroativo para o módulo "Guard App" do EntryFlow, documentando funcionalidade JÁ IMPLEMENTADA (não planeamento futuro). Usa o ficheiro .claude/agents/prd.md como guia de estrutura, mas adapta-o assim:

- Renomeia a secção "9. Milestones & sequencing" para "9. Histórico de entregas", usando estas fases reais (extraídas do git log do repositório em src/):
  - Fase 0: Core MVP (2025-11-29 a 2026-01-23) — páginas guard base
  - Fase 3: Device Approval Settings (2026-04-24 a 2026-04-25, PRs #9-#12) — Setup.tsx e configuração de dispositivos
- A secção "7. Success metrics" deve descrever métricas que estas páginas já impactam hoje (ex: tempo de registo de visita, taxa de incidentes resolvidos), não metas futuras.
- NÃO perguntes sobre criar GitHub issues no final — esta é documentação histórica, a resposta é sempre não.
- Não re-explores o código do zero: os ficheiros relevantes são pages/Dashboard.tsx, pages/NewEntry.tsx, pages/DailyList.tsx, pages/Incidents.tsx, pages/ResidentSearch.tsx, pages/News.tsx, pages/Settings.tsx, pages/Setup.tsx, pages/Login.tsx — lê-os para extrair user stories reais, mas não precisas de procurar noutras partes do código.
- Grava o PRD em src/docs/prd/guard-app.md.

Funcionalidades conhecidas por página (usa isto para acelerar, mas confirma lendo o código):
- Dashboard: menu principal com assistente AI Concierge e resumo de atividades
- NewEntry: registo multi-step de visita/entrega com captura de câmara
- DailyList: lista de visitas do dia, com botões de comunicação ao residente (estes botões são detalhados no módulo "Resident Communication", aqui documenta-se só a lista em si)
- Incidents: gestão de incidentes com alertas de áudio e histórico de ações
- ResidentSearch: busca de residentes por nome/unidade
- News: notícias do condomínio dos últimos 7 dias
- Settings: configurações do dispositivo e info de armazenamento
- Setup: configuração inicial do tablet (registo de dispositivo)
- Login: autenticação por PIN (bcrypt, online via RPC verify_staff_login ou offline via comparação local)
```

- [ ] **Step 3: Apresentar o PRD gerado ao utilizador para aprovação**

Mostrar o conteúdo de `docs/prd/guard-app.md` e perguntar: "Este PRD do módulo Guard App está correto? Posso publicá-lo no Notion?"

- [ ] **Step 4: Aguardar aprovação explícita antes de avançar para a Task 3**

Não avançar sem "sim"/aprovação explícita. Se houver correções, editar `docs/prd/guard-app.md` e repetir o Step 3.

---

### Task 3: Publicar o PRD "Guard App" no Notion

**Files:** nenhum ficheiro local novo — lê `docs/prd/guard-app.md` (produzido na Task 2).

**Interfaces:**
- Consumes: `notion_parent_page_id` (da Task 1), `guard_app_prd_markdown` (da Task 2, conteúdo do ficheiro aprovado).
- Produces: `guard_app_notion_page_id` — referenciado na Task 13 (PRD-mãe linka todas as subpáginas).

- [ ] **Step 1: Publicar como subpágina**

Usar `mcp__notion__API-post-page` com:
- `parent.page_id`: `notion_parent_page_id`
- `properties.title`: `"Guard App"`
- `children`: o conteúdo Markdown de `docs/prd/guard-app.md` convertido em blocos Notion (cabeçalhos `#`/`##` → `heading_1`/`heading_2`, listas → `bulleted_list_item`, texto normal → `paragraph`)

- [ ] **Step 2: Confirmar publicação**

Usar `mcp__notion__API-retrieve-a-page` no ID retornado para confirmar que a página existe e está sob o parent correto.

- [ ] **Step 3: Reportar ao utilizador**

Mensagem: "PRD 'Guard App' publicado no Notion: <url>. Avanço para o módulo Admin Panel?"

---

### Task 4: Gerar PRD do módulo "Resident Communication & Video Calls"

**Files:**
- Create: `docs/prd/resident-communication.md`

**Interfaces:**
- Consumes: tabela de fases (linhas Fase 4, 5, 6, 7 — únicas relevantes a comunicação/vídeo).
- Produces: `resident_comms_prd_markdown` — consumido pela Task 5 e Task 13.

- [ ] **Step 1: Levantar lista de ficheiros do módulo**

- `services/videoCallService.ts`
- `utils/residentLookup.ts`
- `components/VideoCallModal.tsx`
- `services/audioService.ts` (alertas sonoros usados nas chamadas)
- Partes relevantes de `pages/DailyList.tsx` (botões de chamada/vídeo)

- [ ] **Step 2: Invocar o agente `prd`**

```
Gera um PRD retroativo para o módulo "Resident Communication & Video Calls" do EntryFlow, documentando funcionalidade JÁ IMPLEMENTADA. Usa .claude/agents/prd.md como guia de estrutura, com as mesmas adaptações retroativas das secções 9 (Histórico de entregas) e 7 (Success metrics) descritas abaixo.

Histórico de entregas (fases reais do git log do repositório em src/):
- Fase 4: Video Call v0 (2026-04-27 a 2026-04-30, PRs #13-#18, branch feature_video_call) — primeiras iterações de chamada de vídeo
- Fase 5: Video Call v1 (2026-04-30 a 2026-05-05, PRs #18-#23, branch feature_video_call_v1) — WebRTC e VideoCallModal inicial
- Fase 6: Phone Calls via Twilio (2026-05-07, PRs #24-#25, branch feature_calling_twilio) — chamadas telefónicas
- Fase 7: Video Call v3 + Resident Comms (2026-05-25 a 2026-05-26, PR #28 feature_video_call_v3, PR #29 feature_video_call_ring) — VideoCallModal final com 4 estados (CALLING/CONNECTED/REJECTED/FAILED), videoCallService.ts com WebRTC P2P + Supabase Realtime signaling, audioService.ts com ringing, resident lookup utility, botões de comunicação na DailyList

Success metrics: descreve métricas que esta funcionalidade já impacta hoje (ex: tempo de contacto guarda-residente, taxa de chamadas atendidas vs. rejeitadas), não metas futuras.

NÃO perguntes sobre criar GitHub issues no final — resposta sempre não.

Ficheiros a ler para extrair user stories reais (não precisas explorar mais do código): services/videoCallService.ts, utils/residentLookup.ts, components/VideoCallModal.tsx, services/audioService.ts, e a secção de DailyList.tsx relacionada a botões de chamada/vídeo.

Contexto conhecido (confirma lendo o código):
- videoCallService.ts: serviço singleton de chamada de vídeo P2P via WebRTC, com signaling via Supabase Realtime
- VideoCallModal.tsx: UI portal-rendered com 4 estados (CALLING, CONNECTED, REJECTED, FAILED)
- residentLookup.ts: helpers de busca de residente por unit_id, QR, ou resident_id, com fallback Dexie+RPC
- audioService.ts: alertas sonoros e vibração, incluindo som de "ringing" enquanto espera o residente atender
- DailyList.tsx: botões de comunicação (telefone/vídeo) por visita listada

Grava o PRD em src/docs/prd/resident-communication.md.
```

- [ ] **Step 3: Apresentar para aprovação do utilizador**

Mesmo fluxo da Task 2, Step 3.

- [ ] **Step 4: Aguardar aprovação explícita**

Mesmo fluxo da Task 2, Step 4.

---

### Task 5: Publicar o PRD "Resident Communication & Video Calls" no Notion

**Files:** lê `docs/prd/resident-communication.md` (Task 4).

**Interfaces:**
- Consumes: `notion_parent_page_id` (Task 1), `resident_comms_prd_markdown` (Task 4).
- Produces: `resident_comms_notion_page_id` — referenciado na Task 13.

- [ ] **Step 1: Publicar como subpágina** (mesmo padrão da Task 3, Step 1, com `title: "Resident Communication & Video Calls"`)
- [ ] **Step 2: Confirmar publicação** (mesmo padrão da Task 3, Step 2)
- [ ] **Step 3: Reportar ao utilizador e avançar** (mesmo padrão da Task 3, Step 3, avançando para Admin Panel)

---

### Task 6: Gerar PRD do módulo "Admin Panel"

**Files:**
- Create: `docs/prd/admin-panel.md`

**Interfaces:**
- Consumes: tabela de fases (linha Fase 0 — admin pages existem desde o commit inicial, confirmado via `git log -- pages/admin`).
- Produces: `admin_panel_prd_markdown` — consumido pela Task 7 e Task 13.

- [ ] **Step 1: Levantar lista de ficheiros do módulo**

As 18 páginas em `pages/admin/`: AdminDashboard, AdminCondominiums, AdminDevices, AdminDeviceRegistrationErrors, AdminStaff, AdminUnits, AdminResidents, AdminRestaurants, AdminSports, AdminNews, AdminEvents, AdminVisits, AdminIncidents, AdminVisitTypes, AdminServiceTypes, AdminAnalytics, AdminAuditLogs, AdminSubscriptions.

- [ ] **Step 2: Invocar o agente `prd`**

```
Gera um PRD retroativo para o módulo "Admin Panel" do EntryFlow, documentando funcionalidade JÁ IMPLEMENTADA. Usa .claude/agents/prd.md como guia, com as adaptações retroativas habituais.

Histórico de entregas: Fase 0: Core MVP (2025-11-29 a 2026-01-23) — todas as 18 páginas admin existem desde o commit inicial do repositório (confirmado via git log -- pages/admin), constituindo o núcleo de gestão administrativa do produto desde o início.

Success metrics: métricas que o painel admin já impacta hoje (ex: tempo de configuração de um novo condomínio, redução de erros de registo de dispositivo via AdminDeviceRegistrationErrors, cobertura de auditoria via AdminAuditLogs).

NÃO perguntes sobre criar GitHub issues no final — resposta sempre não.

Ficheiros a ler (18 páginas em pages/admin/): AdminDashboard.tsx, AdminCondominiums.tsx, AdminDevices.tsx, AdminDeviceRegistrationErrors.tsx, AdminStaff.tsx, AdminUnits.tsx, AdminResidents.tsx, AdminRestaurants.tsx, AdminSports.tsx, AdminNews.tsx, AdminEvents.tsx, AdminVisits.tsx, AdminIncidents.tsx, AdminVisitTypes.tsx, AdminServiceTypes.tsx, AdminAnalytics.tsx, AdminAuditLogs.tsx, AdminSubscriptions.tsx.

Organiza as user stories por agrupamento funcional (não 18 secções soltas): Gestão de Entidades (Condominiums, Units, Staff, Residents), Gestão de Dispositivos (Devices, DeviceRegistrationErrors), Configuração (VisitTypes, ServiceTypes, Restaurants, Sports), Conteúdo (News, Events), Visibilidade & Auditoria (Visits, Incidents, Analytics, AuditLogs), Subscrições (Subscriptions).

Grava o PRD em src/docs/prd/admin-panel.md.
```

- [ ] **Step 3: Apresentar para aprovação do utilizador** (mesmo padrão)
- [ ] **Step 4: Aguardar aprovação explícita** (mesmo padrão)

---

### Task 7: Publicar o PRD "Admin Panel" no Notion

**Files:** lê `docs/prd/admin-panel.md` (Task 6).

**Interfaces:**
- Consumes: `notion_parent_page_id` (Task 1), `admin_panel_prd_markdown` (Task 6).
- Produces: `admin_panel_notion_page_id` — referenciado na Task 13.

- [ ] **Step 1: Publicar como subpágina** (`title: "Admin Panel"`)
- [ ] **Step 2: Confirmar publicação**
- [ ] **Step 3: Reportar ao utilizador e avançar** para Sync & Offline-First Architecture

---

### Task 8: Gerar PRD do módulo "Sync & Offline-First Architecture"

**Files:**
- Create: `docs/prd/sync-offline-architecture.md`

**Interfaces:**
- Consumes: tabela de fases (linhas Fase 0, Fase 2 — DataService/db.ts são core desde o início; Observability adiciona health checks/logging).
- Produces: `sync_offline_prd_markdown` — consumido pela Task 9 e Task 13.

- [ ] **Step 1: Levantar lista de ficheiros do módulo**

- `services/dataService.ts`
- `services/db.ts`
- `services/logger.ts`
- `services/deviceUtils.ts`
- `services/supabaseClient.ts`

- [ ] **Step 2: Invocar o agente `prd`**

```
Gera um PRD retroativo para o módulo "Sync & Offline-First Architecture" do EntryFlow, documentando funcionalidade JÁ IMPLEMENTADA. Usa .claude/agents/prd.md como guia, com as adaptações retroativas habituais.

Histórico de entregas (fases reais do git log do repositório em src/):
- Fase 0: Core MVP (2025-11-29 a 2026-01-23) — DataService e schema Dexie (db.ts) como fundação offline-first desde o primeiro commit
- Fase 2: Observability (2026-01-29 a 2026-01-30, PRs #2-#8, branch feature_observability) — logger.ts integrado com Sentry, health checks, deviceUtils.ts para fingerprinting

Success metrics: métricas que esta arquitetura já impacta hoje (ex: % de operações completadas offline sem perda de dados, tempo médio de sincronização após reconexão, score de saúde do backend 0-3 como proxy de disponibilidade).

NÃO perguntes sobre criar GitHub issues no final — resposta sempre não.

Ficheiros a ler: services/dataService.ts (Network-then-cache para config, Write-Through with Retry para dados de utilizador, syncPendingItems, eventos sync:start/progress/complete/error), services/db.ts (schema Dexie/IndexedDB v12, tabelas visits/visitEvents/units/staff/etc.), services/logger.ts (logging integrado com Sentry), services/deviceUtils.ts (fingerprinting de dispositivo), services/supabaseClient.ts (inicialização do cliente Supabase).

Documenta os 3 padrões de sincronização descritos no CLAUDE.md como user stories técnicas: Network-Then-Cache (dados de configuração), Write-Through with Retry (dados de utilizador, sync_status PENDING_SYNC), Background Sync (retry em health check recovery e sync manual pelo utilizador).

Grava o PRD em src/docs/prd/sync-offline-architecture.md.
```

- [ ] **Step 3: Apresentar para aprovação do utilizador** (mesmo padrão)
- [ ] **Step 4: Aguardar aprovação explícita** (mesmo padrão)

---

### Task 9: Publicar o PRD "Sync & Offline-First Architecture" no Notion

**Files:** lê `docs/prd/sync-offline-architecture.md` (Task 8).

**Interfaces:**
- Consumes: `notion_parent_page_id` (Task 1), `sync_offline_prd_markdown` (Task 8).
- Produces: `sync_offline_notion_page_id` — referenciado na Task 13.

- [ ] **Step 1: Publicar como subpágina** (`title: "Sync & Offline-First Architecture"`)
- [ ] **Step 2: Confirmar publicação**
- [ ] **Step 3: Reportar ao utilizador e avançar** para Páginas públicas/legais

---

### Task 10: Gerar PRD do módulo "Páginas públicas/legais"

**Files:**
- Create: `docs/prd/public-pages.md`

**Interfaces:**
- Consumes: tabela de fases (linha Fase 0 — páginas públicas fazem parte do core, sem PR dedicado identificado).
- Produces: `public_pages_prd_markdown` — consumido pela Task 11 e Task 13.

- [ ] **Step 1: Levantar lista de ficheiros do módulo**

- `pages/UserManual.tsx`
- `pages/PrivacyPolicy.tsx`
- `pages/AccountDeletion.tsx`

- [ ] **Step 2: Invocar o agente `prd`**

```
Gera um PRD retroativo para o módulo "Páginas públicas/legais" do EntryFlow, documentando funcionalidade JÁ IMPLEMENTADA. Usa .claude/agents/prd.md como guia, com as adaptações retroativas habituais.

Histórico de entregas: Fase 0: Core MVP (2025-11-29 a 2026-01-23) — estas páginas fazem parte do produto desde o início, como requisitos de conformidade para distribuição PWA/app stores (políticas de privacidade e eliminação de conta são exigências de plataformas como Google Play).

Success metrics: métricas que estas páginas já impactam hoje (ex: conformidade com requisitos de app stores, redução de pedidos de suporte via UserManual self-service, tempo de resposta a pedidos de eliminação de dados).

NÃO perguntes sobre criar GitHub issues no final — resposta sempre não.

Ficheiros a ler: pages/UserManual.tsx (manual do utilizador, rota pública /manual, sem restrição de autenticação), pages/PrivacyPolicy.tsx (política de privacidade, rota pública /privacy-policy), pages/AccountDeletion.tsx (pedido de eliminação de conta, rota pública /account-deletion).

Nota: estas 3 páginas são as únicas rotas verdadeiramente públicas/sem autenticação do produto (além de /setup e /login que são "unrestricted" mas fazem parte do fluxo operacional, não legal).

Grava o PRD em src/docs/prd/public-pages.md.
```

- [ ] **Step 3: Apresentar para aprovação do utilizador** (mesmo padrão)
- [ ] **Step 4: Aguardar aprovação explícita** (mesmo padrão)

---

### Task 11: Publicar o PRD "Páginas públicas/legais" no Notion

**Files:** lê `docs/prd/public-pages.md` (Task 10).

**Interfaces:**
- Consumes: `notion_parent_page_id` (Task 1), `public_pages_prd_markdown` (Task 10).
- Produces: `public_pages_notion_page_id` — referenciado na Task 13.

- [ ] **Step 1: Publicar como subpágina** (`title: "Páginas Públicas & Legais"`)
- [ ] **Step 2: Confirmar publicação**
- [ ] **Step 3: Reportar ao utilizador e avançar** para o PRD-mãe (último documento)

---

### Task 12: Gerar o PRD-mãe "EntryFlow — Visão Geral"

**Files:**
- Create: `docs/prd/overview.md`

**Interfaces:**
- Consumes: os 5 PRDs de módulo já gerados (Tasks 2, 4, 6, 8, 10) e os respetivos `*_notion_page_id` (Tasks 3, 5, 7, 9, 11) para construir links.
- Produces: `overview_prd_markdown` — consumido pela Task 13.

- [ ] **Step 1: Confirmar que os 5 PRDs de módulo existem e foram aprovados**

Verificar que `docs/prd/guard-app.md`, `docs/prd/resident-communication.md`, `docs/prd/admin-panel.md`, `docs/prd/sync-offline-architecture.md`, `docs/prd/public-pages.md` existem e que o utilizador aprovou todos (Tasks 2, 4, 6, 8, 10 concluídas).

- [ ] **Step 2: Invocar o agente `prd`**

```
Gera um PRD-mãe retroativo "EntryFlow — Visão Geral" que resume o produto como um todo, documentando funcionalidade JÁ IMPLEMENTADA. Usa .claude/agents/prd.md como guia de estrutura, com as adaptações retroativas habituais.

Este é um PRD de visão geral, não de módulo — deve ser mais curto que os PRDs de módulo. Estrutura:
- Product overview: EntryFlow é uma PWA offline-first para gestão de acesso em condomínios, usada por guardas de segurança e administradores. Stack: React 19 + TypeScript, Vite 6, Dexie.js (IndexedDB), Supabase (PostgreSQL), Tailwind CSS, Leaflet.
- Goals: objetivo de negócio é digitalizar e tornar resiliente (offline-first) o processo de controlo de acesso em condomínios, eliminando livros de registo manuais e permitindo comunicação direta guarda-residente.
- User personas: Guarda (regista visitas/incidentes, comunica com residentes), Admin/Super Admin (gere condomínios, staff, residentes, configurações), Residente (recebe chamadas/vídeo do guarda, consulta notícias via app próprio — fora do âmbito deste PRD).
- Histórico de entregas (visão consolidada, resumindo as fases detalhadas nos 5 PRDs de módulo):
  - Fase 0 (2025-11-29 a 2026-01-23): Core MVP — Guard App, Admin Panel, Sync/Offline, Páginas públicas
  - Fase 1 (2026-01-24): Supabase Session
  - Fase 2 (2026-01-29 a 2026-01-30): Observability (Sentry, health checks)
  - Fase 3 (2026-04-24 a 2026-04-25): Device Approval Settings
  - Fases 4-7 (2026-04-27 a 2026-05-26): Resident Communication & Video Calls (telefone Twilio, depois WebRTC)
- Para cada um dos 5 módulos, inclui um resumo de 2-3 frases e um link Markdown para a respetiva subpágina Notion: 
  - Guard App: [link]
  - Admin Panel: [link]
  - Resident Communication & Video Calls: [link]
  - Sync & Offline-First Architecture: [link]
  - Páginas Públicas & Legais: [link]
- Success metrics: agregado de alto nível (não repetir os detalhados dos módulos) — ex: adoção do produto (ver view v_app_adoption_stats), uptime percebido via health score, satisfação do guarda em campo.

NÃO perguntes sobre criar GitHub issues no final — resposta sempre não.
NÃO re-exploraes o código — usa os 5 PRDs de módulo já gerados em docs/prd/ como fonte.

Grava o PRD em src/docs/prd/overview.md.
```

Nota: os links Notion reais (`*_notion_page_id` das Tasks 3, 5, 7, 9, 11) só ficam disponíveis depois de cada subpágina ser publicada — substituir os placeholders `[link]` pelos URLs reais antes do Step 3, editando `docs/prd/overview.md` diretamente.

- [ ] **Step 3: Apresentar para aprovação do utilizador** (mesmo padrão das tasks anteriores)
- [ ] **Step 4: Aguardar aprovação explícita** (mesmo padrão)

---

### Task 13: Publicar o PRD-mãe no Notion e atualizar a página-mãe

**Files:** lê `docs/prd/overview.md` (Task 12).

**Interfaces:**
- Consumes: `notion_parent_page_id` (Task 1), `overview_prd_markdown` (Task 12), todos os `*_notion_page_id` (Tasks 3, 5, 7, 9, 11).

- [ ] **Step 1: Publicar o conteúdo do PRD-mãe DENTRO da própria página-mãe**

Diferente das subpáginas de módulo, o conteúdo do PRD-mãe vai diretamente no corpo da página "EntryFlow — PRDs" (não como mais uma subpágina), usando `mcp__notion__API-patch-block-children` sobre `notion_parent_page_id`, adicionando os blocos Markdown convertidos do PRD-mãe no topo, antes das subpáginas já listadas.

- [ ] **Step 2: Confirmar estrutura final**

Usar `mcp__notion__API-get-block-children` sobre `notion_parent_page_id` para confirmar que a página tem: conteúdo do PRD-mãe no topo, seguido pelas 5 subpáginas (Guard App, Admin Panel, Resident Communication & Video Calls, Sync & Offline-First Architecture, Páginas Públicas & Legais).

- [ ] **Step 3: Reportar conclusão ao utilizador**

Mensagem final: "Histórico de PRDs completo. 6 documentos gerados e publicados no Notion sob 'EntryFlow — PRDs' (<url>): Visão Geral + Guard App + Admin Panel + Resident Communication & Video Calls + Sync & Offline-First Architecture + Páginas Públicas & Legais. Nenhuma GitHub issue foi criada, conforme acordado."

---

## Self-Review

**1. Cobertura da spec:**
- 6 documentos (PRD-mãe + 5 módulos) → Tasks 2, 4, 6, 8, 10, 12. ✓
- Histórico de entregas com fases reais → tabela de fases extraída via `git log` real, citada em cada task. ✓
- Success metrics retroativas → instrução explícita em cada prompt do agente. ✓
- Publicação Notion sob nova página-mãe irmã → Task 1 (criação) + Tasks 3, 5, 7, 9, 11, 13 (publicação). ✓
- Sem GitHub issues → instrução explícita repetida em todos os prompts do agente. ✓
- Sem reutilizar página de Automation Reports → Task 1, Step 1 usa o ID conhecido só para ler o parent, não para escrever lá. ✓

**2. Placeholder scan:** Nenhum "TBD"/"TODO" — todas as fases têm datas e PRs reais extraídos do git log executado nesta sessão. O único placeholder textual (`[link]` na Task 12) é explicitamente resolvido antes da aprovação do utilizador, com instrução de substituição.

**3. Consistência de tipos/nomes:** `notion_parent_page_id` (Task 1) é consumido identicamente em Tasks 3, 5, 7, 9, 11, 13. Cada `*_prd_markdown` e `*_notion_page_id` é produzido numa task e consumido na task imediatamente seguinte, sem divergência de nomes.
