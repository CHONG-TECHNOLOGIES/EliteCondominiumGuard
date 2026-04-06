import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BellRing,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  LogOut,
  MapPin,
  Newspaper,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  UserCog,
  Users,
  WifiOff
} from 'lucide-react';

interface FeatureCard {
  title: string;
  description: string;
  points: string[];
  icon: React.ReactNode;
  targetId?: string;
}

interface StepGuide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  steps: string[];
  result?: string;
  warning?: string;
  tip?: string;
}

interface StatusGuide {
  title: string;
  meaning: string;
  action: string;
}

interface QuickNavItem {
  label: string;
  targetId: string;
}

const pageNav: QuickNavItem[] = [
  { label: 'Primeiros passos', targetId: 'primeiros-passos' },
  { label: 'Guarda', targetId: 'guarda' },
  { label: 'Admin', targetId: 'admin' },
  { label: 'Super Admin', targetId: 'super-admin' },
  { label: 'Perguntas comuns', targetId: 'perguntas-comuns' }
];

const guardNav: QuickNavItem[] = [
  { label: 'Inicio do turno', targetId: 'guarda-inicio' },
  { label: 'Nova entrada', targetId: 'guarda-nova-entrada' },
  { label: 'Lista do dia', targetId: 'guarda-lista' },
  { label: 'Incidentes', targetId: 'guarda-incidentes' },
  { label: 'Offline', targetId: 'guarda-offline' },
  { label: 'Duvidas rapidas', targetId: 'guarda-duvidas' }
];

const profileCards: FeatureCard[] = [
  {
    title: 'Guarda',
    description: 'Opera a portaria, regista entradas, acompanha incidentes e fecha saidas.',
    icon: <ShieldCheck size={22} />,
    targetId: 'guarda',
    points: [
      'Usa Dashboard, Nova Entrada, Lista do Dia, Incidentes, Pesquisa de Morador e Noticias.',
      'Trabalha online e offline, mas QR e aprovacao por aplicativo dependem de internet.',
      'Precisa de um guia operacional claro para agir rapido durante o turno.'
    ]
  },
  {
    title: 'Admin',
    description: 'Gere o condominio do seu perfil e mantem cadastros, noticias e operacao administrativa.',
    icon: <UserCog size={22} />,
    targetId: 'admin',
    points: [
      'Administra staff, unidades, moradores, dispositivos, tipos de visita e de servico.',
      'Acompanha visitas, incidentes, pagamentos e configuracao do condominio.',
      'Consulta analytics, exportacoes e logs de auditoria.'
    ]
  },
  {
    title: 'Super Admin',
    description: 'Tem visao global, governa varios condominios e controla funcoes de alto privilegio.',
    icon: <Building2 size={22} />,
    targetId: 'super-admin',
    points: [
      'Acede a varios condominios e pode entrar em tablets sem ficar preso ao condominio do dispositivo.',
      'Cria outros Super Admins e faz sincronizacao global.',
      'Controla assinaturas, regras de preco, cobranca e supervisao global.'
    ]
  }
];

const gettingStarted: FeatureCard[] = [
  {
    title: 'Ativar o tablet',
    description: 'O ecran /setup aparece quando o dispositivo ainda nao esta associado.',
    icon: <Smartphone size={22} />,
    points: [
      'Selecione o condominio correto e toque em "CONFIRMAR E ATIVAR".',
      'Se este tablet ja foi usado antes e houver internet, prefira "Recuperar Dispositivo Existente".',
      'Se o sistema informar que o condominio ja esta associado, chame um admin para substituir ou recuperar o dispositivo.'
    ]
  },
  {
    title: 'Entrar na aplicacao',
    description: 'O login normal e feito com nome, apelido e PIN numerico.',
    icon: <ShieldCheck size={22} />,
    points: [
      'O guarda entra com Nome, Apelido e PIN de 4 a 6 digitos e toca em "ENTRAR".',
      'Guarda e levado para o Dashboard; Admin e Super Admin vao para /admin.',
      'Offline, o primeiro login do utilizador precisa de ja ter sido feito online pelo menos uma vez.'
    ]
  },
  {
    title: 'Confirmar o estado da app',
    description: 'A app e offline-first, mas nem tudo funciona do mesmo modo sem internet.',
    icon: <WifiOff size={22} />,
    points: [
      'No turno do guarda, confirme se a app esta ONLINE ou OFFLINE.',
      'Registos e alteracoes podem ser feitos offline e sincronizados depois.',
      'QR Code e aprovacao por aplicativo precisam de ligacao ativa.'
    ]
  }
];

