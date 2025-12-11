import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Staff, UserRole } from './types';
import { api } from './services/dataService';
import { getDeviceIdentifier } from './services/deviceUtils';
import { audioService } from './services/audioService';
import { pwaLifecycleService } from './services/pwaLifecycleService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewEntry from './pages/NewEntry';
import DailyList from './pages/DailyList';
import Incidents from './pages/Incidents';
import Setup from './pages/Setup';
import { Wifi, WifiOff, LogOut, ShieldCheck, Loader2, RefreshCw, KeyRound, Copy, Check } from 'lucide-react';
import { AdminRoute } from './components/AdminRoute';
import { AdminLayout } from './components/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCondominiums from './pages/admin/AdminCondominiums';
import AdminDevices from './pages/admin/AdminDevices';
import AdminStaff from './pages/admin/AdminStaff';
import AdminUnits from './pages/admin/AdminUnits';
import AdminResidents from './pages/admin/AdminResidents';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminSports from './pages/admin/AdminSports';
import AdminVisits from './pages/admin/AdminVisits';
import AdminIncidents from './pages/admin/AdminIncidents';
import AdminVisitTypes from './pages/admin/AdminVisitTypes';
import AdminServiceTypes from './pages/admin/AdminServiceTypes';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import { ToastProvider } from './components/Toast';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { PWAUpdateNotification } from './components/PWAUpdateNotification';

// --- Auth Context ---
interface AuthContextType {
  user: Staff | null;
  login: (user: Staff) => void;
  logout: () => void;
}
export const AuthContext = React.createContext<AuthContextType>(null!);

