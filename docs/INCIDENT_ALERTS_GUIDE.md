# Guia de Alertas de Incidentes - Elite CondoGuard

## 🚨 Sistema de Notificação de Novos Incidentes

O app Guard agora possui um sistema completo de alertas para novos incidentes reportados pelos residentes.

---

## ✅ Funcionalidades Implementadas

### 1. **Alerta Sonoro** 🔊
- Som de alarme triplo **repetido 4 vezes** (BIP-bip-BIP x4 = ~6 segundos)
- Volume elevado (60%) para garantir que o guarda ouça
- Padrão de som urgente e distinto
- **Persistência**: Só precisa ativar o som uma vez (clicando "Testar Som")
- Funciona automaticamente mesmo após login, logout ou refresh da página

### 2. **Vibração do Dispositivo** 📳
- Padrão de vibração dupla (200ms, pausa, 200ms)
- Funciona em tablets e smartphones compatíveis

### 3. **Banner Visual** 🎨
- Banner vermelho com animação no topo da tela
- Mensagem clara: "🚨 NOVO INCIDENTE REPORTADO!"
- Desaparece automaticamente após 10 segundos
- Pode ser fechado manualmente pelo guarda

### 4. **Realtime via Supabase** 📡
- Subscrição em tempo real à tabela `incidents`
- Notificação instantânea quando novo incidente é criado
- Filtragem client-side por condomínio (verifica `resident.condominium_id`)
- Logs detalhados no console para debug

### 5. **Botão "Testar Som"** 🔘
- Botão visível no topo da página de Incidentes
- **Estados**:
  - 🟠 **"Testar Som"** (laranja pulsante): Som ainda não ativado
  - 🟢 **"Som Ativo"** (verde): Som já foi ativado
- **Como usar**: Clique UMA VEZ para ativar
- **Persistência**: A permissão fica salva no navegador (localStorage)
- Funciona automaticamente após primeira ativação, mesmo após:
  - Refresh da página
  - Login/Logout
  - Navegação entre páginas
  - Reinício do navegador (enquanto não limpar cache)

---

## 🔍 Como Verificar se o Sistema Está Funcionando

### Passo 1: Verificar os Logs do Console

Quando abrir a página de Incidentes, você deve ver no console do navegador:

```
[SupabaseClient] Supabase client initialized with realtime enabled
[Incidents] 📡 Setting up realtime subscription for condo: 1
[Incidents] Subscription status: SUBSCRIBED
[Incidents] ✅ Successfully subscribed to incident changes
```

Se você ver `CHANNEL_ERROR` ou `CLOSED`, o Realtime pode não estar habilitado no Supabase.

### Passo 2: Ativar Som (Primeira Vez)

**IMPORTANTE**: Antes de criar o incidente de teste, você deve ativar o som:

1. No **app Guard**, vá para a página de **Incidentes**
2. Clique no botão 🟠 **"Testar Som"** no topo da página
3. Você deve ouvir 4 ciclos de BIP-bip-BIP (~6 segundos)
4. O botão muda para 🟢 **"Som Ativo"**
5. Pronto! Agora o som está ativado permanentemente

### Passo 3: Criar um Incidente de Teste

1. Abra o **app Resident** em outro dispositivo/navegador
2. Faça login como residente
3. Reporte um novo incidente
4. No **app Guard**, você deve ver/ouvir **AUTOMATICAMENTE**:
   - 🔊 Som de alerta contínuo (4 ciclos de BIP-bip-BIP, ~6 segundos)
   - 📳 Vibração (se em dispositivo móvel)
   - 🎨 Banner vermelho no topo da tela
   - 📝 Console: `[Incidents] 🆕 New incident received via realtime`
   - 📝 Console: `[AudioService] 🔊 Alert sound played successfully (4 cycles)`

---

## ⚙️ Configuração do Supabase Realtime

### Verificar se Realtime está Habilitado

1. Acesse o **Dashboard do Supabase**: https://supabase.com/dashboard
2. Selecione seu projeto: `nfuglaftnaohzacilike`
3. Vá para **Database** → **Replication**
4. Verifique se a tabela `incidents` está na lista de **Replicated tables**
5. Se não estiver, clique em **Add table** e adicione `incidents`

### Política RLS (Row Level Security)

Certifique-se de que as políticas RLS da tabela `incidents` permitem:
- **SELECT**: Guardas podem ler incidentes do seu condomínio
- **INSERT**: Residentes podem criar novos incidentes
- **UPDATE**: Guardas podem atualizar status dos incidentes

---

## 🐛 Troubleshooting

### Problema: Não recebo alertas quando incidente é criado

**Possíveis Causas e Soluções:**

1. **Realtime não está habilitado no Supabase**
   - Verifique o console: se aparece `CHANNEL_ERROR`, siga os passos em "Configuração do Supabase Realtime"

