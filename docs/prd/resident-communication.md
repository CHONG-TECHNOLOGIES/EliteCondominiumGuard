# PRD: Resident Communication & Video Calls

## 1. Visão geral do produto

### 1.1 Título e versão do documento

- PRD: Resident Communication & Video Calls
- Versão: 1.0 (retroativo)

### 1.2 Resumo do produto

Este módulo cobre os mecanismos pelos quais um guarda contacta o residente de uma unidade para obter aprovação de entrada de um visitante: chamada telefónica direta, chamada de vídeo P2P via WebRTC, e a lógica de pesquisa que determina qual residente contactar e por que canal. É o módulo que liga o fluxo de aprovação descrito no PRD "Guard App" à infraestrutura de comunicação em tempo real do produto.

A chamada de vídeo é sinalizada via Supabase Realtime (broadcast em canal dedicado por sessão) e estabelece uma ligação WebRTC direta entre o tablet do guarda e a app do residente, com servidores STUN públicos (Google) e fallback opcional TURN (Cloudflare) quando configurado.

Este documento é retroativo: documenta funcionalidade já implementada e em produção, não um plano de trabalho futuro.

## 2. Objetivos

### 2.1 Objetivos de negócio

- Permitir aprovação remota de visitantes sem exigir que o residente esteja fisicamente presente no portão.
- Oferecer um canal de comunicação visual (vídeo) para além da voz, aumentando a confiança na identificação do visitante.
- Garantir um canal de contacto de reserva (telefone) quando o residente não tem a app instalada.

### 2.2 Objetivos do utilizador (guarda)

- Saber imediatamente se um residente tem a app instalada e pode receber uma chamada de vídeo.
- Iniciar uma chamada de vídeo ou telefónica diretamente do ecrã, sem aceder a outro dispositivo.
- Ter feedback claro sobre o estado da chamada (a chamar, ligado, recusado, sem resposta, falhado).

### 2.3 Não-objetivos

- Este módulo não cobre a interface das páginas onde os botões de contacto aparecem (Dashboard, DailyList) — ver PRD "Guard App".
- Não cobre o lado da app de residente que recebe a chamada (fora do âmbito deste repositório).
- Não cobre a integração de interfone físico (placeholder não implementado, ver `initiateIntercomCall`).

## 3. Personas de utilizador

### 3.1 Tipos de utilizador principais

- Guarda (quem inicia a chamada).
- Residente (quem recebe a chamada na app própria, fora do âmbito deste repositório).

### 3.2 Detalhes de persona

- **Guarda**: precisa de decidir rapidamente, com base na disponibilidade do residente, se liga por telefone ou inicia vídeo chamada — a interface só mostra a opção de vídeo quando sabe de antemão que o residente tem a app instalada.

### 3.3 Acesso baseado em papel

- Disponível apenas a utilizadores com papel GUARD autenticados (a iniciar a partir de Dashboard ou DailyList).

## 4. Requisitos funcionais

- **Pesquisa de residente para contacto** (Prioridade: Alta)
  - `findResidentForPhone(visit, isOnline)`: resolve o residente da unidade (ou via QR code) com número de telefone preenchido, priorizando o primeiro residente encontrado com telefone válido.
  - `findResidentForVideoCall(visit, isOnline)`: resolve todos os residentes da unidade com a app instalada (`has_app_installed === true` ou `device_token` presente).
  - `visitHasResidentWithApp(visit, isOnline)`: verificação booleana usada para decidir se o botão de vídeo chamada deve aparecer.
  - Resolução online: consulta direta ao Supabase (`getResidentsByUnitId`, `getResidentById`), com cache local subsequente (`db.residents.bulkPut` / `put`).
  - Resolução offline: usa exclusivamente o cache Dexie (`db.residents`), sem tentativa de rede.
  - Resolução por QR code: se a visita tem `qr_token` mas não `resident_id`, valida o QR (online) para obter o residente exato, em vez de todos os residentes da unidade.

- **Chamada telefónica** (Prioridade: Alta)
  - `initiatePhoneCall(phoneNumber)`: tenta abrir o discador nativo via `tel:` URL, com 3 métodos de fallback (elemento `<a>` temporário, `window.open`, `window.location.href`).
  - Deteção de falha: após 2 segundos, se a página ainda tiver foco (discador não abriu), mostra alerta com o número para discar manualmente e detalhes de diagnóstico (user agent, erros de cada método).
  - Cada chamada iniciada é registada via `api.logCallInitiated` com contexto (origem: dashboard ou daily_list, visita, unidade).