// --- Layout Component ---
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = React.useContext(AuthContext);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [condoName, setCondoName] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    api.getDeviceCondoDetails().then(details => {
      if (details) setCondoName(details.name);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Início';
      case '/new-entry': return 'Nova Entrada';
      case '/day-list': return 'Atividade Diária';
      case '/incidents': return 'Incidentes';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <header className="bg-primary text-white px-4 py-3 md:px-6 md:py-3 flex items-center justify-between shadow-md z-10 shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1">
          <div onClick={() => navigate('/')} className="cursor-pointer flex items-center gap-3 shrink-0">
             <div className="bg-slate-800 p-1.5 rounded-lg border border-slate-700">
               <ShieldCheck className="text-accent w-5 h-5 md:w-6 md:h-6" />
             </div>
             <div className="flex flex-col justify-center">
                <span className="text-[10px] text-accent/80 font-bold uppercase tracking-widest leading-none hidden md:block mb-0.5">
                  Elite AccesControl
                </span>
                <h1 className="text-base md:text-xl font-bold tracking-tight text-white leading-tight truncate max-w-[180px] md:max-w-md">
                  {condoName || 'Elite AccesControl'}
                </h1>
             </div>
          </div>
          <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
          <span className="text-sm md:text-lg font-medium text-slate-300 truncate hidden xs:block">
            {getTitle()}
          </span>
        </div>
        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          <div className={`flex items-center gap-1 md:gap-2 px-2 py-1 md:px-3 rounded-full text-xs md:text-sm font-bold border ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            {isOnline ? <Wifi size={14} className="md:w-[16px] md:h-[16px]" /> : <WifiOff size={14} className="md:w-[16px] md:h-[16px]" />}
            <span className="hidden sm:inline">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <div className="flex items-center gap-3 pl-3 border-l border-slate-700">
             <div className="text-right hidden md:block">
                <p className="text-sm font-bold leading-tight text-white">{user?.first_name} {user?.last_name}</p>
                {user?.id && <p className="text-[10px] text-slate-400 uppercase tracking-wider">ID: {String(user.id).substring(0, 4)}...</p>}
             </div>
             <button 
              onClick={logout}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-red-400 transition-colors"
              title="Sair"
             >
               <LogOut size={18} className="md:w-5 md:h-5" />
             </button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto relative w-full">
        {children}
      </main>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = React.useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const ConfigGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineConfig, setShowOfflineConfig] = useState(false);
  const [condoId, setCondoId] = useState('');
  const [condoName, setCondoName] = useState('');
  const [configuring, setConfiguring] = useState(false);
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Retry configuration when coming back online
      window.location.reload();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load device identifier
    const id = getDeviceIdentifier();
    setDeviceId(id);

    api.isDeviceConfigured().then(configured => {
      setIsConfigured(configured);
      setLoading(false);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const copyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOfflineConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConfiguring(true);

    const id = parseInt(condoId);
    if (isNaN(id) || id <= 0) {
      setError('ID do condomínio inválido');
      setConfiguring(false);
      return;
    }

    if (!condoName.trim()) {
      setError('Nome do condomínio é obrigatório');
      setConfiguring(false);
      return;
    }

    const result = await api.configureDeviceOffline(id, condoName.trim());

    if (result.success) {
      setIsConfigured(true);
      window.location.reload();
    } else {
      setError(result.error || 'Erro ao configurar dispositivo');
    }

    setConfiguring(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin text-sky-500 mb-4" size={48} />
        <p className="text-lg font-semibold">A carregar configuração do quiosque...</p>
      </div>
    );
  }

  if (!isConfigured) {
    // OFFLINE + NOT CONFIGURED → Show offline emergency configuration
    if (!isOnline && !showOfflineConfig) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8">
          <WifiOff className="text-red-500 mb-6" size={64} />
          <h1 className="text-3xl font-bold mb-4 text-center">Dispositivo Não Configurado</h1>
          <p className="text-lg text-slate-300 text-center mb-6 max-w-md">
            Este dispositivo não está configurado e não há conexão à internet.
          </p>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md mb-6">
            <h2 className="text-xl font-semibold mb-3 text-amber-400">Instruções:</h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-300">
              <li>Contacte o <strong className="text-white">administrador da aplicação</strong></li>
              <li>Informe o <strong className="text-white">device_identifier</strong> deste tablet ao admin:
                <div className="mt-2 bg-slate-900 border border-slate-600 rounded p-3 flex items-center justify-between">
                  <code className="text-sky-400 text-xs font-mono break-all">{deviceId}</code>
                  <button
                    onClick={copyDeviceId}
                    className="ml-2 p-2 bg-slate-700 hover:bg-slate-600 rounded flex-shrink-0"
                    title="Copiar ID"
                  >
                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </li>
              <li>O admin verificará na base de dados central:
                <ul className="list-disc list-inside ml-4 mt-1 text-sm">
                  <li><strong className="text-green-400">Se JÁ ATRIBUÍDO:</strong> fornecerá ID e nome do condomínio</li>
                  <li><strong className="text-blue-400">Se NOVO:</strong> atribuirá o dispositivo e fornecerá os dados</li>
                </ul>
              </li>
              <li>Clique em "Configuração Manual" e insira os dados fornecidos pelo admin</li>
            </ol>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold flex items-center gap-2"
            >
              <RefreshCw size={20} />
              Tentar Novamente
            </button>
            <button
              onClick={() => setShowOfflineConfig(true)}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg font-semibold flex items-center gap-2"
            >
              <KeyRound size={20} />
              Configuração Manual
            </button>
          </div>
        </div>
      );
    }

    // OFFLINE MANUAL CONFIGURATION FORM
    if (!isOnline && showOfflineConfig) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold mb-6 text-center">Configuração Manual (Offline)</h1>

            <form onSubmit={handleOfflineConfiguration} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-300">
                  ID do Condomínio <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={condoId}
                  onChange={(e) => setCondoId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-sky-500 focus:outline-none"
                  placeholder="Ex: 123"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Fornecido pelo administrador</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-300">
                  Nome do Condomínio <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={condoName}
                  onChange={(e) => setCondoName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-sky-500 focus:outline-none"
                  placeholder="Ex: Condomínio Elite"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOfflineConfig(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold"
                  disabled={configuring}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-sky-600 hover:bg-sky-700 rounded-lg font-semibold flex items-center justify-center gap-2"
                  disabled={configuring}
                >
                  {configuring ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      A configurar...
                    </>
                  ) : (
                    'Configurar'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-300">
                ⚠️ Esta configuração será sincronizada com o servidor quando a internet for restaurada.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // ONLINE BUT NOT CONFIGURED → Proceed to normal setup
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<Staff | null>(null);

  const login = (staff: Staff) => setUser(staff);
  const logout = () => setUser(null);

  useEffect(() => {
    // Initialize PWA lifecycle tracking
    pwaLifecycleService.init();
    pwaLifecycleService.checkInactivityDecommission();

    // Log installation status
    const status = pwaLifecycleService.getInstallationStatus();
    console.log('[App] PWA Installation Status:', status);

    // Initialize audio service on any user interaction
    const initAudio = () => {
      audioService.initialize().then(success => {
        if (success) {
          console.log('[App] ✅ Audio service initialized successfully');
        }
      });
      // Remove listeners after first interaction
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('keydown', initAudio);
    };

    // Add listeners for first user interaction
    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);
    document.addEventListener('keydown', initAudio);

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, []);

  return (
    <ToastProvider>
      <AuthContext.Provider value={{ user, login, logout }}>
        <PWAUpdateNotification />
        <PWAInstallPrompt />
        <HashRouter>
          <Routes>
            <Route path="/setup" element={<Setup />} />
            <Route path="/login" element={<ConfigGuard><Login /></ConfigGuard>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ConfigGuard><AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/condominiums" element={<ConfigGuard><AdminRoute><AdminLayout><AdminCondominiums /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/devices" element={<ConfigGuard><AdminRoute><AdminLayout><AdminDevices /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/staff" element={<ConfigGuard><AdminRoute><AdminLayout><AdminStaff /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/units" element={<ConfigGuard><AdminRoute><AdminLayout><AdminUnits /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/residents" element={<ConfigGuard><AdminRoute><AdminLayout><AdminResidents /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/restaurants" element={<ConfigGuard><AdminRoute><AdminLayout><AdminRestaurants /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/sports" element={<ConfigGuard><AdminRoute><AdminLayout><AdminSports /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/visits" element={<ConfigGuard><AdminRoute><AdminLayout><AdminVisits /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/incidents" element={<ConfigGuard><AdminRoute><AdminLayout><AdminIncidents /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/config/visit-types" element={<ConfigGuard><AdminRoute><AdminLayout><AdminVisitTypes /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/config/service-types" element={<ConfigGuard><AdminRoute><AdminLayout><AdminServiceTypes /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/analytics" element={<ConfigGuard><AdminRoute><AdminLayout><AdminAnalytics /></AdminLayout></AdminRoute></ConfigGuard>} />
            <Route path="/admin/audit-logs" element={<ConfigGuard><AdminRoute><AdminLayout><AdminAuditLogs /></AdminLayout></AdminRoute></ConfigGuard>} />

            {/* Guard Routes */}
            <Route path="/" element={<ConfigGuard><ProtectedRoute><Dashboard /></ProtectedRoute></ConfigGuard>} />
            <Route path="/new-entry" element={<ConfigGuard><ProtectedRoute><NewEntry /></ProtectedRoute></ConfigGuard>} />
            <Route path="/day-list" element={<ConfigGuard><ProtectedRoute><DailyList /></ProtectedRoute></ConfigGuard>} />
            <Route path="/incidents" element={<ConfigGuard><ProtectedRoute><Incidents /></ProtectedRoute></ConfigGuard>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HashRouter>
      </AuthContext.Provider>
    </ToastProvider>
  );
}