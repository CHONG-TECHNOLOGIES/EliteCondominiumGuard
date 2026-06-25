# PRD: Admin Panel

## 1. Visão geral do produto

### 1.1 Título e versão do documento

- PRD: Admin Panel
- Versão: 1.0 (retroativo)

### 1.2 Resumo do produto

O Admin Panel é o conjunto de 18 páginas administrativas do EntryFlow, usadas por Administradores e Super Administradores para configurar e gerir todos os aspetos do produto: condomínios, dispositivos, pessoal, unidades, residentes, configurações de visita, conteúdo (notícias e eventos), visibilidade operacional (visitas e incidentes), analytics, auditoria e subscrições/pagamentos.

Estas páginas constituem o núcleo de gestão administrativa do produto desde o seu primeiro commit — não foram adicionadas incrementalmente como features separadas, mas existem como parte da fundação do EntryFlow.

Este documento é retroativo: documenta funcionalidade já implementada e em produção, não um plano de trabalho futuro.

## 2. Objetivos

### 2.1 Objetivos de negócio

- Permitir que uma equipa administrativa central configure múltiplos condomínios sem intervenção de engenharia.
- Garantir visibilidade operacional (visitas, incidentes, dispositivos) em tempo real para deteção rápida de problemas.
- Suportar o modelo de negócio de subscrições por condomínio (cobrança e gestão de pagamentos).
- Manter um registo de auditoria completo para conformidade e resolução de disputas.

### 2.2 Objetivos do utilizador (admin/super admin)

- Configurar um novo condomínio (unidades, residentes, staff, tipos de visita) sem precisar de acesso à base de dados.
- Monitorizar a saúde dos dispositivos (tablets) em todos os condomínios geridos.
- Investigar rapidamente um incidente ou visita específica através de pesquisa e filtros.
- Exportar dados (CSV/PDF) para relatórios externos.

### 2.3 Não-objetivos

- Este módulo não cobre as páginas operacionais do guarda (ver PRD "Guard App").
- Não cobre a lógica de chamadas/vídeo (ver PRD "Resident Communication & Video Calls").
- Não cobre a arquitetura de sincronização subjacente (ver PRD "Sync & Offline-First Architecture").

## 3. Personas de utilizador

### 3.1 Tipos de utilizador principais

- **Admin**: gere um ou mais condomínios específicos atribuídos.
- **Super Admin**: gere todos os condomínios, acede a funcionalidades exclusivas (criação de SUPER_ADMIN, gestão de subscrições, sincronização manual de dados).

### 3.2 Detalhes de persona

- **Super Admin**: normalmente staff da Chong Technologies ou gestor de topo do negócio, precisa de visão agregada entre condomínios (analytics multi-condomínio, sincronização global).
- **Admin**: gestor de condomínio individual, focado na operação do seu próprio condomínio (staff, unidades, residentes, configuração de visitas).

### 3.3 Acesso baseado em papel

- Rotas `/admin/*` protegidas por `AdminRoute` (papel ADMIN ou SUPER_ADMIN).
- Algumas ações são exclusivas de SUPER_ADMIN: criar utilizadores com papel SUPER_ADMIN, sincronização manual no AdminDashboard, gestão completa de AdminSubscriptions.
- Filtro de condomínio (`filterCondoId`) disponível em quase todas as páginas para Super Admins navegarem entre condomínios; Admins ficam implicitamente limitados ao seu próprio.

## 4. Requisitos funcionais

Organizados por agrupamento funcional:

### Gestão de entidades

