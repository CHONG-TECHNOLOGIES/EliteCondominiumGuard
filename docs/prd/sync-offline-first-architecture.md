# PRD: Sync & Offline-First Architecture

## 1. Visão geral do produto

### 1.1 Título e versão do documento

- PRD: Sync & Offline-First Architecture
- Versão: 1.0 (retroativo)

### 1.2 Resumo do produto

Esta é a camada de infraestrutura que torna o EntryFlow utilizável num posto de portaria sem garantia de internet estável. Centra-se em `services/dataService.ts` (~4.300 linhas), que arbitra entre o backend Supabase (PostgreSQL) e o armazenamento local IndexedDB via Dexie.js (`services/db.ts`), decidindo a cada operação se lê/escreve localmente, remotamente, ou ambos — sem que o resto da aplicação precise de saber a diferença.

Este não é um módulo de UI: é a fundação sobre a qual todos os outros módulos (Guard App, Admin Panel, Resident Communication) são construídos. Nenhum componente acede a Supabase diretamente — tudo passa por `DataService`.

Este documento é retroativo: documenta arquitetura já implementada e em produção, não um plano de trabalho futuro.

## 2. Objetivos

### 2.1 Objetivos de negócio

- Garantir que a operação de portaria nunca para por falha de internet — é o requisito não-negociável do produto, já que portarias de condomínio frequentemente têm conectividade instável.
- Minimizar perda de dados: nenhuma visita, incidente, ou evento registado localmente pode desaparecer antes de sincronizar.
- Reduzir tempo de resposta percebido (interface local, sem espera por rede) mesmo quando online.

### 2.2 Objetivos do utilizador (guarda/admin, implícito via UX)

- O guarda nunca vê um erro de "sem internet" a bloquear o registo de uma visita.
- Quando a internet volta, os dados pendentes sincronizam automaticamente, sem ação manual.
- O admin pode forçar uma sincronização manual quando necessário (ver AdminDashboard).

### 2.3 Não-objetivos

- Este módulo não cobre as páginas que consomem `DataService` (ver PRDs "Guard App" e "Admin Panel").
- Não cobre a lógica de autenticação de PIN em si (apenas o mecanismo online/offline que a suporta).
- Não inclui encriptação de dados em IndexedDB — está listado como melhoria futura, não implementada.

## 3. Personas de utilizador

### 3.1 Tipos de utilizador principais

Este módulo não tem UI própria — serve todos os papéis (GUARD, ADMIN, SUPER_ADMIN) de forma transparente. A "persona" relevante aqui é o próprio dispositivo tablet, que precisa de funcionar de forma autónoma e resiliente.

### 3.2 Cenários de rede

- **Online estável**: maioria das operações lê/escreve direto no Supabase, com cache local em paralelo.
- **Online instável** (a oscilar): `backendHealthScore` degrada-se gradualmente em vez de alternar abruptamente entre estados.
- **Offline total**: todas as escritas vão para IndexedDB com `sync_status: PENDING_SYNC`; leituras servem-se exclusivamente do cache local.
- **Recuperação de rede**: sincronização automática disparada tanto pelo evento `online` do browser como pelo health check periódico.

## 4. Requisitos funcionais

### Deteção de conectividade (não confia no browser)

- **Verificação real de conectividade no arranque** (Prioridade: Alta) — `verifyConnectivity()` não confia em `navigator.onLine` isoladamente; faz um `pingBackend()` real (HEAD request a `${SUPABASE_URL}/rest/v1/`, timeout 3s, aceita respostas 200/401/404 como "alcançável") antes de assumir que está online.
- **Health score gradual (0-3), não binário** (Prioridade: Alta) — em vez de um booleano online/offline, `backendHealthScore` varia entre 0 e 3. Cada falha de operação decrementa o score; um ping com sucesso reseta para 3. `isBackendHealthy` só é `true` quando `isOnline && backendHealthScore > 0`, tolerando falhas isoladas sem cair imediatamente em modo offline.
- **Health check periódico** (Prioridade: Alta) — `startHealthCheck()` executa um `pingBackend()` a cada 60 segundos enquanto o browser reporta estar online; deteta recuperação (`wasUnhealthy` → sucesso) e dispara sincronização automática nesse momento.
- **Listeners nativos do browser como gatilho imediato** (Prioridade: Média) — eventos `online`/`offline` do `window` chamam `setOnlineStatus()`, que reseta o health score instantaneamente (3 ao reconectar, 0 ao desconectar) sem esperar pelo próximo ciclo de 60s.

### Heartbeat de dispositivo

