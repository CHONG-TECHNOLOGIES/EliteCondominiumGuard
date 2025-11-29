# Elite CondoGuard - Documentação do Projeto

## Visão Geral

**Elite CondoGuard** é uma aplicação Progressive Web App (PWA) para gestão de portaria de condomínios. A aplicação funciona em modo offline-first, permitindo que guardas de segurança registrem visitas, entregas e incidentes mesmo sem conexão à internet, sincronizando automaticamente quando a conexão é restaurada.

### Tecnologias Principais
- **React 19.2** com TypeScript
- **React Router DOM 7.9** para navegação
- **Vite 6.2** como bundler
- **Dexie.js 4.0** para armazenamento local IndexedDB
- **Supabase 2.86** como backend/database
- **Google Generative AI 1.30** para análise de imagens
- **Lucide React** para ícones
- **Tailwind CSS** para estilização

---

## Arquitetura do Projeto

### Estrutura de Pastas

```
src/
├── App.tsx                    # Componente principal com rotas e contexto de autenticação
├── index.tsx                  # Entry point da aplicação
├── types.ts                   # Definições TypeScript de todos os tipos
├── metadata.json              # Metadados do projeto
├── components/
│   └── CameraCapture.tsx      # Componente de captura de foto
├── pages/
│   ├── Login.tsx              # Página de login com PIN
│   ├── Dashboard.tsx          # Dashboard principal
│   ├── NewEntry.tsx           # Registro de nova visita/entrega
│   ├── DailyList.tsx          # Lista de atividades do dia
│   ├── Incidents.tsx          # Gestão de incidentes
│   └── Setup.tsx              # Configuração inicial do dispositivo
└── services/
    ├── db.ts                  # Configuração Dexie (IndexedDB)
    ├── dataService.ts         # Camada de abstração de dados (offline-first)
    ├── supabaseClient.ts      # Cliente Supabase
    ├── mockSupabase.ts        # Mock do Supabase para desenvolvimento
    └── geminiService.ts       # Integração com Google Generative AI
```

---

## Fluxo de Dados (Offline-First Architecture)

### Estratégia de Sincronização

A aplicação utiliza uma arquitetura **Cache-Then-Network** com fallback offline:

```
┌─────────────────────────────────────────────────┐
│           Camada de Apresentação                │
│              (React Components)                 │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│          DataService (dataService.ts)           │
│   • Gerencia estado online/offline              │
│   • Health check do backend                     │
│   • Sincronização automática                    │
└───────────┬──────────────────────┬───────────────┘
            │                      │
            ▼                      ▼
┌──────────────────────┐  ┌───────────────────────┐
│   IndexedDB (Dexie)  │  │  Supabase Backend     │
│   • Armazenamento    │  │  • PostgreSQL         │
│     local            │  │  • Auth & RPC         │
│   • Cache primário   │  │  • Sincronização      │
└──────────────────────┘  └───────────────────────┘
```

### Health Score System

O `DataService` mantém um **health score** (0-3) para o backend:
- **3**: Backend saudável e responsivo
- **0**: Backend indisponível, modo offline completo

Quando uma requisição falha, o score é decrementado. Quando a conexão é restaurada, o score é resetado para 3.

---

## Modelos de Dados Principais

### Enums

```typescript
enum UserRole { ADMIN, GUARD }
enum VisitType { VISITOR, DELIVERY, SERVICE, STUDENT }
enum VisitStatus { PENDING, APPROVED, DENIED, INSIDE, LEFT }
enum SyncStatus { SYNCED, PENDING_SYNC }
enum ApprovalMode { APP, PHONE, INTERCOM, GUARD_MANUAL, QR_SCAN }
```

### Entidades Principais

#### Condominium
Representa um condomínio no sistema.
```typescript
interface Condominium {
  id: string;
  name: string;
  address?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  gps_radius_meters?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}
```

#### Device
Representa um tablet/dispositivo de portaria.
```typescript
interface Device {
  id?: string;
  device_identifier: string;  // Fingerprint único do dispositivo
  device_name?: string;
  condominium_id?: string;    // Associado a qual condomínio
  configured_at?: string;
  last_seen_at?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DECOMMISSIONED';
  metadata?: any;
}
```

#### Staff
Representa um guarda ou administrador.
```typescript
interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  pin_hash?: string;          // Hash bcrypt do PIN
  condominium_id: string;
  condominium?: Condominium;
  role: UserRole;
}
```