- **AdminCondominiums** (Prioridade: Alta) — CRUD de condomínios com nome, endereço, telefone, responsável, gestor, coordenadas GPS + raio (para validação de proximidade), 3 permissões de entrada (foto obrigatória, interfone, aprovação manual pelo guarda), upload de logo (JPG/PNG até 1.5MB), e gestão de ruas (`Street`) por condomínio. Desativar um condomínio desativa e desassocia automaticamente todos os seus dispositivos.
- **AdminStaff** (Prioridade: Alta) — CRUD de staff (guardas/admins/super admins) com PIN (mínimo 4 dígitos, hash feito no backend via RPC), foto capturada por câmara, atribuição a condomínio. Apenas Super Admin pode criar/editar utilizadores SUPER_ADMIN. Alteração de PIN isolada num modal dedicado. Remoção bloqueada se o staff tiver visitas associadas (deteção de erro de foreign key).
- **AdminUnits** (Prioridade: Alta) — CRUD de unidades (bloco, número, piso, nome do edifício) por condomínio.
- **AdminResidents** (Prioridade: Alta) — CRUD de residentes (nome, email, telefone, tipo Proprietário/Inquilino) com paginação (100 por página, "carregar mais"), pesquisa com debounce de 300ms, filtro por estado de app instalada (`has_app_installed`), importação em massa via CSV (`ImportResidentsModal`), e visualização de QR codes de convite gerados pelo residente (estado ACTIVE/EXPIRED/REVOKED/USED, recorrência). Ação de "Enviar Convite" em massa para residentes sem app está desenhada na UI mas desativada (`disabled`, "Em Breve").

### Gestão de dispositivos

- **AdminDevices** (Prioridade: Alta) — Lista de dispositivos com indicador de saúde calculado a partir do heartbeat (Online: <7 min sem sinal; Aviso: 7-15 min; Offline: >15 min — heartbeat esperado a cada 5 min), filtro por condomínio, edição de nome/condomínio associado, desativação (`decommission`), e modal de detalhes com informação de armazenamento local do dispositivo.
- **AdminDeviceRegistrationErrors** (Prioridade: Média) — Log paginado (50/página) de falhas na criação de dispositivos no backend, com filtros por device_identifier exato, intervalo de datas, e pesquisa livre sobre mensagem de erro/payload (payload JSON expansível).

### Configuração

- **AdminVisitTypes** (Prioridade: Média) — CRUD de tipos de visita configuráveis (ex: Visitante, Entrega, Serviço, Estudante, Restaurante, Desporto) com ícone (mapeado de um conjunto fixo de ícones Lucide) e flags booleanas `requires_service_type`, `requires_restaurant`, `requires_sport` que determinam o fluxo no NewEntry do guarda.
- **AdminServiceTypes** (Prioridade: Baixa) — CRUD simples de tipos de serviço (nome apenas), com ícone inferido automaticamente por palavras-chave no nome (mesma lógica usada em NewEntry.tsx).
- **AdminRestaurants** (Prioridade: Baixa) — CRUD de restaurantes por condomínio (nome, descrição, estado ativo/inativo) — usados como destino de "entrada livre" no fluxo de visita.
- **AdminSports** (Prioridade: Baixa) — CRUD de instalações desportivas por condomínio, mesma estrutura que Restaurantes.

### Conteúdo

- **AdminNews** (Prioridade: Média) — CRUD de notícias do condomínio com upload de imagem (até 5MB), categorias geríveis separadamente (nome/ID + rótulo de exibição), paginação (50/página, "carregar mais"), filtros por condomínio (Super Admin), categoria, e intervalo de datas. Edição de notícia substitui a imagem antiga (apaga do storage antes de subir a nova).
- **AdminEvents** (Prioridade: Baixa) — CRUD de eventos do condomínio (estrutura análoga às outras entidades, com categorias de evento).

### Visibilidade & Auditoria

- **AdminVisits** (Prioridade: Alta) — Vista de auditoria de todas as visitas registadas, com histórico de eventos por visita, exportação para CSV e PDF (`exportVisitsToCSV`, `exportVisitsToPDF`), filtros por condomínio/tipo de visita/tipo de serviço.
- **AdminIncidents** (Prioridade: Alta) — Vista de todos os incidentes com histórico de ações do guarda, exportação CSV, mesma lógica de badges de tipo/estado usada na página Incidents do guarda, mas com visão cross-condomínio.
- **AdminAnalytics** (Prioridade: Média) — Dashboard com mapa interativo (Leaflet/react-leaflet) mostrando todos os condomínios geolocalizados, com marcadores customizados exibindo contagem de visitas (verde) e incidentes (badge) por condomínio. Auto-refresh a cada 30 segundos. Centra o mapa automaticamente no primeiro condomínio com coordenadas válidas.
- **AdminAuditLogs** (Prioridade: Alta) — Trilha de auditoria completa do sistema (quem fez o quê, quando), com exportação CSV, filtros por condomínio e intervalo de datas. Alimentada por `buildAuditChanges`/`hasAuditChanges`, usado consistentemente em quase todas as páginas admin para registar diffs de alterações (ex.: edição de condomínio, staff, unidade).