2. **Som não foi ativado**
   - **Solução principal**: Clique no botão 🟠 **"Testar Som"** na página de Incidentes
   - Você deve ouvir o som de teste e o botão muda para 🟢 **"Som Ativo"**
   - Isso precisa ser feito **apenas uma vez** - a permissão fica salva

3. **Som bloqueado pelo navegador**
   - Alguns navegadores bloqueiam autoplay de áudio por padrão
   - **Solução**: Use o botão "Testar Som" (isso conta como interação do usuário)
   - Chrome: Verifique em `chrome://settings/content/sound`
   - Console deve mostrar: `[AudioService] ✅ AudioContext created`

4. **Filtro de condomínio incorreto**
   - A subscrição usa filtragem **client-side** (não server-side)
   - Verifica se `resident.condominium_id` corresponde ao condomínio do guarda
   - Console deve mostrar: `[Incidents] ✅ Incident belongs to this condominium`
   - Se aparecer: `[Incidents] ⏭️ Incident from different condominium - ignoring`, o incidente é de outro condomínio

5. **Supabase Client não inicializado**
   - Console deve mostrar: `[SupabaseClient] Supabase client initialized with realtime enabled`
   - Se não aparecer, verifique variáveis de ambiente

### Problema: Som não toca

**Soluções (em ordem de prioridade):**

1. **Clique no botão "Testar Som"** 🔊
   - Este é o passo OBRIGATÓRIO antes de receber alertas
   - Botão está no topo da página de Incidentes
   - Você só precisa fazer isso UMA VEZ
   - Verifique se o botão mudou para "Som Ativo" (verde)

2. **Verifique o volume do dispositivo**
   - Volume deve estar acima de 50%
   - Não esteja em modo silencioso

3. **Verifique logs do console (F12)**
   - Deve aparecer: `[AudioService] ✅ AudioContext created`
   - Deve aparecer: `[AudioService] 🔊 Alert sound played successfully (4 cycles)`
   - Se aparecer: `[AudioService] ⚠️ AudioContext not initialized`, clique em "Testar Som"
   - Se aparecer: `[AudioService] ⚠️ AudioContext suspended`, interaja com a página

4. **Teste em navegador diferente**
   - Chrome/Edge são os mais recomendados
   - Safari pode ter restrições adicionais

5. **Limpe o cache e tente novamente**
   - Se já tinha clicado "Testar Som" antes mas não funciona:
   - Limpe cache do navegador (Ctrl+Shift+Del)
   - Recarregue a página
   - Clique novamente em "Testar Som"

### Problema: Vibração não funciona

**Soluções:**
1. Vibração só funciona em dispositivos móveis (tablets/smartphones)
2. Alguns navegadores desktop não suportam `navigator.vibrate`
3. Verifique se o console mostra: `[Incidents] 📳 Device vibrated`

---

## 📊 Logs de Debug

O sistema gera logs detalhados para facilitar o debug:

### Logs do SupabaseClient
| Log | Significado |
|-----|-------------|
| `[SupabaseClient] Supabase client initialized with realtime enabled` | Cliente Supabase inicializado com Realtime ativo |

### Logs de Realtime Subscription
| Log | Significado |
|-----|-------------|
| `[Incidents] 📡 Setting up realtime subscription for condo: X` | Subscrição sendo configurada para condomínio X |
| `[Incidents] Subscription status: SUBSCRIBED` | Subscrição ativa e funcionando |
| `[Incidents] ✅ Successfully subscribed to incident changes` | Subscrição confirmada |
| `[Incidents] 🆕 New incident received via realtime` | Novo incidente chegou via realtime |
| `[Incidents] ✅ Incident belongs to this condominium - triggering alert` | Incidente é deste condomínio, alertas ativados |
| `[Incidents] ⏭️ Incident from different condominium - ignoring` | Incidente de outro condomínio, ignorado |
| `[Incidents] ❌ Subscription error` | Erro na subscrição (Realtime pode estar desabilitado) |

### Logs do AudioService
| Log | Significado |
|-----|-------------|
| `[AudioService] ✅ AudioContext created` | Sistema de áudio inicializado com sucesso |
| `[AudioService] ✅ AudioContext resumed` | AudioContext reativado após suspensão |
| `[AudioService] 🔊 Alert sound played successfully (4 cycles)` | Som de alerta tocado (4 ciclos completos) |
| `[AudioService] ⚠️ AudioContext not initialized - call initialize() first` | Áudio não inicializado - clique em "Testar Som" |
| `[AudioService] ⚠️ AudioContext suspended - user interaction required` | Interação do usuário necessária |
| `[AudioService] ❌ Initialization failed` | Falha ao inicializar sistema de áudio |
| `[AudioService] 🔄 Audio service reset` | Serviço de áudio resetado |

### Logs de Vibração
| Log | Significado |
|-----|-------------|
| `[Incidents] 📳 Device vibrated` | Dispositivo vibrou com sucesso |

### Logs Gerais
| Log | Significado |
|-----|-------------|
| `[Incidents] 🚨 NEW INCIDENT DETECTED!` | Sistema detectou novo incidente |
| `[DataService] Syncing incidents from backend...` | Sincronizando incidentes do servidor |