- **Chamada de vídeo (WebRTC)** (Prioridade: Alta)
  - Máquina de estados (`VideoCallState`): IDLE → REQUESTING_MEDIA → CALLING → CONNECTED → (ENDED | REJECTED | MISSED | FAILED).
  - Pedido de acesso a câmara traseira (`facingMode: 'environment'`, 1280x720 ideal) e microfone via `getUserMedia`.
  - Sinalização via canal Supabase Realtime dedicado por sessão (`video-call-{session.id}`), com eventos broadcast: `offer`, `answer`, `ice-candidate`, `reject`, `hangup`.
  - Servidores ICE: STUN públicos do Google sempre incluídos; servidor TURN da Cloudflare incluído apenas se `VITE_TURN_USERNAME` e `VITE_TURN_CREDENTIAL` estiverem configurados.
  - Persistência da oferta SDP na base de dados (`updateVideoCallSessionOffer`) para que o residente a possa recuperar mesmo se perder o broadcast inicial.
  - Timeout de chamada de 90 segundos (`CALL_TIMEOUT_MS`) — se não houver resposta, estado passa a `MISSED` e a sessão é marcada como tal no backend.
  - Deteção de queda de rede: se o estado ICE for `disconnected` ou `failed` durante uma chamada `CONNECTED`, espera 10 segundos antes de confirmar falha (para tolerar reconexões rápidas) e marca a sessão como `FAILED`.
  - Fila de candidatos ICE recebidos antes da `remoteDescription` estar definida, processados em lote (`flushPendingIceCandidates`) após receber a resposta.
  - Notificação ao(s) residente(s) via `createVideoCallNotification` para cada residente elegível da unidade; se nenhuma notificação for criada com sucesso, a sessão é marcada `FAILED` e o guarda é avisado.
  - Interface modal (`VideoCallModal`) com 4 ecrãs visuais: chamada em curso (com contagem decrescente de 60s e foto do residente), ligado (vídeo remoto em full screen, vídeo local em picture-in-picture, controlos de mute/câmara/terminar, duração da chamada), recusado/sem resposta (auto-fecha em 3s), e falhado.
  - Aviso de `beforeunload` do browser durante chamadas ativas, para evitar fecho acidental do separador a meio de uma chamada.
  - Tom de chamada (ringback) sintetizado via Web Audio API (dois osciladores a 440Hz/480Hz, modulação de volume a cada 650ms entre 0.1 e 0.18) enquanto o estado é `CALLING`.

- **Determinação do modo de aprovação disponível** (Prioridade: Alta)
  - `getAvailableApprovalModes`: decide quais modos de aprovação mostrar ao guarda (App, Telefone, Interfone, Aprovação Manual, QR Code) com base em 3 fatores: ligação à internet, se a unidade tem residente com app instalada, e configuração do condomínio (`intercom_approval_enabled`, `guard_manual_approval_enabled`).
  - Online + residente com app: mostra App primeiro, mais Interfone/Aprovação Manual se ativados no condomínio.
  - Online + residente sem app, ou Offline: mostra apenas métodos locais ativados (Telefone está sempre disponível; Interfone e Aprovação Manual dependem da configuração do condomínio).
  - `initiateIntercomCall`: atualmente um placeholder (`alert` informativo) — integração real com sistema de interfone físico (SIP/VoIP ou deep link) ainda não implementada.

## 5. Experiência do utilizador

### 5.1 Pontos de entrada e fluxo do primeiro uso

- A partir do Dashboard ou da Lista do Dia, nos cartões de visitas `PENDING`, após um atraso de 7 minutos desde a criação da visita.
- A partir do passo 3 de "Nova Entrada", via `ApprovalModeSelector`, quando o modo escolhido tem `hasCallAction: true` (Telefone ou Interfone).

### 5.2 Experiência principal

- **Decisão automática entre telefone e vídeo**: o botão de vídeo chamada só aparece quando o sistema já confirmou que o residente tem a app instalada — o guarda nunca precisa de adivinhar ou tentar e falhar.
  - Isto evita frustração: sem essa verificação prévia, o guarda tentaria iniciar vídeo chamadas que falhariam sempre por falta de app no lado do residente.
- **Feedback de estado constante durante a chamada de vídeo**: cada transição de estado (a chamar → ligado → terminado/recusado/falhado) tem um ecrã dedicado com texto claro em português, evitando ambiguidade sobre o que está a acontecer.

### 5.3 Funcionalidades avançadas e casos extremos