const guardSummaryCards: FeatureCard[] = [
  {
    title: 'Dashboard',
    description: 'Ponto de partida do turno e painel de controlo rapido.',
    icon: <ShieldCheck size={22} />,
    points: [
      'Mostra o estado atual da portaria e visitas em progresso.',
      'Se aparecer "Ativar Som", toque uma vez para liberar alertas sonoros.',
      'Acompanhe dali os contadores de visitas e incidentes.'
    ]
  },
  {
    title: 'Nova Entrada',
    description: 'Fluxo principal para registar qualquer acesso.',
    icon: <ClipboardList size={22} />,
    points: [
      'Trabalha em 3 passos: tipo de visita, dados do visitante e foto/aprovacao.',
      'QR Code pode preencher dados automaticamente quando existir e for valido.',
      'Restaurante e desporto usam entrada livre, sem aprovacao previa.'
    ]
  },
  {
    title: 'Lista do Dia',
    description: 'Consulta, pesquisa, historico e registo de saida.',
    icon: <FileText size={22} />,
    points: [
      'Pesquise por nome ou telefone.',
      'Use "Historico" para ver eventos, tempos e alteracoes.',
      'Use "Saida" para fechar visitas autorizadas ou no interior.'
    ]
  },
  {
    title: 'Incidentes',
    description: 'Area de resposta do guarda para ocorrencias e alertas.',
    icon: <BellRing size={22} />,
    points: [
      'Incidentes novos disparam banner, som e vibracao quando o audio esta ativo.',
      'Primeiro confirme leitura; depois reporte a acao tomada.',
      'A descricao da acao e obrigatoria ao marcar "Em Progresso" ou "Resolvido".'
    ]
  }
];

const guardStartGuides: StepGuide[] = [
  {
    id: 'guarda-inicio',
    eyebrow: 'Rotina de abertura',
    title: 'O que o guarda deve fazer no inicio do turno',
    description: 'Este e o checklist minimo para comecar a operar sem perder alertas nem registos.',
    steps: [
      'No login, confirme se o nome do condominio apresentado esta correto para o tablet em uso.',
      'Introduza Nome, Apelido e PIN. Se falhar offline, ligue o tablet a internet e faca um login online pelo menos uma vez.',
      'Assim que entrar no Dashboard, verifique se o cabecalho indica ONLINE ou OFFLINE.',
      'Se aparecer o botao laranja "Ativar Som", toque uma vez e confirme que o estado muda para "Alertas Ativos".',
      'Leia a area "Em Progresso" para perceber se ha visitantes pendentes, autorizados ou no interior antes de atender a proxima chegada.',
      'Se o tablet regressou agora de um periodo offline, aguarde a sincronizacao ou use o fluxo de sincronizacao definido pela equipa.'
    ],
    result: 'O guarda comeca o turno com audio ativo, estado da ligacao conhecido e sem visitas antigas esquecidas.'
  },
  {
    id: 'guarda-painel',
    eyebrow: 'Mapa do ecran principal',
    title: 'Como interpretar o Dashboard',
    description: 'O Dashboard nao e apenas menu. Ele mostra o que merece atencao imediata.',
    steps: [
      'Use "Nova Entrada" sempre que uma pessoa chegar e ainda nao estiver registada.',
      'Use "Lista do Dia" para localizar uma visita ja criada, consultar historico e registar saida.',
      'Use "Incidentes" assim que surgir contador vermelho ou banner de novo incidente.',
      'Use "Pesquisar Morador" quando precisar confirmar unidade, nome ou telefone de um residente.',
      'Use "Ultimas Noticias" para ler comunicados recentes que possam afetar o atendimento na portaria.',
      'Na secao "Em Progresso", atue diretamente: PENDENTE pede contacto; AUTORIZADO permite "Marcar Interior"; NO INTERIOR permite "Marcar Saida".'
    ],
    tip: 'Se o guarda estiver com duvida sobre um visitante que ja foi registado, comece por "Em Progresso" ou "Lista do Dia", nao por "Nova Entrada".'
  }
];

