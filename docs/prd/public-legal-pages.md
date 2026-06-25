# PRD: Páginas Públicas/Legais

## 1. Visão geral do produto

### 1.1 Título e versão do documento

- PRD: Páginas Públicas/Legais
- Versão: 1.0 (retroativo)

### 1.2 Resumo do produto

Três páginas do EntryFlow acessíveis sem autenticação (`unrestricted` no router): Manual do Utilizador (`/manual`), Política de Privacidade (`/privacy-policy`) e Eliminação de Conta (`/account-deletion`). Servem dois propósitos distintos: a primeira é documentação de produto para utilizadores internos (guardas/admins); as últimas duas são páginas de conformidade legal exigidas para publicação em lojas de aplicações (Google Play/App Store) e para cumprimento de RGPD.

Este documento é retroativo: documenta conteúdo e funcionalidade já implementados e publicados, não um plano de trabalho futuro.

## 2. Objetivos

### 2.1 Objetivos de negócio

- Cumprir requisitos obrigatórios das lojas de aplicações (Google Play exige uma página pública de eliminação de conta para apps com contas de utilizador).
- Cumprir obrigações de transparência do RGPD (informar o titular dos dados sobre recolha, finalidade, fornecedores, retenção e direitos).
- Reduzir pedidos de suporte repetitivos sobre "como uso a aplicação" através de documentação self-service.

### 2.2 Objetivos do utilizador

- Um guarda novo consegue aprender a usar a aplicação sem formação presencial, consultando o Manual.
- Um residente ou colaborador entende que dados são recolhidos sobre si e pode exercer o direito de eliminação sem precisar de abrir um ticket de suporte.

### 2.3 Não-objetivos

- Estas páginas não cobrem a lógica operacional das funcionalidades que documentam (ver PRDs "Guard App", "Admin Panel", "Resident Communication & Video Calls").
- Não implementam eliminação de conta self-service automática dentro da aplicação — o fluxo é mediado por email, por desenho explícito desta versão.

## 3. Personas de utilizador

### 3.1 Tipos de utilizador principais

- **Guarda/Admin/Super Admin novo**: consulta o Manual do Utilizador para aprender a usar a sua área da aplicação.
- **Titular de dados (residente, visitante, colaborador, ou qualquer pessoa cujos dados sejam tratados pelo EntryFlow)**: consulta a Política de Privacidade ou solicita eliminação de conta.
- **Revisor de loja de aplicações** (Google Play/Apple App Store): valida que a app cumpre requisitos de transparência antes de aprovar a publicação.

### 3.2 Acesso

- Todas as três rotas são `unrestricted` — não exigem login, ao contrário de praticamente todo o resto da aplicação (que passa por `ConfigGuard` + `ProtectedRoute`/`AdminRoute`).

## 4. Requisitos funcionais

### Manual do Utilizador (`/manual`)