---

## 🧪 Como Testar em Desenvolvimento

### Teste Manual (Recomendado)

1. Abra o **app Guard** em um navegador
2. Faça login e vá para página de **Incidentes**
3. **IMPORTANTE**: Clique no botão 🟠 **"Testar Som"** no topo da página
   - Você deve ouvir 4 ciclos de BIP-bip-BIP
   - Botão muda para 🟢 **"Som Ativo"**
4. Abra o **app Resident** em OUTRO navegador/aba/dispositivo
5. Faça login como residente
6. Crie um novo incidente
7. No **app Guard**, verifique se (deve acontecer AUTOMATICAMENTE):
   - 🔊 Som tocou (4 ciclos, ~6 segundos)
   - 🎨 Banner vermelho apareceu no topo
   - 📳 Dispositivo vibrou (se for mobile)
   - 📝 Incidente aparece na lista
   - 📊 Console mostra: `[AudioService] 🔊 Alert sound played successfully (4 cycles)`

### Teste de Som via Console do Navegador

Você pode testar o sistema de som diretamente no console do navegador:

```javascript
// Execute este código no console do navegador (F12) na página de Incidentes
// Testa se o audioService está funcionando
import { audioService } from './services/audioService';

// Verificar estado atual
console.log('Audio enabled:', audioService.isEnabled());
console.log('AudioContext state:', audioService.getState());

// Testar som manualmente
await audioService.testSound();

// Apenas tocar o alerta (se já estiver inicializado)
audioService.playAlertSound();
```

**Nota**: Este teste só funciona se você importar o módulo corretamente. É mais fácil usar o botão "Testar Som" na interface.

---

## 🔄 Fluxo de Detecção

### Fluxo Completo (com Realtime)

```
[Resident App] Cria incidente
        ↓
[Supabase] INSERT na tabela incidents
        ↓
[Realtime] Notifica subscrições ativas
        ↓
[Guard App] Recebe evento INSERT via WebSocket
        ↓
[Guard App] Verifica se incident.resident_id pertence ao condomínio do guarda
        ↓ (Se SIM)
1. audioService.playAlertSound() → 4 ciclos de BIP-bip-BIP (~6 segundos)
2. vibrateDevice() → Padrão de vibração dupla
3. showNewIncidentBanner() → Banner vermelho animado
4. loadIncidents() → Atualiza lista de incidentes
```

### Fluxo de Ativação do Som (Primeira Vez)

```
[Guarda] Clica no botão "Testar Som"
        ↓
[AudioService] initialize() → Cria AudioContext
        ↓
[AudioService] Resume AudioContext (se suspenso)
        ↓
[AudioService] Salva permissão no localStorage → 'audio_permission_enabled' = 'true'
        ↓
[AudioService] playAlertSound() → Toca som de teste
        ↓
[UI] Botão muda de "Testar Som" (laranja) para "Som Ativo" (verde)
        ↓
[SUCESSO] Agora todos os alertas futuros tocam automaticamente!
```

---

## 🎯 Melhorias Futuras Planejadas

- [x] ✅ **Persistência de áudio** - Implementado com localStorage
- [x] ✅ **Alerta sonoro contínuo** - 4 ciclos de BIP-bip-BIP (~6 segundos)
- [x] ✅ **Botão de teste de som** - UI intuitiva com feedback visual
- [ ] Som de alerta customizável (escolher entre diferentes sons)
- [ ] Notificações push nativas (PWA)
- [ ] Histórico de alertas não lidos
- [ ] Repetir alerta se não for reconhecido em X minutos
- [ ] Integração com sistemas de campainha/alto-falante
- [ ] Alerta diferenciado por gravidade do incidente
- [ ] Suporte a múltiplos idiomas nos alertas sonoros (TTS)

---

## 📞 Suporte

Em caso de problemas persistentes:
1. Verifique os logs do console (F12)
2. Tire screenshot dos erros
3. Contacte o desenvolvedor com os detalhes

**Desenvolvedor**: Chong Technologies
**Versão**: 1.1.0
**Última Atualização**: Dezembro 2024

---

## 📝 Changelog

### v1.1.0 (Dezembro 2024)
- ✅ Implementado `audioService` com gerenciamento centralizado de áudio
- ✅ Persistência de permissão de áudio via localStorage
- ✅ Botão "Testar Som" com feedback visual (laranja → verde)
- ✅ Som contínuo: 4 ciclos de BIP-bip-BIP (~6 segundos)
- ✅ Volume aumentado para 60%
- ✅ Filtragem client-side por condomínio (correção de bug)
- ✅ Auto-inicialização do AudioContext ao carregar a página
- ✅ Logs detalhados para debugging

### v1.0.0 (Dezembro 2024)
- ✅ Sistema inicial de alertas (som, vibração, banner)
- ✅ Integração com Supabase Realtime
- ✅ Subscrição à tabela `incidents`
