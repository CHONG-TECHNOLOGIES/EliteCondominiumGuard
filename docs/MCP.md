# MCP - Model Context Protocol

Documentação da configuração de MCP servers no projeto Elite AccessControl.

---

## Visão Geral

O projeto utiliza MCP servers para integrar o Claude Code com serviços externos. Existem dois ficheiros de configuração:

| Ficheiro | Localização | Servers |
|----------|-------------|---------|
| `.mcp.json` (raiz) | `APPGUARD/.mcp.json` | Notion, Playwright (legacy) |
| `.mcp.json` (src) | `APPGUARD/src/.mcp.json` | Playwright, Supabase, Sentry |

O ficheiro **activo** é o `src/.mcp.json` (directório de trabalho do Claude Code).

---

## Ficheiros de Configuração

### `.mcp.json` (src - Activo)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "headers": {
        "x-supabase-url": "<SUPABASE_PROJECT_URL>",
        "x-supabase-anon-key": "<SUPABASE_ANON_KEY>"
      }
    },
    "plugin:sentry:sentry": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sentry"],
      "env": {
        "SENTRY_AUTH_TOKEN": "<SENTRY_AUTH_TOKEN>",
        "SENTRY_ORG": "chongtechnologies",
        "SENTRY_PROJECT": "eliteaccesscontrol"
      }
    }
  }
}
```

### `.mcp.json` (raiz - Legacy)

```json
{
  "mcpServers": {
    "notion": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "${NOTION_TOKEN}"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-playwright"]
    }
  }
}
```

### Permissões em `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(npm install:*)",
      "Bash(npm run:*)",
      "Bash(vercel:*)",
      "Bash(cd:*)",
      "Bash(git:*)",
      "mcp__notion__*",
      "mcp__playwright__*",
      "mcp__supabase__*"
    ]
  },
  "enabledPlugins": {
    "code-review@claude-plugins-official": true,
    "context7@claude-plugins-official": true,
    "code-simplifier@claude-plugins-official": true,
    "vercel@claude-plugins-official": true,
    "sentry@claude-plugins-official": true,
    "supabase@claude-plugins-official": true,
    "claude-md-management@claude-plugins-official": true,
    "claude-code-setup@claude-plugins-official": true
  }
}
```

---

## Supabase MCP Server

### Descrição

O MCP Supabase permite ao Claude Code interagir directamente com o backend PostgreSQL para:
- Consultar tabelas, views e RPC functions
- Inspeccionar schema e RLS policies
- Executar queries SQL directamente
- Verificar configuração de storage buckets

### Tipo de Conexão

**HTTP MCP** - Conecta via `https://mcp.supabase.com/mcp` com headers de autenticação.

### Pré-requisitos

1. URL do projecto Supabase (`VITE_SUPABASE_URL`)
2. Anon key do projecto (`VITE_SUPABASE_ANON_KEY`)
3. Ambos configurados nos headers do `.mcp.json`

### MCP Tools Disponíveis (Supabase)

| Tool | Descrição |
|------|-----------|
| `mcp__supabase__*` | Acesso completo ao schema, tabelas, RPC, RLS e storage |

### Uso Direto

```
"Mostra as tabelas do Supabase"
"Qual é o schema da tabela visits?"
"Lista as RPC functions disponíveis"
"Verifica as RLS policies da tabela staff"
"Executa um SELECT nos últimos 10 visits"
```

### Referências (Supabase)

