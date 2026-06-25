# PRD: Guard App

## 1. Visão geral do produto

### 1.1 Título e versão do documento

- PRD: Guard App
- Versão: 1.0 (retroativo)

### 1.2 Resumo do produto

O módulo Guard App é o conjunto de páginas usadas pelos guardas de segurança do EntryFlow no dia-a-dia da portaria: registo de visitas/entregas, consulta da lista diária, gestão de incidentes, pesquisa de moradores, consulta de notícias do condomínio, configurações do dispositivo, configuração inicial do tablet e autenticação.

Estas páginas operam em modo offline-first: o guarda continua a registar visitas e incidentes mesmo sem ligação à internet, com sincronização automática quando a ligação é restaurada. O fluxo central do produto — "Nova Entrada" — suporta múltiplos métodos de aprovação (app do residente, telefone, intercomunicador, aprovação manual do guarda, ou leitura de QR code) e adapta-se a diferentes tipos de visita (visitante, entrega, serviço, restaurante, desporto).

Este documento é retroativo: documenta funcionalidade já implementada e em produção, não um plano de trabalho futuro.

## 2. Objetivos

### 2.1 Objetivos de negócio

- Eliminar livros de registo manuais na portaria de condomínios.
- Garantir continuidade operacional mesmo em falhas de rede (offline-first).
- Reduzir o tempo médio de registo e aprovação de uma visita.
- Criar um histórico auditável de todas as entradas, saídas e incidentes.

### 2.2 Objetivos do utilizador (guarda)

- Registar uma visita em poucos passos, mesmo sem internet.
- Saber rapidamente quais visitas estão pendentes de aprovação ou precisam de ação (entrada/saída).
- Ser alertado de forma audível e visual quando surge um novo incidente.
- Contactar o morador de uma unidade diretamente do ecrã, sem precisar de outro dispositivo.
- Configurar o tablet pela primeira vez sem assistência remota.

### 2.3 Não-objetivos

- Este módulo não cobre a gestão administrativa do condomínio (ver PRD "Admin Panel").
- Não cobre o detalhe da lógica de chamada telefónica/vídeo com residentes (ver PRD "Resident Communication & Video Calls") — aqui documenta-se apenas a superfície (botões, fluxo de aprovação) que invoca essa lógica.
- Não cobre a arquitetura interna de sincronização (ver PRD "Sync & Offline-First Architecture").

## 3. Personas de utilizador

### 3.1 Tipos de utilizador principais

- Guarda de segurança (uso diário, no tablet da portaria).
- Administrador/Super Admin (usa Login.tsx para entrar, mas é redirecionado para `/admin` — fora do âmbito operacional deste módulo).

### 3.2 Detalhes de persona

- **Guarda**: utiliza um tablet fixo na portaria, muitas vezes com luvas ou em condições de luz solar direta. Precisa de ecrãs com botões grandes, feedback visual e sonoro claro, e operação fiável mesmo com rede instável.

### 3.3 Acesso baseado em papel

- **GUARD**: acesso a Dashboard, NewEntry, DailyList, Incidents, ResidentSearch, News, Settings (rotas protegidas por `ProtectedRoute` + `ConfigGuard`).
- **ADMIN / SUPER_ADMIN**: ao fazer login nestas páginas via Login.tsx, são redirecionados para `/admin` em vez do Dashboard do guarda.
- **Não autenticado**: acesso a Setup.tsx (configuração inicial do tablet) e Login.tsx.

## 4. Requisitos funcionais

- **Dashboard** (Prioridade: Alta)
  - Atalhos principais: Nova Entrada, Lista do Dia (com contador de visitas do dia), Incidentes (com contador de incidentes novos, "9+" acima de 9), Pesquisar Morador.
  - Secção "Em Progresso": lista de visitas que precisam de ação (PENDING, APPROVED, ou INSIDE sem checkout), ordenadas por hora de entrada decrescente.
  - Botões de ação rápida por visita: Aprovar Entrada, Marcar Interior, Marcar Saída.
  - Botões de contacto ao residente (Ligar / Vídeo Chamada) aparecem após um atraso de 7 minutos (`CONTACT_DELAY_MS = 7 * 60 * 1000`) desde a criação da visita, só para visitas PENDING.
  - Prévia das 3 notícias mais recentes do condomínio.
  - Indicador e botão de ativação de alertas sonoros ("🔊 Ativar Som" / "🔊 Alertas Ativos").
  - Assistente de IA (Concierge) — atualmente desativado na interface (botão flutuante com `disabled={true}`).
  - Atualização automática de dados a cada 10 segundos; notícias a cada 60 segundos.

