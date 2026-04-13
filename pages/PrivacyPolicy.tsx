import React, { useEffect, useState } from 'react';
import { Bell, Camera, Database, Globe, Lock, Mail, Shield, Smartphone, Users } from 'lucide-react';

type Lang = 'pt' | 'en';

type Copy = {
  title: string;
  updated: string;
  language: string;
  intro: React.ReactNode;
  introNote: string;
  controllerTitle: string;
  controllerText: string;
  company: string;
  application: string;
  contact: string;
  dataTitle: string;
  dataText: string;
  dataRows: Array<{ title: string; data: string; purpose: string }>;
  dataLabel: string;
  purposeLabel: string;
  pinNote: string;
  useTitle: string;
  useItems: string[];
  useNote: string;
  sharingTitle: string;
  sharingText: string;
  vendors: Array<{ name: string; service: string; shared: string }>;
  serviceLabel: string;
  sharedLabel: string;
  securityTitle: string;
  securityItems: string[];
  retentionTitle: string;
  retentionItems: string[];
  rightsTitle: string;
  rightsItems: string[];
  permissionsTitle: string;
  permissionsItems: Array<{ icon: 'camera' | 'database' | 'bell'; label: string; text: string }>;
  childrenTitle: string;
  childrenText: string;
  changesTitle: string;
  changesText: string;
  contactTitle: string;
  contactText: string;
  privacyEmail: string;
  supportEmail: string;
  footer: string;
};

