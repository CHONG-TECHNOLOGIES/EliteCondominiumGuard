# PRD: EntryFlow — Visão Geral

## 1. Visão geral do produto

EntryFlow é uma Progressive Web App (PWA) offline-first para gestão de portaria e controlo de acessos em condomínios. É usada por guardas de segurança para registar visitas, entregas e incidentes mesmo sem internet, e por administradores para configurar e supervisionar todos os condomínios geridos. Substitui o livro de registo manual de portaria por um sistema que funciona online ou offline, com sincronização automática, comunicação direta entre guarda e residente (telefone/Twilio, depois vídeo WebRTC), e auditoria completa de todas as ações.

**Stack**: React 19 + TypeScript, Vite 6, Dexie.js (IndexedDB), Supabase (PostgreSQL), Tailwind CSS, Leaflet.

Este documento é retroativo: resume funcionalidade já implementada e em produção, não um roadmap futuro. É o documento-mãe dos 5 PRDs de módulo que detalham cada área do produto.

## 2. Objetivos

### 2.1 Objetivo de negócio

Digitalizar e tornar resiliente o processo de controlo de acesso em condomínios, eliminando livros de registo em papel e permitindo comunicação direta entre o guarda de portaria e o residente — sem depender de uma ligação de internet permanentemente estável.

### 2.2 Objetivos do utilizador

- O guarda regista qualquer visita, entrega ou incidente em segundos, com ou sem internet.
- O admin configura e supervisiona um ou vários condomínios sem depender de intervenção técnica.
- O residente é contactado de forma confiável (telefone, depois vídeo) sempre que alguém chega à portaria à sua procura.

## 3. Personas de utilizador

- **Guarda**: opera a portaria — regista visitas, acompanha incidentes, contacta residentes, fecha saídas.
- **Admin**: gere um ou mais condomínios atribuídos — staff, unidades, residentes, configuração, conteúdo.
- **Super Admin**: gere todos os condomínios, controla funções de alto privilégio (subscrições, sincronização global, criação de outros Super Admins).
- **Residente** (fora do âmbito direto destes PRDs, app própria — `APPRESIDENT`): recebe chamadas/vídeo do guarda, consulta notícias, gera QR codes de convite.

## 4. Módulos do produto

### Guard App

Conjunto de páginas operacionais do guarda — Dashboard, Nova Entrada, Lista do Dia, Incidentes, Pesquisa de Morador, Notícias, Definições, Setup e Login. Cobre os fluxos de registo de visita (com/sem QR, serviço, entrada livre), gestão de incidentes com alertas sonoros, e configuração inicial de dispositivo com PIN de emergência offline.

[PRD: Guard App](https://app.notion.com/p/38a350f27ede8179b0acdc2c30c5a8f8)

### Admin Panel

As 18 páginas administrativas usadas por Admin/Super Admin para configurar e supervisionar o produto: gestão de condomínios, dispositivos, staff, unidades, residentes, configuração (tipos de visita/serviço, restaurantes, desportos), conteúdo (notícias, eventos), visibilidade operacional (visitas, incidentes, analytics, auditoria), e subscrições/pagamentos.

[PRD: Admin Panel](https://app.notion.com/p/38a350f27ede81cda6eadb7615ff5048)

### Resident Communication & Video Calls

Mecanismo de contacto entre guarda e residente no momento da chegada de um visitante: chamada telefónica via Twilio (primeira iteração) e, posteriormente, chamadas de vídeo P2P via WebRTC com sinalização por Supabase Realtime. Inclui lookup de residente por unidade/QR/ID com fallback Dexie+RPC.

[PRD: Resident Communication & Video Calls](https://app.notion.com/p/38a350f27ede8186aa83e10a8cc25d87)

### Sync & Offline-First Architecture

A camada de infraestrutura (`DataService`, Dexie/IndexedDB, health check, heartbeat de dispositivo) que torna possível operar a portaria sem garantia de internet estável, com deteção gradual de saúde do backend (score 0-3), sincronização automática pós-recuperação, e configuração de dispositivo em 3 camadas de armazenamento.

[PRD: Sync & Offline-First Architecture](https://app.notion.com/p/38a350f27ede81a8afe7eae6b18c8a80)

### Páginas Públicas & Legais

Manual do Utilizador (filtrado por audiência/papel), Política de Privacidade e Eliminação de Conta — páginas acessíveis sem autenticação, exigidas para conformidade RGPD e publicação em lojas de aplicações.

[PRD: Páginas Públicas/Legais](https://app.notion.com/p/38a350f27ede81ec90bfd537c2cb13fb)

## 5. Histórico de entregas (visão consolidada)

- **Fase 0: Core MVP** (2025-11-29 a 2026-01-23) — Guard App, Admin Panel, Sync/Offline (DataService, db.ts), e Páginas Públicas/Legais existem desde os primeiros commits, como fundação simultânea do produto.
- **Fase 1: Supabase Session** (2026-01-24, PR #1 `feature_suapabase_session`) — sessão/autenticação via Supabase.
- **Fase 2: Observability** (2026-01-29 a 2026-01-30, PRs #2–#8 `feature_observability`) — integração de Sentry, `logger.ts`, e health checks estruturados.
- **Fase 3: Device Approval Settings** (2026-04-24 a 2026-04-25, PRs #9–#12 `feature_device_approval_settings`) — Setup.tsx e configuração de dispositivos.
- **Fases 4-7: Resident Communication & Video Calls** (2026-04-27 a 2026-05-26) — chamadas telefónicas via Twilio (PRs #24–#25 `feature_calling_twilio`), seguidas de 3 iterações de chamada de vídeo WebRTC (PRs #13–#23 `feature_video_call`/`v1`, PR #28 `feature_video_call_v3`, PR #29 `feature_video_call_ring`), e lookup de residente integrado na DailyList.
- **Atualização de conteúdo das Páginas Públicas/Legais** (até 2026-04-14) — filtragem do Manual do Utilizador por audiência/papel, revisão de Política de Privacidade e Eliminação de Conta.

## 6. Métricas de sucesso (impacto observado, agregado)

- **Adoção do produto**: ver view `v_app_adoption_stats` no backend Supabase, que agrega instalação/uso da app de residentes por condomínio.
- **Continuidade operacional percebida**: proxy via `backendHealthScore` (0-3) e frequência de quedas para modo offline detetadas pelo health check — quanto mais estável, menos a operação de portaria depende de processo manual de contingência.
- **Satisfação do guarda em campo**: indiretamente observável via volume de incidentes reportados com alertas sonoros corretamente ativados, e taxa de utilização do Manual do Utilizador filtrado por papel em vez de pedidos de suporte.
- **Conformidade e auditoria**: cobertura de `AdminAuditLogs` (ações administrativas com registo correspondente) e tempo de resposta a pedidos de eliminação de conta sob RGPD.

## 7. Fora de âmbito

- A app de residentes (`APPRESIDENT`/`EliteResidentAccess`), que é um produto separado com o seu próprio repositório.
- Detalhe de implementação de cada módulo — ver os 5 PRDs de módulo linkados na secção 4.
- Qualquer trabalho planeado ou não implementado — este documento e os seus 5 PRDs de módulo documentam exclusivamente o que já está em produção.
