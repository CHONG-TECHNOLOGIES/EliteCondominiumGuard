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

---

## Playwright MCP Server

### Descrição

O MCP Playwright permite ao Claude Code automatizar browsers para:
- Navegar em websites e aplicações web
- Tirar screenshots de páginas
- Interagir com elementos (clicar, preencher formulários)
- Testar funcionalidades E2E da aplicação

### Configuração

Não requer configuração adicional. O server inicia automaticamente quando necessário.

### MCP Tools Disponíveis (Playwright)

| Tool | Descrição |
|------|-----------|
| `mcp__playwright__browser_navigate` | Navegar para uma URL |
| `mcp__playwright__browser_screenshot` | Capturar screenshot da página |
| `mcp__playwright__browser_click` | Clicar num elemento |
| `mcp__playwright__browser_fill` | Preencher campo de input |
| `mcp__playwright__browser_select` | Selecionar opção em dropdown |
| `mcp__playwright__browser_hover` | Hover sobre elemento |
| `mcp__playwright__browser_evaluate` | Executar JavaScript na página |

### Uso Direto

Podes pedir ao Claude para:

```
"Abre a aplicação em https://localhost:3000 e tira um screenshot"
"Testa o login com utilizador X e password Y"
"Navega até à página de settings e verifica se o botão existe"
"Preenche o formulário de nova visita e submete"
```

### Casos de Uso para Elite AccessControl

1. **Testar Login Flow**: Verificar autenticação com PIN
2. **Testar Registo de Visitas**: Preencher formulário multi-step
3. **Verificar UI Responsiva**: Screenshots em diferentes viewports
4. **Testar Modo Offline**: Verificar comportamento sem rede
5. **Validar PWA**: Testar instalação e funcionalidades offline

### Configuração Técnica (Playwright)

#### `.mcp.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-playwright"]
    }
  }
}
```

#### Permissões em `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "mcp__playwright__*"
    ]
  }
}
```

### Verificação

1. Reiniciar Claude Code após configurar
2. Executar `/mcp` para ver servers ativos
3. Verificar que `playwright` aparece na lista
4. Testar: "Navega para https://example.com e tira um screenshot"

### Referências (Playwright)

- [Playwright MCP Server](https://www.npmjs.com/package/@anthropic/mcp-server-playwright)
- [Playwright Documentation](https://playwright.dev/)
