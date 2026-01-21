Workflow para iniciar trabalho numa tarefa do Notion: $ARGUMENTS

## Passos

1. **Buscar tarefa no Notion** (MCP tool)
   - Usar `mcp__notion__search` para procurar por Name: $ARGUMENTS
   - Extrair: Name, Task, Notes, ID

2. **Criar branch git** (executar skill /create-new-branch)
   - Formato do nome: `{feature}/{Name}`
   - Exemplos:
     - Feature "Add notifications" → `feature/add-notifications`
     - Bug "Fix camera iOS" → `fix/camera-ios`
     - Refactor "Optimize DataService" → `refactor/optimize-dataservice`
   - Se Type não existir, usar `task/` como prefixo

3. **Atualizar Notion** (MCP tool `mcp__notion__update-page-properties`)
   - Alterar Status → "In Progress"
   - Preencher Branch Name → nome da branch criada

4. **Mostrar resumo final**
   - Tarefa: [Name]
   - Branch: [nome da branch]
   - Descrição: [descrição da tarefa]
   - Status: Pronto para implementar!

## Tratamento de Erros

- Se tarefa não encontrada: Listar tarefas similares e pedir clarificação
- Se branch já existe: Perguntar se deve fazer checkout da existente ou criar nova
- Se falhar atualização do Notion: Continuar mas avisar o utilizador