- **Filtragem real por audiência, não apenas navegação** (Prioridade: Alta) — a página deteta a audiência através do parâmetro de URL `?audience=public|guard|admin|super-admin` ou, na ausência deste, do papel (`role`) do utilizador autenticado via `AuthContext` (GUARD → `guard`, ADMIN → `admin`, SUPER_ADMIN → `super-admin`, sem sessão → `public`). Com base nisso, secções inteiras (`guarda`, `admin`, `super-admin`) são condicionalmente renderizadas ou ocultadas — não é apenas scroll-to-anchor dentro de uma página estática igual para todos; o conteúdo visível muda de facto por perfil. SUPER_ADMIN vê as secções de Guarda + Admin + Super Admin (acesso cumulativo).
- **Versão pública reduzida** (Prioridade: Alta) — quando `audience === 'public'` (sem sessão e sem query param), a página mostra todos os perfis apenas como referência geral (cartões de resumo), com texto explícito a indicar que "depois do login, cada utilizador abre o manual filtrado para o seu próprio perfil" — evitando expor o detalhe operacional completo de guarda/admin a um visitante anónimo.
- **Cobertura funcional por página do guarda** (Prioridade: Alta) — secções dedicadas a Início do turno, mapa do Dashboard, Nova Entrada (incluindo os 4 cenários: com QR, sem QR, prestador de serviço, restaurante/desporto como entrada livre), escolha do método de aprovação, glossário de estados de visita, Lista do Dia, Incidentes (incluindo o aviso de que som/vibração exigem ativação manual por política dos browsers), e modo Offline — espelhando em detalhe as páginas reais do Guard App (ver PRD "Guard App").
- **Cartões de funcionalidade com pontos-chave** (Prioridade: Média) — estrutura `FeatureCard` (título, descrição, lista de pontos, ícone) usada tanto para resumir os 3 perfis na secção introdutória como para "Primeiros Passos" (ativar tablet, login, confirmar estado online/offline).
- **Guias passo-a-passo numerados** (Prioridade: Alta) — estrutura `StepGuide` (eyebrow, título, descrição, lista de passos numerados, resultado esperado opcional, aviso opcional, dica opcional), usada extensivamente para fluxos operacionais reais: início de turno, interpretação do Dashboard, os 4 cenários de Nova Entrada, escolha de método de aprovação, uso da Lista do Dia, resposta a incidentes, garantia de alertas sonoros, operação offline, e fecho de turno.
- **Avisos operacionais específicos e não genéricos** (Prioridade: Alta) — os campos `warning` dos guias capturam comportamento real da implementação que de outra forma surpreenderia o guarda: ex. "o botão Autorizar aparece desativado na Lista do Dia" (a lista serve para localizar/contactar/fechar saídas, não para aprovar), ou que validação de QR exige internet mesmo que o resto da app funcione offline.
- **Glossário de estados de visita** (Prioridade: Média) — estrutura `StatusGuide` (título, significado, ação recomendada) cobrindo PENDENTE, AUTORIZADO, NO INTERIOR, SAIU, NEGADO — traduzindo cada badge num próximo passo concreto em vez de deixar o guarda adivinhar.
- **Secção de Boas Práticas e Perguntas Comuns** (Prioridade: Média) — duas listas dedicadas (`supportTips`, `troubleshooting`) com dicas operacionais e resolução de problemas típicos (ex. "não consigo entrar offline", "o QR não valida", "incidente chegou sem som"), navegáveis por âncora própria.

### Política de Privacidade (`/privacy-policy`)

- **Bilingue PT/EN com deteção automática** (Prioridade: Alta) — idioma inicial detetado de `navigator.language` (prefixo `pt` → Português, qualquer outro → Inglês), com toggle manual sempre visível no cabeçalho.
- **Identificação do responsável pelo tratamento** (Prioridade: Alta) — secção explícita "Responsável pelo Tratamento" com empresa (Chong Technologies), nome da aplicação (EntryFlow), e contacto — requisito direto do RGPD (Art. 13).
- **Tabela de dados recolhidos com finalidade** (Prioridade: Alta) — `dataRows` lista cada categoria de dado (ex.: Colaboradores: nome/apelido/função/PIN como hash bcrypt; Visitas: nome do visitante, documento opcional, horários, unidade, tipo) emparelhada com a finalidade legal/operacional da recolha — nunca apenas "que dados" sem "porquê".
- **Divulgação explícita de subprocessadores/fornecedores** (Prioridade: Alta) — lista nomeada (`vendors`) com Supabase Inc. (base de dados e armazenamento), Sentry (monitorização de erros), e Vercel Inc. (alojamento da aplicação web), cada um com o serviço prestado e o que é partilhado.
- **Secções de segurança, retenção, direitos do titular, e permissões do dispositivo** (Prioridade: Alta) — cobrindo medidas de segurança aplicadas, prazos de retenção por tipo de dado, direitos RGPD (acesso, rectificação, eliminação, portabilidade, etc.), e justificação de permissões do dispositivo (câmara, armazenamento, notificações).
- **Nota específica sobre PINs** (Prioridade: Alta) — `pinNote` esclarece explicitamente que PINs nunca são armazenados em claro, apenas como hash bcrypt — alinhado com a prática real implementada em `dataService.ts`/RPCs (ver PRD "Sync & Offline-First Architecture").
- **Secção dedicada a menores** (Prioridade: Média) — `childrenTitle`/`childrenText` aborda explicitamente a posição da aplicação relativamente a dados de menores.
- **Link cruzado para Eliminação de Conta** (Prioridade: Média) — a Política de Privacidade inclui, no final, uma chamada de ação direta para `#/account-deletion` com instruções de como proceder — relação bidirecional com a página de Eliminação de Conta (que por sua vez já linka de volta para a Política), evitando que o utilizador fique "preso" numa das duas páginas sem saber que a outra existe.