- **Nova Entrada (registo de visita)** (Prioridade: Alta)
  - Fluxo de 3 passos: (1) seleção do tipo de visita, (2) dados do visitante e destino, (3) foto + método de aprovação.
  - Tipos de visita configuráveis dinamicamente (`visitTypes`), com deteção automática de "restaurante" e "desporto" como entrada livre (sem aprovação necessária, status `APPROVED` automático).
  - Pergunta intermédia "Dispõe de QR Code?" para tipos visitante/entrega/serviço, que desvia para um fluxo de leitura de QR code (exige ligação à internet).
  - Validação de QR code via `api.validateQrCode`, com pré-preenchimento automático de nome, telefone, motivo e unidade quando válido.
  - Seleção de unidade via modal com pesquisa por bloco, número ou nome de morador.
  - Seleção de restaurante, desporto ou tipo de serviço via modal dedicado, condicional ao tipo de visita.
  - Captura de foto do visitante com consentimento explícito obrigatório (toggle "Consentimento Fotográfico") antes de ativar a câmara; qualidade da foto configurável (Alta/Média/Baixa) carregada das definições do dispositivo.
  - Seletor de modo de aprovação (`ApprovalModeSelector`) para visitas que não são entrada livre nem QR confirmado.
  - Botão de submissão bloqueado até: consentimento fotográfico dado (se aplicável), foto capturada (se aplicável e não for fluxo QR), QR confirmado (se fluxo QR), ou chamada telefónica feita (se modo PHONE e unidade sem app instalada).
  - Ao submeter, grava a visita localmente, regista uma entrada de auditoria (`api.logAudit`), e navega para a Lista do Dia.

- **Lista do Dia (DailyList)** (Prioridade: Alta)
  - Lista de todas as visitas do dia atual, com vista em cartões (mobile) e tabela (tablet/desktop).
  - Pesquisa por nome ou telefone do visitante.
  - Badges de estado coloridos: PENDENTE (amarelo), APROVADO (verde), INSIDE (azul), LEFT (cinza), DENIED (vermelho), WITHOUT_RESPONSE (laranja), VIDEO_CHAMADA (ciano).
  - Indicador "Não Sincronizado" quando `sync_status === PENDING_SYNC`.
  - Modal de histórico de eventos por visita (linha do tempo com estado, hora e autor de cada transição).
  - Modal de zoom da foto do visitante.
  - Ações rápidas por estado: Aprovar Entrada, Marcar Interior, Marcar Saída — equivalentes às do Dashboard.
  - Atualização automática a cada 30 segundos.

- **Incidentes** (Prioridade: Alta)
  - Lista de incidentes reportados (tipos: perigo, incêndio, suspeita, outro), com cor e ícone por tipo.
  - Subscrição em tempo real (Supabase Realtime) a INSERT/UPDATE na tabela `incidents`, filtrando client-side por condomínio via RPC `get_resident`.
  - Alerta visual (banner animado, auto-esconde em 10s) e sonoro + vibração (`navigator.vibrate([200, 100, 200])`) ao detetar um novo incidente.
  - Botão de teste de som, necessário pelas políticas de autoplay dos browsers.
  - Fluxo de estados: novo (`new`) → confirmar leitura (`acknowledged`) → reportar ação (`inprogress` ou `resolved` diretamente) → fechar.
  - Modal de reporte de ação com notas obrigatórias e escolha de estado final (Em Progresso / Resolvido).
  - Histórico de ações do guarda por incidente (via `getIncidentActionHistory`).

- **Pesquisar Morador (ResidentSearch)** (Prioridade: Média)
  - Diretório de moradores do condomínio do dispositivo, filtrado por `condominium_id`.
  - Pesquisa por nome, telefone (dígitos) ou nome do condomínio.
  - Indicador de modo offline quando aplicável.
  - Apresenta nome, telefone e unidade (bloco + número) de cada morador.

- **Notícias (News)** (Prioridade: Baixa)
  - Lista de notícias do condomínio dos últimos 7 dias, com categoria, título, descrição e data relativa.
  - Atualização automática a cada 60 segundos quando online.
  - Modal de detalhe com imagem, categoria, data completa e conteúdo integral.

- **Configurações (Settings)** (Prioridade: Média)
  - Informação do dispositivo: nome do condomínio associado, estado de ligação (online/offline), ID do dispositivo.
  - Informação de armazenamento local (usado/total/percentagem) via `navigator.storage.estimate()`.
  - Configuração de qualidade de foto (Alta ~300KB / Média ~150KB / Baixa ~50KB).
  - Ação de recarregar a aplicação.
  - Ação de desinstalar o dispositivo (irreversível, com diálogo de confirmação `UninstallConfirmDialog`), que desassocia o tablet do condomínio e apaga dados locais.