const copy: Record<Lang, Copy> = {
  pt: {
    title: 'Política de Privacidade',
    updated: 'Última atualização: 11 de abril de 2026',
    language: 'Idioma',
    intro: (
      <>
        A <strong className="text-white">Chong Technologies</strong> desenvolveu o{' '}
        <strong className="text-white">EntryFlow</strong> para gestão de portaria em condomínios. Esta página explica
        como recolhemos, utilizamos, armazenamos e protegemos os dados tratados pela aplicação.
      </>
    ),
    introNote:
      'Ao utilizar a aplicação, concorda com as práticas descritas nesta política. Se não concordar, não deve utilizar o serviço.',
    controllerTitle: 'Responsável pelo Tratamento',
    controllerText: 'A entidade responsável pelo tratamento dos dados pessoais é:',
    company: 'Empresa',
    application: 'Aplicação',
    contact: 'Contacto',
    dataTitle: 'Dados Recolhidos',
    dataText: 'Recolhemos apenas os dados necessários para operar o controlo de acessos e a segurança do condomínio:',
    dataRows: [
      {
        title: 'Colaboradores',
        data: 'Nome, apelido, função e PIN armazenado como hash bcrypt',
        purpose: 'Autenticação de guardas e administradores',
      },
      {
        title: 'Visitas',
        data: 'Nome do visitante, documento opcional, horários, unidade visitada e tipo de visita',
        purpose: 'Registo de acessos e histórico de segurança',
      },
      {
        title: 'Fotografias',
        data: 'Fotos de visitantes apenas com consentimento e fotos de perfil de colaboradores',
        purpose: 'Identificação visual e documentação operacional',
      },
      {
        title: 'Dispositivo e auditoria',
        data: 'Identificador local do dispositivo, modelo, sistema operativo e ações realizadas na aplicação',
        purpose: 'Gestão de dispositivos autorizados, rastreabilidade e suporte técnico',
      },
    ],
    dataLabel: 'Dados',
    purposeLabel: 'Finalidade',
    pinNote: 'Os PINs nunca são guardados em texto simples e não são transmitidos sem proteção.',
    useTitle: 'Como Utilizamos os Dados',
    useItems: [
      'Autenticar utilizadores e controlar o acesso à aplicação.',
      'Registar entradas, saídas, visitas e incidentes.',
      'Permitir aprovação de visitas por moradores.',
      'Sincronizar dados entre o dispositivo e o backend.',
      'Monitorizar erros e melhorar a estabilidade do sistema.',
    ],
    useNote: 'Os dados não são usados para publicidade, perfis comerciais ou venda a terceiros.',
    sharingTitle: 'Partilha com Terceiros',
    sharingText: 'Partilhamos dados apenas com fornecedores necessários para o funcionamento técnico da aplicação:',
    vendors: [
      {
        name: 'Supabase Inc.',
        service: 'Base de dados e armazenamento',
        shared: 'Dados operacionais e fotografias',
      },
      {
        name: 'Sentry',
        service: 'Monitorização de erros',
        shared: 'Logs técnicos e stack traces sem dados pessoais diretos',
      },
      {
        name: 'Vercel Inc.',
        service: 'Alojamento da aplicação web',
        shared: 'Metadados técnicos de pedidos HTTP',
      },
    ],
    serviceLabel: 'Serviço',
    sharedLabel: 'Dados partilhados',
    securityTitle: 'Armazenamento e Segurança',
    securityItems: [
      'Funcionamento offline com IndexedDB e sincronização quando a ligação é restaurada.',
      'Encriptação em trânsito e em repouso nos serviços cloud utilizados.',
      'Buckets privados para fotografias e acesso apenas por utilizadores autenticados.',
      'Row Level Security e separação de dados por condomínio.',
      'Logs de auditoria para ações críticas.',
    ],
    retentionTitle: 'Retenção de Dados',
    retentionItems: [
      'Registos de visitas e incidentes: mantidos enquanto a subscrição estiver ativa e eliminados após encerramento da conta.',
      'Fotografias: mantidas com o respetivo registo e removidas em conjunto com ele.',
      'Logs de auditoria: retidos por até 12 meses para segurança e conformidade.',
      'Dados de diagnóstico: retidos segundo a política do fornecedor técnico aplicável.',
    ],
    rightsTitle: 'Direitos do Titular',
    rightsItems: [
      'Acesso aos seus dados pessoais.',
      'Retificação de dados incorretos ou incompletos.',
      'Eliminação quando legalmente aplicável.',
      'Portabilidade dos dados.',
      'Oposição ao tratamento, quando permitido por lei.',
    ],
    permissionsTitle: 'Permissões da Aplicação',
    permissionsItems: [
      {
        icon: 'camera',
        label: 'Câmara',
        text: 'Utilizada para captar fotografias de visitantes apenas quando o visitante autoriza o registo.',
      },
      {
        icon: 'database',
        label: 'Armazenamento local',
        text: 'Utilizado para operação offline e persistência local temporária.',
      },
      {
        icon: 'bell',
        label: 'Ligação à internet',
        text: 'Utilizada para sincronização, notificações e comunicação com o backend.',
      },
    ],
    childrenTitle: 'Menores de Idade',
    childrenText:
      'A aplicação destina-se a utilização profissional em condomínios e não é direcionada a menores de 18 anos.',
    changesTitle: 'Alterações a Esta Política',
    changesText:
      'Podemos atualizar esta política periodicamente. Quando isso acontecer, a data de atualização será revista nesta página.',
    contactTitle: 'Contacto',
    contactText: 'Para pedidos ou questões sobre privacidade, contacte-nos através dos endereços abaixo.',
    privacyEmail: 'E-mail de privacidade',
    supportEmail: 'Suporte geral',
    footer: '© 2026 Chong Technologies. Todos os direitos reservados.',
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: April 11, 2026',
    language: 'Language',
    intro: (
      <>
        <strong className="text-white">Chong Technologies</strong> developed{' '}
        <strong className="text-white">EntryFlow</strong> for condominium gate management. This page explains how we
        collect, use, store, and protect the data processed by the application.
      </>
    ),
    introNote:
      'By using the application, you agree to the practices described in this policy. If you do not agree, you should not use the service.',
    controllerTitle: 'Data Controller',
    controllerText: 'The entity responsible for processing personal data is:',
    company: 'Company',
    application: 'Application',
    contact: 'Contact',
    dataTitle: 'Data We Collect',
    dataText: 'We collect only the data required to operate access control and condominium security:',
    dataRows: [
      {
        title: 'Staff',
        data: 'Name, surname, role, and PIN stored as a bcrypt hash',
        purpose: 'Authentication of guards and administrators',
      },
      {
        title: 'Visits',
        data: 'Visitor name, optional document, timestamps, visited unit, and visit type',
        purpose: 'Access records and security history',
      },
      {
        title: 'Photographs',
        data: 'Visitor photos only with consent and staff profile photos',
        purpose: 'Visual identification and operational documentation',
      },
      {
        title: 'Device and audit data',
        data: 'Local device identifier, model, operating system, and actions performed in the app',
        purpose: 'Authorized device management, traceability, and technical support',
      },
    ],
    dataLabel: 'Data',
    purposeLabel: 'Purpose',
    pinNote: 'PINs are never stored in plain text and are not transmitted without protection.',
    useTitle: 'How We Use Data',
    useItems: [
      'Authenticate users and control access to the application.',
      'Register entries, exits, visits, and incidents.',
      'Allow residents to approve visits.',
      'Synchronize data between the device and the backend.',
      'Monitor errors and improve platform stability.',
    ],
    useNote: 'Data is not used for advertising, commercial profiling, or resale to third parties.',
    sharingTitle: 'Sharing with Third Parties',
    sharingText: 'We share data only with providers required for the technical operation of the application:',
    vendors: [
      {
        name: 'Supabase Inc.',
        service: 'Database and storage',
        shared: 'Operational data and photographs',
      },
      {
        name: 'Sentry',
        service: 'Error monitoring',
        shared: 'Technical logs and stack traces without direct personal data',
      },
      {
        name: 'Vercel Inc.',
        service: 'Web hosting',
        shared: 'Technical HTTP request metadata',
      },
    ],
    serviceLabel: 'Service',
    sharedLabel: 'Shared data',
    securityTitle: 'Storage and Security',
    securityItems: [
      'Offline-first operation using IndexedDB and synchronization when connectivity is restored.',
      'Encryption in transit and at rest across the cloud services in use.',
      'Private buckets for photographs, accessible only to authenticated users.',
      'Row Level Security and condominium-level data separation.',
      'Audit logs for critical actions.',
    ],
    retentionTitle: 'Data Retention',
    retentionItems: [
      'Visit and incident records: kept while the subscription is active and deleted after account closure.',
      'Photographs: retained with the related record and removed together with it.',
      'Audit logs: retained for up to 12 months for security and compliance purposes.',
      'Diagnostic data: retained according to the applicable technical provider policy.',
    ],
    rightsTitle: 'Data Subject Rights',
    rightsItems: [
      'Access to your personal data.',
      'Correction of inaccurate or incomplete data.',
      'Deletion where legally applicable.',
      'Data portability.',
      'Objection to processing when permitted by law.',
    ],
    permissionsTitle: 'Application Permissions',
    permissionsItems: [
      {
        icon: 'camera',
        label: 'Camera',
        text: 'Used to capture visitor photographs during check-in only when the visitor allows it.',
      },
      {
        icon: 'database',
        label: 'Local storage',
        text: 'Used for offline operation and temporary local persistence.',
      },
      {
        icon: 'bell',
        label: 'Internet connection',
        text: 'Used for synchronization, notifications, and backend communication.',
      },
    ],
    childrenTitle: 'Children',
    childrenText: 'The application is intended for professional condominium use and is not directed to anyone under 18.',
    changesTitle: 'Changes to This Policy',
    changesText: 'We may update this policy from time to time. When we do, the update date on this page will change.',
    contactTitle: 'Contact',
    contactText: 'For privacy requests or questions, contact us using the addresses below.',
    privacyEmail: 'Privacy email',
    supportEmail: 'General support',
    footer: '© 2026 Chong Technologies. All rights reserved.',
  },
};