### Eliminação de Conta (`/account-deletion`)

- **Bilingue PT/EN com deteção automática** (Prioridade: Alta) — mesmo padrão de deteção de idioma que a Política de Privacidade, implementado de forma independente (sem componente partilhado entre as duas páginas).
- **Fluxo de pedido por email, não self-service automático** (Prioridade: Alta) — `requestSteps` define um processo claro de 3 passos: enviar email para `entryflow.space@chongtechnologies.com` com identificação, incluir identificadores para localizar o registo, e aguardar revisão da equipa. A página é explícita (`introNote`) que esta versão não promete eliminação automática dentro da app.
- **Distinção entre dados eliminados e dados retidos** (Prioridade: Alta) — duas listas separadas: `deletedItems` (dados de conta/perfil, dados operacionais, fotografias, dados de suporte) vs. `retainedItems` (logs de auditoria/segurança contra fraude, dados de obrigação legal/fiscal/contratual, registos técnicos mínimos para defesa de direitos) — gestão de expectativa explícita de que nem tudo é apagável.
- **Prazos de retenção concretos** (Prioridade: Alta) — `retentionItems` especifica períodos reais: visitas/incidentes mantidos enquanto a subscrição estiver ativa; fotografias removidas junto com o registo relacionado; logs de auditoria mantidos até 12 meses; dados de diagnóstico conforme política do fornecedor.
- **Link cruzado para a Política de Privacidade** (Prioridade: Média) — botão direto para `#/privacy-policy`, evitando duplicar todo o conteúdo legal nesta página.
- **Correção de scroll em página standalone** (Prioridade: Baixa, técnica) — função `enablePageScroll()` reverte estilos de overflow/height aplicados pelo shell principal da app (otimizado para um layout fixo de tablet/kiosk) para permitir scroll normal numa página pública acedida fora do contexto da app instalada.

## 5. Experiência do utilizador

### 5.1 Pontos de entrada e fluxo do primeiro uso

- `/manual`: acedido tipicamente a partir de um link partilhado pelo admin a um guarda novo, ou por curiosidade dentro da própria app (link no menu, fora do âmbito coberto aqui).
- `/privacy-policy` e `/account-deletion`: acedidos externamente — a partir da ficha da app na loja, de um email de suporte, ou de um link partilhado por um residente que queira exercer direitos RGPD.

### 5.2 Experiência principal

- Todas as três páginas funcionam fora do "casco" autenticado da aplicação (sem `AuthContext`/sidebar/tema de admin), com o seu próprio layout standalone — refletindo que podem ser acedidas por alguém que nunca usou a app.
- Tema visual consistente entre PrivacyPolicy e AccountDeletion (fundo `slate-900`, cartões `slate-800/50`, cabeçalho fixo com toggle PT/EN) apesar de serem implementações independentes — sugerindo um padrão copiado deliberadamente para consistência, não um componente partilhado.

### 5.3 Funcionalidades avançadas e casos extremos

- Deteção de idioma do browser como default, mas sempre com override manual visível — nunca força um idioma sem dar escolha.
- `enablePageScroll()` em AccountDeletion demonstra consciência de que o resto da aplicação é otimizada para um layout de tablet fixo (sem scroll de página), e que uma página pública standalone precisa de reverter explicitamente esse comportamento.

### 5.4 Destaques de UI/UX

- Uso de numeração visual (círculos numerados) nos passos de pedido de eliminação, mais claro do que uma lista genérica para um processo sequencial que o utilizador precisa de seguir corretamente.
- Distinção visual por cor entre "dados eliminados" (check verde) e "dados retidos" (bullet âmbar) e "prazos" (bullet azul) — comunica a diferença de categoria sem precisar de texto explicativo adicional.

