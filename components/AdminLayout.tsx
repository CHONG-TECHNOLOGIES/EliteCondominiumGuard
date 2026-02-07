import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { useToast } from './Toast';
import { api } from '../services/dataService';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../types';
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
  FileText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Utensils,
  Dumbbell,
  Wifi,
  WifiOff,
  ShieldCheck,
  Palette,
  Moon,
  Sparkles,
  Newspaper
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
  const { theme, setTheme } = useTheme();
  const { showConfirm } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['management']);
  const [isOnline, setIsOnline] = useState(api.checkOnline());
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isTabletCollapsed, setIsTabletCollapsed] = useState(true);

  // Responsive breakpoints
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update online status periodically
  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(api.checkOnline());
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    const interval = setInterval(handleOnlineStatus, 2000);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      clearInterval(interval);
    };
  }, []);

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
        },
        {
          label: 'Notícias',
          path: '/admin/news',
          icon: <Newspaper size={18} />
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
    },
    {
      label: 'Logs',
      path: '/admin/logs',
      icon: <FileText size={20} />,
      children: [
        {
          label: 'Auditoria',
          path: '/admin/audit-logs',
          icon: <FileText size={18} />
        },
        {
          label: 'Erros de Registo',
          path: '/admin/device-registration-errors',
          icon: <AlertTriangle size={18} />
        }
      ]
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
    showConfirm(
      'Tem certeza que deseja sair?',
      () => {
        logout();
        navigate('/login');
      }
    );
  };

  // Determine sidebar width and visibility based on device type
  const getSidebarClasses = () => {
    if (isDesktop) {
      return 'relative translate-x-0 w-64';
    }
    if (isTablet) {
      return `relative translate-x-0 ${isTabletCollapsed ? 'w-20' : 'w-64'}`;
    }
    // Mobile
    return `w-72 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`;
  };

  // Check if sidebar is in collapsed (icons-only) mode
  const isCollapsedMode = isTablet && isTabletCollapsed;

  return (
    <div className="flex h-screen bg-bg-root overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-primary text-white transform transition-all duration-300 ease-in-out flex flex-col ${getSidebarClasses()}`}
      >
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center ${isCollapsedMode ? 'justify-center px-2' : 'justify-between px-4'} border-b border-white/10 shrink-0`}>
          {isCollapsedMode ? (
            <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
              <ShieldCheck className="text-accent w-5 h-5" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <ShieldCheck className="text-accent w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Admin Panel</h1>
                  <p className="text-xs text-slate-400">Elite AccesControl</p>
                </div>
              </div>
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Tablet Toggle Button */}
        {isTablet && (
          <button
            onClick={() => setIsTabletCollapsed(!isTabletCollapsed)}
            className="absolute -right-3 top-20 bg-primary border-2 border-white/20 rounded-full p-1.5 z-50 hover:bg-slate-700 transition-colors shadow-lg"
            title={isTabletCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isTabletCollapsed ? <ChevronRight size={14} className="text-white" /> : <ChevronLeft size={14} className="text-white" />}
          </button>
        )}

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto ${isCollapsedMode ? 'p-2' : 'p-4'} space-y-2 min-h-0`}>
          {navItems.map((item) => (
            <div key={item.label}>
              {isCollapsedMode ? (
                // Collapsed mode - icons only
                item.children ? (
                  <div className="space-y-1">
                    <button
                      onClick={() => setIsTabletCollapsed(false)}
                      className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
                        item.children.some(child => isActive(child.path))
                          ? 'bg-accent text-slate-900'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                      title={item.label}
                    >
                      {item.icon}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-accent text-slate-900'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                    title={item.label}
                  >
                    {item.icon}
                  </button>
                )
              ) : (
                // Expanded mode - full navigation
                item.children ? (
                  <div>
                    <button
                      onClick={() => toggleSection(item.label)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${expandedSections.includes(item.label)
                        ? 'bg-white/10 text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${expandedSections.includes(item.label) ? 'rotate-180' : ''
                          }`}
                      />
                    </button>
                    {expandedSections.includes(item.label) && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <button
                            key={child.path}
                            onClick={() => handleNavigation(child.path)}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${isActive(child.path)
                              ? 'bg-accent text-slate-900 font-bold'
                              : 'text-slate-300 hover:bg-white/10 hover:text-white'
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
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                      ? 'bg-accent text-slate-900 font-bold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className={`border-t border-white/10 ${isCollapsedMode ? 'p-2' : 'p-4'} space-y-2 shrink-0`}>
          {isCollapsedMode ? (
            // Collapsed footer - just logout icon
            <>
              <button
                onClick={() => setIsTabletCollapsed(false)}
                className="w-full flex items-center justify-center p-3 text-slate-300 hover:bg-white/10 rounded-lg transition-colors"
                title={`${user?.first_name} ${user?.last_name}`}
              >
                <UserCircle size={20} />
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            // Expanded footer
            <>
              {/* User Info */}
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-sm font-bold text-white">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-slate-400">Administrador</p>
              </div>

              {/* Theme Selector */}
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Palette size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Aparência</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTheme(Theme.ELITE)}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${theme === Theme.ELITE
                      ? 'bg-accent text-slate-900 shadow-lg'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    title="Elite (Padrão)"
                  >
                    <Sparkles size={18} />
                    <span className="text-[10px] font-bold">Elite</span>
                  </button>
                  <button
                    onClick={() => setTheme(Theme.MIDNIGHT)}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${theme === Theme.MIDNIGHT
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    title="Midnight"
                  >
                    <Moon size={18} />
                    <span className="text-[10px] font-bold">Dark</span>
                  </button>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut size={20} />
                <span className="font-medium">Sair</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 md:h-16 bg-bg-surface border-b border-border-main flex items-center justify-between px-3 md:px-4 lg:px-6 shrink-0">
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={24} className="text-slate-700" />
            </button>
          )}

          <div className="flex items-center gap-4 ml-auto">
            {/* Online/Offline Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${isOnline
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
        <main className="flex-1 overflow-y-auto bg-bg-root">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
