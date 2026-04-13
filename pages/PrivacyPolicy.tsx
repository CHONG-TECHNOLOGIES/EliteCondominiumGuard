import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Camera, Database, Bell, Lock, Trash2, Mail, Users, Smartphone } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-4 md:px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-1.5 rounded-lg border border-slate-700">
              <Shield className="text-sky-500 w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Política de Privacidade</h1>
              <p className="text-xs text-slate-500">Última atualização: 11 de abril de 2026</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 space-y-6">

        {/* Intro */}
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-5">
          <p className="text-slate-300 text-sm leading-relaxed">
            A <strong className="text-white">Chong Technologies</strong> desenvolveu o <strong className="text-white">EntryFlow</strong> como
            um aplicativo de gestão de portaria para condomínios. Esta Política de Privacidade descreve como recolhemos, usamos,
            armazenamos e protegemos os seus dados quando utiliza a nossa aplicação.
          </p>
          <p className="text-slate-400 text-sm mt-3">
            Ao utilizar o EntryFlow, você concorda com as práticas descritas neste documento. Se não concordar, pedimos que não utilize a aplicação.
          </p>
        </div>

        {/* 1. Responsável */}
        <Section num={1} title="Responsável pelo Tratamento de Dados" icon={<Users size={18} />}>
          <p className="text-slate-400 text-sm mb-4">O responsável pelo tratamento dos seus dados pessoais é:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoCard label="Empresa" value="Chong Technologies" />
            <InfoCard label="Aplicação" value="EntryFlow" />
            <InfoCard label="Contacto" value="privacy@chongtechnologies.com" isEmail />
          </div>
        </Section>

        {/* 2. Dados recolhidos */}
        <Section num={2} title="Que Dados Recolhemos" icon={<Database size={18} />}>
          <p className="text-slate-400 text-sm mb-4">
            O EntryFlow recolhe apenas os dados necessários para o funcionamento do sistema de controlo de acessos:
          </p>
          <div className="space-y-3">
            <DataRow category="Identificação de pessoal" data="Nome, apelido, cargo, PIN de acesso (hash bcrypt)" purpose="Autenticação de guardas e administradores" />
            <DataRow category="Fotografias" data="Fotos de visitantes capturadas na entrada; fotos de perfil de funcionários" purpose="Registo visual de acessos; identificação de pessoal" />
            <DataRow category="Registos de visitas" data="Nome do visitante, documento de identidade (opcional), hora de entrada/saída, unidade visitada, tipo de visita" purpose="Controlo de acessos e histórico de segurança" />
            <DataRow category="Dados de moradores" data="Nome, unidade, número de contacto (inseridos pelo administrador do condomínio)" purpose="Verificação de visitas e aprovação de acesso" />
            <DataRow category="Dados do dispositivo" data="Identificador único do dispositivo (fingerprint gerado localmente); modelo, sistema operativo" purpose="Gestão de dispositivos autorizados e auditoria" />
            <DataRow category="Registos de incidentes" data="Descrição, data/hora, tipo de incidente, fotografias associadas" purpose="Segurança e documentação operacional" />
            <DataRow category="Dados de diagnóstico" data="Erros da aplicação, stack traces (sem dados pessoais identificáveis)" purpose="Monitorização de qualidade e resolução de bugs" />
            <DataRow category="Registos de auditoria" data="Ações realizadas na aplicação (ex.: login, edição de registo), com timestamp e utilizador" purpose="Rastreabilidade e conformidade de segurança" />
          </div>
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <p className="text-amber-300 text-sm flex items-start gap-2">
              <Lock size={16} className="shrink-0 mt-0.5" />
              Os PINs de acesso são sempre armazenados como hash criptográfico (bcrypt, 12 rounds). Nenhum PIN em texto simples é armazenado ou transmitido.
            </p>
          </div>
        </Section>

        {/* 3. Como usamos */}
        <Section num={3} title="Como Utilizamos os Dados" icon={<Shield size={18} />}>
          <p className="text-slate-400 text-sm mb-3">Utilizamos os dados recolhidos exclusivamente para:</p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2"><span className="text-sky-500 mt-1">•</span>Autenticar funcionários e controlar o acesso à aplicação;</li>
            <li className="flex items-start gap-2"><span className="text-sky-500 mt-1">•</span>Registar e gerir entradas e saídas de visitantes e prestadores de serviços;</li>
            <li className="flex items-start gap-2"><span className="text-sky-500 mt-1">•</span>Permitir que moradores aprovem ou recusem visitas;</li>
            <li className="flex items-start gap-2"><span className="text-sky-500 mt-1">•</span>Documentar incidentes de segurança no condomínio;</li>
            <li className="flex items-start gap-2"><span className="text-sky-500 mt-1">•</span>Gerar relatórios e análises de acesso para administradores do condomínio;</li>
            <li className="flex items-start gap-2"><span className="text-sky-500 mt-1">•</span>Sincronizar dados entre dispositivos offline e o servidor backend;</li>
            <li className="flex items-start gap-2"><span className="text-sky-500 mt-1">•</span>Monitorizar a saúde técnica da aplicação e corrigir erros.</li>
          </ul>
          <p className="text-emerald-400 text-sm font-semibold mt-4">
            Não utilizamos os seus dados para publicidade, perfis comerciais ou vendas a terceiros.
          </p>
        </Section>

        {/* 4. Partilha de dados */}
        <Section num={4} title="Partilha de Dados com Terceiros" icon={<Users size={18} />}>
          <p className="text-slate-400 text-sm mb-4">
            Partilhamos dados apenas com os seguintes fornecedores de serviços, estritamente necessários para o funcionamento da aplicação:
          </p>
          <div className="space-y-3">
            <ThirdPartyRow provider="Supabase Inc." service="Base de dados e armazenamento na nuvem" data="Todos os dados operacionais e fotografias" />
            <ThirdPartyRow provider="Sentry (Functional Software, Inc.)" service="Monitorização de erros" data="Stack traces, logs de erro (sem dados pessoais)" />
            <ThirdPartyRow provider="Vercel Inc." service="Hospedagem da aplicação web" data="Metadata de requisições HTTP (IP, user-agent)" />
          </div>
          <p className="text-slate-400 text-sm mt-4">
            Não vendemos, alugamos nem partilhamos dados pessoais com quaisquer outras entidades terceiras para fins comerciais.
          </p>
        </Section>

        {/* 5. Armazenamento e segurança */}
        <Section num={5} title="Armazenamento e Segurança" icon={<Lock size={18} />}>
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="text-white font-semibold mb-1">Armazenamento local (offline-first):</p>
              <p className="text-slate-400">O EntryFlow armazena dados localmente no dispositivo através de IndexedDB (Dexie.js) para funcionar sem ligação à internet. Os dados são sincronizados com o servidor quando a ligação é restaurada.</p>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Armazenamento na nuvem:</p>
              <p className="text-slate-400">Os dados são armazenados em servidores Supabase com encriptação em repouso e em trânsito (TLS 1.2+).</p>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Fotografias:</p>
              <p className="text-slate-400">Armazenadas em buckets privados do Supabase Storage, acessíveis apenas por utilizadores autenticados com as devidas permissões.</p>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Medidas de segurança implementadas:</p>
              <ul className="text-slate-400 space-y-1 mt-2">
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>Autenticação por PIN com hash bcrypt (12 rounds)</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>Fingerprinting de dispositivo para autorização de acesso</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>Row Level Security (RLS) na base de dados</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>Registos de auditoria para todas as ações críticas</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>Separação de dados por condomínio (multi-tenant)</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 6. Retenção */}
        <Section num={6} title="Retenção de Dados" icon={<Trash2 size={18} />}>
          <ul className="space-y-3 text-sm text-slate-300">
            <li><strong className="text-white">Registos de visitas e incidentes:</strong> <span className="text-slate-400">retidos enquanto o contrato de subscrição do condomínio estiver ativo, e eliminados 90 dias após o encerramento da conta.</span></li>
            <li><strong className="text-white">Fotografias:</strong> <span className="text-slate-400">associadas ao período de visita; eliminadas com o registo correspondente.</span></li>
            <li><strong className="text-white">Logs de auditoria:</strong> <span className="text-slate-400">retidos por 12 meses para fins de conformidade e segurança.</span></li>
            <li><strong className="text-white">Dados de diagnóstico (Sentry):</strong> <span className="text-slate-400">retidos por 90 dias conforme a política da Sentry.</span></li>
            <li><strong className="text-white">Dados de dispositivo (localStorage/IndexedDB):</strong> <span className="text-slate-400">eliminados ao desinstalar a aplicação ou limpar os dados do navegador.</span></li>
          </ul>
        </Section>

        {/* 7. Direitos */}
        <Section num={7} title="Os Seus Direitos" icon={<Shield size={18} />}>
          <p className="text-slate-400 text-sm mb-4">
            Dependendo da sua localização, pode ter os seguintes direitos sobre os seus dados pessoais:
          </p>
          <div className="space-y-2">
            <RightRow right="Acesso" description="Solicitar uma cópia dos seus dados pessoais" />
            <RightRow right="Retificação" description="Corrigir dados incorretos ou incompletos" />
            <RightRow right="Eliminação" description='Solicitar a eliminação dos seus dados ("direito ao esquecimento")' />
            <RightRow right="Portabilidade" description="Receber os seus dados num formato legível por máquina" />
            <RightRow right="Oposição" description="Opor-se ao tratamento dos seus dados" />
          </div>
          <p className="text-slate-400 text-sm mt-4">
            Para exercer qualquer destes direitos, entre em contacto connosco através de{' '}
            <a href="mailto:privacy@chongtechnologies.com" className="text-sky-400 hover:underline">privacy@chongtechnologies.com</a>.
            Responderemos dentro de 30 dias.
          </p>
        </Section>

        {/* 8. Permissões */}
        <Section num={8} title="Permissões da Aplicação" icon={<Smartphone size={18} />}>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <Camera size={16} className="text-sky-500 shrink-0 mt-0.5" />
              <div><strong className="text-white">Câmara:</strong> <span className="text-slate-400">utilizada para capturar fotografias de visitantes no momento do registo de entrada. As fotografias são imediatamente enviadas para o servidor e não são armazenadas na galeria do dispositivo.</span></div>
            </li>
            <li className="flex items-start gap-3">
              <Database size={16} className="text-sky-500 shrink-0 mt-0.5" />
              <div><strong className="text-white">Armazenamento local (IndexedDB/localStorage):</strong> <span className="text-slate-400">utilizado para funcionamento offline e persistência de configurações do dispositivo.</span></div>
            </li>
            <li className="flex items-start gap-3">
              <Bell size={16} className="text-sky-500 shrink-0 mt-0.5" />
              <div><strong className="text-white">Ligação à internet:</strong> <span className="text-slate-400">utilizada para sincronização de dados com o servidor backend.</span></div>
            </li>
          </ul>
          <p className="text-slate-400 text-sm mt-4">
            Nenhuma permissão de localização GPS, contactos, microfone ou outros sensores é solicitada pela aplicação.
          </p>
        </Section>

        {/* 9. Menores */}
        <Section num={9} title="Menores de Idade" icon={<Users size={18} />}>
          <p className="text-slate-400 text-sm">
            O EntryFlow é uma aplicação destinada exclusivamente a uso profissional por funcionários de condomínios (guardas, administradores).
            Não é dirigida a menores de 18 anos. Não recolhemos intencionalmente dados pessoais de menores. Se tomar conhecimento
            de que recolhemos dados de um menor sem consentimento parental, contacte-nos imediatamente para os eliminarmos.
          </p>
        </Section>

        {/* 10. Alterações */}
        <Section num={10} title="Alterações a Esta Política" icon={<Shield size={18} />}>
          <p className="text-slate-400 text-sm">
            Podemos atualizar esta Política de Privacidade periodicamente. Quando o fizermos, atualizaremos a data de
            "Última atualização" no topo desta página. Para alterações significativas, notificaremos os administradores
            de conta por e-mail ou através de uma notificação na aplicação.
          </p>
          <p className="text-slate-400 text-sm mt-3">
            Recomendamos que reveja esta política periodicamente. A utilização continuada da aplicação após a publicação
            de alterações constitui aceitação dessas alterações.
          </p>
        </Section>

        {/* 11. Contacto */}
        <Section num={11} title="Contacto" icon={<Mail size={18} />}>
          <p className="text-slate-400 text-sm mb-4">
            Para questões, pedidos ou reclamações relacionadas com privacidade, contacte-nos:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoCard label="E-mail (Privacidade)" value="privacy@chongtechnologies.com" isEmail />
            <InfoCard label="Suporte Geral" value="support@chongtechnologies.com" isEmail />
            <InfoCard label="Empresa" value="Chong Technologies" />
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center text-slate-600 text-xs pt-6 border-t border-slate-800">
          <p>&copy; 2026 Chong Technologies. Todos os direitos reservados.</p>
          <p className="mt-1">EntryFlow — Sistema de Gestão de Portaria para Condomínios</p>
        </div>
      </div>
    </div>
  );
};