- **Configuração inicial (Setup)** (Prioridade: Alta)
  - Lista de condomínios disponíveis, com pesquisa por nome/endereço.
  - Confirmação de ativação com 3 preferências configuráveis: captura de foto do visitante obrigatória, aprovação por intercomunicador permitida, aprovação manual do guarda permitida.
  - Fluxo de substituição de dispositivo já associado, exigindo credenciais de administrador (nome + PIN) via `api.forceConfigureDevice`.
  - Fluxo de recuperação de dispositivo (`api.recoverDeviceConfiguration`), listando dispositivos ativos do sistema com indicação de "última visto", também exigindo credenciais de administrador. Só disponível online.
  - Atualização do Service Worker ao entrar na página.

- **Autenticação (Login)** (Prioridade: Alta)
  - Autenticação por nome, apelido e PIN (mínimo 3 dígitos no formulário, teclado numérico dedicado).
  - Redirecionamento por papel: ADMIN/SUPER_ADMIN → `/admin`; GUARD → `/` (Dashboard).
  - Inicialização do serviço de áudio imediatamente após login bem-sucedido.
  - Funcionalidade de reset de emergência: 5 toques no logótipo em 2 segundos abre um modal de PIN mestre (`123456`) que invoca `api.resetDevice()` — mecanismo de recuperação offline sem precisar de suporte remoto.

## 5. Experiência do utilizador

### 5.1 Pontos de entrada e fluxo do primeiro uso

- Tablet novo → Setup.tsx (seleção de condomínio e preferências) → Login.tsx → Dashboard.
- Tablet já configurado → Login.tsx direto.

### 5.2 Experiência principal

- **Dashboard como hub central**: o guarda regressa ao Dashboard entre cada ação — é o ponto de partida e de retorno de todos os fluxos, com contadores visuais (badges vermelhos) que sinalizam o que precisa de atenção.
  - Isto garante que o guarda nunca perde de vista visitas pendentes ou incidentes novos, mesmo a meio de outra tarefa.
- **Nova Entrada em 3 passos claros**: a barra de progresso e a navegação "Voltar" em cada passo reduzem o erro e permitem corrigir sem recomeçar.
  - O bloqueio do botão de submissão até todos os requisitos estarem satisfeitos evita o registo de visitas com dados incompletos.

### 5.3 Funcionalidades avançadas e casos extremos

- Entrada livre automática para restaurante/desporto, sem fluxo de aprovação.
- Fluxo de leitura de QR code com tratamento de estados de validação (a aguardar, a validar, erro, confirmado) e exigência de ligação online.
- Indicador "Não Sincronizado" na Lista do Dia para visitas ainda não confirmadas no Supabase.
- Reset de emergência via PIN mestre offline, para recuperação sem suporte técnico remoto.
- Substituição/recuperação de dispositivo com validação de credenciais de administrador, para o caso de troca física de tablet.

### 5.4 Destaques de UI/UX

- Botões grandes com áreas de toque amplas, adequados a uso com luvas e ecrãs tablet.
- Cores de estado consistentes em toda a app (amarelo=pendente, verde=aprovado, azul=interior, etc.).
- Animações de destaque (`animate-pulse`, anéis âmbar) em botões que requerem atenção imediata (ex.: botões de contacto ao residente, aprovar entrada pós-chamada).
- Vistas responsivas dedicadas: cartões para mobile, tabela para tablet/desktop na Lista do Dia.

## 6. Narrativa

Um visitante chega à portaria. O guarda toca em "Nova Entrada" no Dashboard, seleciona o tipo de visita, preenche os dados do visitante e escolhe o destino (unidade, restaurante ou área desportiva). Se o condomínio usa QR codes, o visitante mostra o código e os dados são pré-preenchidos automaticamente. O guarda obtém consentimento fotográfico, captura a foto, e escolhe como aprovar a entrada — app do residente, telefone, intercomunicador, ou aprovação manual. Mesmo sem internet, a visita é guardada localmente e sincroniza mais tarde. O guarda acompanha o estado da visita pelo Dashboard ou pela Lista do Dia, marca a entrada e a saída, e se algo correr mal, regista um incidente que dispara um alerta sonoro para qualquer guarda no turno.

## 7. Métricas de sucesso (impacto observado)