#### Visit
Representa uma visita/entrega registrada.
```typescript
interface Visit {
  id: string;
  condominium_id: string;
  visitor_name: string;
  visitor_doc?: string;
  visitor_phone?: string;
  visit_type: string;         // Nome ou ID
  visit_type_id?: string;     // UUID real
  service_type?: string;
  service_type_id?: string;
  unit_id: string;
  reason?: string;
  photo_url?: string;
  qr_token?: string;
  check_in_at: string;
  check_out_at?: string;
  status: VisitStatus;
  approval_mode?: ApprovalMode;
  sync_status: SyncStatus;
  guard_id: string;
}
```

#### Unit
Representa uma fração/unidade no condomínio.
```typescript
interface Unit {
  id: string;
  condominium_id: string;
  block: string;
  number: string;
  residents: Resident[];
}
```

#### Incident
Representa um incidente reportado.
```typescript
interface Incident {
  id: string;
  condominium_id: string;
  title: string;
  description: string;
  severity: 'BAIXA' | 'MÉDIA' | 'ALTA';
  status: 'ABERTO' | 'VISTO' | 'RESOLVIDO';
  reported_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}
```

---

## Fluxo de Autenticação

### 1. Configuração Inicial (Setup)
```
Setup.tsx → configureDevice(condoId)
    ↓
DataService registra o dispositivo no Supabase
    ↓
Salva configuração localmente (IndexedDB)
    ↓
Redireciona para /login
```

### 2. Login
```
Login.tsx → login(firstName, lastName, pin)
    ↓
[ONLINE] → SupabaseService.verifyStaffLogin()
    ↓
Verifica se staff pertence ao condomínio do dispositivo
    ↓
Sincroniza lista de staff + configurações
    ↓
[OFFLINE FALLBACK] → Verifica PIN hash localmente (bcrypt)
    ↓
AuthContext.login(staff)
```

### 3. Proteção de Rotas
```tsx
<ProtectedRoute>
  → Verifica se user existe no AuthContext
  → Se não: Navigate to="/login"
  → Se sim: Renderiza <Layout>{children}</Layout>
</ProtectedRoute>

<ConfigGuard>
  → Verifica se dispositivo está configurado
  → Se não: Navigate to="/setup"
  → Se sim: Renderiza children
</ConfigGuard>
```

---

## Páginas e Funcionalidades

### 1. Setup (/setup)
**Objetivo**: Configurar o tablet associando-o a um condomínio.

**Funcionalidades**:
- Lista condomínios ativos
- Seleciona condomínio
- Registra dispositivo no backend
- Salva configuração localmente

**Estado**:
- Primeira execução: sempre exibe setup
- Após configuração: redireciona para login

---

### 2. Login (/login)
**Objetivo**: Autenticação de guardas/staff com PIN.

**Funcionalidades**:
- Input de Nome e Sobrenome
- Input de PIN (4-6 dígitos)
- Validação online (Supabase RPC)
- Fallback offline (bcrypt local)

**Validações**:
- Staff deve pertencer ao condomínio configurado no dispositivo
- PIN deve estar correto (hash bcrypt)

---

### 3. Dashboard (/)
**Objetivo**: Tela principal com visão geral e acesso rápido.

**Funcionalidades**:
- Exibe nome do condomínio
- Indicador de status online/offline
- Menu de navegação:
  - Nova Entrada
  - Atividade Diária
  - Incidentes
  - Configurações (admin)

---

### 4. NewEntry (/new-entry)
**Objetivo**: Registrar nova visita/entrega.

**Funcionalidades**:
- Seleção de tipo de visita (Visitante, Entrega, Serviço, Estudante)
- Se "Serviço": seleciona tipo de serviço (Obras, Mudanças, etc.)
- Input de dados do visitante (nome, documento, telefone)
- Seleção de unidade (bloco + número)
- Captura de foto (opcional)
- Modo de aprovação:
  - Aplicativo (gera notificação push)
  - Telefone (guarda liga para residente)
  - Interfone
  - Manual (guarda autoriza diretamente)
  - QR Code (visitante escaneia código)
- Salva localmente com `sync_status: PENDING_SYNC`
- Sincroniza automaticamente quando online

---

### 5. DailyList (/day-list)
**Objetivo**: Lista de todas as entradas do dia.

**Funcionalidades**:
- Exibe visitas de hoje
- Filtros por status (Pendente, Autorizado, No Interior, Saiu)
- Marcar entrada/saída
- Atualizar status

---