const guardEntryGuides: StepGuide[] = [
  {
    id: 'guarda-nova-entrada',
    eyebrow: 'Fluxo principal',
    title: 'Como usar Nova Entrada sem se perder',
    description: 'O registo tem sempre 3 passos. O segredo e escolher o tipo certo logo no inicio.',
    steps: [
      'Toque em "Nova Entrada" no Dashboard.',
      'No Passo 1, escolha o tipo de visita que mais corresponde ao caso: visitante, entrega, servico, estudante ou outras categorias configuradas no condominio.',
      'Se o tipo escolhido for visitante, entrega ou servico, a app pergunta "Dispoe de QR Code?".',
      'Se escolher "Nao", segue para os dados manuais no Passo 2. Se escolher "Sim", o fluxo vai preparar a leitura no Passo 3.',
      'No Passo 2, preencha no minimo o Nome Completo e selecione corretamente a Unidade de Destino, exceto em restaurante ou desporto.',
      'No Passo 3, confirme foto e metodo de aprovacao ou, no caso de entrada livre, finalize o registo.'
    ],
    result: 'Regra pratica: se ja existe QR valido, use QR; se nao existe, complete o formulario e confirme com o metodo de aprovacao disponivel.'
  },
  {
    id: 'guarda-qr',
    eyebrow: 'Scenario 1',
    title: 'Visitante com QR Code',
    description: 'Use este fluxo quando o visitante ja traz um QR emitido previamente pelo sistema.',
    steps: [
      'Em "Nova Entrada", escolha o tipo correto e responda "Sim" a pergunta sobre QR Code.',
      'No bloco de aprovacao do Passo 3, toque em "Scan QRCODE".',
      'Aponte a camara ao codigo e aguarde a validacao online.',
      'Se o QR for valido, a app preenche nome, telefone, unidade e motivo quando esses dados existirem.',
      'Confirme os dados mostrados em "Dados Lidos do QR".',
      'Toque em "CONFIRMAR ENTRADA".'
    ],
    result: 'No fluxo com QR valido, a app exige confirmacao do QR e nao exige foto adicional para habilitar a entrada.',
    warning: 'Se o tablet estiver offline, a propria pagina avisa que a validacao de QR requer internet.'
  },
  {
    id: 'guarda-sem-qr',
    eyebrow: 'Scenario 2',
    title: 'Visitante sem QR Code',
    description: 'Este e o caso mais comum para visitas normais, entregas e parte dos servicos.',
    steps: [
      'Escolha o tipo de visita e responda "Nao" quando a app perguntar sobre QR Code.',
      'No Passo 2, preencha Nome Completo. Documento, telefone, matricula e notas sao opcionais mas ajudam muito em auditoria e contacto.',
      'Toque em "Selecione a Unidade..." e pesquise por bloco, numero ou nome de morador.',
      'Toque em "Seguinte: Foto & Autorizacao".',
      'No Passo 3, capture a foto do visitante. Sem foto, o botao "REGISTAR ENTRADA" continua bloqueado.',
      'Escolha o metodo de aprovacao apresentado pela app e conclua o contacto necessario.',
      'Depois toque em "REGISTAR ENTRADA".'
    ],
    tip: 'Ao procurar unidade, use o nome do morador se o visitante nao souber o bloco ou o numero exato.'
  },
  {
    id: 'guarda-aprovacao',
    eyebrow: 'Escolha do metodo',
    title: 'Como decidir o modo de aprovacao',
    description: 'As opcoes mudam conforme internet e dados da unidade. O guarda nao deve estranhar se algumas opcoes desaparecerem.',
    steps: [
      'Se a app estiver ONLINE e a unidade tiver morador com aplicativo instalado, a opcao principal sera "Aplicativo".',
      'Se a unidade nao tiver app instalada, a pagina mostra aviso em amarelo e privilegia telefone, interfone ou aprovacao manual.',
      'Se o tablet estiver OFFLINE, a app so mostra metodos locais: telefone, interfone ou aprovacao manual.',
      'Ao escolher "Telefone", use o botao de chamada mostrado no proprio seletor.',
      'Ao escolher "Interfone", ative a chamada da unidade no seletor correspondente.',
      'Use "Aprovacao Manual" apenas quando isso fizer parte da operacao aprovada pelo condominio e a autorizacao ja tiver sido confirmada por outro meio interno.'
    ],
    warning: 'Na implementacao atual, o registo fica associado ao metodo escolhido, mas o guarda ainda deve acompanhar o estado da visita em "Em Progresso" e "Lista do Dia".'
  },
  {
    id: 'guarda-servico',
    eyebrow: 'Scenario 3',
    title: 'Prestador de servico',
    description: 'O servico precisa de detalhe extra para ficar auditavel.',
    steps: [
      'Escolha o tipo de visita de servico.',
      'No Passo 2, selecione obrigatoriamente o "Tipo de Servico".',
      'Informe nome, telefone e matricula sempre que possivel.',
      'Escolha a unidade de destino correta.',
      'Use o campo "Motivo / Notas" para registar empresa, tarefa ou material transportado.',
      'Passe para "Foto & Autorizacao", capture imagem e conclua o metodo de aprovacao.'
    ],
    result: 'O registo do servico fica mais facil de localizar depois em auditoria, historico e investigacao de incidentes.'
  },
  {
    id: 'guarda-entrada-livre',
    eyebrow: 'Scenario 4',
    title: 'Restaurante ou desporto',
    description: 'Estas categorias funcionam como entrada livre na versao atual.',
    steps: [
      'Escolha a categoria correspondente a restaurante ou desporto.',
      'No Passo 2, selecione o restaurante ou a instalacao desportiva. Nao existe escolha de unidade residencial neste fluxo.',
      'Avance para "Foto & Registo".',
      'Capture a foto do visitante.',
      'Confirme o resumo da visita e toque em "REGISTAR ENTRADA".'
    ],
    result: 'A app mostra "Entrada Livre": nao existe necessidade de aprovacao previa e o estado e criado como autorizado automaticamente.',
    tip: 'Este fluxo serve para controlo de acesso e historico. O visitante pode prosseguir diretamente depois do registo.'
  }
];

