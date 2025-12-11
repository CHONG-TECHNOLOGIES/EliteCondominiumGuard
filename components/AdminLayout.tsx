import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import {
  LayoutDashboard,
  Building2,
  Tablet,
  Users,
  Home,
  UserCircle,
  ClipboardList,
  AlertTriangle,
  Settings,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Utensils,
  Dumbbell,
  Wifi,
  WifiOff,
  ShieldCheck
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['management']);
  const [isOnline] = useState(navigator.onLine);

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/admin',
      icon: <LayoutDashboard size={20} />
    },
    {
      label: 'Gestão',
      path: '/admin/management',
      icon: <Settings size={20} />,
      children: [
        {
          label: 'Condomínios',
          path: '/admin/condominiums',
          icon: <Building2 size={18} />
        },
        {
          label: 'Dispositivos',
          path: '/admin/devices',
          icon: <Tablet size={18} />
        },
        {
          label: 'Pessoal',
          path: '/admin/staff',
          icon: <Users size={18} />
        },
        {
          label: 'Unidades',
          path: '/admin/units',
          icon: <Home size={18} />
        },
        {
          label: 'Residentes',
          path: '/admin/residents',
          icon: <UserCircle size={18} />
        },
        {
          label: 'Restaurantes',
          path: '/admin/restaurants',
          icon: <Utensils size={18} />
        },
        {
          label: 'Desportos',
          path: '/admin/sports',
          icon: <Dumbbell size={18} />
        }
      ]
    },
    {
      label: 'Operações',
      path: '/admin/operations',
      icon: <ClipboardList size={20} />,
      children: [
        {
          label: 'Visitas',
          path: '/admin/visits',
          icon: <ClipboardList size={18} />
        },
        {
          label: 'Incidentes',
          path: '/admin/incidents',
          icon: <AlertTriangle size={18} />
        }
      ]
    },
    {
      label: 'Configuração',
      path: '/admin/config',
      icon: <Settings size={20} />,
      children: [
        {
          label: 'Tipos de Visita',
          path: '/admin/config/visit-types',
          icon: <Settings size={18} />
        },
        {
          label: 'Tipos de Serviço',
          path: '/admin/config/service-types',
          icon: <Settings size={18} />
        }
      ]
    },
    {
      label: 'Analytics',
      path: '/admin/analytics',
      icon: <BarChart3 size={20} />
    }
  ];

  const toggleSection = (label: string) => {
    setExpandedSections(prev =>
      prev.includes(label)
        ? prev.filter(s => s !== label)
        : [...prev, label]
    );
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
              <ShieldCheck className="text-accent w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Panel</h1>
              <p className="text-xs text-slate-400">Elite AccesControl</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                // Parent with children
                <div>
                  <button
                    onClick={() => toggleSection(item.label)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      expandedSections.includes(item.label)
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        expandedSections.includes(item.label) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSections.includes(item.label) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <button
                          key={child.path}
                          onClick={() => handleNavigation(child.path)}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                            isActive(child.path)
                              ? 'bg-accent text-slate-900 font-bold'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {child.icon}
                          <span className="text-sm">{child.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Single item without children
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-accent text-slate-900 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-800 p-4 space-y-2 shrink-0">
          {/* User Info */}
          <div className="px-4 py-3 bg-slate-800 rounded-lg">
            <p className="text-sm font-bold text-white">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-slate-400">Administrador</p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={24} className="text-slate-700" />
          </button>

          <div className="flex items-center gap-4">
            {/* Online/Offline Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 border-red-500/20'
              }`}
            >
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span className="hidden sm:inline">
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-100">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