- Fallback de telefone com 3 métodos de abertura de discador, cobrindo diferentes comportamentos de browser/tablet.
- Diagnóstico detalhado quando a chamada telefónica falha (user agent, erros de cada tentativa) — útil para suporte remoto identificar tablets problemáticos.
- Tolerância a quedas de rede breves durante chamadas de vídeo ativas (espera de 10s antes de declarar falha).
- Fila de candidatos ICE para lidar com a ordem de chegada não garantida entre oferta/resposta e candidatos de rede.

### 5.4 Destaques de UI/UX

- Modal de chamada de vídeo renderizado via React Portal, garantindo que fica sempre acima de qualquer outro conteúdo da página.
- Picture-in-picture do vídeo local sobre o vídeo remoto em ecrã cheio, padrão familiar de apps de videochamada.
- Anel âmbar pulsante em torno da foto do residente durante "a chamar", reforçando urgência visual.

## 6. Narrativa

Um visitante chega sem QR code e a unidade de destino tem morador com a app instalada. Após o guarda preencher os dados da visita, o sistema mostra o botão de vídeo chamada (e telefone como alternativa). O guarda toca em "Vídeo Chamada": o tablet pede acesso à câmara e microfone, cria uma sessão no Supabase, notifica o residente, e mostra um ecrã de "a chamar" com a foto do morador e contagem decrescente. Se o residente atender, a ligação WebRTC estabelece-se diretamente entre os dois dispositivos e o guarda vê o residente em ecrã cheio, com o seu próprio vídeo num canto. Após a chamada terminar com sucesso, o guarda pode avançar para aprovar a entrada do visitante. Se o residente não tiver a app, o botão de telefone aciona o discador nativo do tablet diretamente.

## 7. Métricas de sucesso (impacto observado)

### 7.1 Métricas centradas no utilizador

- Tempo médio entre o início da chamada e a resposta do residente (proxy: segundos decorridos até `CONNECTED`).
- Taxa de chamadas de vídeo bem-sucedidas (`CONNECTED`) vs. recusadas (`REJECTED`) vs. sem resposta (`MISSED`) vs. falhadas (`FAILED`).
- Taxa de utilização de fallback telefónico após falha de discagem automática (indicador de tablets com configuração de discador problemática).

### 7.2 Métricas de negócio

- Percentagem de unidades com residentes que têm a app instalada (proxy de adoção da app de residente, que viabiliza vídeo chamada).
- Redução do tempo de aprovação de visitantes em unidades que usam vídeo chamada vs. apenas telefone.

### 7.3 Métricas técnicas

- Taxa de chamadas marcadas `FAILED` por queda de rede (`oniceconnectionstatechange`), como proxy de qualidade de rede no terreno.
- Frequência de uso do servidor TURN (quando configurado) vs. apenas STUN, como proxy de quão restritivas são as redes dos condomínios.

## 8. Considerações técnicas

### 8.1 Pontos de integração

- `services/videoCallService.ts` (singleton `videoCallService`) — orquestra WebRTC e sinalização.
- `services/Supabase.ts` (`SupabaseService`) — `createVideoCallSession`, `createVideoCallNotification`, `updateVideoCallSessionStatus`, `updateVideoCallSessionOffer`.
- Supabase Realtime — canal `video-call-{session.id}` por sessão, broadcast-only (`config: { broadcast: { self: false } }`).
- `services/audioService.ts` — `playRingbackTone` / `stopRingbackTone`.
- `services/db.ts` (Dexie) — tabela `residents`, usada como cache offline por `residentLookup.ts`.
- `utils/approvalModes.ts` — determina disponibilidade de modos e expõe `initiatePhoneCall` / `initiateIntercomCall`.
- Variáveis de ambiente `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` para o servidor TURN opcional da Cloudflare.

### 8.2 Armazenamento de dados e privacidade

- Streams de vídeo/áudio (`MediaStream`) nunca persistidos — apenas transmitidos P2P via WebRTC; param-se explicitamente as tracks no `cleanup()`.
- Dados de residente (nome, foto, telefone, `device_token`) cacheados em IndexedDB local (`db.residents`) para acesso offline.
- Registo de auditoria de cada chamada telefónica iniciada (`api.logCallInitiated`) com contexto da visita e unidade.

### 8.3 Escalabilidade e desempenho

- Cada chamada de vídeo cria um canal Supabase Realtime dedicado (`video-call-{session.id}`), evitando contenção entre chamadas simultâneas de diferentes guardas/unidades.
- Resolução de residentes prioriza cache local quando disponível, reduzindo chamadas de rede repetidas para a mesma unidade.

### 8.4 Desafios potenciais

