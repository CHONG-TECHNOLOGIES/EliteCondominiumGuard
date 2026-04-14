import React, { useEffect, useState } from 'react';
import { Clock3, Database, Globe, Mail, Shield, Trash2 } from 'lucide-react';

type Lang = 'pt' | 'en';

type Copy = {
  title: string;
  updated: string;
  language: string;
  intro: React.ReactNode;
  introNote: string;
  identityTitle: string;
  identityText: string;
  requestTitle: string;
  requestText: string;
  requestSteps: string[];
  deletedTitle: string;
  deletedItems: string[];
  retainedTitle: string;
  retainedItems: string[];
  retentionTitle: string;
  retentionItems: string[];
  linksTitle: string;
  linksText: string;
  privacyLink: string;
  emailLabel: string;
  footer: string;
};

const copy: Record<Lang, Copy> = {
  pt: {
    title: 'Eliminacao de Conta',
    updated: 'Ultima atualizacao: April 14, 2026',
    language: 'Idioma',
    intro: (
      <>
        Esta pagina explica como pedir a eliminacao de conta e dados associados para a aplicacao{' '}
        <strong className="text-white">EntryFlow</strong>, publicada pela <strong className="text-white">Chong Technologies</strong>.
        Tambem se aplica a referencias comerciais ou listagens Google Play com o nome{' '}
        <strong className="text-white">APPGUARD</strong> ou <strong className="text-white">EliteCondoGuard</strong>.
      </>
    ),
    introNote:
      'A eliminacao e processada mediante pedido por email. Esta versao nao promete eliminacao automatica self-service dentro da aplicacao.',
    identityTitle: 'Identificacao da Aplicacao',
    identityText:
      'Use esta pagina se instalou a aplicacao publicada pela Chong Technologies para controlo de acessos, seguranca de condominio e registo operacional.',
    requestTitle: 'Como Pedir a Eliminacao',
    requestText: 'Para solicitar a eliminacao da conta e dados associados, envie um email para a equipa de privacidade:',
    requestSteps: [
      'Envie o pedido para entryflow.space@chongtechnologies.com a partir de um email associado a conta ou incluindo detalhes suficientes para verificacao.',
      'Inclua o nome da aplicacao, condominio, utilizador ou outros identificadores relevantes para localizar o registo correto.',
      'A equipa ira analisar o pedido e confirmar que dados podem ser eliminados, anonimizados ou retidos por obrigacao legal ou de seguranca.',
    ],
    deletedTitle: 'Dados Normalmente Eliminados',
    deletedItems: [
      'Dados de conta e perfil do utilizador, quando aplicavel.',
      'Dados operacionais associados ao utilizador, quando a eliminacao e legalmente permitida.',
      'Fotografias e outros anexos relacionados com os registos eliminados.',
      'Dados armazenados para suporte da utilizacao normal da plataforma, quando deixarem de ser necessarios.',
    ],
    retainedTitle: 'Dados que Podem Ser Mantidos',
    retainedItems: [
      'Registos de auditoria e seguranca necessarios para prevenir fraude, abuso, incidentes ou acessos indevidos.',
      'Informacao que tenha de ser mantida para cumprimento legal, regulatorio, fiscal, contratual ou defesa de direitos.',
      'Registos tecnicos minimos necessarios para demonstrar cumprimento, resolver disputas ou proteger a plataforma e terceiros.',
    ],
    retentionTitle: 'Prazos de Conservacao',
    retentionItems: [
      'Registos de visitas e incidentes: mantidos enquanto a subscricao estiver ativa e eliminados apos o encerramento da conta.',
      'Fotografias: mantidas com o registo relacionado e removidas em conjunto com esse registo.',
      'Logs de auditoria: mantidos ate 12 meses para seguranca e conformidade.',
      'Dados de diagnostico: mantidos de acordo com a politica tecnica do fornecedor aplicavel.',
    ],
    linksTitle: 'Links Relacionados',
    linksText: 'Consulte tambem a politica de privacidade para mais detalhes sobre tratamento de dados, fornecedores e medidas de seguranca.',
    privacyLink: 'Abrir Politica de Privacidade',
    emailLabel: 'Email de privacidade',
    footer: '© 2026 Chong Technologies. All rights reserved.',
  },
  en: {
    title: 'Account Deletion',
    updated: 'Last updated: April 14, 2026',
    language: 'Language',
    intro: (
      <>
        This page explains how to request deletion of your account and associated data for the{' '}
        <strong className="text-white">EntryFlow</strong> application published by{' '}
        <strong className="text-white">Chong Technologies</strong>. It also applies to Google Play or commercial branding
        that may refer to the product as <strong className="text-white">APPGUARD</strong> or{' '}
        <strong className="text-white">EliteCondoGuard</strong>.
      </>
    ),
    introNote:
      'Deletion is handled through an email request. This release does not promise automatic in-app self-service deletion.',
    identityTitle: 'Application Identity',
    identityText:
      'Use this page if you installed the Chong Technologies application used for gate access control, condominium security, and operational visitor records.',
    requestTitle: 'How To Request Deletion',
    requestText: 'To request deletion of your account and associated data, email the privacy team at:',
    requestSteps: [
      'Send your request to entryflow.space@chongtechnologies.com from an address linked to the account, or include enough details to verify ownership.',
      'Include the app name, condominium, user identity, or other relevant identifiers so the correct records can be located.',
      'Our team will review the request and confirm which data can be deleted, anonymized, or retained for legal, security, or compliance reasons.',
    ],
    deletedTitle: 'Data Typically Deleted',
    deletedItems: [
      'User account and profile data, where applicable.',
      'Associated operational data linked to the user, where deletion is legally permitted.',
      'Photographs and other attachments connected to records that are deleted.',
      'Platform support data that is no longer necessary after the request is completed.',
    ],
    retainedTitle: 'Data That May Be Retained',
    retainedItems: [
      'Audit and security records needed to prevent fraud, abuse, incidents, or unauthorized access.',
      'Information that must be kept to comply with legal, regulatory, tax, contractual, or dispute-resolution obligations.',
      'Minimum technical records needed to demonstrate compliance, resolve disputes, or protect the platform and third parties.',
    ],
    retentionTitle: 'Retention Periods',
    retentionItems: [
      'Visit and incident records: kept while the subscription is active and deleted after account closure.',
      'Photographs: retained with the related record and removed together with it.',
      'Audit logs: retained for up to 12 months for security and compliance purposes.',
      'Diagnostic data: retained according to the applicable technical provider policy.',
    ],
    linksTitle: 'Related Links',
    linksText: 'See the privacy policy for broader details about data processing, service providers, and security measures.',
    privacyLink: 'Open Privacy Policy',
    emailLabel: 'Privacy email',
    footer: '© 2026 Chong Technologies. All rights reserved.',
  },
};

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

