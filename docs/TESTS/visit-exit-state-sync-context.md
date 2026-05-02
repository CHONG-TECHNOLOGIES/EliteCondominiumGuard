# Correção: sincronização do estado de saída entre DailyList e Dashboard

## Contexto

Foi identificado um problema no fluxo de saída de visitantes: o guarda marcava a saída com sucesso, confirmava no popup, mas o botão `Saída` ou `Marcar Saída` podia voltar a aparecer.

O problema era mais visível ao alternar rapidamente entre `DailyList` e `Dashboard`, antes do próximo refresh automático da interface. O comportamento esperado é simples: depois de marcar a saída, a visita deixa de expor qualquer ação de saída e deve ficar disponível apenas para consulta e histórico.

---

## Sintoma Reproduzido

O cenário reproduzido foi o seguinte:

1. O guarda abre uma visita com estado `NO INTERIOR`.
2. Marca `Saída` num dos ecrãs.
3. Navega rapidamente para o outro ecrã antes do próximo polling ou refresh natural.
4. A visita ainda pode aparecer em `Em Progresso` ou continuar a mostrar o botão de saída, apesar de já ter sido marcada como `SAIU`.

---

## Causa Raiz

Foram identificadas duas causas principais:

1. `getTodaysVisits()` podia voltar a preferir um registo antigo vindo do backend logo após a atualização local, reintroduzindo temporariamente um estado anterior da visita.
2. `DailyList` e `Dashboard` dependiam sobretudo de mount, polling e foco para recarregar dados, sem reagirem imediatamente à alteração de estado da visita.

Na prática, isso criava uma janela curta em que a UI podia voltar a renderizar a visita como se ainda estivesse `NO INTERIOR`.

---

## Comportamento Implementado

A correção aplicada segue estas regras:

1. O merge em `getTodaysVisits()` deve preservar o registo local quando ele já estiver num estado mais avançado do que o vindo do backend.
2. Se a visita local já tiver `check_out_at`, esse registo local deve continuar a ser preferido durante o merge.
3. A atualização de estado em `updateVisitStatus()` deve emitir um evento global `VISITS_CHANGED_EVENT`.
4. `DailyList` e `Dashboard` devem recarregar imediatamente quando esse evento ocorre.
5. `DailyList` e `Dashboard` também devem recarregar quando a app ganha foco ou quando o separador volta a ficar visível.

Com isso, a visita marcada como `SAIU` deixa de reaparecer com ação de saída noutro ecrã por atraso de sincronização visual.

---

## Componentes/Serviços Envolvidos

- [dataService.ts](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/services/dataService.ts)
- [DailyList.tsx](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/pages/DailyList.tsx)
- [Dashboard.tsx](/c:/CHONG/CHONGTECHNOLOGIES/PROJECTS/ELITECONDOGUARD/APPGUARD/src/pages/Dashboard.tsx)

Pontos técnicos relevantes:

- `VISITS_CHANGED_EVENT` foi introduzido para notificar mudanças de estado das visitas.
- `getTodaysVisits()` passou a aplicar uma regra de merge que protege o estado local mais avançado.
- As páginas afetadas passaram a usar refresh reativo, além do polling já existente.

---

## Casos de Teste Manuais

- [ ] `DailyList` -> marcar `Saída` -> confirmar que o botão desaparece na própria tela.
- [ ] `DailyList` -> após marcar `Saída` -> confirmar que `Histórico` continua acessível.
- [ ] `DailyList` -> marcar `Saída` -> navegar imediatamente para `Dashboard` -> confirmar que a visita deixa de aparecer em `Em Progresso`.
- [ ] `Dashboard` -> marcar `Marcar Saída` -> navegar imediatamente para `DailyList` -> confirmar que o botão `Saída` não reaparece.
- [ ] Marcar saída e depois trocar de aba, minimizar ou reabrir a app -> confirmar que o estado continua `SAIU`.
- [ ] Validar o comportamento online com backend disponível.
- [ ] Validar que o refresh natural da UI não reintroduz a ação de saída.
- [ ] Confirmar que uma visita ainda em `NO INTERIOR` continua a mostrar o botão de saída normalmente.
- [ ] Confirmar que uma visita já carregada do backend como `SAIU` nunca mostra `Saída` nem `Marcar Saída`.

---

## Resultado Esperado

Depois desta correção:

- uma visita com estado `SAIU` nunca deve voltar a expor ação de saída;
- `Histórico` deve continuar acessível para consulta da visita;
- `DailyList` e `Dashboard` devem manter consistência visual entre si;
- a UI não deve depender apenas do polling para refletir a saída já confirmada.

---

## Notas de Validação

- A build `npm run build` foi executada com sucesso durante a validação desta correção.
- A build pode regenerar ficheiros em `src/dist/`, o que é esperado no fluxo atual do projeto.

