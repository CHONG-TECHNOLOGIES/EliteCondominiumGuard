# Contexto de Testes: Admin Condominium Events

## Resumo

Foi desenvolvida uma nova funcionalidade de administração de eventos do condomínio no contexto admin, acessível em `Gestão > Eventos`.

O objetivo desta entrega é permitir que `SUPER_ADMIN` e `ADMIN` consigam:

1. listar eventos do condomínio;
2. criar eventos;
3. editar eventos;
4. desativar eventos sem apagar histórico;
5. filtrar eventos por condomínio, categoria e intervalo de datas.

Esta primeira versão é focada em CRUD administrativo. A gestão de RSVP ficou fora de escopo, mas a interface já mostra `rsvp_count` em modo apenas leitura.

---

## Estado Atual da Implementação

### Frontend implementado

A aplicação já foi atualizada com:

- nova página admin: `pages/admin/AdminEvents.tsx`
- nova rota: `/admin/events`
- novo item no menu lateral em `Gestão > Eventos`
- novos tipos TypeScript para `CondominiumEvent`
- integração na camada `SupabaseService`
- integração na camada `dataService`
- registo em audit logs para `CREATE`, `UPDATE` e `DELETE`

### Comportamento implementado

O ecrã admin suporta:

- pesquisa por título, descrição ou local;
- filtro por condomínio para `SUPER_ADMIN`;
- filtro por categoria;
- filtro por data inicial e final;
- opção para mostrar eventos inativos;
- formulário com:
  - condomínio
  - título
  - descrição
  - local
  - categoria
  - `start_at`
  - `end_at`
  - `is_all_day`
  - `requires_rsvp`
  - `max_attendees`

### Regras funcionais implementadas

- `SUPER_ADMIN` pode ver todos os condomínios e filtrar por condomínio.
- `ADMIN` fica limitado ao próprio `condominium_id`.
- `title` é obrigatório.
- `start_at` é obrigatório.
- `end_at` é opcional, mas não pode ser anterior a `start_at`.
- `max_attendees` é opcional, mas quando preenchido deve ser inteiro positivo.
- remoção no admin faz `soft delete` via `is_active = false`.

---

## Alterações Técnicas Relevantes

### Ficheiros alterados

- [types.ts](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/types.ts)
- [services/Supabase.ts](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/services/Supabase.ts)
- [services/dataService.ts](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/services/dataService.ts)
- [pages/admin/AdminEvents.tsx](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/pages/admin/AdminEvents.tsx)
- [App.tsx](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/App.tsx)
- [components/AdminLayout.tsx](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/components/AdminLayout.tsx)
- [database/schema_complete.sql](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/database/schema_complete.sql)

### Tipos adicionados

Foram adicionados:

- `CondominiumEventCategory`
- `CondominiumEvent`
- `CondominiumEventInput`

Categorias válidas:

- `meeting`
- `maintenance`
- `social`
- `sports`
- `closure`
- `general`

### RPCs previstas para o banco

O código passou a depender destas RPCs:

- `admin_get_all_condominium_events`
- `admin_create_condominium_event`
- `admin_update_condominium_event`
- `admin_delete_condominium_event`

Estas RPCs já foram adicionadas ao `schema_complete.sql`, mas no momento desta documentação elas **ainda não estavam disponíveis no banco live**.

---

## Dependência Pendente no Supabase

### Situação confirmada

Foi verificado no Supabase live que as RPCs acima ainda não existiam no schema cache do PostgREST.

Erro encontrado:

- `PGRST202`
- mensagem equivalente a `Could not find the function public.admin_*_condominium_event...`

### Impacto

Enquanto essas RPCs não forem aplicadas no banco:

- a página `/admin/events` abre e compila normalmente;
- mas as operações reais de listagem/criação/edição/desativação não vão funcionar em runtime.

### Ação necessária antes dos testes funcionais

Executar no Supabase SQL Editor o bloco novo adicionado em:

- [schema_complete.sql](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/database/schema_complete.sql)

Blocos relevantes:

- `admin_get_all_condominium_events`
- `admin_create_condominium_event`
- `admin_update_condominium_event`
- `admin_delete_condominium_event`

Depois disso, revalidar se as RPCs passam a responder.

---

## Estado do MCP Supabase

Foi identificado que o `Supabase MCP` no Codex estava configurado apenas como placeholder no ficheiro global:

- `C:\Users\Achong\.codex\config.toml`

Estado anterior:

- `project_ref=YOUR_PROJECT_REF`

Estado atualizado:

- `project_ref=nfuglaftnaohzacilike`

Importante:

- esta alteração foi feita no config global;
- para o MCP aparecer numa sessão nova, é necessário reiniciar a sessão do Codex;
- pode ainda ser necessário executar `codex mcp login supabase`.

Esta ativação do MCP não cria as RPCs automaticamente. Serve apenas para permitir operações futuras pelo conector.

---

## Checklist de Testes Manuais

### Preparação

- [ ] Aplicar no Supabase live as RPCs novas do `schema_complete.sql`
- [ ] Reiniciar sessão do Codex se quiser validar depois via MCP
- [ ] Confirmar que existe pelo menos um utilizador `SUPER_ADMIN`
- [ ] Confirmar que existe pelo menos um utilizador `ADMIN`
- [ ] Confirmar que existem condomínios ativos para seleção

### Testes de acesso

- [ ] `SUPER_ADMIN` vê o item `Gestão > Eventos`
- [ ] `ADMIN` vê o item `Gestão > Eventos`
- [ ] utilizadores sem papel admin não conseguem aceder a `/admin/events`

### Testes de listagem

- [ ] `SUPER_ADMIN` consegue listar eventos de todos os condomínios
- [ ] `SUPER_ADMIN` consegue filtrar por condomínio
- [ ] `ADMIN` vê apenas eventos do próprio condomínio
- [ ] filtro por categoria funciona
- [ ] filtro por data inicial funciona
- [ ] filtro por data final funciona
- [ ] pesquisa por título funciona
- [ ] pesquisa por descrição funciona
- [ ] pesquisa por local funciona
- [ ] opção `Mostrar eventos inativos` funciona

### Testes de criação

- [ ] criar evento mínimo com `title` + `start_at`
- [ ] criar evento com `location`
- [ ] criar evento com `requires_rsvp = true`
- [ ] criar evento com `max_attendees`
- [ ] criar evento `is_all_day = true`
- [ ] confirmar que o novo evento aparece na lista

### Testes de validação

- [ ] bloquear criação sem `title`
- [ ] bloquear criação sem `start_at`
- [ ] bloquear criação com `end_at < start_at`
- [ ] bloquear criação com `max_attendees <= 0`
- [ ] bloquear criação com `max_attendees` decimal

### Testes de edição

- [ ] editar título
- [ ] editar descrição
- [ ] editar local
- [ ] editar categoria
- [ ] editar `start_at`
- [ ] editar `end_at`
- [ ] editar `is_all_day`
- [ ] editar `requires_rsvp`
- [ ] editar `max_attendees`
- [ ] confirmar persistência visual após refresh

### Testes de desativação

- [ ] desativar evento ativo
- [ ] confirmar que desaparece da listagem padrão
- [ ] confirmar que reaparece quando `Mostrar eventos inativos` está ativo
- [ ] confirmar que não há hard delete físico no fluxo admin

### Testes de escopo por perfil

- [ ] `SUPER_ADMIN` escolhe condomínio no modal de criação
- [ ] `ADMIN` não altera condomínio no modal
- [ ] eventos criados por `ADMIN` ficam associados ao condomínio correto

### Testes de auditoria

- [ ] `CREATE` gera log em `audit_logs`
- [ ] `UPDATE` gera log em `audit_logs`
- [ ] `DELETE` gera log em `audit_logs`
- [ ] `target_table` deve ser `condominium_events`

### Testes de datas e timezone

- [ ] criar evento com `datetime-local` e confirmar que reabre sem shift inesperado
- [ ] editar um evento existente e confirmar round-trip correto de `start_at`
- [ ] editar um evento existente e confirmar round-trip correto de `end_at`
- [ ] validar visualmente casos com `is_all_day = true`

---

## Validação Técnica Já Feita

Foi executado com sucesso:

- `npm run build`

Resultado:

- a aplicação compila sem erros de TypeScript;
- a nova página `AdminEvents` foi incluída no bundle.

Observações do build:

- houve warnings normais de chunk size;
- não houve erro bloqueante relacionado a esta feature.

---

## Resultado Esperado Depois de Tudo Aplicado

Depois de aplicar as RPCs no Supabase e testar:

- admins conseguem gerir eventos no painel;
- `SUPER_ADMIN` trabalha cross-condominium;
- `ADMIN` trabalha apenas no seu condomínio;
- eventos desativados deixam de aparecer por defeito;
- o histórico de RSVP não é destruído por causa do soft delete;
- a auditoria fica registada;
- a UI mantém consistência entre criação, edição e reabertura do modal.

---

## Nota Final

No momento desta documentação, a parte de código da feature está pronta, mas a ativação completa em ambiente real depende da aplicação das RPCs no Supabase live.