### 7.1 Métricas centradas no utilizador

- Tempo médio para completar o registo de uma visita (3 passos guiados, com auto-preenchimento via QR quando disponível).
- Taxa de incidentes confirmados (`acknowledged`) e resolvidos (`resolved`) pelos guardas, visível no histórico de ações.
- Taxa de utilização do reset de emergência (PIN mestre) como proxy de problemas de configuração no terreno.

### 7.2 Métricas de negócio

- Volume diário de visitas registadas por condomínio (contador "Lista do Dia" no Dashboard).
- Percentagem de entradas livres (restaurante/desporto) vs. entradas que exigem aprovação — indica padrão de uso das áreas comuns.

### 7.3 Métricas técnicas

- Percentagem de visitas com `sync_status: PENDING_SYNC` em determinado momento, como proxy de qualidade de rede no terreno.
- Frequência de uso do fluxo de recuperação/substituição de dispositivo, como proxy de rotatividade de hardware.

## 8. Considerações técnicas

### 8.1 Pontos de integração

- `services/dataService.ts` (`api`) para todas as operações de dados (visitas, incidentes, notícias, configuração de dispositivo).
- `services/Supabase.ts` (`SupabaseService`) para sessões de chamada de vídeo (delegado ao módulo Resident Communication).
- `services/audioService.ts` para alertas sonoros de incidentes e indicador de chamada.
- `services/logger.ts` para logging estruturado com categorias de erro (`ErrorCategory`).
- Supabase Realtime (canal `incidents-changes`) para atualização em tempo real de incidentes.
- `components/CameraCapture.tsx`, `ApprovalModeSelector.tsx`, `UninstallConfirmDialog.tsx` como componentes partilhados.

### 8.2 Armazenamento de dados e privacidade

- Consentimento fotográfico explícito e obrigatório antes da captura de imagem do visitante.
- PIN de autenticação validado via `api.login` (bcrypt, conforme arquitetura geral do produto).
- PIN mestre de emergência fixo (`123456`) para reset/recovery offline — risco de segurança conhecido e aceito como trade-off para continuidade operacional sem internet.

### 8.3 Escalabilidade e desempenho

- Polling client-side (10s no Dashboard, 30s na Lista do Dia, 60s nas Notícias) em vez de subscrições realtime para a maioria dos dados — exceção: Incidentes usa Supabase Realtime.
- Filtragem de incidentes por condomínio feita client-side via RPC adicional (`get_resident`), por a tabela `incidents` não ter coluna direta de `condominium_id`.

### 8.4 Desafios potenciais

- Dependência de `navigator.vibrate` e Web Audio API, com fallback gracioso quando não suportado/permitido pelo browser.
- Autoplay de som bloqueado por políticas de browser, exigindo interação explícita do utilizador ("Testar Som") antes dos alertas automáticos funcionarem.
- PIN mestre fixo no código-fonte representa uma superfície de risco que poderia ser explorada se o dispositivo for comprometido fisicamente.

## 9. Histórico de entregas

