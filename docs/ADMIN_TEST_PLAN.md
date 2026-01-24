# Plano de Testes - Painel Administrativo (Admin Panel)

Este documento serve como um roteiro para validar todas as funcionalidades do Painel Administrativo do Elite Condo Guard. Utilize as caixas de seleção para marcar o progresso dos testes.


## Dashboard (`AdminDashboard`)
- [ ] **Carregamento de Estatísticas**: Verificar se os números (Condomínios, Dispositivos, Pessoal, etc.) carregam corretamente.
- [ ] **Links Rápidos**: Testar se os cards de estatísticas e botões de "Ações Rápidas" redirecionam para as páginas corretas.
- [ ] **Estado de Carregamento**: Verificar se o spinner de loading aparece enquanto os dados são buscados.

## Gestão de Condomínios (`AdminCondominiums`)
### Ações (CRUD)

- [x] **Inserir,Editar Condomínio**:
    - [x] carregar logo.

### ⚠️ Issues Identificadas
- **ISSUE 2**: O ícone (logo) não está a aparecer para todos os condomínios na listagem.



## Gestão de Dispositivos (`AdminDevices`)
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


## Gestão de Incidentes (`AdminIncidents`)
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

## Outros Módulos (Testes Rápidos)
- [ ] **Staff (`AdminStaff`)**: Testar criação e listagem de guardas/admins.testar adicao de fotos


## Gestão de Residentes 
### Listagem e Filtros
- por paginacao