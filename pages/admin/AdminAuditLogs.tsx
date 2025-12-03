import React, { useState, useEffect } from 'react';
import { FileText, Loader2, Search, ChevronLeft, ChevronRight, Shield, Calendar } from 'lucide-react';
import { api } from '../../services/dataService';
import { AuditLog, Condominium } from '../../types';
import { useToast } from '../../components/Toast';

export default function AdminAuditLogs() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterTable, setFilterTable] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadCondominiums();
  }, []);

  useEffect(() => {
    loadData();
  }, [currentPage, filterCondoId, filterAction, filterTable, startDate, endDate]);

  const loadCondominiums = async () => {
    try {
      const data = await api.adminGetAllCondominiums();
      setCondominiums(data);
    } catch (error) {
      console.error('Error loading condominiums:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};

      if (filterCondoId) filters.condominiumId = filterCondoId;
      if (filterAction) filters.action = filterAction;
      if (filterTable) filters.targetTable = filterTable;
      if (startDate) filters.startDate = `${startDate}T00:00:00`;
      if (endDate) filters.endDate = `${endDate}T23:59:59`;

      const offset = (currentPage - 1) * pageSize;
      const result = await api.adminGetAuditLogs(filters, pageSize, offset);

      setLogs(result.logs);
      setTotal(result.total);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      showToast('error', 'Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilterCondoId(null);
    setFilterAction('');
    setFilterTable('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const getActionBadge = (action: string) => {
    const badges: { [key: string]: { bg: string, text: string } } = {
      'CREATE': { bg: 'bg-green-100', text: 'text-green-800' },
      'UPDATE': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'DELETE': { bg: 'bg-red-100', text: 'text-red-800' },
      'LOGIN': { bg: 'bg-purple-100', text: 'text-purple-800' },
      'LOGOUT': { bg: 'bg-gray-100', text: 'text-gray-800' }
    };

    const badge = badges[action] || { bg: 'bg-slate-100', text: 'text-slate-800' };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${badge.bg} ${badge.text}`}>
        {action}
      </span>
    );
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(search) ||
      log.target_table?.toLowerCase().includes(search) ||
      log.actor?.first_name?.toLowerCase().includes(search) ||
      log.actor?.last_name?.toLowerCase().includes(search) ||
      log.condominium?.name?.toLowerCase().includes(search) ||
      JSON.stringify(log.details)?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Logs de Auditoria</h1>
          <p className="text-slate-600">Visualizar todas as ações administrativas no sistema</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Shield size={20} />
          <span className="font-medium">{total} registos</span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por ação, tabela, utilizador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterCondoId || ''}
            onChange={(e) => {
              setFilterCondoId(e.target.value ? parseInt(e.target.value) : null);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Condomínios</option>
            {condominiums.map(condo => (
              <option key={condo.id} value={condo.id}>{condo.name}</option>
            ))}
          </select>

          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Ações</option>
            <option value="CREATE">Criar</option>
            <option value="UPDATE">Atualizar</option>
            <option value="DELETE">Eliminar</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>

          <select
            value={filterTable}
            onChange={(e) => {
              setFilterTable(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Tabelas</option>
            <option value="condominiums">Condomínios</option>
            <option value="devices">Dispositivos</option>
            <option value="staff">Staff</option>
            <option value="units">Unidades</option>
            <option value="residents">Residentes</option>
            <option value="visits">Visitas</option>
            <option value="incidents">Incidentes</option>
            <option value="visit_types">Tipos de Visita</option>
            <option value="service_types">Tipos de Serviço</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Data Início"
            />
            <span className="text-slate-500">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Data Fim"
            />
          </div>

          {(filterCondoId || filterAction || filterTable || startDate || endDate || searchTerm) && (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">Carregando logs de auditoria...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <FileText size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm || filterCondoId || filterAction || filterTable ? 'Nenhum resultado encontrado' : 'Nenhum log de auditoria'}
          </h3>
          <p className="text-slate-600">
            {searchTerm || filterCondoId || filterAction || filterTable ? 'Tente ajustar os filtros de pesquisa' : 'Logs de auditoria aparecerão aqui quando ações forem realizadas'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ação
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tabela
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Utilizador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Condomínio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-mono">
                        {log.target_table}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {log.actor ? (
                          <div>
                            <div className="font-medium">{log.actor.first_name} {log.actor.last_name}</div>
                            <div className="text-xs text-slate-500">{log.actor.role}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {log.condominium?.name || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {log.details ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-700">Ver detalhes</summary>
                            <pre className="mt-2 p-2 bg-slate-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3">
              <div className="text-sm text-slate-600">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, total)} de {total} registos
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
