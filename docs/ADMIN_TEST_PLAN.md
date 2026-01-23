# Plano de Testes - Painel Administrativo (Admin Panel)

Este documento serve como um roteiro para validar todas as funcionalidades do Painel Administrativo do Elite Condo Guard. Utilize as caixas de seleção para marcar o progresso dos testes.


## 2. Dashboard (`AdminDashboard`)
- [ ] **Carregamento de Estatísticas**: Verificar se os números (Condomínios, Dispositivos, Pessoal, etc.) carregam corretamente.
- [ ] **Links Rápidos**: Testar se os cards de estatísticas e botões de "Ações Rápidas" redirecionam para as páginas corretas.
- [ ] **Estado de Carregamento**: Verificar se o spinner de loading aparece enquanto os dados são buscados.

## 3. Gestão de Condomínios (`AdminCondominiums`)
### Listagem e Filtros
- [x] **Listagem**: Verificar se todos os condomínios são listados.

- [ ] **Badges de Status**: Verificar se condomínios ativos/inativos têm cores diferentes.

### Ações (CRUD)

- [x] **Inserir,Editar Condomínio**:
    - [x] carregar logo.

### ⚠️ Issues Identificadas
- **ISSUE 2**: O ícone (logo) não está a aparecer para todos os condomínios na listagem.

## 4. Gestão de Residentes (`AdminResidents`)
### Listagem e Filtros
- [x] **Filtro por Condomínio**: Selecionar um condomínio e verificar se a lista atualiza apenas com residentes daquele condomínio.
- [x] **Busca**: Testar busca por nome, email ou telefone.

### Ações (CRUD)
- [ ] **Criar Residente**:
    - [ ] Tentar criar sem selecionar Condomínio/Unidade (validar erro).
    - [ ] Selecionar Condomínio e verificar se a lista de Unidades carrega.
    - [ ] Criar residente (Proprietário e Inquilino).
- [ ] **Editar Residente**:
    - [ ] Alterar dados de contato (email/telefone).
    - [ ] Alterar tipo (Proprietário/Inquilino).
- [ ] **Remover Residente**:
    - [ ] Excluir um residente e confirmar a remoção.

### ⚠️ Issues Identificadas

#### **ISSUE #3: Erro ao criar residente - Violação de constraint NOT NULL**
**Severidade:** 🔴 Alta (Bloqueante)  
**Status:** Aberta  

**Erro:**
```
[Admin] Error creating resident: null value in column "id" of relation "residents" violates not-null constraint
```

**Localização:**
- Arquivo: `src/services/Supabase.ts`
- Função: `adminCreateResident` (linha 1195)

**Análise Técnica:**  
O erro indica que a coluna `id` na tabela `residents` não está configurada como `SERIAL` (auto-incremento) ou que o valor padrão não está sendo aplicado corretamente. A função não envia o campo `id` (o que é correto), mas o banco de dados espera que esse valor seja fornecido.

**Código Atual:**
```typescript
async adminCreateResident(resident: any): Promise<any | null> {
  const { data, error } = await supabase
    .from('residents')
    .insert({
      name: resident.name,
      email: resident.email,
      phone: resident.phone,
      condominium_id: resident.condominium_id,
      unit_id: resident.unit_id
    })
    .select()
    .single();
}
```

**Solução Proposta:**  
Verificar e corrigir o schema da tabela `residents` no Supabase:
```sql
ALTER TABLE residents ALTER COLUMN id SET DEFAULT nextval('residents_id_seq');
```

---

#### **ISSUE #4: Erro ao editar residente - Coluna 'type' não existe**
**Severidade:** 🔴 Alta (Bloqueante)  
**Status:** Aberta  

**Erro:**
```
[Admin] Error updating resident: Could not find the 'type' column of 'residents' in the schema cache
```

**Localização:**
- Arquivo: `src/services/Supabase.ts`
- Função: `adminUpdateResident` (linha 1222)

**Análise Técnica:**  
O código está tentando atualizar uma coluna `type` que não existe na tabela `residents` do banco de dados. A interface TypeScript (`types.ts`, linha 94) define `type?: 'OWNER' | 'TENANT'`, mas a coluna não foi criada no schema do Supabase.