/* --- Sub-components --- */

const Section: React.FC<{ num: number; title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ num, title, icon, children }) => (
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 md:p-6">
    <h2 className="flex items-center gap-3 text-white font-bold text-base mb-4 pb-3 border-b border-slate-700">
      <span className="bg-sky-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">{num}</span>
      {icon}
      {title}
    </h2>
    {children}
  </div>
);

const InfoCard: React.FC<{ label: string; value: string; isEmail?: boolean }> = ({ label, value, isEmail }) => (
  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{label}</p>
    {isEmail ? (
      <a href={`mailto:${value}`} className="text-sky-400 text-sm hover:underline break-all">{value}</a>
    ) : (
      <p className="text-slate-200 text-sm">{value}</p>
    )}
  </div>
);

const DataRow: React.FC<{ category: string; data: string; purpose: string }> = ({ category, data, purpose }) => (
  <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3">
    <p className="text-white text-sm font-semibold mb-1">{category}</p>
    <p className="text-slate-400 text-xs mb-1"><span className="text-slate-500">Dados:</span> {data}</p>
    <p className="text-slate-400 text-xs"><span className="text-slate-500">Finalidade:</span> {purpose}</p>
  </div>
);

const ThirdPartyRow: React.FC<{ provider: string; service: string; data: string }> = ({ provider, service, data }) => (
  <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3">
    <p className="text-white text-sm font-semibold">{provider}</p>
    <p className="text-slate-400 text-xs"><span className="text-slate-500">Serviço:</span> {service}</p>
    <p className="text-slate-400 text-xs"><span className="text-slate-500">Dados partilhados:</span> {data}</p>
  </div>
);

const RightRow: React.FC<{ right: string; description: string }> = ({ right, description }) => (
  <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3">
    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">Sim</span>
    <div>
      <span className="text-white text-sm font-semibold">{right}</span>
      <span className="text-slate-400 text-sm"> — {description}</span>
    </div>
  </div>
);

export default PrivacyPolicy;
