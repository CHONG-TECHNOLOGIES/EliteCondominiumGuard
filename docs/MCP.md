# MCP - Model Context Protocol

Documentação da configuração de MCP servers no projeto Elite AccessControl.

---

## Notion MCP Server

### Descrição

O MCP Notion permite ao Claude Code interagir diretamente com o workspace Notion para:
- Ler tarefas da database
- Atualizar status de tarefas
- Preencher campos como Branch Name e PR URL

### Ficheiros Configurados

| Ficheiro | Propósito |
|----------|-----------|
| `.mcp.json` | Configuração do MCP server Notion |
| `.claude/settings.json` | Permissões para tools do Notion (`mcp__notion__*`) |
| `.claude/commands/notion-task.md` | Skill `/notion-task` para workflow automatizado |

### Pré-requisitos

#### 1. Criar Integração no Notion

1. Ir a https://www.notion.so/profile/integrations
2. Criar nova integração: `ClaudeCode-TaskAutomation`
3. Copiar o token (`ntn_xxxx...`)
4. Capacidades necessárias:
   - Read content
   - Update content
   - Insert content

#### 2. Conectar Integração à Database

1. Abrir a database de tarefas no Notion
2. Menu `...` → `Connections`
3. Adicionar `ClaudeCode-TaskAutomation`

#### 3. Configurar Variável de Ambiente

**Windows (PowerShell como Admin):**
```powershell
[Environment]::SetEnvironmentVariable("NOTION_TOKEN", "ntn_SEU_TOKEN_AQUI", "User")
```

**Verificar:**
```powershell
$env:NOTION_TOKEN
```

**Nota:** Após configurar, reiniciar o terminal/VSCode para carregar a variável.

---

## MCP Tools Disponíveis

Após configuração, os seguintes tools ficam disponíveis:

| Tool | Descrição |
|------|-----------|
| `mcp__notion__search` | Procurar páginas/databases por texto |
| `mcp__notion__query-data-source` | Listar items de uma database com filtros |
| `mcp__notion__retrieve-a-page` | Obter detalhes de uma página |
| `mcp__notion__update-page-properties` | Atualizar propriedades de uma página |
| `mcp__notion__create-a-page` | Criar nova página/tarefa |

---

## Skill `/notion-task`

### Descrição

Skill que automatiza o início do trabalho numa tarefa do Notion.

### Workflow

1. **Busca a tarefa** no Notion pelo nome
2. **Cria branch git** com formato `{type}/{nome-slugified}`
3. **Atualiza Notion**:
   - Status → "In Progress"
   - Branch Name → nome da branch criada
4. **Mostra resumo** pronto para implementar

### Uso

```bash
/notion-task "Nome da tarefa"
/notion-task "Fix camera bug"
/notion-task "Add push notifications"
```

### Formato de Branch

| Tipo da Tarefa | Exemplo de Branch |
|----------------|-------------------|
| Feature | `feature/add-notifications` |
| Bug | `fix/camera-ios` |
| Refactor | `refactor/optimize-dataservice` |
| Sem tipo | `task/nome-da-tarefa` |

---

## Uso Direto dos MCP Tools

Para operações avulsas, podes pedir diretamente ao Claude:

```
"Lista as tarefas com status Todo"
"Mostra os detalhes da tarefa X"
"Atualiza a tarefa Y para Done"
"Cria uma nova tarefa chamada Z"
```

O Claude usará automaticamente os MCP tools apropriados.

---

## Verificação da Configuração

1. Reiniciar Claude Code após configurar
2. Executar `/mcp` para ver servers ativos
3. Verificar que `notion` aparece na lista
4. Testar: "Lista as minhas tarefas do Notion"

---

## Troubleshooting

### Token não reconhecido

- Verificar se a variável `NOTION_TOKEN` está configurada: `echo $env:NOTION_TOKEN`
- Reiniciar terminal/VSCode após configurar
- Verificar se o token começa com `ntn_`

### Acesso negado à database

- Verificar se a integração está conectada à database
- Menu `...` → `Connections` → deve aparecer `ClaudeCode-TaskAutomation`

### MCP não aparece em `/mcp`

- Verificar se `.mcp.json` existe na raiz do projeto
- Reiniciar Claude Code completamente

---

## Configuração Técnica

### `.mcp.json`

```json
{
  "mcpServers": {
    "notion": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "${NOTION_TOKEN}"
      }
    }
  }
}
```

### Permissões em `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "mcp__notion__*"
    ]
  }
}
```

---

## Referências

- [Notion MCP Server (npm)](https://www.npmjs.com/package/@notionhq/notion-mcp-server)
- [Notion API Documentation](https://developers.notion.com/)
- [Claude Code MCP Documentation](https://docs.anthropic.com/claude-code/mcp)
