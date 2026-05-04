# Plano: Fixar Fuso Horário — Hora de Angola (Africa/Luanda) em Toda a App

## Context

As horas exibidas na app (ex: "08:59 AM" na DailyList) dependem do fuso horário do dispositivo/browser, não do fuso de Angola. Angola usa **WAT (West Africa Time) = UTC+1**, identificador IANA: `Africa/Luanda`. Não há horário de verão.

**Raiz do problema**: Todas as chamadas `toLocaleString('pt-PT')`, `toLocaleTimeString()`, `toLocaleDateString()` no frontend não especificam `timeZone`, logo usam o fuso do dispositivo. Se o tablet estiver configurado para UTC ou Europe/Lisbon, as horas ficam erradas.

**Fuso do servidor Supabase**: Irrelevante para o display — PostgreSQL armazena `timestamptz` em UTC internamente e devolve strings ISO UTC (ex: `2026-04-27T08:59:00+00:00`). A conversão acontece no frontend.

**Solução**: Criar um utilitário central `src/utils/datetime.ts` com formatadores que usam sempre `timeZone: 'Africa/Luanda'`, e substituir todos os call sites.

---

## Abordagem

### Passo 1 — Criar `src/utils/datetime.ts`

Novo ficheiro com funções de formatação centralizadas, todas com `timeZone: 'Africa/Luanda'`:

```typescript
const TZ = 'Africa/Luanda';

// "08:59" — hora curta para listas
export function formatTime(dateTime: string | Date): string {
  return new Date(dateTime).toLocaleTimeString('pt-AO', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "27/04/2026 08:59" — data+hora completa
export function formatDateTime(dateTime: string | Date): string {
  return new Date(dateTime).toLocaleString('pt-AO', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "27/04/2026 08:59:35" — data+hora+segundo para auditoria
export function formatDateTimeWithSeconds(dateTime: string | Date): string {
  return new Date(dateTime).toLocaleString('pt-AO', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// "27/04/2026" — só data
export function formatDate(dateTime: string | Date): string {
  return new Date(dateTime).toLocaleDateString('pt-AO', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Timestamp para strings de notas/audit (ex: "[27/04/2026, 08:59]")
export function formatTimestampLabel(): string {
  return new Date().toLocaleString('pt-AO', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

### Passo 2 — Substituir todos os call sites (17 locais em 15 ficheiros)

| Ficheiro | Linha(s) | Função atual | Substituir por |
|----------|----------|--------------|----------------|
| `src/pages/DailyList.tsx` | 280 | `formatDateTime()` local com `toLocaleString('pt-PT', ...)` | `formatDateTime()` do utilitário |
| `src/pages/DailyList.tsx` | 368, 488 | `toLocaleTimeString([], {...})` (sem locale, sem TZ) | `formatTime()` |
| `src/pages/Incidents.tsx` | 13-17 | `formatActionDate()` com `toLocaleString('pt-PT')` | `formatDateTime()` |
| `src/pages/Incidents.tsx` | 457, 464, 467 | inline `toLocaleString('pt-PT')` | `formatDateTime()` |
| `src/pages/Dashboard.tsx` | 593 | `toLocaleTimeString([], {...})` (sem TZ) | `formatTime()` |
| `src/pages/News.tsx` | 73 | `toLocaleDateString('pt-PT', {...})` | `formatDate()` |
| `src/pages/admin/AdminAnalytics.tsx` | 73-78 | `toLocaleTimeString('pt-PT', {...})` | `formatTime()` |
| `src/pages/admin/AdminAuditLogs.tsx` | 253 | `toLocaleString('pt-PT', {...})` | `formatDateTime()` |
| `src/pages/admin/AdminDeviceRegistrationErrors.tsx` | 54 | `toLocaleString('pt-PT', {...})` | `formatDateTime()` |
| `src/pages/admin/AdminIncidents.tsx` | 247, 292 | `toLocaleString('pt-PT', {...})` | `formatDateTime()` |
| `src/pages/admin/AdminVisits.tsx` | 338 | `toLocaleString('pt-PT', {...})` | `formatDateTime()` |
| `src/pages/admin/AdminDevices.tsx` | 321, 499, 507 | `toLocaleString('pt-PT')` | `formatDateTime()` |
| `src/pages/admin/AdminResidents.tsx` | 444 | `toLocaleDateString('pt-PT', {...})` | `formatDate()` |
| `src/pages/admin/AdminNews.tsx` | 532 | `toLocaleDateString('pt-PT', {...})` | `formatDate()` |
| `src/utils/csvExport.ts` | 62, 213 | `toLocaleString('pt-PT', {...})` | `formatDateTime()` / `formatTimestampLabel()` |
| `src/services/Supabase.ts` | 909, 2361 | `toLocaleString('pt-PT', {...})` para label de nota | `formatTimestampLabel()` |
| `src/services/dataService.ts` | 2306 | `toLocaleString('pt-PT', {...})` para label de audit | `formatTimestampLabel()` |

> **AdminSubscriptions.tsx** — as chamadas `toLocaleDateString('pt-AO')` para datas de pagamento (linhas 802, 1048) precisam de `timeZone: 'Africa/Luanda'` nas opções.

---

## Ficheiros a Modificar

- **CRIAR**: `src/utils/datetime.ts`
- **MODIFICAR** (15 ficheiros):
  - `src/pages/DailyList.tsx`
  - `src/pages/Incidents.tsx`
  - `src/pages/Dashboard.tsx`
  - `src/pages/News.tsx`
  - `src/pages/admin/AdminAnalytics.tsx`
  - `src/pages/admin/AdminAuditLogs.tsx`
  - `src/pages/admin/AdminDeviceRegistrationErrors.tsx`
  - `src/pages/admin/AdminIncidents.tsx`
  - `src/pages/admin/AdminVisits.tsx`
  - `src/pages/admin/AdminDevices.tsx`
  - `src/pages/admin/AdminResidents.tsx`
  - `src/pages/admin/AdminNews.tsx`
  - `src/pages/admin/AdminSubscriptions.tsx`
  - `src/utils/csvExport.ts`
  - `src/services/Supabase.ts`
  - `src/services/dataService.ts`

---

## Verificação

1. Abrir a app em browser com TZ do sistema definido como UTC (Chrome DevTools → Sensors → Location).
2. Criar uma visita e verificar que a hora exibida na DailyList é UTC+1 (hora de Angola), não UTC.
3. Verificar que as horas no histórico de incidentes e admin também aparecem correctas.
4. Exportar CSV e confirmar que os timestamps estão em hora de Angola.
5. Verificar `npm run lint` sem erros após as alterações.
