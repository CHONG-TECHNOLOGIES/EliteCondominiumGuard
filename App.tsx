import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Staff, UserRole } from './types';
import { api } from './services/dataService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewEntry from './pages/NewEntry';
import DailyList from './pages/DailyList';
import Incidents from './pages/Incidents';
import Setup from './pages/Setup';
import { Wifi, WifiOff, LogOut, ShieldCheck, Loader2 } from 'lucide-react';
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
import { ToastProvider } from './components/Toast';

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
                  Elite CondoGuard
                </span>
                <h1 className="text-base md:text-xl font-bold tracking-tight text-white leading-tight truncate max-w-[180px] md:max-w-md">
                  {condoName || 'Elite CondoGuard'}
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

  useEffect(() => {
    api.isDeviceConfigured().then(configured => {
      setIsConfigured(configured);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin text-sky-500 mb-4" size={48} />
        <p className="text-lg font-semibold">A carregar configuração do quiosque...</p>
      </div>
    );
  }

  if (!isConfigured) {
    return <Navigate to="/setup" replace />;
  }
  
  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<Staff | null>(null);

  const login = (staff: Staff) => setUser(staff);
  const logout = () => setUser(null);

  return (
    <ToastProvider>
      <AuthContext.Provider value={{ user, login, logout }}>
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