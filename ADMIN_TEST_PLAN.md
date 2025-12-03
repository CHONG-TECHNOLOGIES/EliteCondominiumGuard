# Plano de Testes - Painel Administrativo (Admin Panel)

Este documento serve como um roteiro para validar todas as funcionalidades do Painel Administrativo do Elite Condo Guard. Utilize as caixas de seleção para marcar o progresso dos testes.

## 1. Autenticação e Navegação
- [x] **Login de Administrador**: Verificar se é possível fazer login com credenciais de administrador.
- [x] **Proteção de Rotas**: Tentar acessar `/admin/*` sem estar logado e verificar o redirecionamento para login.
- [x] **Logout**: Verificar se o botão de logout encerra a sessão corretamente.
- [x] **Menu Lateral**: Testar a navegação entre todas as páginas do menu (Dashboard, Condomínios, Residentes, etc.).
- [x] **Responsividade**: Verificar se o menu se adapta corretamente em dispositivos móveis (hambúrguer menu).

## 2. Dashboard (`AdminDashboard`)
- [ ] **Carregamento de Estatísticas**: Verificar se os números (Condomínios, Dispositivos, Pessoal, etc.) carregam corretamente.
- [ ] **Links Rápidos**: Testar se os cards de estatísticas e botões de "Ações Rápidas" redirecionam para as páginas corretas.
- [ ] **Estado de Carregamento**: Verificar se o spinner de loading aparece enquanto os dados são buscados.

## 3. Gestão de Condomínios (`AdminCondominiums`)
### Listagem e Filtros
- [x] **Listagem**: Verificar se todos os condomínios são listados.
- [x] **Busca**: Testar a busca por nome e endereço.
- [ ] **Badges de Status**: Verificar se condomínios ativos/inativos têm cores diferentes.

### Ações (CRUD)
- [x] **Criar Condomínio**:
    - [x] Validar campos obrigatórios (Nome).
    - [x] Criar um novo condomínio com sucesso.
    - [x] Verificar se aparece na lista após criação.
- [x] **Editar Condomínio**:
    - [x] Alterar nome, endereço, coordenadas GPS e raio.
    - [x] Salvar e verificar se as alterações persistem.
- [x] **Gerir Ruas**:
    - [x] Adicionar uma nova rua a um condomínio.
    - [x] Remover uma rua existente.
- [x] **Ativar/Desativar**:
    - [x] Testar o botão de toggle de status (Power icon).
    - [x] Confirmar a ação no modal de confirmação.

### ⚠️ Issues Identificadas
- **ISSUE 1**: Quando um condomínio é desativado, ele desaparece da listagem. Deveria continuar visível com badge "INATIVO".
- **ISSUE 2**: O ícone (logo) não está a aparecer para todos os condomínios na listagem.

## 4. Gestão de Residentes (`AdminResidents`)
### Listagem e Filtros
- [ ] **Filtro por Condomínio**: Selecionar um condomínio e verificar se a lista atualiza apenas com residentes daquele condomínio.
- [ ] **Busca**: Testar busca por nome, email ou telefone.

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

## 5. Gestão de Dispositivos (`AdminDevices`)
### Listagem e Filtros
- [ ] **Listagem**: Verificar se os dispositivos (tablets) aparecem.
- [ ] **Status**: Verificar badges (ATIVO, INATIVO, DESATIVADO).
- [ ] **Último Contacto**: Verificar se o tempo "atrás" (ex: 5m atrás) está coerente.

### Ações
- [ ] **Editar Dispositivo**:
    - [ ] Renomear dispositivo.
    - [ ] Associar/Desassociar de um condomínio.
- [ ] **Desativar (Decommission)**:
    - [ ] Testar a desativação de um dispositivo.
    - [ ] Verificar se o status muda para DESATIVADO.

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