- **Fase 0: Core MVP** (2025-11-29 a 2026-01-23) — Dashboard, NewEntry, DailyList, Incidents, ResidentSearch, News, Settings, Login implementados como fundação do produto, antes de qualquer PR nomeado formalmente.
- **Fase 3: Device Approval Settings** (2026-04-24 a 2026-04-25, PRs #9–#12, branch `feature_device_approval_settings`) — Setup.tsx ganhou as 3 preferências configuráveis (foto obrigatória, intercomunicador, aprovação manual) e os fluxos de substituição/recuperação de dispositivo.

## 10. User stories

### 10.1. Registar uma nova visita com aprovação pela app do residente

- **ID**: GH-001
- **Descrição**: Como guarda, quero registar a entrada de um visitante associando-o a uma unidade e pedindo aprovação através da app do residente, para que a entrada só avance com autorização do morador.
- **Critérios de aceitação**:
  - O guarda consegue selecionar o tipo de visita, preencher nome do visitante e selecionar a unidade de destino.
  - O guarda consegue capturar uma foto do visitante após dar consentimento fotográfico.
  - O sistema envia um pedido de aprovação para a app do residente associado à unidade.
  - A visita é criada com estado `PENDING` até receber resposta.

### 10.2. Registar entrada livre num restaurante ou área desportiva

- **ID**: GH-002
- **Descrição**: Como guarda, quero registar a entrada de um visitante num restaurante ou área desportiva do condomínio sem necessitar de aprovação prévia, para agilizar o acesso a áreas comuns.
- **Critérios de aceitação**:
  - Ao selecionar um tipo de visita marcado como `requires_restaurant` ou `requires_sport`, a unidade de destino deixa de ser obrigatória.
  - A visita é criada automaticamente com estado `APPROVED` e modo `ENTRADA_LIVRE`.
  - A interface mostra explicitamente "Entrada Livre — Sem necessidade de aprovação".

### 10.3. Validar entrada por leitura de QR code

- **ID**: GH-003
- **Descrição**: Como guarda, quero ler o QR code de um visitante para pré-preencher automaticamente os seus dados e confirmar a sua identidade, para reduzir erros de digitação e acelerar o registo.
- **Critérios de aceitação**:
  - O sistema só permite o fluxo de QR code quando o dispositivo está online.
  - Após leitura, o sistema valida o código via RPC e apresenta erro claro se inválido.
  - Em caso de validação bem-sucedida, nome, telefone, motivo e unidade são pré-preenchidos e o guarda pode confirmar a entrada.

### 10.4. Acompanhar visitas ativas e agir sobre o seu estado

- **ID**: GH-004
- **Descrição**: Como guarda, quero ver no Dashboard e na Lista do Dia quais visitas precisam da minha ação (aprovar, marcar interior, marcar saída), para gerir o fluxo de pessoas sem perder nenhuma etapa.
- **Critérios de aceitação**:
  - Visitas com estado `PENDING` mostram botão de aprovação (ou contacto ao residente, após 7 minutos de espera).
  - Visitas com estado `APPROVED` mostram botão "Marcar Interior".
  - Visitas com estado `INSIDE` e sem `check_out_at` mostram botão "Marcar Saída".
  - As ações atualizam o estado da visita e refletem-se imediatamente na interface.

### 10.5. Reportar e gerir um incidente de segurança

- **ID**: GH-005
- **Descrição**: Como guarda, quero reportar um incidente de segurança e acompanhar o seu ciclo de vida (confirmar leitura, reportar ação, fechar), para manter um registo auditável de ocorrências.
- **Critérios de aceitação**:
  - Um novo incidente reportado por um residente dispara alerta sonoro e visual em todos os tablets do condomínio, em tempo real.
  - O guarda pode confirmar leitura (`acknowledged`), reportar a ação tomada com notas obrigatórias, e marcar como resolvido ou em progresso.
  - O histórico de ações de cada incidente é visível e ordenado cronologicamente.

### 10.6. Pesquisar um morador por nome, telefone ou condomínio

- **ID**: GH-006
- **Descrição**: Como guarda, quero pesquisar rapidamente um morador para confirmar a sua unidade e contacto, para validar identidades ou esclarecer dúvidas no portão.
- **Critérios de aceitação**:
  - A pesquisa filtra por nome, dígitos do telefone, ou nome do condomínio.
  - Os resultados mostram nome completo, telefone e unidade (bloco + número).
  - Em modo offline, a pesquisa usa apenas os dados em cache local.

### 10.7. Configurar o tablet pela primeira vez (autenticação/segurança)

- **ID**: GH-007
- **Descrição**: Como administrador, quero associar um tablet novo a um condomínio específico, definindo as preferências de aprovação, para que o dispositivo comece a operar corretamente desde o primeiro uso.
- **Critérios de aceitação**:
  - A seleção de condomínio é obrigatória antes de avançar.
  - As 3 preferências (foto obrigatória, intercomunicador, aprovação manual) são configuráveis no momento da ativação.
  - Se o condomínio já tiver um dispositivo associado, o sistema oferece o fluxo de substituição, que exige credenciais válidas de administrador.
  - O fluxo de recuperação de dispositivo só é apresentado quando o tablet está online, e exige credenciais de administrador antes de restaurar a configuração.

### 10.8. Autenticar-se com PIN e aceder a reset de emergência offline

- **ID**: GH-008
- **Descrição**: Como guarda ou administrador, quero autenticar-me com nome, apelido e PIN, e ter um mecanismo de recuperação offline em caso de bloqueio do dispositivo, para nunca ficar sem acesso à portaria.
- **Critérios de aceitação**:
  - O login redireciona ADMIN/SUPER_ADMIN para `/admin` e GUARD para `/`.
  - O PIN tem no mínimo 3 dígitos e é validado via `api.login` (bcrypt).
  - 5 toques no logótipo em menos de 2 segundos abrem o modal de reset de emergência, que exige o PIN mestre `123456` para executar `api.resetDevice()`.
  - Falhas de autenticação mostram mensagem de erro clara sem expor detalhes da causa.