## 6. Narrativa

Um guarda recém-contratado recebe da sua admin um link `#/manual?audience=guard`. Ao abrir, vê apenas a secção operacional do guarda — início de turno, Nova Entrada com os 4 cenários possíveis (com QR, sem QR, prestador de serviço, entrada livre em restaurante/desporto), o glossário de estados de visita, e o que fazer quando chega um incidente. Não vê nada sobre gestão de condomínios ou subscrições, porque isso não lhe é relevante. Numa situação real de turno, em dúvida sobre se deve marcar "Marcar Interior" ou "Marcar Saída", consulta o glossário de estados e resolve sozinho, sem chamar o admin.

Semanas depois, um residente do condomínio decide que já não quer que os seus dados constem do sistema do EntryFlow. Procura na ficha da app e encontra a página pública de Eliminação de Conta. Lê que pode contactar `entryflow.space@chongtechnologies.com`, com o seu número de telefone para verificação. Antes de enviar o email, segue o link cruzado para a Política de Privacidade para confirmar que fornecedores têm acesso aos seus dados (Supabase, Sentry, Vercel) e durante quanto tempo. Envia o pedido; a equipa de privacidade confirma que os dados operacionais serão eliminados, mas que alguns logs de auditoria de segurança serão retidos até 12 meses por obrigação de conformidade — exatamente como descrito na página, sem surpresas.

## 7. Métricas de sucesso (impacto observado)

### 7.1 Métricas centradas no utilizador

- Redução de pedidos de suporte sobre "como funciona X" resolvidos via consulta ao Manual sem intervenção humana.
- Tempo entre pedido de eliminação por email e confirmação da equipa de privacidade.

### 7.2 Métricas de negócio

- Aprovação sem fricção em revisões de loja de aplicações (Google Play/Apple), por já existir página pública de eliminação de conta conforme exigido.
- Redução de risco de não-conformidade RGPD (multas, reclamações) por existir documentação de transparência acessível publicamente.

### 7.3 Métricas técnicas

- Não aplicável diretamente — estas são páginas de conteúdo estático/semi-estático, sem métricas de desempenho de sistema relevantes além de tempo de carregamento.

## 8. Considerações técnicas

### 8.1 Pontos de integração

- Rotas registadas como `unrestricted` no router principal (`App.tsx`), fora do fluxo `ConfigGuard`/`ProtectedRoute`/`AdminRoute` usado pelo resto da aplicação.
- `AuthContext` é consultado em UserManual para determinar a audiência (`public`/`guard`/`admin`/`super-admin`) quando não há `?audience=` na URL — isto controla diretamente que secções são renderizadas (não apenas a navegação), mas a página continua a funcionar sem sessão (cai em `public`).
- Nenhuma chamada a `DataService` ou Supabase — conteúdo é inteiramente estático, definido em objetos `copy`/`pageNav`/`profileCards` no próprio ficheiro.

### 8.2 Armazenamento de dados e privacidade

- Estas páginas são, elas próprias, o mecanismo de conformidade de privacidade do produto — não consomem dados pessoais, mas declaram como os dados pessoais são tratados noutras partes do sistema.
- A lista de subprocessadores (Supabase, Sentry, Vercel) está fixa no código-fonte; qualquer mudança de fornecedor de infraestrutura exigiria atualização manual desta página para se manter exata.

### 8.3 Escalabilidade e desempenho

- Conteúdo bilingue mantido como objeto `Record<Lang, Copy>` duplicado integralmente por idioma (não usa biblioteca de i18n) — simples de implementar para 2 idiomas, mas não escala bem para um terceiro idioma sem refatoração.

### 8.4 Desafios potenciais

