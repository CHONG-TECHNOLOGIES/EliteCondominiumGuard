# RPC Security Hardening TODO

Data: 2026-05-02

Escopo: revisao local/read-only do `src/database/schema_complete.sql` e do uso das RPCs em `src/services/Supabase.ts`.

Fora de escopo: token Notion em `src/config.toml`, por decisao temporaria para esta tarefa.

## Resumo executivo

O schema atual tem muitas RPCs `SECURITY DEFINER`, principalmente `admin_*`, sem validacao visivel de role dentro das funcoes e sem `REVOKE EXECUTE` global visivel para `public`/`anon`. Em PostgreSQL/Supabase, funcoes podem ficar executaveis por `PUBLIC` por padrao se nao houver revogacao explicita. Isso cria risco de chamadas administrativas via anon key do frontend, contornando RLS.

Prioridade de correcao:

1. Revogar `EXECUTE` publico das RPCs administrativas e sensiveis.
2. Criar helper server-side de autorizacao, por exemplo `public.require_admin(p_staff_id, p_required_roles text[])`.
3. Adicionar parametro de ator autenticado/controlado nas RPCs admin ou migrar para JWT real do Supabase Auth.
4. Remover campos sensiveis dos retornos (`pin_hash`, `qr_token`, `device_token`, `push_token`, dados de visitantes quando nao estritamente necessarios).
5. Separar RPCs publicas de configuracao/setup das RPCs administrativas.
6. Definir `ALTER DEFAULT PRIVILEGES` para evitar que novas funcoes voltem a ficar executaveis por `PUBLIC`.

## Achado 1: RPCs `admin_*` sem autorizacao server-side

Severidade: Critica

Evidencia:

- `admin_create_condominium` cria condominios sem checagem de role: `schema_complete.sql:1906`.
- `admin_create_device` cria dispositivos sem checagem de role: `schema_complete.sql:1956`.
- `admin_create_resident` cria residentes sem checagem de role: `schema_complete.sql:2043`.
- `admin_create_staff_with_pin` cria staff e PIN sem checagem de role: `schema_complete.sql:2148`.
- `admin_delete_staff` apaga staff sem checagem de role: `schema_complete.sql:2467`.
- `admin_update_staff_pin` altera PIN de staff sem checagem de role: `schema_complete.sql:3790`.

Funcoes afetadas confirmadas no schema:

Leitura/listagem:

- `admin_get_all_devices`
- `admin_get_all_incidents`
- `admin_get_all_news`
- `admin_get_all_staff`
- `admin_get_all_units`
- `admin_get_all_visits`
- `admin_get_all_visits_filtered`
- `admin_get_app_pricing_rules`
- `admin_get_audit_logs`
- `admin_get_condominium_subscriptions`
- `admin_get_condominiums_with_stats`
- `admin_get_dashboard_stats`
- `admin_get_residents`
- `admin_get_restaurants`
- `admin_get_service_types`
- `admin_get_sports`
- `admin_get_subscription_payments`
- `admin_get_visit_types`
- `admin_get_all_condominium_events`

Criacao:

- `admin_create_app_pricing_rule`
- `admin_create_condominium`
- `admin_create_condominium_event`
- `admin_create_device`
- `admin_create_news`
- `admin_create_news_category`
- `admin_create_resident`
- `admin_create_restaurant`
- `admin_create_service_type`
- `admin_create_sport`
- `admin_create_staff_with_pin`
- `admin_create_subscription_payment`
- `admin_create_unit`
- `admin_create_visit_type`

Atualizacao:

- `admin_update_app_pricing_rule`
- `admin_update_condominium`
- `admin_update_condominium_event`
- `admin_update_device`
- `admin_update_incident`
- `admin_update_news`
- `admin_update_news_category`
- `admin_update_resident`
- `admin_update_restaurant`
- `admin_update_service_type`
- `admin_update_sport`
- `admin_update_staff`
- `admin_update_staff_pin`
- `admin_update_subscription_details`
- `admin_update_subscription_status`
- `admin_update_unit`
- `admin_update_visit`
- `admin_update_visit_type`

Remocao:

- `admin_delete_app_pricing_rule`
- `admin_delete_condominium`
- `admin_delete_condominium_event`
- `admin_delete_device`
- `admin_delete_incident`
- `admin_delete_news`
- `admin_delete_news_category`
- `admin_delete_resident`
- `admin_delete_restaurant`
- `admin_delete_service_type`
- `admin_delete_sport`
- `admin_delete_staff`
- `admin_delete_unit`
- `admin_delete_visit_type`

Financeiro/subscricoes:

- `admin_send_subscription_alert`
- `admin_create_subscription_payment`
- `admin_update_subscription_details`
- `admin_update_subscription_status`
- `admin_get_subscription_payments`
- `admin_get_condominium_subscriptions`
- `admin_get_app_pricing_rules`
- `admin_create_app_pricing_rule`
- `admin_update_app_pricing_rule`
- `admin_delete_app_pricing_rule`

Impacto:

Se qualquer uma destas funcoes estiver executavel por `anon`/`PUBLIC`, a anon key do frontend pode listar, criar, alterar ou apagar dados administrativos diretamente. Como as funcoes sao `SECURITY DEFINER`, a RLS das tabelas nao protege contra esse caminho.

Fix recomendado:

- Criar migration que revogue execucao publica de todas as funcoes `admin_*`.
- Conceder `EXECUTE` apenas a uma role confiavel ou exigir verificacao interna forte.
- Adicionar no inicio de cada RPC admin uma chamada a `perform public.require_admin(...)`.

Exemplo base:

```sql
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;

-- Depois conceder explicitamente apenas RPCs publicas/necessarias.
grant execute on function public.verify_staff_login(text, text, text) to anon, authenticated;
grant execute on function public.get_visit_types(integer) to anon, authenticated;
```

## Achado 2: `admin_get_all_staff` retorna `pin_hash`

Severidade: Critica

Evidencia:

- Declaracao retorna `pin_hash`: `schema_complete.sql:2644`.
- SELECT inclui `s.pin_hash`: `schema_complete.sql:2657`.
- Cliente chama a RPC em `Supabase.ts:1701`.

Impacto:

Hash de PIN no cliente amplia o dano de qualquer XSS, extensao maliciosa, tablet comprometido ou chamada direta da anon key. Mesmo sendo hash bcrypt, PINs de 4 a 6 digitos tem entropia baixa e sao candidatos a ataque offline.

Fix recomendado:

- Remover `pin_hash` de `admin_get_all_staff`.
- Criar RPC separada e muito restrita para cache offline de staff, limitada ao condominium do dispositivo e chamada apenas apos login valido.
- Considerar substituir cache de `pin_hash` por mecanismo offline com chave local protegida, validade curta, e revogacao por device.

## Achado 3: RPCs retornando `SETOF` de tabelas base expoem colunas sensiveis

Severidade: Alta

Evidencia:

- `admin_get_residents` retorna `SETOF residents` e faz `SELECT *`: `schema_complete.sql:3217` a `schema_complete.sql:3225`.
- `admin_create_resident` retorna `SETOF residents`: `schema_complete.sql:2043`.
- `admin_update_resident` retorna `residents`: `schema_complete.sql:3628`.
- `get_resident` retorna `SETOF residents`: `schema_complete.sql:4995`.
- `get_residents_by_unit_id` retorna `SETOF residents` e tem `GRANT EXECUTE` explicito para `authenticated`: `schema_complete.sql:7323` e `schema_complete.sql:7334`.
- `get_staff_by_condominium` retorna `SETOF staff`: `schema_complete.sql:5201`.
- `verify_resident_login` retorna `pin_hash` apos login bem-sucedido: `schema_complete.sql:6538` e `schema_complete.sql:6595`.
- `get_units` retorna JSON de residentes com `device_token`: `schema_complete.sql:5321` e `schema_complete.sql:5343`.
- `get_todays_visits` retorna `qr_token`: `schema_complete.sql:5239`.
- `admin_get_all_visits` retorna `visitor_doc`, `visitor_phone`, `photo_url`, `qr_token`: `schema_complete.sql:2713`.
- `admin_get_all_visits_filtered` retorna `visitor_doc`, `visitor_phone`, `photo_url`, `qr_token`: `schema_complete.sql:2767`.