const guardStatusGuide: StatusGuide[] = [
  {
    title: 'PENDENTE',
    meaning: 'A visita foi criada, mas ainda exige acompanhamento do processo de autorizacao.',
    action: 'Use "Contactar morador" e acompanhe a resposta. No Dashboard, mantenha esta visita sob observacao.'
  },
  {
    title: 'AUTORIZADO',
    meaning: 'A visita ja foi aprovada e pode ser dada como entrada efetiva.',
    action: 'No Dashboard, use "Marcar Interior" quando o visitante realmente entrar.'
  },
  {
    title: 'NO INTERIOR',
    meaning: 'O visitante ja entrou e ainda nao foi dada saida.',
    action: 'Quando sair, use "Marcar Saida" no Dashboard ou "Saida" na Lista do Dia.'
  },
  {
    title: 'SAIU',
    meaning: 'O fluxo terminou e a visita esta encerrada.',
    action: 'Normalmente so precisa de consulta de historico.'
  },
  {
    title: 'NEGADO',
    meaning: 'A entrada nao foi autorizada.',
    action: 'Nao crie novo registo sem necessidade. Consulte o historico se precisar explicar o caso.'
  }
];

const guardListGuides: StepGuide[] = [
  {
    id: 'guarda-lista',
    eyebrow: 'Acompanhamento',
    title: 'Como usar a Lista do Dia',
    description: 'Esta pagina serve para localizar rapidamente um registo ja criado e fechar o ciclo da visita.',
    steps: [
      'Abra "Lista do Dia".',
      'Use a pesquisa por nome ou telefone se ja souber quem esta a procurar.',
      'Abra "Historico" para ver eventos da visita, horas e alteracoes de estado.',
      'Se a visita estiver AUTORIZADO ou NO INTERIOR, use "Saida" para concluir.',
      'Se a visita estiver PENDENTE, use "Contactar morador" para reforcar o contacto ou confirmar dados.',
      'Se precisar rever a foto, toque na imagem do visitante.'
    ],
    warning: 'Na versao atual, o botao "Autorizar" aparece desativado na Lista do Dia. A lista serve sobretudo para localizar, contactar e fechar saidas.'
  },
  {
    id: 'guarda-fluxo-rapido',
    eyebrow: 'Atalho mental',
    title: 'Regra rapida para nao duplicar registos',
    description: 'Quando o guarda esta sob pressao, o erro mais comum e criar uma nova entrada para quem ja esta no sistema.',
    steps: [
      'Se a pessoa acabou de chegar e ainda nao existe registo, use "Nova Entrada".',
      'Se a pessoa diz que ja foi autorizada ou que entrou ha pouco, verifique primeiro "Em Progresso" ou "Lista do Dia".',
      'Se a duvida for sobre o residente e nao sobre a visita, use "Pesquisar Morador".'
    ],
    result: 'Isto reduz filas, duplicacoes e erros de saida.'
  }
];