### 6. Incidents (/incidents)
**Objetivo**: Reportar e visualizar incidentes.

**Funcionalidades**:
- Criar novo incidente
- Classificar gravidade (Baixa, Média, Alta)
- Adicionar descrição
- Marcar como "Visto" ou "Resolvido"
- Sincronização automática com backend

---

## Serviços e Integrações

### DataService (dataService.ts)
**Responsabilidades**:
- Abstração da camada de dados
- Gerenciamento offline/online
- Sincronização automática
- Health check do backend
- Heartbeat do dispositivo (a cada 5 minutos)

**Métodos Principais**:
```typescript
// Setup
isDeviceConfigured(): Promise<boolean>
getDeviceCondoDetails(): Promise<Condominium | null>
configureDevice(condoId: string): Promise<boolean>
resetDevice(): Promise<void>

// Auth
login(firstName, lastName, pin): Promise<Staff | null>

// Configurações
getVisitTypes(): Promise<VisitTypeConfig[]>
getServiceTypes(): Promise<ServiceTypeConfig[]>

// Visitas
getTodaysVisits(): Promise<Visit[]>
createVisit(visitData): Promise<Visit>
updateVisitStatus(visitId, status): Promise<void>

// Sincronização
syncPendingItems(): Promise<number>

// Outros
getUnits(): Promise<Unit[]>
getIncidents(): Promise<Incident[]>
checkOnline(): boolean
```

---

### SupabaseService (supabaseClient.ts)
**Responsabilidades**:
- Comunicação com backend Supabase
- RPC calls para lógica de negócio
- Autenticação e autorização

**RPCs Importantes**:
```sql
-- Autenticação
verify_staff_login(p_first_name, p_last_name, p_pin_cleartext)

-- Device Management
register_device(p_device_identifier, p_device_name, p_condominium_id, p_metadata)
update_device_heartbeat(p_device_identifier)

-- Sincronização
get_staff_for_sync(p_condominium_id)
get_visit_types(p_condominium_id)
get_service_types()
```

---

### Dexie Database (db.ts)
**Responsabilidades**:
- Armazenamento local persistente
- Cache de dados para modo offline
- Sincronização de dados pendentes

**Tabelas**:
```typescript
visits        // Visitas registradas
units         // Unidades do condomínio
visitTypes    // Tipos de visita configurados
serviceTypes  // Tipos de serviço configurados
settings      // Configurações do dispositivo
staff         // Lista de guardas (cache)
condominiums  // Lista de condomínios (cache)
```

---

### Gemini Service (geminiService.ts)
**Responsabilidades**:
- Análise de fotos de visitantes
- Extração de informações de documentos
- OCR de placas de veículos (futuro)

---

## Estratégias de Sincronização

### 1. Sincronização de Configurações (Cache-Then-Network)
```typescript
async getVisitTypes(): Promise<VisitTypeConfig[]> {
  // 1. Retorna dados locais imediatamente (se existirem)
  const local = await db.visitTypes.toArray();
  if (local.length > 0) {
    // Fire-and-forget: sincroniza em background
    if (this.isBackendHealthy) {
      this.refreshConfigs(this.currentCondoId);
    }
    return local;
  }

  // 2. Se não há dados locais, aguarda sincronização
  if (this.isBackendHealthy) {
    await this.refreshConfigs(this.currentCondoId);
    return await db.visitTypes.toArray();
  }

  // 3. Fallback: dados hardcoded
  return DEFAULT_VISIT_TYPES;
}
```

### 2. Sincronização de Visitas (Write-Through with Retry)
```typescript
async createVisit(visitData: Partial<Visit>): Promise<Visit> {
  const visit = {
    id: generateUUID(),
    ...visitData,
    sync_status: SyncStatus.PENDING_SYNC,
    check_in_at: new Date().toISOString()
  };

  // 1. Salva localmente SEMPRE
  await db.visits.put(visit);

  // 2. Tenta enviar ao backend (se online)
  if (this.isBackendHealthy) {
    try {
      await SupabaseService.createVisit(visit);
      visit.sync_status = SyncStatus.SYNCED;
      await db.visits.put(visit);
    } catch (e) {
      console.warn("Visit saved locally, will sync later");
      this.backendHealthScore--;
    }
  }

  return visit;
}
```