- **Heartbeat a cada 5 minutos** (Prioridade: Alta) — `startHeartbeat()` chama `SupabaseService.updateDeviceHeartbeat(deviceId)` a cada 300.000ms, apenas quando `isBackendHealthy && currentCondoId` está definido. Este heartbeat é a base do indicador de saúde de dispositivo usado em AdminDevices (online <7min, aviso 7-15min, offline >15min — ver PRD "Admin Panel").

### Configuração de dispositivo

- **`configureDevice`** (Prioridade: Alta) — fluxo de primeira configuração: valida que o condomínio existe, verifica que não está já associado a outro dispositivo ativo (1 tablet por condomínio), regista o dispositivo no Supabase com metadata do browser (`getDeviceMetadata()`: user agent, plataforma, idioma, resolução, timezone), grava as definições de setup centralmente, e persiste a configuração tanto em IndexedDB (`db.settings`) como em `localStorage` (redundância dupla).
- **`forceConfigureDevice`** (Prioridade: Média) — permite a um ADMIN/SUPER_ADMIN substituir o dispositivo associado a um condomínio, desativando primeiro os dispositivos antigos via `SupabaseService.deactivateCondoDevices`. Requer backend saudável (não funciona offline).
- **`configureDeviceOffline`** (Prioridade: Média) — configuração de emergência sem internet, usando apenas o ID e nome do condomínio fornecidos manualmente pelo admin (com PIN de emergência 123456, ver PRD "Guard App"). Cria uma configuração local mínima que sincroniza quando a rede voltar.
- **Prioridade de armazenamento de configuração**: Central DB > IndexedDB > localStorage — refletido na ordem de leitura em `getDeviceCondoDetails` e na escrita redundante em `configureDevice`.

### Sincronização de dados pendentes

- **`syncPendingItems`** (Prioridade: Alta) — função central de sincronização, protegida contra execução concorrente (`isSyncing` flag). Processa, pela ordem: visitas pendentes (incluindo upload de fotos capturadas offline antes de criar o registo remoto), eventos de visita pendentes, e incidentes pendentes. Emite eventos `sync:start`, `sync:progress`, `sync:complete`, `sync:error` para a UI reagir (ex.: `SyncOverlay`).
- **Substituição de ID temporário por ID real** (Prioridade: Alta) — uma visita criada offline recebe um ID temporário local; ao sincronizar, o registo local é apagado e substituído pela versão devolvida pelo servidor (com ID definitivo), e todos os `visitEvents` que referenciavam o ID temporário são atualizados (`modify({ visit_id: createdVisit.id })`) para apontar para o novo ID.
- **Upload de foto offline diferido** (Prioridade: Alta) — se uma visita tem `photo_data_url` (base64 capturado offline) mas não `photo_url`, o upload da foto para o Supabase Storage só acontece no momento da sincronização, não no momento da captura. O campo `photo_data_url` é removido antes de enviar o registo (não é uma coluna da base de dados).
- **Parar no primeiro erro por categoria** (Prioridade: Média) — o loop de sincronização de cada tipo de entidade (`break`) interrompe-se ao primeiro erro dentro desse tipo, decrementando o health score, em vez de continuar a tentar itens seguintes que provavelmente falhariam pela mesma razão (backend indisponível).
- **Sincronização automática pós-recuperação** (Prioridade: Alta) — quando o health check deteta que o backend recuperou (estava `wasUnhealthy`, agora respondeu), dispara `syncPendingItems()` automaticamente, sem esperar por ação do utilizador.
- **Sincronização manual** (Prioridade: Média) — exposta no AdminDashboard (botão visível só para Super Admin) via `getPendingSyncCount()` + `syncPendingItems()`.

### Auditoria offline

- **Fila de audit logs pendentes** (Prioridade: Média) — `pendingAuditLogsKey` mantém uma fila local de logs de auditoria gerados offline; `flushPendingAuditLogs()` é chamada tanto ao reconectar (`setOnlineStatus(true)`) como após recuperação detetada pelo health check.

## 5. Experiência do utilizador

### 5.1 Pontos de entrada e fluxo do primeiro uso

- O construtor de `DataService` arranca automaticamente `init()` ao ser instanciado (singleton implícito da aplicação), antes de qualquer página renderizar dados.
- `ensureCondoContext()` garante que qualquer chamada que precise do contexto do condomínio espera primeiro pela conclusão de `initPromise`.

### 5.2 Experiência principal

- **Transparência para o resto da aplicação**: páginas como NewEntry ou DailyList chamam `api.createVisit(...)` sem nunca saber se a escrita foi local, remota, ou ambas — a complexidade fica inteiramente dentro de `DataService`.
- **Eventos de sincronização desacoplados da UI**: `emitSyncEvent` usa `CustomEvent` no `window`, permitindo que qualquer componente (ex.: `SyncOverlay.tsx`) escute sem acoplamento direto ao `DataService`.

