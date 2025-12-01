# Integração: App Residente ↔ Sistema Elite CondoGuard

## 📋 Visão Geral

Este documento descreve como o **App de Residentes** (desenvolvido em outra plataforma) deve integrar-se com o **Sistema Elite CondoGuard** (app de portaria) para habilitar notificações push e aprovação de visitas.

---

## 🎯 Objetivo

Quando um residente instala e faz login no app pela primeira vez, o sistema de portaria precisa saber disso para:
1. **Habilitar o modo "Aplicativo"** quando guardas registram visitas para aquela unidade
2. **Enviar notificações push** para aprovação de visitantes
3. **Rastrear adoção do app** (estatísticas para administração)

---

## 🔧 Passos de Integração

### 1. **Primeiro Login do Residente**-------------feito

### 2. **Atualizar Atividade (Heartbeat)**

Sempre que o residente abre o app, atualize a última atividade:

```typescript
// Resident App - App Launch / Foreground
async function updateActivity(residentId: number) {
  await supabase.rpc('update_resident_app_activity', {
    p_resident_id: residentId
  });
}
```

**Recomendação**: Executar a cada vez que o app vai para foreground ou a cada 24h.

---

### 3. **Receber Notificação de Visitante**

Quando o guarda registra uma visita e seleciona "Aplicativo":

```typescript
// Resident App - Push Notification Handler
interface VisitApprovalNotification {
  type: 'VISIT_APPROVAL_REQUEST';
  visit_id: number;
  visitor_name: string;
  visitor_phone?: string;
  visitor_photo_url?: string;
  visit_type: string; // 'VISITANTE', 'ENTREGA', etc.
  reason?: string;
  guard_name: string;
  timestamp: string;
}

// Handle notification
onNotificationReceived((notification: VisitApprovalNotification) => {
  // Show modal with visitor details
  showVisitorApprovalDialog({
    visitorName: notification.visitor_name,
    photo: notification.visitor_photo_url,
    reason: notification.reason,
    onApprove: () => approveVisit(notification.visit_id),
    onDeny: () => denyVisit(notification.visit_id)
  });
});
```

---

### 4. **Aprovar/Negar Visitante**

```typescript
// Resident App - Approval Actions
async function approveVisit(visitId: number) {
  const { error } = await supabase
    .from('visits')
    .update({
      status: 'AUTORIZADO',
      approved_at: new Date().toISOString()
    })
    .eq('id', visitId);

  if (!error) {
    showToast('Visitante autorizado!');
  }
}

async function denyVisit(visitId: number) {
  const { error } = await supabase
    .from('visits')
    .update({
      status: 'NEGADO',
      denied_at: new Date().toISOString()
    })
    .eq('id', visitId);

  if (!error) {
    showToast('Visita negada');
  }
}
```

---



## 🔄 Fluxo Completo: Visita com Notificação

```
1. Visitante chega à portaria
   ↓
2. Guarda registra visita no app CondoGuard
   ↓
3. Guarda seleciona unidade
   ↓
4. Sistema verifica: residents.has_app_installed
   ├─ TRUE → Mostra opção "Aplicativo"
   └─ FALSE → Oculta "Aplicativo", mostra Telefone/Interfone
   ↓
5. [SE APP INSTALADO] Guarda seleciona "Aplicativo"
   ↓
6. Sistema envia notificação push via FCM/APNS
   usando residents.device_token
   ↓
7. Residente recebe notificação
   ↓
8. Residente aprova/nega
   ↓
9. Status da visita é atualizado em tempo real
   ↓
10. Guarda vê aprovação e libera entrada
```

---

## 🔐 Permissões Supabase RLS

```sql
-- Permitir que residentes atualizem suas próprias visitas
CREATE POLICY "Residents can approve their own visits"
ON visits FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM residents r
    WHERE r.id = auth.uid()::int4
    AND r.unit_id = visits.unit_id
  )
);

-- Permitir que residentes vejam visitas da sua unidade
CREATE POLICY "Residents can view their unit visits"
ON visits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM residents r
    WHERE r.id = auth.uid()::int4
    AND r.unit_id = visits.unit_id
  )
);
```

---

## 📱 Push Notifications (Firebase Cloud Messaging)

### Server-side (quando guarda seleciona "Aplicativo"):

```typescript
// Guard App - Backend Service
async function sendVisitApprovalNotification(visit: Visit) {
  // Get resident device tokens
  const { data: residents } = await supabase
    .from('residents')
    .select('device_token, name')
    .eq('unit_id', visit.unit_id)
    .eq('has_app_installed', true);

  if (!residents || residents.length === 0) {
    throw new Error('No residents with app installed');
  }

  // Send FCM notification to all residents in unit
  const tokens = residents.map(r => r.device_token).filter(Boolean);

  await sendFCMNotification({
    tokens,
    notification: {
      title: `🔔 Visitante: ${visit.visitor_name}`,
      body: `${visit.reason || 'Sem motivo especificado'}. Aprovar entrada?`
    },
    data: {
      type: 'VISIT_APPROVAL_REQUEST',
      visit_id: String(visit.id),
      visitor_name: visit.visitor_name,
      visitor_photo_url: visit.photo_url || '',
      visit_type: visit.visit_type,
      reason: visit.reason || ''
    }
  });
}
```

---

## 📊 Estatísticas de Adoção (View SQL)

```sql
-- Ver estatísticas de adoção do app
SELECT * FROM v_app_adoption_stats;

-- Resultado:
-- condominium_name | total_units | total_residents | residents_with_app | adoption_percent
-- Hipicus Tower    | 120         | 340             | 287                | 84.4%
```

---

## 🧪 Teste de Integração

### 1. **Testar Registro de Login**
```bash
curl -X POST https://your-project.supabase.co/rest/v1/rpc/register_resident_app_login \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "p_resident_id": 1,
    "p_device_token": "fcm_test_token_123",
    "p_platform": "ios"
  }'
```

### 2. **Verificar se Unidade Tem App**
```bash
curl -X POST https://your-project.supabase.co/rest/v1/rpc/check_unit_has_app \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_unit_id": 1}'
```

---

## ✅ Checklist de Implementação

**App de Residentes:**
- [ ] Implementar chamada `register_resident_app_login` no primeiro login
- [ ] Implementar `update_resident_app_activity` ao abrir app
- [ ] Configurar recepção de push notifications (FCM/APNS)
- [ ] Implementar UI de aprovação/negação de visitas
- [ ] Testar fluxo completo de notificação

**Backend/Supabase:**
- [ ] Executar migration SQL (`add_resident_app_tracking.sql`)
- [ ] Configurar Firebase Cloud Messaging
- [ ] Implementar envio de notificações quando guarda usa modo "Aplicativo"
- [ ] Configurar RLS policies para residentes
- [ ] Testar RPCs com Postman/curl

**App de Portaria (Elite CondoGuard):**
- [x] Lógica contextual de modos de aprovação implementada
- [x] UI de feedback quando residente não tem app
- [x] Auto-seleção de modo baseado em has_app_installed

---

## 🔗 Recursos Adicionais

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime) (para aprovação em tempo real)

---

## 📞 Suporte

Para dúvidas sobre integração:
- **Equipe**: Chong Technologies
- **Projeto**: Elite CondoGuard
- **Contato**: [your-email@domain.com]
