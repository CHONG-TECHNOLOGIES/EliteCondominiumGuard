# Integração de Dispositivo de Vídeo Indoor com EntryFlow

> Documento de referência para a implementação futura. Não é código executável — descreve a arquitetura recomendada, fornecedores avaliados e plano de execução faseado.

## Contexto

A app EntryFlow já tem videochamada funcional entre o tablet do guarda (PWA) e a app móvel do residente (Expo). O objectivo deste documento é **adicionar um terceiro tipo de endpoint**: um dispositivo de vídeo dedicado, instalado dentro do apartamento, montado na parede, que toca quando o guarda chama e mostra a imagem do visitante + portaria — sem o residente ter de pegar no telemóvel.

- Mercado alvo: **Portugal (UE)**
- Faixa de preço: aberta (apresentar várias opções ao cliente final)
- Objetivo de negócio: vender o "kit indoor" como upsell ao condomínio (hardware + setup + subscrição)

---

## Análise do Estado Atual

### Stack de videochamada já implementada

| Componente | Localização | Estado |
|---|---|---|
| WebRTC peer-to-peer | [src/services/videoCallService.ts](../services/videoCallService.ts) | Funcional (offer/answer + ICE via Supabase Realtime broadcast) |
| Sinalização | Canal Supabase `video-call-${session.id}` | Eventos: `offer`, `answer`, `ice-candidate`, `reject`, `hangup` |
| STUN/TURN | [videoCallService.ts:21-31](../services/videoCallService.ts#L21-L31) | STUN Google + TURN Cloudflare opcional via env |
| UI da chamada | [src/components/VideoCallModal.tsx](../components/VideoCallModal.tsx) | Estados IDLE / CALLING / CONNECTED / REJECTED / MISSED / FAILED |
| Push para residente | [supabase/functions/send-video-call-push/index.ts](../../supabase/functions/send-video-call-push/index.ts) | Expo Push API → token em `resident_devices.push_token` |
| Schema da sessão | [src/types.ts:422-437](../types.ts#L422-L437) `VideoCallSession` | Já existe |
| RPCs Supabase | [src/services/Supabase.ts:3025-3071](../services/Supabase.ts#L3025-L3071) | `create_video_call_session`, `update_video_call_session_status` |

**Implicação crítica**: a stack é **agnóstica do tipo de dispositivo do residente**. Qualquer cliente que fale WebRTC + Supabase Realtime pode atender. O trabalho aqui é principalmente de **hardware + packaging**, não de reescrever a app guarda.

### Lacunas a colmatar

1. O endpoint indoor precisa de saber qual `resident_id` / `unit_id` representa.
2. A função `send-video-call-push` só envia via Expo Push (mobile). Precisamos de **fan-out a múltiplos dispositivos**.
3. A tabela `resident_devices` precisa de distinguir tipo de dispositivo (`mobile` vs `indoor_station`) para encaminhar a chamada para o endpoint certo (ou para os dois em paralelo).
4. O atual `initiateIntercomCall` em [src/utils/approvalModes.ts:181-198](../utils/approvalModes.ts#L181-L198) é apenas TODO — pode ser limpo.

---

## Arquitetura Recomendada — 3 Tiers de Hardware

A estratégia é **suportar múltiplos níveis de hardware sobre a mesma stack WebRTC**, em vez de construir 3 integrações separadas. Princípio: **o dispositivo indoor corre uma versão "kiosk" da app residente Expo**.

### Decisão arquitetónica nuclear

> **Não usar SIP nem WebRTC-to-SIP gateway** (Janus, Asterisk, Twilio). O dispositivo indoor corre WebRTC nativo, igual à app móvel. Justificação: já temos sinalização Supabase Realtime a funcionar; introduzir SIP duplica a stack, exige servidor permanente, e bloqueia-nos a hardware específico.

### Tier A — Económico (~120-180 EUR/unidade)

**Hardware**: Tablet Android industrial wall-mount (10") com PoE ou alimentação 12V.

Modelos sugeridos para Portugal:
- **Lenovo Tab M10** (~120 EUR) + suporte parede VESA (~25 EUR)
- **Teclast P30S / P40HD** (~110 EUR)
- **Sonoff NSPanel Pro 120** (~180 EUR, PoE, ecrã 4")
- Painéis industriais com Android 11+ AOSP (Aliexpress/Amazon, ~150 EUR, 7"-10")

**Software**: app Expo do residente já existente, em modo kiosk (Lock Task Mode do Android), boot automático, sem barra de estado.

**Distribuidores PT**: Worten Empresas, PCDIGA, ChiptecPC, Amazon.es.

### Tier B — Médio (~280-450 EUR/unidade)

**Hardware**: Indoor monitors *baseados em Android* dos fabricantes especializados — permitem instalar APK custom da nossa app residente.

Modelos:
- **Akuvox IT83A / IT88A** (~350 EUR) — Android 9, ecrã 8"-10", PoE, câmara frontal, altifalante. Permite APK third-party via Akuvox SmartPlus Console.
- **Hikvision DS-KH9510-WTE1** (~320 EUR) — Android 4.4 (limitado, mas suporta APK), ecrã 10", PoE.
- **Dahua VTH5341G-W** (~280 EUR) — Android, ecrã 7", PoE.

**Software**: build da app residente (Expo) gerada como APK, instalada no dispositivo. WebRTC funciona em Android nativo.

**Distribuidores PT**: Securitas Direct PT, Casmar, Sécurité Iberica, Daitem PT.

### Tier C — Premium (>600 EUR/unidade)

**Hardware**: Indoor monitors profissionais com acabamento premium.

Modelos:
- **2N Indoor Touch 2.0** (~750 EUR) — Android 8.1 com APK third-party permitido, ecrã 7", PoE, mic+camera, IP54. **Recomendado.**
- **Fermax WIT 7" MEET** (~580 EUR) — sistema MEET, suporta SIP. Não corre Android aberto: para usar com o nosso WebRTC seria preciso wrapper.
- **Aiphone IX-MV7** (~900 EUR) — fechado, requer integração SIP (descartado pela decisão arquitetónica).

**Recomendação para Tier C**: focar no **2N Indoor Touch 2.0** porque corre Android com APK aberto (mesma estratégia que Tier B, mas premium).

---

## Fornecedores — Shortlist Portugal

| Tier | Modelo | Distribuidor PT | Preço aprox. (EUR) | SDK / Integração |
|---|---|---|---|---|
| **A** | Lenovo Tab M10 + VESA mount | Worten Empresas, PCDIGA | 120-150 | APK Android nativo |
| **A** | Sonoff NSPanel Pro 120 (PoE) | Aliexpress, Amazon.es | 180 | Android open |
| **B** | **Akuvox IT83A** ⭐ | Casmar, Sécurité Iberica | 320-380 | APK + SmartPlus REST API |
| **B** | Hikvision DS-KH9510 | Securitas Direct, Daitem | 280-340 | APK (Android 4.4) |
| **C** | **2N Indoor Touch 2.0** ⭐ | Securitas, OptimusS | 700-820 | APK + 2N HTTP API |

> Preços indicativos com base em informação do modelo até Aug 2025. Validar com cotação direta dos distribuidores antes de comprometer-se com cliente.

### Links para fotos / fichas técnicas

| Modelo | Site fabricante | Pesquisa imagens (Google) |
|---|---|---|
| Lenovo Tab M10 (Gen 4) | https://www.lenovo.com/pt/pt/tablets/ | https://www.google.com/search?q=Lenovo+Tab+M10+Gen+4&tbm=isch |
| Sonoff NSPanel Pro 120 | https://sonoff.tech/ | https://www.google.com/search?q=Sonoff+NSPanel+Pro+120&tbm=isch |
| Akuvox IT83A | https://www.akuvox.com/ | https://www.google.com/search?q=Akuvox+IT83A+indoor+monitor&tbm=isch |
| Akuvox IT88A | https://www.akuvox.com/ | https://www.google.com/search?q=Akuvox+IT88A+indoor+monitor&tbm=isch |
| Hikvision DS-KH9510-WTE1 | https://www.hikvision.com/ | https://www.google.com/search?q=Hikvision+DS-KH9510-WTE1&tbm=isch |
| Dahua VTH5341G-W | https://www.dahuasecurity.com/ | https://www.google.com/search?q=Dahua+VTH5341G-W&tbm=isch |
| 2N Indoor Touch 2.0 | https://www.2n.com/ | https://www.google.com/search?q=2N+Indoor+Touch+2.0&tbm=isch |
| Fermax WIT 7" MEET | https://www.fermax.com/ | https://www.google.com/search?q=Fermax+WIT+7+MEET&tbm=isch |

**Estratégia de validação inicial**: comprar **1 unidade de cada estrela (⭐) + 1 tablet Lenovo**, validar instalação da app residente em modo kiosk, medir latência de notificação e qualidade de chamada antes de fechar parceria comercial.

---

## Trabalho na Codebase

### 1. Schema / Backend (Supabase)

| Mudança | Onde | Detalhe |
|---|---|---|
| Adicionar coluna `device_type` em `resident_devices` | Migration SQL nova em `database/` | Enum: `mobile`, `indoor_station`, `web`. Default `mobile` para compatibilidade. |
| Estender `send-video-call-push` para fan-out | [supabase/functions/send-video-call-push/index.ts](../../supabase/functions/send-video-call-push/index.ts) | Em vez de `.limit(1)` (linha 46), enviar para **todos** os dispositivos do residente. |
| Opcional: realtime channel "ring" | Novo canal Supabase `unit-ring-${unit_id}` | Para dispositivos sempre-ligados, em vez de push, podem subscrever realtime e tocar imediatamente. Latência <500ms. Mais robusto que push. |

### 2. App Residente (fora deste repo, mas a coordenar)

> A app residente Expo está noutro repositório. O guard app (este repo) **não muda muito** — apenas a app residente precisa de modo "indoor station".

Mudanças sugeridas no projeto Expo do residente:
- Flag de configuração `DEVICE_MODE=indoor_station` no `.env` ou no primeiro setup.
- Em modo indoor: bypass de login (o device autentica-se ao apartamento, não ao utilizador), boot direto na tela de standby.
- Auto-resposta opcional ao fim de 1-2 toques (configurável).
- Subscrição ao canal realtime `unit-ring-${unit_id}` em vez de depender só de push.

### 3. App Guarda (este repo) — mudanças mínimas

| Mudança | Ficheiro | Detalhe |
|---|---|---|
| Mostrar "Indoor station online" no UI | [src/pages/DailyList.tsx](../pages/DailyList.tsx), botão de vídeo | Indicador visual de que a unidade tem indoor station ativa. Query a `resident_devices` filtrado por `device_type='indoor_station'`. |
| Atualizar `unitHasAppInstalled` | [src/utils/approvalModes.ts:102-107](../utils/approvalModes.ts#L102-L107) | Considerar indoor station como "tem app" para mostrar `ApprovalMode.APP`. Pode-se renomear para `unitHasReachableEndpoint`. |
| Limpar `initiateIntercomCall` TODO | [src/utils/approvalModes.ts:181-198](../utils/approvalModes.ts#L181-L198) | Remover ou substituir por chamada à indoor station via mesmo `videoCallService`. |
| Documentar tipo `device_type` | [src/types.ts](../types.ts) | Acrescentar enum `DeviceType` e estender interface relacionada com `resident_devices`. |

### 4. Documentação técnica (para o cliente final)

- Guia de instalação por modelo (Tier A/B/C).
- Procedimento de provisionamento: como vincular um device físico a um `unit_id`.
- Ficha técnica de venda: 1-pager por tier para apresentar ao síndico.

---

## Plano de Execução Faseado

### Fase 0 — Validação técnica (2 semanas)
1. Comprar 1× Lenovo M10, 1× Akuvox IT83A, 1× 2N Indoor Touch.
2. Empacotar app Expo residente como APK com flag `DEVICE_MODE=indoor_station`.
3. Instalar nos 3 dispositivos, testar videochamada end-to-end com tablet guarda.
4. Medir: latência de notificação, qualidade de áudio/vídeo, comportamento offline, consumo elétrico.

### Fase 1 — Backend (1 semana)
1. Migration SQL: adicionar `device_type` a `resident_devices`.
2. Atualizar `send-video-call-push` para fan-out a todos os devices.
3. Adicionar canal realtime `unit-ring-${unit_id}` (opcional, ganho de UX).

### Fase 2 — Guard PWA (3-4 dias)
1. Indicador "indoor station online" no [DailyList.tsx](../pages/DailyList.tsx).
2. Atualizar lógica em [approvalModes.ts](../utils/approvalModes.ts).
3. Tipos em [types.ts](../types.ts).

### Fase 3 — App Residente (paralelo a Fase 2)
1. Modo indoor station na app Expo (kiosk + auto-config).
2. Build APK assinado com keystore Chong Technologies.

### Fase 4 — Comercial
1. Pitch deck "Kit Indoor EntryFlow" com 3 tiers.
2. Acordo com distribuidor (Casmar para Akuvox).
3. Piloto num condomínio amigável.

---

## Verificação End-to-End

| Verificação | Como |
|---|---|
| Videochamada do guarda → indoor station Tier A | Tablet guarda chama unidade X → indoor station toca <2s → atende → vê imagem do guarda → áudio bidirecional <300ms |
| Fan-out a múltiplos devices | Unidade com mobile + indoor: ambos tocam, primeiro a atender ganha (outros recebem evento `answered` via Supabase Realtime e param de tocar) |
| Comportamento offline | Indoor station sem internet: chamada falha graciosamente; guarda vê estado `MISSED` ao fim de 60s ([videoCallService.ts:33](../services/videoCallService.ts#L33)) |
| Provisionamento | Reset de fábrica → boot → ecrã de pareamento com QR code → guarda valida → device aparece como `indoor_station` em `resident_devices` |
| Custo total instalado | Tier B (Akuvox) com mão-de-obra: ≤500 EUR/unidade chave-na-mão |

---

## Critical Files (Referência rápida)

- [src/services/videoCallService.ts](../services/videoCallService.ts) — stack WebRTC, **não tocar**
- [src/components/VideoCallModal.tsx](../components/VideoCallModal.tsx) — UI guarda, **não tocar**
- [supabase/functions/send-video-call-push/index.ts](../../supabase/functions/send-video-call-push/index.ts) — **modificar** para fan-out
- [src/utils/approvalModes.ts](../utils/approvalModes.ts) — limpar TODO + atualizar `unitHasAppInstalled`
- [src/pages/DailyList.tsx](../pages/DailyList.tsx) — indicador visual indoor online
- [src/types.ts](../types.ts) — enum `DeviceType`
- `database/` — nova migration SQL para `device_type`

---

## Decisões Firmes — O Que Não Fazer

1. Não introduzir SIP nem gateway WebRTC↔SIP. Duplica stack e bloqueia hardware.
2. Não usar a Akuvox SmartPlus cloud nem 2N MyDigital como sinalização. Mantém-se Supabase Realtime — é o que já funciona e é o que controlamos.
3. Não construir uma app nativa nova para o indoor — reutilizar a Expo existente em modo kiosk.
4. Não suportar hardware fechado (Aiphone IX, Comelit non-MEET) na primeira fase.