Impacto:

`SETOF residents`, `SETOF staff`, `SETOF visits` herdam todas as colunas atuais e futuras da tabela. Se a tabela contem ou vier a conter `pin_hash`, `device_token`, `push_token`, documentos, telefones, fotos ou metadados internos, a RPC passa a expor automaticamente esses campos.

Fix recomendado:

- Nunca usar `RETURNS SETOF <tabela>` em RPC consumida pelo frontend quando a tabela contem PII/segredos.
- Trocar por `RETURNS TABLE(...)` com allowlist de colunas.
- Remover `qr_token` de listagens admin salvo em telas que realmente precisam do token bruto.
- Criar views/RPCs especificas por caso de uso.

## Achado 4: Filtros por `p_condominium_id` sao controlados pelo cliente

Severidade: Alta

Evidencia:

- `admin_get_all_staff(p_condominium_id)` filtra apenas pelo parametro: `schema_complete.sql:2660`.
- `admin_get_residents(p_condominium_id)` filtra apenas pelo parametro: `schema_complete.sql:3226`.
- `admin_get_all_visits(p_condominium_id)` filtra apenas pelo parametro: `schema_complete.sql:2756`.
- `admin_get_all_visits_filtered(p_condominium_id)` filtra apenas pelo parametro: `schema_complete.sql:2813`.
- O frontend passa esses parametros via `Supabase.ts`, por exemplo `admin_get_all_staff` em `Supabase.ts:1701` e `admin_get_residents` em `Supabase.ts:2138`.

Impacto:

Sem validacao server-side que vincule o ator ao condominio permitido, qualquer caller que execute a RPC pode trocar `p_condominium_id` para outro condominio ou enviar `NULL` para obter listagem global em funcoes que aceitam `NULL`.

Fix recomendado:

- A RPC deve derivar o condominio autorizado no servidor, nao confiar no parametro do cliente.
- Para `ADMIN`, forcar `where condominium_id = actor.condominium_id`.
- Para `SUPER_ADMIN`, permitir `NULL` ou listagem global.

## Achado 5: Mutacoes admin aceitam JSON amplo e atualizam colunas dinamicamente

Severidade: Alta

Evidencia:

- `admin_update_condominium` usa `jsonb_populate_record` e monta `UPDATE` dinamico por colunas da tabela: `schema_complete.sql:3451` a `schema_complete.sql:3474`.
- `admin_update_resident` usa o mesmo padrao para `residents`: `schema_complete.sql:3628` a `schema_complete.sql:3650`.
- `admin_update_unit` usa o mesmo padrao para `units`: `schema_complete.sql:3881` a `schema_complete.sql:3903`.
- `admin_update_visit` usa o mesmo padrao para `visits`: `schema_complete.sql:3915` a `schema_complete.sql:3937`.

Impacto:

O caller consegue enviar qualquer coluna existente no JSON, inclusive campos que a UI nao deveria controlar. Quando novas colunas sensiveis forem adicionadas, elas ficam automaticamente editaveis por essa RPC.

Fix recomendado:

- Substituir update dinamico por lista explicita de campos permitidos.
- Separar RPCs por finalidade: status, metadados, dados cadastrais, PIN, etc.
- Validar role e escopo antes do update.

## Achado 6: Falta de `search_path` em varias `SECURITY DEFINER`

Severidade: Media

Evidencia:

Algumas funcoes definem `SET search_path TO 'public'`, mas muitas nao. Exemplos sem `SET search_path` visivel no cabecalho:

- `admin_get_all_staff`: `schema_complete.sql:2644`.
- `admin_get_residents`: `schema_complete.sql:3217`.
- `admin_update_staff_pin`: `schema_complete.sql:3790`.
- `admin_create_staff_with_pin`: `schema_complete.sql:2148`.
- `admin_get_all_visits`: `schema_complete.sql:2713`.

Impacto:

`SECURITY DEFINER` sem `SET search_path` fixo e uso consistente de nomes qualificados aumenta risco de resolucao inesperada de objetos se o search path do caller interferir.

Fix recomendado:

- Adicionar `SET search_path = public, pg_temp` em todas as funcoes `SECURITY DEFINER`.
- Qualificar tabelas e funcoes internas com `public.`.

## Achado 7: RPCs nao-admin tambem precisam revisao de escopo

Severidade: Alta/Media, depende da exposicao

Funcoes a revisar explicitamente:

- `get_staff_by_condominium`: retorna `SETOF staff`, risco de expor `pin_hash`.
- `get_resident`: retorna `SETOF residents`, risco de expor `pin_hash`, `device_token` ou `push_token`.
- `get_residents_by_unit_id`: explicitamente concedida a `authenticated`, retorna `SETOF residents`, risco de enumeracao por `unit_id`.
- `verify_resident_login`: retorna `pin_hash` ao cliente; deve ser revisado antes de expandir cache offline do app residente.
- `get_units`: agrega residentes e inclui `device_token`; deve retornar apenas campos necessarios para a tela.
- `get_todays_visits`: retorna dados pessoais e `qr_token`.
- `get_visit_events`: retorna eventos por `visit_id` controlado pelo cliente.
- `get_resident_qr_codes`, `get_notifications`, `get_pending_visits`: retornam tabelas/dados por ids controlados pelo cliente e precisam de checagem de ownership.
- `update_visit_status`, `approve_visit`, `deny_visit`, `checkout_visit`: alteram estado de visitas sem ator/role evidente no nome da assinatura.
- `create_audit_log` e `log_audit`: aceitam ator/detalhes do cliente e podem permitir auditoria falsificada se executaveis publicamente.
- `create_notification`: cria notificacoes por parametros de residente/condominio/unidade.
- `get_active_qr_codes`, `get_qr_code_history`, `revoke_qr_code`, `validate_qr_code`: lidam com QR tokens; precisam garantir que o caller pertence ao residente/unidade/condominio correto.

Fix recomendado:

- Classificar cada RPC como `public`, `guard`, `resident`, `admin`, `super_admin`, `service_role`.
- Para cada classe, aplicar `REVOKE/GRANT` e validacao interna.
- Remover retornos de tabelas base.

## Proposta de migration futura

Arquivo sugerido: `src/database/2026-05-02_rpc_security_hardening.sql`

Itens:

1. `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;`
2. `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;`
3. Recriar grants allowlist para RPCs publicas realmente necessarias.
4. Criar helper de autorizacao.
5. Atualizar RPCs admin para receber `p_actor_staff_id` ou usar claims/JWT.
6. Trocar retornos `SETOF residents`, `SETOF staff`, `SETOF visits` por `RETURNS TABLE` com allowlist.
7. Remover `pin_hash` de retornos admin.
8. Adicionar `SET search_path = public, pg_temp` em todas as `SECURITY DEFINER`.

Exemplo de helper:

```sql
create or replace function public.require_staff_role(
  p_staff_id integer,
  p_allowed_roles text[],
  p_condominium_id integer default null
) returns public.staff
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_staff public.staff;
begin
  select *
  into v_staff
  from public.staff
  where id = p_staff_id;

  if v_staff.id is null then
    raise exception 'unauthorized';
  end if;

  if not (v_staff.role = any(p_allowed_roles)) then
    raise exception 'forbidden';
  end if;

  if p_condominium_id is not null
     and v_staff.role <> 'SUPER_ADMIN'
     and v_staff.condominium_id <> p_condominium_id then
    raise exception 'forbidden condominium scope';
  end if;

  return v_staff;
end;
$$;
```

Nota: este helper ainda depende de `p_staff_id` vindo do cliente. O ideal de longo prazo e usar Supabase Auth/JWT para identificar o caller no servidor sem confiar em identificadores enviados pelo browser.

## Checklist de validacao

- [ ] Confirmar no Supabase real quais funcoes estao executaveis por `anon`, `authenticated` e `public`.
- [ ] Aplicar migration de `REVOKE` em ambiente de staging primeiro.
- [ ] Testar login/setup/guard/admin apos revogar execucao publica.
- [ ] Garantir que a app nao depende de `pin_hash` em listagens admin.
- [ ] Testar modo offline depois de alterar a estrategia de cache de PIN.
- [ ] Reexecutar auditoria de RPCs e `npm run build`.