### Subscrições

- **AdminSubscriptions** (Prioridade: Alta, exclusivo Super Admin) — Gestão de regras de preço (`AppPricingRule`), subscrições por condomínio (`CondominiumSubscription`) e pagamentos (`SubscriptionPayment`), com filtros por mês/ano, e indicadores de estado (ativo/inativo/em atraso). Acesso restrito via `Navigate` (redireciona não-Super-Admins).

### Visão geral

- **AdminDashboard** (Prioridade: Alta) — KPIs agregados: infraestrutura (condomínios, dispositivos ativos/total com % online, staff, unidades), residentes (total — com 2 métricas ainda não implementadas, marcadas "TODO: Implementar tracking" no código), visitas de hoje (total/pendentes/no interior/finalizadas), incidentes (ativos/total/resolvidos). Botão de sincronização manual (`syncPendingItems`) visível apenas para Super Admin, desativado quando não há itens pendentes. Atalhos de ação rápida para Condomínios, Staff e Analytics. Subscrição a mudanças de estado de dispositivo em tempo real (`subscribeToDeviceStatusChanges`).

## 5. Experiência do utilizador

### 5.1 Pontos de entrada e fluxo do primeiro uso

- Login como ADMIN/SUPER_ADMIN → redirecionamento automático para `/admin` (AdminDashboard).
- Navegação lateral (via `AdminLayout`) para as restantes 17 páginas.

### 5.2 Experiência principal

- **Componente `SearchableSelect` reutilizado em praticamente todas as páginas**: um padrão de dropdown com pesquisa inline, usado para selecionar condomínio, unidade, categoria, etc. — consistência de UX entre as 18 páginas apesar de cada uma ter a sua própria lógica de dados.
  - Isto reduz a curva de aprendizagem: um admin que aprende a usar o seletor numa página já sabe usá-lo em todas as outras.
- **Auditoria automática em edições**: a maioria das páginas usa `buildAuditChanges`/`hasAuditChanges` para só gravar um registo de auditoria quando há alterações reais, evitando ruído no log de auditoria com "edições" que não mudaram nada.

### 5.3 Funcionalidades avançadas e casos extremos

- Indicador de saúde de dispositivo com 3 níveis (online/aviso/offline) baseado em janelas de tempo desde o último heartbeat, não apenas um booleano online/offline.
- Desativação de condomínio em cascata: desativa e desassocia automaticamente todos os dispositivos do condomínio, com confirmação explícita do impacto antes de prosseguir.
- Bloqueio de remoção de staff com visitas associadas, com mensagem específica em vez de erro genérico de base de dados.
- Mapa de analytics com marcadores customizados (badges de visitas/incidentes sobrepostos ao pin), não apenas pins genéricos.

### 5.4 Destaques de UI/UX

- Tema com variáveis CSS semânticas (`bg-surface`, `text-main`, `text-dim`, `border-main`) em vez de cores Tailwind fixas, sugerindo suporte a temas claro/escuro a nível administrativo.
- Paginação "carregar mais" (em vez de páginas numeradas) em Residentes e Notícias, mais adequada para listas longas em ecrã tablet/desktop.
- Modais consistentes (criar/editar) com cabeçalho fixo (`sticky top-0`) e rodapé de ações fixo (`sticky bottom-0`) para formulários longos com scroll.

## 6. Narrativa