function getPermissionIcon(icon: 'camera' | 'database' | 'bell') {
  if (icon === 'camera') return <Camera size={16} className="mt-0.5 shrink-0 text-sky-500" />;
  if (icon === 'database') return <Database size={16} className="mt-0.5 shrink-0 text-sky-500" />;
  return <Bell size={16} className="mt-0.5 shrink-0 text-sky-500" />;
}

function enablePageScroll() {
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
    rootHeight: root?.style.height ?? '',
    rootMinHeight: root?.style.minHeight ?? '',
    rootOverflow: root?.style.overflow ?? '',
  };

  html.style.overflow = 'auto';
  html.style.height = 'auto';
  body.style.overflow = 'auto';
  body.style.overflowY = 'auto';
  body.style.height = 'auto';
  body.style.minHeight = '100vh';
  body.style.touchAction = 'pan-y';

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
    if (root) {
      root.style.height = previous.rootHeight;
      root.style.minHeight = previous.rootMinHeight;
      root.style.overflow = previous.rootOverflow;
    }
  };
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 md:p-6">
    <h2 className="mb-4 flex items-center gap-3 border-b border-slate-700 pb-3 text-base font-bold text-white">
      {icon}
      {title}
    </h2>
    {children}
  </section>
);

export default function PrivacyPolicy() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'));
  const c = copy[lang];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    return enablePageScroll();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-1.5">
              <Shield className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{c.title}</h1>
              <p className="text-xs text-slate-500">{c.updated}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-800 p-1 sm:self-auto">
            <span className="px-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{c.language}</span>
            <button
              type="button"
              onClick={() => setLang('pt')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                lang === 'pt' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe size={14} />
              PT
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                lang === 'en' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe size={14} />
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-6">
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-5">
          <p className="text-sm leading-relaxed text-slate-300">{c.intro}</p>
          <p className="mt-3 text-sm text-slate-400">{c.introNote}</p>
        </div>

        <Section icon={<Users size={18} />} title={c.controllerTitle}>
          <p className="mb-4 text-sm text-slate-400">{c.controllerText}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoCard label={c.company} value="Chong Technologies" />
            <InfoCard label={c.application} value="EntryFlow" />
            <InfoCard label={c.contact} value="entryflow.space@chongtechnologies.com" isEmail />
          </div>
        </Section>

        <Section icon={<Database size={18} />} title={c.dataTitle}>
          <p className="mb-4 text-sm text-slate-400">{c.dataText}</p>
          <div className="space-y-3">
            {c.dataRows.map((row) => (
              <div key={row.title} className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
                <p className="mb-1 text-sm font-semibold text-white">{row.title}</p>
                <p className="mb-1 text-xs text-slate-400">
                  <span className="text-slate-500">{c.dataLabel}:</span> {row.data}
                </p>
                <p className="text-xs text-slate-400">
                  <span className="text-slate-500">{c.purposeLabel}:</span> {row.purpose}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="flex items-start gap-2 text-sm text-amber-300">
              <Lock size={16} className="mt-0.5 shrink-0" />
              {c.pinNote}
            </p>
          </div>
        </Section>

        <Section icon={<Shield size={18} />} title={c.useTitle}>
          <ul className="space-y-2 text-sm text-slate-300">
            {c.useItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 text-sky-500">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-semibold text-emerald-400">{c.useNote}</p>
        </Section>

        <Section icon={<Users size={18} />} title={c.sharingTitle}>
          <p className="mb-4 text-sm text-slate-400">{c.sharingText}</p>
          <div className="space-y-3">
            {c.vendors.map((vendor) => (
              <div key={vendor.name} className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-3">
                <p className="text-sm font-semibold text-white">{vendor.name}</p>
                <p className="text-xs text-slate-400">
                  <span className="text-slate-500">{c.serviceLabel}:</span> {vendor.service}
                </p>
                <p className="text-xs text-slate-400">
                  <span className="text-slate-500">{c.sharedLabel}:</span> {vendor.shared}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={<Lock size={18} />} title={c.securityTitle}>
          <ul className="space-y-2 text-sm text-slate-300">
            {c.securityItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">&check;</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Database size={18} />} title={c.retentionTitle}>
          <ul className="space-y-2 text-sm text-slate-300">
            {c.retentionItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 text-sky-500">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Shield size={18} />} title={c.rightsTitle}>
          <ul className="space-y-2 text-sm text-slate-300">
            {c.rightsItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 text-sky-500">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Smartphone size={18} />} title={c.permissionsTitle}>
          <ul className="space-y-3 text-sm text-slate-300">
            {c.permissionsItems.map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                {getPermissionIcon(item.icon)}
                <div>
                  <strong className="text-white">{item.label}:</strong> <span className="text-slate-400">{item.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Users size={18} />} title={c.childrenTitle}>
          <p className="text-sm text-slate-400">{c.childrenText}</p>
        </Section>

        <Section icon={<Shield size={18} />} title={c.changesTitle}>
          <p className="text-sm text-slate-400">{c.changesText}</p>
        </Section>

        <Section icon={<Mail size={18} />} title={c.contactTitle}>
          <p className="mb-4 text-sm text-slate-400">{c.contactText}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoCard label={c.privacyEmail} value="entryflow.space@chongtechnologies.com" isEmail />
            <InfoCard label={c.supportEmail} value="entryflow.space@chongtechnologies.com" isEmail />
            <InfoCard label={c.company} value="Chong Technologies" />
          </div>
        </Section>

        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-600">
          <p>{c.footer}</p>
        </div>
      </main>
    </div>
  );
}

const InfoCard: React.FC<{ label: string; value: string; isEmail?: boolean }> = ({ label, value, isEmail = false }) => (
  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    {isEmail ? (
      <a href={`mailto:${value}`} className="break-all text-sm text-sky-400 hover:underline">
        {value}
      </a>
    ) : (
      <p className="text-sm text-slate-200">{value}</p>
    )}
  </div>
);