const guardIncidentGuides: StepGuide[] = [
  {
    id: 'guarda-incidentes',
    eyebrow: 'Resposta operacional',
    title: 'O que fazer quando surgir um incidente',
    description: 'O guarda deve agir por ordem: ver, confirmar leitura, atuar, registar a acao.',
    steps: [
      'Se aparecer banner vermelho de novo incidente, abra "Incidentes" imediatamente.',
      'Se o tablet nao tocou som, volte ao Dashboard ou ao topo da pagina e toque em "Ativar Som" ou "Testar Som".',
      'Leia o tipo, a descricao, o residente associado e a hora do reporte.',
      'Se o estado estiver "NOVO", toque em "Confirmar Leitura".',
      'Depois da verificacao inicial, use "Reportar Acao".',
      'Escolha "Em Progresso" se a situacao ainda esta em curso ou "Resolvido" se ja terminou.',
      'Descreva obrigatoriamente o que foi feito e o resultado obtido.',
      'Submeta a acao e confirme no historico do incidente se a nota ficou registada.'
    ],
    result: 'O incidente passa a ter trilho claro: visto pelo guarda, acao tomada, resultado e hora de fecho quando aplicavel.'
  },
  {
    id: 'guarda-audio',
    eyebrow: 'Som e vibracao',
    title: 'Como garantir que os alertas funcionam',
    description: 'Browsers e PWAs bloqueiam audio automatico ate haver uma interacao do utilizador.',
    steps: [
      'No inicio do turno, toque em "Ativar Som" se o botao estiver visivel.',
      'Confirme que aparece "Alertas Ativos".',
      'Se continuar sem ouvir som, entre em "Incidentes" e use "Testar Som".',
      'Verifique tambem o volume fisico do tablet.'
    ],
    warning: 'Se o guarda nunca ativar o som depois do login, pode ver o banner de incidente mas nao ouvir o alerta sonoro.'
  }
];

const guardOfflineGuides: StepGuide[] = [
  {
    id: 'guarda-offline',
    eyebrow: 'Continuidade de operacao',
    title: 'Como trabalhar offline sem perder controlo',
    description: 'A aplicacao foi feita para continuar a operar, mas o guarda precisa de saber o que muda.',
    steps: [
      'Continue a registar visitas e saidas normalmente. A app guarda os dados localmente e sincroniza depois.',
      'Use telefone, interfone ou aprovacao manual quando o seletor limitar as opcoes por falta de internet.',
      'Nao conte com QR Code nem aprovacao por aplicativo enquanto o estado estiver OFFLINE.',
      'Pesquisa de morador e noticias podem funcionar com dados em cache; se nao houver cache, a pagina informa.',
      'Quando a internet regressar, confirme se os registos pendentes foram sincronizados.'
    ],
    result: 'O trabalho nao para, mas o guarda deve ajustar o metodo de aprovacao e confirmar a sincronizacao assim que possivel.'
  },
  {
    id: 'guarda-fecho',
    eyebrow: 'Fim do turno',
    title: 'O que rever antes de entregar a portaria',
    description: 'Fechar bem o turno evita incidentes sem dono e visitantes esquecidos no sistema.',
    steps: [
      'Revise "Em Progresso" no Dashboard.',
      'Na "Lista do Dia", confirme se visitantes que ja sairam foram marcados como "SAIU".',
      'Em "Incidentes", veja se os que receberam acao estao com nota e estado correto.',
      'Avise o proximo guarda sobre qualquer visita ainda no interior ou incidente em progresso.'
    ],
    tip: 'O melhor fecho de turno e deixar o minimo de pendencias invisiveis para o colega seguinte.'
  },
  {
    id: 'guarda-duvidas',
    eyebrow: 'Duvidas do turno',
    title: 'Respostas rapidas para situacoes comuns do guarda',
    description: 'Use estas respostas quando o problema for mais operacional do que tecnico.',
    steps: [
      'A visita nao aparece: confirme se foi criada hoje, pesquise por telefone e verifique se nao esta em outro estado ou categoria.',
      'Nao sei a unidade: use "Pesquisar Morador" antes de inventar um registo.',
      'O visitante diz que ja foi autorizado: confira primeiro "Em Progresso" e depois "Lista do Dia".',
      'O QR falhou: leia a mensagem de erro, confirme internet e use "Tentar Novamente".',
      'Nao ha numero para ligar: use interfone ou siga o procedimento interno do condominio.',
      'A pagina ficou offline: continue a registar localmente e reporte a necessidade de validar QR apenas quando a ligacao voltar.'
    ]
  }
];