Um gestor recebe um novo condomínio para configurar no EntryFlow. Entra no Admin Panel, cria o condomínio com endereço e coordenadas GPS, define as permissões de entrada (foto obrigatória, interfone, aprovação manual), e carrega o logótipo. Em seguida cria as unidades do edifício, importa os residentes via CSV, e adiciona o staff de portaria com os respetivos PINs. Configura os tipos de visita disponíveis e os restaurantes/áreas desportivas do condomínio. Nos dias seguintes, acompanha o Dashboard para ver volume de visitas e incidentes, investiga ocorrências específicas em AdminIncidents, e no final do mês consulta AdminSubscriptions para confirmar o pagamento do condomínio.

## 7. Métricas de sucesso (impacto observado)

### 7.1 Métricas centradas no utilizador

- Tempo médio de configuração de um novo condomínio (do zero até o primeiro guarda conseguir fazer login).
- Taxa de utilização do indicador de saúde de dispositivo para deteção proativa de tablets offline (antes de reclamações do condomínio).
- Redução de erros de registo de dispositivo visível ao longo do tempo via AdminDeviceRegistrationErrors.

### 7.2 Métricas de negócio

- Cobertura de auditoria: percentagem de ações administrativas com registo correspondente em AdminAuditLogs.
- Receita gerida via AdminSubscriptions (pagamentos confirmados vs. em atraso por condomínio).

### 7.3 Métricas técnicas

- % de dispositivos no estado "online" vs. "aviso"/"offline" em tempo real (proxy de saúde de infraestrutura distribuída).
- Latência do auto-refresh de Analytics (30s) face ao volume real de eventos.

## 8. Considerações técnicas

### 8.1 Pontos de integração

- `services/dataService.ts` (`api`) com prefixo `admin*` para todas as operações administrativas (ex.: `adminGetAllCondominiums`, `adminCreateStaffWithPin`, `adminGetDashboardStats`).
- `services/Supabase.ts` para upload de fotos/logos (`uploadStaffPhoto`, `adminUploadCondoLogo`) e leitura de URLs públicas.
- `utils/auditDiff.ts` (`buildAuditChanges`, `hasAuditChanges`) — utilitário partilhado para diffing de alterações antes de gravar auditoria.
- `utils/csvExport.ts` (`exportVisitsToCSV`, `exportVisitsToPDF`, `exportIncidentsToCSV`, `exportAuditLogsToCSV`) — exportação partilhada entre várias páginas.
- `react-leaflet` + `leaflet` para o mapa de AdminAnalytics.
- `components/ImportResidentsModal.tsx` para importação CSV em massa de residentes.

### 8.2 Armazenamento de dados e privacidade

- PINs de staff nunca processados em claro no cliente — hash feito server-side via RPC (`adminCreateStaffWithPin`, `adminUpdateStaffPin`).
- Fotos de staff e logos de condomínio armazenados em buckets Supabase Storage dedicados (`staff-photos`, `logo_condominio`).
- `buildAuditChanges` exclui explicitamente `pin`/`pin_hash` de qualquer diff de auditoria, evitando que valores sensíveis acabem em registos de log.

### 8.3 Escalabilidade e desempenho

- Paginação cursor-based em Residentes e Notícias (usando `created_at`/`id` do último item, não offset numérico), mais resiliente a inserções concorrentes do que paginação por offset.
- Cache local de unidades por condomínio (`unitsByCondoRef`) em AdminResidents para evitar refetch repetido ao navegar entre residentes do mesmo condomínio.
- Debounce de 300ms em campos de pesquisa (Residentes, Notícias) para reduzir chamadas RPC durante digitação.

### 8.4 Desafios potenciais

- Métricas de "Residentes com/sem app instalada" no AdminDashboard estão marcadas no código como `TODO: Implementar tracking` — os valores mostrados não refletem dados reais (mostram 0 e o total, respetivamente).
- Funcionalidade de "Enviar Convite" em massa para residentes sem app está visível na UI mas desativada — risco de um admin assumir que a funcionalidade existe.
- O indicador de armazenamento local do dispositivo em AdminDevices usa valores mock/default quando a metadata real não está disponível, podendo induzir em erro sobre o estado real do dispositivo.