### 5.3 Funcionalidades avançadas e casos extremos

- Pedido de armazenamento persistente (`navigator.storage.persist()`) no arranque, para reduzir o risco de o browser apagar o IndexedDB automaticamente quando o disco do tablet está com pouco espaço — crítico num dispositivo kiosk que pode ficar meses sem reinício.
- Log de uso de quota de armazenamento (`navigator.storage.estimate()`) no arranque, para diagnóstico proativo de espaço em disco.
- Decremento de health score também ocorre durante operações de escrita normais (não só no health check periódico) — qualquer chamada falhada ao Supabase em qualquer parte do `DataService` decrementa o score, tornando a deteção de degradação mais sensível do que depender só do ping de 60s.

### 5.4 Destaques de UI/UX

Não aplicável diretamente — este módulo não tem superfície de UI própria, mas é o que torna possível o `SyncOverlay` (ecrã cheio de progresso de sincronização) e os badges de `sync_status: PENDING_SYNC` visíveis nas listas de visitas/incidentes.

## 6. Narrativa

A internet da fibra do condomínio cai durante a tarde. O guarda continua a registar entregas e visitas normalmente — cada registo é guardado de imediato no IndexedDB do tablet com `sync_status: PENDING_SYNC`, incluindo a foto do visitante capturada localmente em base64. O `DataService` deteta a queda de conectividade através do health check de 60 segundos (o score desce a zero) e o heartbeat de dispositivo para de ser enviado. Trinta minutos depois, a internet volta. No ciclo seguinte do health check, o ping ao backend tem sucesso, o score volta a 3, e o `DataService` dispara automaticamente `syncPendingItems()`: cada visita pendente tem a sua foto carregada para o Supabase Storage, é criada no backend com um ID definitivo, e o registo local temporário é substituído. O guarda não precisa de fazer nada — quando olha para o tablet, a lista do dia já mostra tudo sincronizado.

## 7. Métricas de sucesso (impacto observado)

### 7.1 Métricas centradas no utilizador

- Zero registos de visita/incidente perdidos por falha de rede (objetivo de design do `sync_status: PENDING_SYNC`).
- Tempo entre recuperação de rede e sincronização completa de itens pendentes (depende do ciclo de 60s do health check + tempo de processamento do `syncPendingItems`).

### 7.2 Métricas de negócio

- Continuidade operacional da portaria durante falhas de internet (sem necessidade de processo manual em papel).
- Redução de chamadas de suporte relacionadas com "dados perdidos" devido à arquitetura write-local-first.

### 7.3 Métricas técnicas

- Distribuição do `backendHealthScore` ao longo do tempo (proxy de estabilidade real da rede do condomínio, não apenas o booleano `navigator.onLine`).
- Taxa de sucesso de sincronização por tipo de entidade (visitas vs. eventos vs. incidentes) e taxa de itens que ficam permanentemente bloqueados em `PENDING_SYNC`.
- Frequência de heartbeats perdidos por dispositivo (alimenta o indicador de saúde em AdminDevices).

## 8. Considerações técnicas

### 8.1 Pontos de integração

- `services/db.ts` (Dexie/IndexedDB) — schema com 12 versões incrementais (`CondoDatabase extends Dexie`), cobrindo visits, visitEvents, units, visitTypes, serviceTypes, settings, staff, condominiums, restaurants, sports, incidents, incidentTypes, incidentStatuses, devices, residents, news.
- `services/Supabase.ts` — todas as chamadas RPC ao backend, nunca acedidas diretamente por componentes.
- `services/deviceUtils.ts` — `getDeviceIdentifier()` (UUID v4 gerado e persistido em `localStorage`, substituído pelo ID central após configuração) e `getDeviceMetadata()` (fingerprint do browser/dispositivo).
- `services/logger.ts` — toda a telemetria de sync/health passa pelo logger com `ErrorCategory.SYNC`/`ErrorCategory.NETWORK`/`ErrorCategory.DEVICE`, integrado com Sentry.
- Eventos customizados no `window`: `sync:start`, `sync:progress`, `sync:complete`, `sync:error`, e `visits:changed` — mecanismo de pub/sub leve sem dependência de uma state library.

### 8.2 Armazenamento de dados e privacidade

- Configuração do dispositivo replicada em 3 camadas (Central DB, IndexedDB, localStorage) por design — nenhuma é a "única fonte de verdade", a ordem de prioridade de leitura é que resolve conflitos.
- Dados sensíveis (PIN) nunca passam por este módulo em claro — a responsabilidade de hashing está nas RPCs do Supabase, e `DataService` apenas encaminha o PIN em claro para a chamada RPC sobre uma ligação HTTPS.