- A lógica de tradução PT/EN está duplicada de forma independente entre `PrivacyPolicy.tsx` e `AccountDeletion.tsx` (mesmo padrão `Lang`/`Copy`/deteção de `navigator.language`, sem componente ou hook partilhado) — qualquer correção ou nova funcionalidade de i18n precisa de ser replicada manualmente nas duas páginas.
- A data "Última atualização" em cada política é um valor estático escrito manualmente no código — risco de ficar desatualizada se o conteúdo for alterado sem lembrar de atualizar a data.
- A ausência de eliminação self-service automática implica uma dependência operacional contínua de alguém monitorizar a caixa de email `entryflow.space@chongtechnologies.com` para cumprir prazos de resposta RGPD.

## 9. Histórico de entregas

- **Fase 0: Core MVP** (2025-11-29 a 2026-01-23) — UserManual, PrivacyPolicy e AccountDeletion existem desde os primeiros commits do repositório, como parte da fundação do produto necessária para publicação em loja de aplicações.
- **Atualização de conteúdo e filtragem por audiência** (commits até 2026-04-14, confirmado via `git log -- pages/UserManual.tsx pages/PrivacyPolicy.tsx pages/AccountDeletion.tsx`) — reescrita do Manual do Utilizador com guias passo-a-passo operacionais detalhados e filtragem real por audiência (`?audience=`/papel do utilizador), e revisão de conteúdo da Política de Privacidade (última atualização registada: 11 de abril de 2026) e da página de Eliminação de Conta (14 de abril de 2026), incluindo o link cruzado entre as duas páginas legais.

## 10. User stories

### 10.1. Ver apenas o manual relevante para o meu papel

- **ID**: PL-001
- **Descrição**: Como utilizador do EntryFlow (guarda, admin, super admin, ou visitante anónimo), quero que o manual mostre apenas o conteúdo relevante para o meu papel, para não ter de filtrar manualmente informação que não me aplica.
- **Critérios de aceitação**:
  - Sem sessão e sem `?audience=` na URL, o manual mostra a versão pública (resumo de todos os perfis, sem detalhe operacional completo).
  - Com sessão, a audiência é determinada automaticamente pelo papel do utilizador (GUARD/ADMIN/SUPER_ADMIN), sem o utilizador precisar de escolher.
  - O parâmetro `?audience=` na URL permite forçar uma audiência específica independentemente da sessão (ex.: para partilhar um link direto a um guarda).
  - SUPER_ADMIN vê cumulativamente as secções de Guarda, Admin, e Super Admin.

### 10.2. Aprender a usar a aplicação sem formação presencial

- **ID**: PL-002
- **Descrição**: Como guarda novo, quero consultar um manual com guias passo-a-passo numerados e avisos sobre comportamento real da app, para aprender a operar a aplicação sem depender de formação presencial.
- **Critérios de aceitação**:
  - O manual cobre os 4 cenários reais de Nova Entrada (com QR, sem QR, prestador de serviço, entrada livre) com passos numerados.
  - O manual avisa explicitamente sobre comportamentos não-óbvios da implementação (ex.: "Autorizar" desativado na Lista do Dia, QR exige internet).
  - A página é acessível sem login.

### 10.3. Entender que dados pessoais são recolhidos e por quem são processados

- **ID**: PL-003
- **Descrição**: Como titular de dados (residente, visitante, colaborador), quero saber que dados são recolhidos sobre mim, com que finalidade, e que fornecedores externos têm acesso, para poder exercer os meus direitos de forma informada.
- **Critérios de aceitação**:
  - A política lista cada categoria de dado recolhido emparelhada com a sua finalidade.
  - A política nomeia explicitamente os subprocessadores (Supabase, Sentry, Vercel) e o serviço que cada um presta.
  - A política está disponível em Português e Inglês, com deteção automática de idioma do browser.
  - A política tem um link direto para a página de Eliminação de Conta.

### 10.4. Solicitar a eliminação dos meus dados

- **ID**: PL-004
- **Descrição**: Como titular de dados, quero um processo claro para pedir a eliminação da minha conta e dados associados, para exercer o meu direito ao esquecimento sob RGPD.
- **Critérios de aceitação**:
  - A página explica um processo de 3 passos via email, com o endereço de contacto explícito.
  - A página distingue claramente que dados serão eliminados e que dados podem ser retidos por obrigação legal/segurança, com prazos concretos.
  - A página tem um link direto para a Política de Privacidade para mais contexto.