## 9. Histórico de entregas

- **Fase 0: Core MVP** (2025-11-29 a 2026-01-23) — todas as 18 páginas admin existem desde os primeiros commits do repositório (confirmado via `git log -- pages/admin`), constituindo, junto com o Guard App, o núcleo fundacional do produto.

## 10. User stories

### 10.1. Configurar um novo condomínio de ponta a ponta

- **ID**: AP-001
- **Descrição**: Como admin, quero criar um condomínio com todas as suas configurações (endereço, GPS, permissões de entrada, logo) e popular as suas unidades e residentes, para colocar o condomínio operacional no sistema.
- **Critérios de aceitação**:
  - O formulário de criação de condomínio aceita nome (obrigatório), endereço, GPS+raio, contactos, e as 3 permissões de entrada (todas com default `true`).
  - Após criar o condomínio, é possível adicionar unidades manualmente.
  - É possível importar residentes em massa via CSV, associando-os às unidades existentes.

### 10.2. Monitorizar a saúde dos dispositivos de todos os condomínios

- **ID**: AP-002
- **Descrição**: Como admin, quero ver rapidamente quais tablets estão online, com aviso, ou offline, para agir antes que um condomínio fique sem cobertura de portaria.
- **Critérios de aceitação**:
  - Cada dispositivo mostra um indicador de saúde com 3 níveis baseados no tempo desde o último heartbeat (online <7min, aviso 7-15min, offline >15min).
  - É possível filtrar dispositivos por condomínio.
  - É possível editar o nome/condomínio de um dispositivo ou desativá-lo.

### 10.3. Gerir staff com PIN seguro e foto

- **ID**: AP-003
- **Descrição**: Como admin, quero criar e gerir contas de guarda/admin com PIN e foto, para que o staff possa autenticar-se no tablet de portaria.
- **Critérios de aceitação**:
  - O PIN exige mínimo 4 dígitos e nunca é processado em claro no cliente — apenas via RPC com hash server-side.
  - Apenas Super Admin pode criar ou editar staff com papel SUPER_ADMIN.
  - Alterar o PIN de um staff existente é uma ação isolada (modal dedicado), separada da edição de outros dados.
  - Tentar remover um staff com visitas associadas mostra uma mensagem específica em vez de um erro genérico.

### 10.4. Investigar incidentes e visitas com exportação para relatório

- **ID**: AP-004
- **Descrição**: Como admin, quero pesquisar, filtrar e exportar visitas e incidentes para CSV/PDF, para responder a pedidos de relatório externos (condomínio, seguradora, etc.).
- **Critérios de aceitação**:
  - AdminVisits e AdminIncidents permitem filtrar por condomínio, tipo, e intervalo de datas.
  - A exportação gera um ficheiro CSV (ambas) ou PDF (apenas visitas) com os dados filtrados.
  - O histórico de eventos/ações de cada visita/incidente é visível antes de exportar.

### 10.5. Visualizar a distribuição geográfica de atividade entre condomínios

- **ID**: AP-005
- **Descrição**: Como super admin, quero ver num mapa todos os condomínios geridos com indicadores de visitas e incidentes, para identificar rapidamente pontos de atenção geográfica.
- **Critérios de aceitação**:
  - O mapa centra-se automaticamente no primeiro condomínio com coordenadas válidas.
  - Cada marcador mostra contagem de visitas e incidentes do condomínio correspondente.
  - Os dados atualizam automaticamente a cada 30 segundos sem ação do utilizador.

### 10.6. Gerir subscrições e pagamentos de condomínios

- **ID**: AP-006
- **Descrição**: Como super admin, quero gerir as regras de preço, subscrições e pagamentos de cada condomínio, para controlar a faturação do negócio.
- **Critérios de aceitação**:
  - A página é acessível exclusivamente a Super Admin (Admin é redirecionado).
  - É possível filtrar pagamentos por mês/ano.
  - O estado de cada subscrição/pagamento (ativo, inativo, em atraso) é visível de forma clara.