const adminFeatures: FeatureCard[] = [
  {
    title: '1. Organizar o condominio',
    description: 'O Admin mantem os dados base corretos para a portaria funcionar sem improvisos.',
    icon: <Users size={22} />,
    points: [
      'Atualize staff, unidades, moradores e dispositivos.',
      'Revise tipos de visita e de servico para que o guarda encontre as opcoes certas.',
      'Use importacao em massa de moradores quando houver grandes alteracoes.'
    ]
  },
  {
    title: '2. Operar a comunicacao',
    description: 'Noticias e configuracoes influenciam diretamente o trabalho do guarda.',
    icon: <Newspaper size={22} />,
    points: [
      'Publique noticias com titulo, descricao, categoria e imagem quando necessario.',
      'Mantenha restaurantes e desportos atualizados para o fluxo de entrada livre.',
      'Revise os cadastros sempre que um espaco comum abrir, fechar ou mudar de regra.'
    ]
  },
  {
    title: '3. Controlar visitas, incidentes e cobranca',
    description: 'O Admin acompanha o que aconteceu e corrige desvios operacionais.',
    icon: <ClipboardList size={22} />,
    points: [
      'Consulte visitas e incidentes com filtros e exportacao.',
      'Acompanhe assinaturas, pagamentos e alertas do seu condominio.',
      'Use analytics e audit logs para auditoria, reunioes e melhoria de processo.'
    ]
  }
];

const superAdminFeatures: FeatureCard[] = [
  {
    title: '1. Suporte transversal',
    description: 'O Super Admin consegue atuar em mais de um condominio e em mais de um dispositivo.',
    icon: <Building2 size={22} />,
    points: [
      'Acede ao painel administrativo global.',
      'Pode entrar em tablets sem ficar limitado ao condominio configurado no dispositivo.',
      'Faz apoio central a equipas locais.'
    ]
  },
  {
    title: '2. Governa perfis elevados',
    description: 'So o Super Admin deve administrar outros perfis de alto privilegio.',
    icon: <UserCog size={22} />,
    points: [
      'Cria e edita utilizadores SUPER_ADMIN.',
      'Mantem a hierarquia de acesso sob controlo.',
      'Intervem quando ha bloqueios de administracao local.'
    ]
  },
  {
    title: '3. Controla a visao financeira global',
    description: 'Acompanha receita, cobranca e regras globais de preco.',
    icon: <FileText size={22} />,
    points: [
      'Gere assinaturas e estados de cobranca em varios condominios.',
      'Aplica regras por faixa de residentes.',
      'Usa relatorios globais para supervisao da plataforma.'
    ]
  }
];

const supportTips = [
  'No turno do guarda, ative o som no inicio e confirme logo o estado "Alertas Ativos".',
  'Nao crie nova visita antes de pesquisar se a pessoa ja esta em "Em Progresso" ou "Lista do Dia".',
  'Preencha telefone, matricula e notas sempre que possivel. Isso poupa tempo em incidentes e auditoria.',
  'Se a unidade nao tiver app instalada, nao perca tempo a procurar aprovacao por aplicativo; use os metodos locais mostrados no ecran.',
  'Em restaurante e desporto, confirme o destino correto antes de registar, porque o sistema trata essas entradas como livres.'
];

const troubleshooting = [
  'Nao consigo entrar offline: esse utilizador provavelmente ainda nao ficou em cache. Ligue a internet e faca um login online.',
  'A app mostra /setup outra vez: o tablet perdeu configuracao local. Reative ou recupere o dispositivo.',
  'O QR nao valida: confirme internet, repita a leitura e, se preciso, volte ao fluxo sem QR conforme a regra do condominio.',
  'O visitante entrou mas continua AUTORIZADO: no Dashboard use "Marcar Interior".',
  'O visitante saiu mas continua NO INTERIOR: abra Dashboard ou Lista do Dia e use "Marcar Saida" ou "Saida".',
  'Novo incidente chegou sem som: o guarda ainda nao liberou audio no navegador/PWA. Toque em "Ativar Som" ou "Testar Som".'
];