### 8.3 Escalabilidade e desempenho

- Dexie schema versionado incrementalmente (`version(1)` a `version(12)`) — cada nova tabela/índice é uma migração aditiva, nunca uma reescrita destrutiva do schema anterior, permitindo upgrade do tablet em produção sem perda de dados locais.
- `configRefreshIntervalMs` de 5 minutos limita a frequência de refresh de configuração em background, evitando chamadas RPC excessivas em dispositivos sempre ligados.
- Sincronização processa um tipo de entidade de cada vez (visitas → eventos → incidentes), com emissão de progresso granular por item, em vez de um único bulk upload — UX de progresso mais informativa, ao custo de mais round-trips de rede.

### 8.4 Desafios potenciais

- O `break` ao primeiro erro dentro de cada categoria de sincronização significa que um único item pendente "envenenado" (ex.: payload inválido) pode bloquear a sincronização dos itens seguintes do mesmo tipo até ser resolvido manualmente.
- A ausência de encriptação em IndexedDB significa que dados de visitantes (incluindo fotos em base64 antes de upload) ficam em texto claro no armazenamento local do tablet.
- A janela de heartbeat de 5 minutos com tolerância de 7 minutos no indicador de saúde (ver PRD "Admin Panel") implica que uma falha de rede de até ~7 minutos não é visível para o admin como "offline" — trade-off deliberado entre sensibilidade e falsos positivos.

## 9. Histórico de entregas

- **Fase 0: Core MVP** (2025-11-29 a 2026-01-23) — `dataService.ts` e `db.ts` existem desde os primeiros commits, com a arquitetura offline-first (Dexie + Supabase + health score) já presente como fundação do produto, não como adição posterior.
- **Fase 2: Observabilidade** (2026-01-29 a 2026-01-30, PRs #2 a #8) — integração de `services/logger.ts` com categorias de erro (`ErrorCategory.SYNC`, `NETWORK`, `DEVICE`) e Sentry, substituindo logging ad-hoc por telemetria estruturada em toda a camada de sincronização.

## 10. User stories

### 10.1. Registar uma visita sem internet disponível

- **ID**: SY-001
- **Descrição**: Como guarda, quero registar uma visita mesmo sem ligação à internet, para que a operação de portaria nunca pare por falha de rede.
- **Critérios de aceitação**:
  - A visita é gravada imediatamente em IndexedDB com `sync_status: PENDING_SYNC`, incluindo a foto capturada (como `photo_data_url` em base64).
  - Nenhum erro bloqueante é mostrado ao guarda por falta de rede.
  - A visita aparece na lista do dia imediatamente, mesmo antes de sincronizar.

### 10.2. Sincronizar automaticamente quando a rede recupera

- **ID**: SY-002
- **Descrição**: Como guarda, não quero ter de fazer nada manualmente quando a internet volta — quero que os dados pendentes sincronizem sozinhos.
- **Critérios de aceitação**:
  - O health check periódico (60s) deteta recuperação do backend e dispara `syncPendingItems()` automaticamente.
  - Cada visita pendente com foto offline tem a foto carregada para o Supabase Storage antes de criar o registo remoto.
  - O ID temporário local é substituído pelo ID real devolvido pelo servidor, e os eventos de visita associados são atualizados para o novo ID.

### 10.3. Detetar degradação de rede de forma gradual, não binária

- **ID**: SY-003
- **Descrição**: Como sistema, quero distinguir entre uma falha isolada e uma perda de conectividade real, para evitar alternar desnecessariamente entre modo online/offline.
- **Critérios de aceitação**:
  - O `backendHealthScore` varia entre 0 e 3, decrementando a cada falha de operação e resetando a 3 num ping com sucesso.
  - `isBackendHealthy` só reporta `false` quando o score chega a 0, não numa única falha isolada.
  - Os eventos nativos `online`/`offline` do browser atualizam o estado imediatamente, sem esperar pelo próximo ciclo do health check.

### 10.4. Configurar um dispositivo num condomínio sem internet (emergência)

- **ID**: SY-004
- **Descrição**: Como admin, quero poder configurar um tablet novo mesmo sem internet disponível no momento, para não bloquear a entrada em funcionamento de um condomínio.
- **Critérios de aceitação**:
  - `configureDeviceOffline` cria uma configuração local mínima (ID e nome do condomínio) sem depender do backend.
  - A configuração sincroniza com o backend automaticamente quando a rede ficar disponível.
  - O fluxo de emergência está protegido por PIN administrativo.
