# Supabase Edge Functions

Este directorio contem as Edge Functions para o Elite Resident Access.

## send-sms

Envia SMS via Twilio para visitantes com codigos QR de acesso.

### Configuracao

1. **Instalar Supabase CLI** (se ainda nao tiver):
   ```bash
   npm install -g supabase
   ```

2. **Login no Supabase**:
   ```bash
   supabase login
   ```

3. **Linkar o projecto**:
   ```bash
   supabase link --project-ref SEU_PROJECT_REF
   ```
   (Encontre o project-ref no URL do seu dashboard Supabase)

4. **Configurar secrets do Twilio**:
   ```bash
   supabase secrets set TWILIO_ACCOUNT_SID=seu_account_sid
   supabase secrets set TWILIO_AUTH_TOKEN=seu_auth_token
   supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
   ```

5. **Deploy da funcao**:
   ```bash
   supabase functions deploy send-sms
   ```

### Credenciais Twilio

Encontre as suas credenciais no [Twilio Console](https://console.twilio.com/):

- **TWILIO_ACCOUNT_SID**: Na pagina principal do console
- **TWILIO_AUTH_TOKEN**: Na pagina principal do console (clique para revelar)
- **TWILIO_PHONE_NUMBER**: Numero de telefone Twilio (com codigo do pais, ex: +1234567890)

### Testar a funcao

Apos o deploy, pode testar com:

```bash
curl -X POST 'https://SEU_PROJECT_REF.supabase.co/functions/v1/send-sms' \
  -H 'Authorization: Bearer SEU_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"to": "923456789", "message": "Teste de SMS"}'
```

### Notas

- O numero de telefone do destinatario pode ser com ou sem codigo do pais
- Se nao tiver codigo do pais, sera adicionado automaticamente +244 (Angola)
- A funcao retorna `{ success: true, messageId: "..." }` em caso de sucesso