- [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase Documentation](https://supabase.com/docs)

---

## Sentry MCP Server

### Descrição

O MCP Sentry permite ao Claude Code monitorizar erros e performance da aplicação:
- Consultar issues e eventos de erro
- Analisar stack traces
- Verificar performance metrics
- Investigar bugs reportados

### Configuração

| Campo | Valor |
|-------|-------|
| Organização | `chongtechnologies` |
| Projecto | `eliteaccesscontrol` |
| Auth Token | Configurado via `SENTRY_AUTH_TOKEN` no `.mcp.json` |

### Pré-requisitos

1. Conta Sentry com projecto configurado
2. Auth token com permissões de leitura
3. Plugin `sentry@claude-plugins-official` activado

### Skills Disponíveis (Sentry)

| Skill | Descrição |
|-------|-----------|
| `/sentry:getIssues` | Buscar os 10 issues mais recentes |
| `/sentry:seer` | Perguntas em linguagem natural sobre o Sentry |
| `/sentry:sentry-code-review` | Analisar comentários do Sentry em PRs |
| `/sentry:sentry-setup-ai-monitoring` | Configurar AI Agent Monitoring |
| `/sentry:sentry-setup-logging` | Configurar Sentry Logging |
| `/sentry:sentry-setup-metrics` | Configurar Sentry Metrics |
| `/sentry:sentry-setup-tracing` | Configurar Sentry Tracing |

### Uso Direto

```
"Mostra os últimos erros no Sentry"
"Qual é o erro mais frequente?"
"Analisa o stack trace do issue X"
"Configura tracing para a aplicação"
```

### Referências (Sentry)

- [Sentry MCP Server (npm)](https://www.npmjs.com/package/@modelcontextprotocol/server-sentry)
- [Sentry Documentation](https://docs.sentry.io/)

---

## Playwright MCP Server

### Descrição

O MCP Playwright permite ao Claude Code automatizar browsers para:
- Navegar em websites e aplicações web
- Tirar screenshots de páginas
- Interagir com elementos (clicar, preencher formulários)
- Testar funcionalidades E2E da aplicação

### Configuração

Utiliza `@playwright/mcp@latest` (versão oficial mais recente). Não requer configuração adicional.

**Nota**: O ficheiro raiz usa o pacote legacy `@anthropic/mcp-server-playwright`. O ficheiro activo (`src/.mcp.json`) usa o pacote oficial `@playwright/mcp@latest`.

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

### Referências (Playwright)

- [Playwright MCP Server](https://www.npmjs.com/package/@playwright/mcp)
- [Playwright Documentation](https://playwright.dev/)

---

## Notion MCP Server (Legacy)

### Descrição

O MCP Notion permite ao Claude Code interagir directamente com o workspace Notion para:
- Ler tarefas da database
- Atualizar status de tarefas
- Preencher campos como Branch Name e PR URL

**Nota**: Este server está configurado apenas no `.mcp.json` da raiz. Para usar, o Claude Code deve ser executado a partir da raiz do projecto ou o server deve ser adicionado ao `src/.mcp.json`.

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

### MCP Tools Disponíveis (Notion)

| Tool | Descrição |
|------|-----------|
| `mcp__notion__search` | Procurar páginas/databases por texto |
| `mcp__notion__query-data-source` | Listar items de uma database com filtros |
| `mcp__notion__retrieve-a-page` | Obter detalhes de uma página |
| `mcp__notion__update-page-properties` | Atualizar propriedades de uma página |
| `mcp__notion__create-a-page` | Criar nova página/tarefa |

### Referências (Notion)

- [Notion MCP Server (npm)](https://www.npmjs.com/package/@notionhq/notion-mcp-server)
- [Notion API Documentation](https://developers.notion.com/)

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

## Plugins Activados

O projecto tem os seguintes plugins Claude Code activados:

| Plugin | Descrição |
|--------|-----------|
| `code-review` | Code review de pull requests |
| `context7` | Contexto adicional para o Claude |
| `code-simplifier` | Simplificação e refactoring de código |
| `vercel` | Deploy e gestão de deployments Vercel |
| `sentry` | Monitorização de erros e performance |
| `supabase` | Integração com Supabase backend |
| `claude-md-management` | Gestão de ficheiros CLAUDE.md |
| `claude-code-setup` | Recomendações de automação Claude Code |

---

## Verificação da Configuração

1. Reiniciar Claude Code após configurar
2. Executar `/mcp` para ver servers ativos
3. Verificar que `playwright`, `supabase` e `sentry` aparecem na lista
4. Testar:
   - `"Mostra as tabelas do Supabase"` (Supabase)
   - `"Mostra os últimos erros"` (Sentry)
   - `"Navega para https://example.com"` (Playwright)

---

## Troubleshooting

### MCP server não aparece em `/mcp`

- Verificar se `.mcp.json` existe no directório de trabalho (`src/`)
- Reiniciar Claude Code completamente
- Verificar permissões em `.claude/settings.json`

### Supabase MCP não conecta

- Verificar se a URL e anon key estão correctas nos headers
- Testar conexão directa ao Supabase via browser
- Verificar se o projecto Supabase está activo

### Sentry MCP não funciona

- Verificar se o `SENTRY_AUTH_TOKEN` é válido
- Confirmar organização (`chongtechnologies`) e projecto (`eliteaccesscontrol`)
- Verificar se o plugin `sentry` está activado em settings

### Notion token não reconhecido

- Verificar se a variável `NOTION_TOKEN` está configurada: `echo $env:NOTION_TOKEN`
- Reiniciar terminal/VSCode após configurar
- Verificar se o token começa com `ntn_`
- **Nota**: O Notion está apenas no `.mcp.json` da raiz, não no `src/.mcp.json`

### Playwright não inicia

- Executar `npx @playwright/mcp@latest` manualmente para verificar
- Verificar se o Node.js está instalado e acessível

---

## Referências Gerais

- [Claude Code MCP Documentation](https://docs.anthropic.com/claude-code/mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