**Interface TypeScript:**
```typescript
export interface Resident {
  type?: 'OWNER' | 'TENANT';  // ← Coluna não existe no DB
}
```

**Solução Proposta:**  
Adicionar a coluna `type` à tabela `residents`:
```sql
ALTER TABLE residents 
ADD COLUMN type TEXT CHECK (type IN ('OWNER', 'TENANT'));
```

**Nota:** A distinção entre Proprietário e Inquilino é importante para a gestão do condomínio, portanto recomenda-se adicionar a coluna ao invés de remover do código.


## 5. Gestão de Dispositivos (`AdminDevices`)
### Listagem e Filtros
- [x] **Listagem**: Verificar se os dispositivos (tablets) aparecem.
- [x] **Status**: Verificar badges (ATIVO, INATIVO, DESATIVADO).
- [x] **Último Contacto**: Verificar se o tempo "atrás" (ex: 5m atrás) está coerente.

### Ações
- [ ] **Editar Dispositivo**:
    - [ ] Renomear dispositivo.
    - [ ] Associar/Desassociar de um condomínio.
- [ ] **Desativar (Decommission)**:
    - [ ] Testar a desativação de um dispositivo.
    - [ ] Verificar se o status muda para DESATIVADO.

### ⚠️ Issues Identificadas

#### **ISSUE #5: Falta botão para ativar/desativar tablet**
**Severidade:** 🟡 Média (Funcionalidade em falta)  
**Status:** Aberta  

**Descrição:**  
Não existe botão na interface para ativar ou desativar um dispositivo (tablet). A funcionalidade de "Decommission" existe no backend (`adminDecommissionDevice` e `adminUpdateDevice` em `Supabase.ts`), mas não está acessível através do UI.

**Funcionalidades Backend Disponíveis:**
- `adminUpdateDevice()` - Pode alterar status do dispositivo
- `adminDecommissionDevice()` - Marca dispositivo como DECOMMISSIONED

**Solução Proposta:**  
Adicionar botões de ação na listagem de dispositivos:
1. **Botão Editar** - Para renomear e associar/desassociar condomínio
2. **Botão Toggle Status** - Para ativar/desativar (ACTIVE ↔ INACTIVE)
3. **Botão Decommission** - Para desativar permanentemente (com confirmação)

**Localização do Código:**
- Backend: `src/services/Supabase.ts` (linhas 959-995)
- Frontend: `src/pages/admin/AdminDevices.tsx` (adicionar botões de ação)


## 6. Gestão de Incidentes (`AdminIncidents`)
### Listagem e Filtros
- [ ] **Filtros Combinados**: Testar filtro por Condomínio + Status (Pendente, Resolvido, etc.).
- [ ] **Busca**: Buscar por descrição ou nome do residente.

### Workflow de Incidentes
- [ ] **Reconhecer (Acknowledge)**:
    - [ ] Clicar em "Reconhecer" em um incidente Pendente.
    - [ ] Verificar mudança de status para RECONHECIDO.
- [ ] **Resolver (Resolve)**:
    - [ ] Resolver diretamente (sem notas).
    - [ ] Resolver com notas (modal de notas).
    - [ ] Verificar mudança de status para RESOLVIDO.
- [ ] **Adicionar Notas**:
    - [ ] Adicionar notas a um incidente sem resolvê-lo (se aplicável) ou durante a resolução.
- [ ] **Exportar CSV**:
    - [ ] Testar o botão de exportação e verificar se o arquivo é baixado corretamente.

## 7. Outros Módulos (Testes Rápidos)
- [ ] **Staff (`AdminStaff`)**: Testar criação e listagem de guardas/admins.
- [ ] **Unidades (`AdminUnits`)**: Testar listagem e filtros.
- [ ] **Tipos de Visita/Serviço**: Verificar se é possível adicionar novos tipos.

## 8. Validações Gerais
- [ ] **Feedback do Usuário**: Verificar se "Toasts" (mensagens de sucesso/erro) aparecem após ações.
- [ ] **Tratamento de Erros**: Simular falha de rede (se possível) ou verificar comportamento quando a API falha.