const InfoCard: React.FC<{ label: string; value: string; href?: string }> = ({ label, value, href }) => (
  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    {href ? (
      <a href={href} className="break-all text-sm text-sky-400 hover:underline">
        {value}
      </a>
    ) : (
      <p className="text-sm text-slate-200">{value}</p>
    )}
  </div>
);

export default function AccountDeletion() {
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
              <Trash2 className="h-5 w-5 text-rose-400" />
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
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5">
          <p className="text-sm leading-relaxed text-slate-300">{c.intro}</p>
          <p className="mt-3 text-sm text-slate-400">{c.introNote}</p>
        </div>

        <Section icon={<Shield size={18} />} title={c.identityTitle}>
          <p className="mb-4 text-sm text-slate-400">{c.identityText}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoCard label="Developer" value="Chong Technologies" />
            <InfoCard label="Primary app name" value="EntryFlow" />
            <InfoCard label="Store / commercial names" value="APPGUARD / EliteCondoGuard" />
          </div>
        </Section>

        <Section icon={<Mail size={18} />} title={c.requestTitle}>
          <p className="mb-4 text-sm text-slate-400">{c.requestText}</p>
          <div className="mb-4">
            <InfoCard label={c.emailLabel} value="entryflow.space@chongtechnologies.com" href="mailto:entryflow.space@chongtechnologies.com" />
          </div>
          <ol className="space-y-2 text-sm text-slate-300">
            {c.requestSteps.map((item, index) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-300">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section icon={<Database size={18} />} title={c.deletedTitle}>
          <ul className="space-y-2 text-sm text-slate-300">
            {c.deletedItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 text-emerald-400">&check;</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Shield size={18} />} title={c.retainedTitle}>
          <ul className="space-y-2 text-sm text-slate-300">
            {c.retainedItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 text-amber-400">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Clock3 size={18} />} title={c.retentionTitle}>
          <ul className="space-y-2 text-sm text-slate-300">
            {c.retentionItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 text-sky-500">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Globe size={18} />} title={c.linksTitle}>
          <p className="mb-4 text-sm text-slate-400">{c.linksText}</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#/privacy-policy"
              className="inline-flex items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
            >
              {c.privacyLink}
            </a>
            <a
              href="mailto:entryflow.space@chongtechnologies.com"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
            >
              entryflow.space@chongtechnologies.com
            </a>
          </div>
        </Section>

        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-600">
          <p>{c.footer}</p>
        </div>
      </main>
    </div>
  );
}