### 3. Sincronização Pendente (Background Sync)
```typescript
async syncPendingItems(): Promise<number> {
  if (!this.isBackendHealthy) return 0;

  const pendingVisits = await db.visits
    .where('sync_status')
    .equals(SyncStatus.PENDING_SYNC)
    .toArray();

  let synced = 0;
  for (const visit of pendingVisits) {
    try {
      await SupabaseService.createVisit(visit);
      visit.sync_status = SyncStatus.SYNCED;
      await db.visits.put(visit);
      synced++;
    } catch (e) {
      console.error("Failed to sync visit", visit.id, e);
      this.backendHealthScore--;
      break; // Para na primeira falha
    }
  }

  return synced;
}
```

---

## Componentes Reutilizáveis

### AuthContext
Gerencia o estado global de autenticação.

```typescript
interface AuthContextType {
  user: Staff | null;
  login: (user: Staff) => void;
  logout: () => void;
}

export const AuthContext = React.createContext<AuthContextType>(null!);
```

**Uso**:
```tsx
const { user, login, logout } = React.useContext(AuthContext);
```

---

### Layout Component
Header padrão com informações do usuário e status online/offline.

**Features**:
- Logo do condomínio
- Nome do condomínio
- Título da página atual
- Indicador online/offline
- Nome do usuário logado
- Botão de logout

---

### CameraCapture Component
Captura de foto com preview.

**Props**:
```typescript
interface CameraCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  onCancel?: () => void;
}
```

---

## Considerações de Segurança

### 1. Autenticação
- PINs são armazenados com **bcrypt** (hash + salt)
- Nunca armazenar PINs em plaintext
- Validação de condomínio: staff só pode fazer login no dispositivo do seu condomínio

### 2. Device Fingerprinting
- Cada dispositivo tem um identificador único gerado no primeiro acesso
- Armazenado em `localStorage` e sincronizado com backend
- Permite rastreabilidade e auditoria

### 3. Offline Security
- Dados sensíveis criptografados no IndexedDB (futuro)
- PIN validation offline usa hash bcrypt local
- Logs de auditoria para todas as ações críticas

---

## Performance e Otimizações

### 1. Code Splitting
- Lazy loading de páginas (futuro)
- Dynamic imports para componentes pesados

### 2. IndexedDB
- Índices otimizados para queries frequentes
- Bulk operations para sincronização
- Clear strategy para evitar dados obsoletos

### 3. Network Optimizations
- Debounce em sincronizações automáticas
- Retry logic com exponential backoff
- Health check a cada 1 minuto
- Heartbeat a cada 5 minutos

---

## Configuração e Deployment

### Variáveis de Ambiente
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### Build
```bash
npm run build
```

### Development
```bash
npm run dev
```

### Preview (Production Build)
```bash
npm run preview
```

---

## Roadmap / Melhorias Futuras

### Funcionalidades
- [ ] Notificações push para residentes (aprovação de visitas)
- [ ] QR Code para visitantes recorrentes
- [ ] Biometria facial para identificação
- [ ] Integração com câmeras IP
- [ ] Histórico completo de visitas (exportação CSV/PDF)
- [ ] Dashboard analytics (admin)
- [ ] Gestão de veículos e estacionamento
- [ ] Chat interno entre guardas

### Técnicas
- [ ] Service Worker para PWA completo
- [ ] Background sync API
- [ ] Criptografia E2E para dados sensíveis
- [ ] Suporte multi-idioma (i18n)
- [ ] Testes automatizados (Jest + Testing Library)
- [ ] CI/CD pipeline
- [ ] Monitoring e error tracking (Sentry)

---

## Troubleshooting Comum

### 1. "Dispositivo não configurado"
**Causa**: IndexedDB foi limpo ou setup não foi concluído.
**Solução**: Navegar para `/setup` e reconfigurar o dispositivo.

### 2. Login falha em modo offline
**Causa**: Staff não foi sincronizado antes de ficar offline.
**Solução**: Conectar à internet e fazer login uma vez para sincronizar dados.

### 3. Visitas não aparecem na lista
**Causa**: Filtro de data ou condomínio incorreto.
**Solução**: Verificar se `currentCondoId` está correto e se a data é de hoje.

### 4. Sincronização travada
**Causa**: Backend retornando erros consecutivos, health score = 0.
**Solução**: Verificar logs do console, reiniciar app, verificar conectividade.

---

## Contato e Suporte

**Desenvolvedor**: Chong Technologies
**Projeto**: Elite CondoGuard
**Versão**: 0.0.0 (Alpha)
**Última Atualização**: 2025

---

## Licença
Propriedade de Chong Technologies. Todos os direitos reservados.
