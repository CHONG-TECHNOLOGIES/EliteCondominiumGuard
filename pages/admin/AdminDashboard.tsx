import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { api } from '../../services/dataService';
import {
  Building2,
  Tablet,
  Users,
  Home,
  UserCircle,
  ClipboardList,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

interface DashboardStats {
  totalCondominiums: number;
  activeCondominiums: number;
  activeDevices: number;
  totalDevices: number;
  totalStaff: number;
  totalUnits: number;
  totalResidents: number;
  todayVisits: number;
  pendingVisits: number;
  insideVisits: number;
  activeIncidents: number;
  totalIncidents: number;
  resolvedIncidents: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'slate';
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    slate: 'bg-slate-500'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
          )}
        </div>
        <div className={`${colorClasses[color]} p-3 rounded-lg`}>
          {React.cloneElement(icon as React.ReactElement, {
            className: 'text-white',
            size: 24
          })}
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCondominiums: 0,
    activeCondominiums: 0,
    activeDevices: 0,
    totalDevices: 0,
    totalStaff: 0,
    totalUnits: 0,
    totalResidents: 0,
    todayVisits: 0,
    pendingVisits: 0,
    insideVisits: 0,
    activeIncidents: 0,
    totalIncidents: 0,
    resolvedIncidents: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Use admin-specific methods that fetch data across ALL condominiums
      const dashboardStats = await api.adminGetDashboardStats();

      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
            <p className="text-slate-600 font-medium">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Dashboard Administrativo
        </h1>
        <p className="text-slate-600">
          Bem-vindo, <strong>{user?.first_name}</strong>! Aqui está uma visão geral do sistema.
        </p>
      </div>

      {/* Infrastructure Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity size={24} className="text-blue-600" />
          Infraestrutura
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Condomínios"
            value={stats.totalCondominiums}
            icon={<Building2 />}
            color="blue"
            onClick={() => navigate('/admin/condominiums')}
          />
          <StatCard
            title="Dispositivos Ativos"
            value={`${stats.activeDevices}/${stats.totalDevices}`}
            subtitle={stats.totalDevices > 0 ? `${Math.round((stats.activeDevices / stats.totalDevices) * 100)}% online` : 'Nenhum dispositivo'}
            icon={<Tablet />}
            color="green"
            onClick={() => navigate('/admin/devices')}
          />
          <StatCard
            title="Pessoal"
            value={stats.totalStaff}
            subtitle="Total de guardas e admins"
            icon={<Users />}
            color="purple"
            onClick={() => navigate('/admin/staff')}
          />
          <StatCard
            title="Unidades"
            value={stats.totalUnits}
            icon={<Home />}
            color="slate"
            onClick={() => navigate('/admin/units')}
          />
        </div>
      </div>

      {/* Residents */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <UserCircle size={24} className="text-purple-600" />
          Residentes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total de Residentes"
            value={stats.totalResidents}
            icon={<UserCircle />}
            color="purple"
            onClick={() => navigate('/admin/residents')}
          />
          <StatCard
            title="Com App Instalado"
            value={0}
            subtitle="TODO: Implementar tracking"
            icon={<CheckCircle />}
            color="green"
          />
          <StatCard
            title="Sem App"
            value={stats.totalResidents}
            subtitle="TODO: Implementar tracking"
            icon={<XCircle />}
            color="orange"
          />
        </div>
      </div>

      {/* Visits Today */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ClipboardList size={24} className="text-green-600" />
          Visitas Hoje
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total de Visitas"
            value={stats.todayVisits}
            icon={<ClipboardList />}
            color="blue"
            onClick={() => navigate('/admin/visits')}
          />
          <StatCard
            title="Pendentes"
            value={stats.pendingVisits}
            icon={<Clock />}
            color="orange"
          />
          <StatCard
            title="No Interior"
            value={stats.insideVisits}
            icon={<TrendingUp />}
            color="green"
          />
          <StatCard
            title="Finalizadas"
            value={stats.todayVisits - stats.pendingVisits - stats.insideVisits}
            icon={<CheckCircle />}
            color="slate"
          />
        </div>
      </div>

      {/* Incidents */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle size={24} className="text-red-600" />
          Incidentes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Incidentes Ativos"
            value={stats.activeIncidents}
            subtitle={stats.activeIncidents > 0 ? 'Requer atenção!' : 'Tudo sob controlo'}
            icon={<AlertTriangle />}
            color={stats.activeIncidents > 0 ? 'red' : 'green'}
            onClick={() => navigate('/admin/incidents')}
          />
          <StatCard
            title="Total de Incidentes"
            value={stats.totalIncidents}
            icon={<AlertTriangle />}
            color="orange"
          />
          <StatCard
            title="Resolvidos"
            value={stats.resolvedIncidents}
            icon={<CheckCircle />}
            color="green"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin/condominiums')}
            className="bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-400 rounded-xl p-6 text-left transition-all"
          >
            <Building2 size={32} className="text-blue-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">Gerir Condomínios</h3>
            <p className="text-sm text-slate-600">
              Criar, editar ou desativar condomínios
            </p>
          </button>

          <button
            onClick={() => navigate('/admin/staff')}
            className="bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-purple-400 rounded-xl p-6 text-left transition-all"
          >
            <Users size={32} className="text-purple-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">Gerir Pessoal</h3>
            <p className="text-sm text-slate-600">
              Adicionar guardas e administradores
            </p>
          </button>

          <button
            onClick={() => navigate('/admin/analytics')}
            className="bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-green-400 rounded-xl p-6 text-left transition-all"
          >
            <TrendingUp size={32} className="text-green-600 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">Ver Analytics</h3>
            <p className="text-sm text-slate-600">
              Relatórios e estatísticas detalhadas
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
