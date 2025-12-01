# Guia de Alertas de Incidentes - Elite CondoGuard

## 🚨 Sistema de Notificação de Novos Incidentes

O app Guard agora possui um sistema completo de alertas para novos incidentes reportados pelos residentes.

---

## ✅ Funcionalidades Implementadas

### 1. **Alerta Sonoro** 🔊
- Som de alarme triplo (bip alto-baixo-alto)
- Volume elevado para garantir que o guarda ouça
- Padrão de som urgente e distinto

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
- Logs detalhados no console para debug

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

### Passo 2: Criar um Incidente de Teste

1. Abra o **app Resident** em outro dispositivo/navegador
2. Faça login como residente
3. Reporte um novo incidente
4. No **app Guard**, você deve ver/ouvir:
   - 🔊 Som de alerta triplo
   - 📳 Vibração (se em dispositivo móvel)
   - 🎨 Banner vermelho no topo da tela
   - 📝 Console: `[Incidents] 🆕 New incident received via realtime`

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

2. **Som bloqueado pelo navegador**
   - Alguns navegadores bloqueiam autoplay de áudio
   - Solução: Interaja com a página primeiro (clique em qualquer lugar)
   - Chrome: Verifique em `chrome://settings/content/sound`

3. **Filtro de condomínio incorreto**
   - A subscrição filtra por `condominium_id`
   - Verifique se o incidente foi criado para o condomínio correto
   - Console deve mostrar: `filter: condominium_id=eq.1`

4. **Supabase Client não inicializado**
   - Console deve mostrar: `[SupabaseClient] Supabase client initialized`
   - Se não aparecer, verifique variáveis de ambiente

### Problema: Som não toca

**Soluções:**
1. Verifique o volume do dispositivo
2. Teste em navegador diferente (Chrome recomendado)
3. Interaja com a página antes (clique em qualquer botão)
4. Verifique se o console mostra: `[Incidents] 🔊 Alert sound played`

### Problema: Vibração não funciona

**Soluções:**
1. Vibração só funciona em dispositivos móveis (tablets/smartphones)
2. Alguns navegadores desktop não suportam `navigator.vibrate`
3. Verifique se o console mostra: `[Incidents] 📳 Device vibrated`

---

## 📊 Logs de Debug

O sistema gera logs detalhados para facilitar o debug:

| Log | Significado |
|-----|-------------|
| `📡 Setting up realtime subscription` | Subscrição sendo configurada |
| `✅ Successfully subscribed` | Subscrição ativa e funcionando |
| `🆕 New incident received via realtime` | Novo incidente chegou via realtime |
| `🚨 NEW INCIDENT DETECTED!` | Sistema detectou novo incidente |
| `🔊 Alert sound played` | Som de alerta foi tocado |
| `📳 Device vibrated` | Dispositivo vibrou |
| `❌ Subscription error` | Erro na subscrição (Realtime pode estar desabilitado) |

---

## 🧪 Como Testar em Desenvolvimento

### Teste Manual (Recomendado)

1. Abra o app Guard em um navegador
2. Abra o app Resident em OUTRO navegador/aba/dispositivo
3. Faça login em ambos
4. No app Resident, crie um novo incidente
5. No app Guard, verifique se:
   - Som tocou
   - Banner vermelho apareceu
   - Incidente aparece na lista

### Teste via Console do Navegador

Você pode simular um novo incidente diretamente no console do navegador (app Guard):

```javascript
// Execute este código no console do navegador (F12)
// Simula a chegada de um novo incidente via realtime
const event = new CustomEvent('test-new-incident');
window.dispatchEvent(event);
```

---

## 🔄 Fluxo de Detecção

```
[Resident App] Cria incidente
        ↓
[Supabase] INSERT na tabela incidents
        ↓
[Realtime] Notifica subscrições ativas
        ↓
[Guard App] Recebe evento INSERT
        ↓
1. Toca som de alerta (playAlertSound)
2. Vibra dispositivo (vibrateDevice)
3. Mostra banner vermelho (showNewIncidentBanner)
4. Recarrega lista de incidentes (loadIncidents)
```

---

## 🎯 Melhorias Futuras Planejadas

- [ ] Som de alerta customizável (escolher entre diferentes sons)
- [ ] Notificações push nativas (PWA)
- [ ] Histórico de alertas não lidos
- [ ] Repetir alerta se não for reconhecido em X minutos
- [ ] Integração com sistemas de campainha/alto-falante
- [ ] Alerta diferenciado por gravidade do incidente

---

## 📞 Suporte

Em caso de problemas persistentes:
1. Verifique os logs do console (F12)
2. Tire screenshot dos erros
3. Contacte o desenvolvedor com os detalhes

**Desenvolvedor**: Chong Technologies
**Versão**: 1.0.0
**Última Atualização**: Dezembro 2024