- Dependência de `getUserMedia` — falha com mensagem clara se o utilizador recusar permissões de câmara/microfone.
- STUN/TURN: sem servidor TURN configurado, chamadas atrás de NAT simétrico ou firewalls restritivas podem falhar a estabelecer ligação P2P direta.
- `initiateIntercomCall` é apenas um placeholder funcional (mostra um alerta), não uma integração real com hardware de interfone — risco de expectativa desalinhada se um condomínio assumir que esta funcionalidade está operacional.
- Áudio de ringback depende de uma `AudioContext` já inicializada por interação prévia do utilizador (políticas de autoplay do browser).

## 9. Histórico de entregas

- **Fase 4: Video Call v0** (2026-04-27 a 2026-04-30, PRs #13–#18, branch `feature_video_call`) — primeiras iterações da funcionalidade de chamada de vídeo.
- **Fase 5: Video Call v1** (2026-04-30 a 2026-05-05, PRs #18–#23, branch `feature_video_call_v1`) — implementação WebRTC e versão inicial do `VideoCallModal`.
- **Fase 6: Phone Calls via Twilio** (2026-05-07, PRs #24–#25, branch `feature_calling_twilio`) — funcionalidade de chamadas telefónicas (a integração Twilio evoluiu posteriormente para o mecanismo `tel:` direto documentado aqui, mais simples e sem dependência de serviço externo).
- **Fase 7: Video Call v3 + Resident Comms** (2026-05-25 a 2026-05-26, PR #28 `feature_video_call_v3`, PR #29 `feature_video_call_ring`, commits `67cb649`, `9e44058`, `71d9fae`, `d505886`, `9f27c66`) — versão final do `VideoCallModal` com 4 estados, `videoCallService.ts` com WebRTC P2P + sinalização Supabase Realtime, `audioService.ts` com tom de chamada (ringback), utilitário de pesquisa de residente (`residentLookup.ts`), e botões de comunicação integrados na Lista do Dia.

## 10. User stories

### 10.1. Iniciar uma chamada de vídeo para o residente de uma unidade

- **ID**: RC-001
- **Descrição**: Como guarda, quero iniciar uma chamada de vídeo com o residente de uma unidade quando este tem a app instalada, para confirmar visualmente a autorização de entrada de um visitante.
- **Critérios de aceitação**:
  - O botão de vídeo chamada só aparece quando pelo menos um residente da unidade tem `has_app_installed` ou `device_token`.
  - Ao iniciar, o sistema pede acesso a câmara e microfone, cria a sessão, e notifica todos os residentes elegíveis da unidade.
  - O ecrã mostra "a chamar" com contagem decrescente de 60 segundos visível ao guarda.
  - Após 90 segundos sem resposta, a chamada passa automaticamente a estado "sem resposta".

### 10.2. Acompanhar o estado de uma chamada de vídeo em curso

- **ID**: RC-002
- **Descrição**: Como guarda, quero ver claramente se a chamada foi atendida, recusada, ou falhou, para decidir o próximo passo (aprovar entrada, tentar telefone, ou tentar novamente).
- **Critérios de aceitação**:
  - Estado "ligado" mostra vídeo do residente em ecrã cheio e vídeo do guarda em picture-in-picture, com duração da chamada visível.
  - Estado "recusado" ou "sem resposta" mostra o motivo (quando disponível) e fecha automaticamente após 3 segundos.
  - Estado "falhado" mostra mensagem de erro e requer fecho manual.
  - O guarda pode silenciar o microfone e desligar a câmara durante a chamada.

### 10.3. Contactar o residente por telefone quando não tem a app

- **ID**: RC-003
- **Descrição**: Como guarda, quero ligar diretamente para o telemóvel do residente quando este não tem a app instalada, para obter aprovação por voz.
- **Critérios de aceitação**:
  - O sistema localiza o residente da unidade com número de telefone preenchido (online ou a partir do cache offline).
  - Ao confirmar, o discador nativo do tablet abre automaticamente com o número.
  - Se o discador não abrir em 2 segundos, o sistema mostra o número para discagem manual e detalhes de diagnóstico.
  - A chamada iniciada é registada em auditoria com o contexto de origem (dashboard ou lista diária).

### 10.4. Determinar os modos de aprovação disponíveis para uma visita

- **ID**: RC-004
- **Descrição**: Como guarda, quero ver apenas os modos de aprovação que realmente funcionam para a situação atual (online/offline, app instalada, configuração do condomínio), para não tentar métodos que vão falhar.
- **Critérios de aceitação**:
  - Online com residente com app: App é mostrado primeiro, seguido de Interfone/Aprovação Manual se ativados no condomínio.
  - Offline ou residente sem app: apenas Telefone (sempre disponível) e os métodos locais ativados na configuração do condomínio são mostrados.
  - O modo App nunca é mostrado quando o residente não tem a app instalada.