function QuickNav({ items, onSelect }: { items: QuickNavItem[]; onSelect: (targetId: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.targetId}
          type="button"
          onClick={() => onSelect(item.targetId)}
          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition-colors hover:border-sky-400 hover:text-sky-700"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function FeatureGrid({ title, subtitle, cards, id }: { title: string; subtitle: string; cards: FeatureCard[]; id?: string }) {
  return (
    <section id={id} className="space-y-5 scroll-mt-24">
      <div>
        <h2 className="text-2xl font-black text-slate-900 md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-4xl text-slate-600">{subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                {card.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
            </div>
            <p className="mb-4 text-sm text-slate-600">{card.description}</p>
            <div className="space-y-2">
              {card.points.map((point) => (
                <div key={point} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StepGuideSection({ guides }: { guides: StepGuide[] }) {
  return (
    <div className="space-y-5">
      {guides.map((guide) => (
        <article
          key={guide.id}
          id={guide.id}
          className="scroll-mt-24 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 md:p-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">{guide.eyebrow}</p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">{guide.title}</h3>
          <p className="mt-3 max-w-4xl text-slate-600">{guide.description}</p>

          <div className="mt-6 space-y-3">
            {guide.steps.map((step, index) => (
              <div key={`${guide.id}-${index}`} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>

          {guide.result && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <strong>Resultado esperado:</strong> {guide.result}
            </div>
          )}

          {guide.tip && (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              <strong>Dica:</strong> {guide.tip}
            </div>
          )}

          {guide.warning && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Atencao:</strong> {guide.warning}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function StatusGuideGrid() {
  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-2xl font-black text-slate-900">Como ler os estados das visitas</h3>
        <p className="mt-2 max-w-4xl text-slate-600">
          Esta traducao ajuda o guarda a decidir a proxima acao sem adivinhar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {guardStatusGuide.map((item) => (
          <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <h4 className="text-lg font-black text-slate-900">{item.title}</h4>
            <p className="mt-3 text-sm text-slate-600">{item.meaning}</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <strong>O que fazer:</strong> {item.action}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function UserManual() {
  const navigate = useNavigate();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const previous = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      bodyOverflow: body.style.overflow,
      bodyOverflowY: body.style.overflowY,
      bodyHeight: body.style.height,
      bodyMinHeight: body.style.minHeight,
      bodyTouchAction: body.style.touchAction,
      bodyOverscrollBehaviorY: body.style.overscrollBehaviorY,
      rootHeight: root?.style.height ?? '',
      rootMinHeight: root?.style.minHeight ?? '',
      rootOverflow: root?.style.overflow ?? ''
    };

    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.overflowY = 'auto';
    body.style.height = 'auto';
    body.style.minHeight = '100vh';
    body.style.touchAction = 'pan-y';
    body.style.overscrollBehaviorY = 'auto';

    if (root) {
      root.style.height = 'auto';
      root.style.minHeight = '100vh';
      root.style.overflow = 'visible';
    }

    return () => {
      html.style.overflow = previous.htmlOverflow;
      html.style.height = previous.htmlHeight;
      body.style.overflow = previous.bodyOverflow;
      body.style.overflowY = previous.bodyOverflowY;
      body.style.height = previous.bodyHeight;
      body.style.minHeight = previous.bodyMinHeight;
      body.style.touchAction = previous.bodyTouchAction;
      body.style.overscrollBehaviorY = previous.bodyOverscrollBehaviorY;

      if (root) {
        root.style.height = previous.rootHeight;
        root.style.minHeight = previous.rootMinHeight;
        root.style.overflow = previous.rootOverflow;
      }
    };
  }, []);

  const scrollToSection = (targetId?: string) => {
    if (!targetId) return;
    const section = document.getElementById(targetId);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/20"
              >
                <ShieldCheck size={16} />
                Ir para o login
              </Link>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
              Manual alinhado com a implementacao atual
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200">
                <BookOpen size={16} />
                Manual do Utilizador EntryFlow
              </div>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight md:text-6xl">
                Manual pratico para o guarda operar a app passo a passo
              </h1>
              <p className="mt-5 max-w-4xl text-base leading-7 text-slate-300 md:text-lg">
                Este guia foi reescrito para servir como apoio real de turno. Em vez de descricao generica,
                ele explica o que fazer em cada ecran, em cada tipo de entrada e em cada duvida operacional do guarda.
              </p>
              <div className="mt-6">
                <QuickNav items={pageNav} onSelect={scrollToSection} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Este manual ajuda quando...</p>
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                  <span>O guarda nao sabe se deve criar uma nova visita ou procurar uma ja existente.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                  <span>Ha duvida entre QR, telefone, interfone, aplicativo ou aprovacao manual.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                  <span>O guarda precisa de saber o que fazer com AUTORIZADO, NO INTERIOR ou incidente novo.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                  <span>O tablet esta offline e a operacao tem de continuar com seguranca.</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {profileCards.map((profile) => (
                  <button
                    key={profile.title}
                    type="button"
                    onClick={() => scrollToSection(profile.targetId)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-200 transition-colors hover:bg-white/10"
                  >
                    {profile.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 md:px-6 md:py-10">
        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900 md:text-3xl">Perfis da Aplicacao</h2>
            <p className="mt-2 max-w-4xl text-slate-600">
              Clique num perfil para saltar para a area detalhada. O bloco do guarda foi escrito como manual operacional de consulta rapida.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profileCards.map((card) => (
              <button
                key={card.title}
                type="button"
                onClick={() => scrollToSection(card.targetId)}
                className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm shadow-slate-200/50 transition-all hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-sky-100"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
                </div>
                <p className="mb-4 text-sm text-slate-600">{card.description}</p>
                <div className="space-y-2">
                  {card.points.map((point) => (
                    <div key={point} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-sky-700">
                  Abrir secao detalhada
                </div>
              </button>
            ))}
          </div>
        </section>

        <FeatureGrid
          id="primeiros-passos"
          title="Primeiros Passos"
          subtitle="Estas instrucoes cobrem a ativacao do tablet, o login e a confirmacao do estado da aplicacao antes de iniciar a portaria."
          cards={gettingStarted}
        />

        <section id="guarda" className="space-y-8 scroll-mt-24">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">Manual operacional do guarda</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900 md:text-4xl">
              O que fazer no turno, em cada ecran e em cada situacao
            </h2>
            <p className="mt-4 max-w-4xl text-slate-600">
              Esta secao foi escrita para consulta durante a operacao. Se estiver em duvida na portaria,
              siga a ordem abaixo: inicio do turno, nova entrada, estados da visita, lista do dia, incidentes e modo offline.
            </p>
            <div className="mt-6">
              <QuickNav items={guardNav} onSelect={scrollToSection} />
            </div>
          </div>

          <FeatureGrid
            title="Mapa rapido das ferramentas do guarda"
            subtitle="Estas sao as areas que o guarda usa todos os dias e o tipo de acao esperado em cada uma."
            cards={guardSummaryCards}
          />

          <StepGuideSection guides={guardStartGuides} />
          <StepGuideSection guides={guardEntryGuides} />
          <StatusGuideGrid />
          <StepGuideSection guides={guardListGuides} />
          <StepGuideSection guides={guardIncidentGuides} />

          <section className="scroll-mt-24 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">Consulta rapida</p>
            <h3 className="mt-2 text-2xl font-black text-slate-900">Pesquisar Morador e Noticias</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <article className="rounded-3xl bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Search size={22} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Pesquisar Morador</h4>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <p>Pesquise por nome, telefone ou condominio.</p>
                  <p>Use esta pagina quando o visitante nao souber a unidade ou quando o guarda precisar confirmar o telefone do residente.</p>
                  <p>Se a app estiver offline e nao houver dados em cache, a pagina informa que nao ha dados offline.</p>
                </div>
              </article>

              <article className="rounded-3xl bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Newspaper size={22} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Noticias</h4>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <p>Abra "Ultimas Noticias" para ler comunicados dos ultimos 7 dias.</p>
                  <p>Toque em "Ler Mais" para abrir a noticia completa.</p>
                  <p>Online, a lista atualiza automaticamente; offline, a pagina mostra o que estiver em cache.</p>
                </div>
              </article>
            </div>
          </section>

          <StepGuideSection guides={guardOfflineGuides} />
        </section>

        <section id="admin" className="scroll-mt-24">
          <FeatureGrid
            title="Admin"
            subtitle="O Admin mantem o condominio configurado, monitoriza a operacao e garante dados corretos para a portaria."
            cards={adminFeatures}
          />
        </section>

        <section id="super-admin" className="scroll-mt-24">
          <FeatureGrid
            title="Super Admin"
            subtitle="O Super Admin trabalha com governacao global, suporte multi-condominio e controlo das areas financeiras e de privilegio elevado."
            cards={superAdminFeatures}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <h2 className="mb-4 text-2xl font-black text-slate-900">Boas praticas</h2>
            <div className="space-y-3">
              {supportTips.map((tip) => (
                <div key={tip} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </article>

          <article id="perguntas-comuns" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <h2 className="mb-4 text-2xl font-black text-slate-900">Perguntas comuns e falhas tipicas</h2>
            <div className="space-y-3">
              {troubleshooting.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-[2rem] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Acesso rapido ao manual</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-700">
                Este guia esta disponivel pela rota <strong>#/manual</strong> antes e depois do login.
                Se a equipa de portaria usar tablets em PWA, faca refresh completo sempre que houver atualizacao do manual.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-700">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm">
                  <Phone size={16} />
                  Fluxos reais do guarda
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm">
                  <QrCode size={16} />
                  QR, aprovacao e incidentes
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm">
                  <LogOut size={16} />
                  Saidas e fecho de turno
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm">
                  <MapPin size={16} />
                  Offline-first
                </span>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              <ShieldCheck size={18} />
              Abrir a aplicacao
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
