import React, { useState, useEffect, useContext, useRef } from 'react';
import { FileText, Loader2, Search, Shield, Calendar, Download, X, ChevronDown, Check } from 'lucide-react';
import { api } from '../../services/dataService';
import { AuditLog, Condominium } from '../../types';
import { useToast } from '../../components/Toast';
import { exportAuditLogsToCSV } from '../../utils/csvExport';
import { AuthContext } from '../../App';

// Searchable Select Component
interface SearchableSelectProps {
  options: { value: number | string; label: string }[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  alwaysVisibleValues?: Array<number | string>;
  className?: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhum resultado encontrado',
  alwaysVisibleValues = [],
  className = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    alwaysVisibleValues.includes(option.value) ||
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: number | string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between cursor-pointer"
      >
        <span className={selectedOption ? 'text-text-main' : 'text-text-dim'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-bg-root rounded transition-colors"
            >
              <X size={14} className="text-text-dim" />
            </button>
          )}
          <ChevronDown size={18} className={`text-text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-bg-surface border border-border-main rounded-lg shadow-lg">
          <div className="p-2 border-b border-border-main">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-dim text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-bg-root flex items-center justify-between transition-colors ${option.value === value ? 'bg-accent/10 text-accent' : 'text-text-main'
                    }`}
                >
                  <span>{option.label}</span>
                  {option.value === value && <Check size={16} className="text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAuditLogs() {
  const { showToast } = useToast();
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
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
  }, [filterCondoId, filterAction, filterTable, startDate, endDate]);

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

      const result = await api.adminGetAuditLogs(filters, pageSize, 0);

      setLogs(result.logs);
      setTotal(result.total);
      setHasMore(result.logs.length < result.total);
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
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const filters: any = {};

      if (filterCondoId) filters.condominiumId = filterCondoId;
      if (filterAction) filters.action = filterAction;
      if (filterTable) filters.targetTable = filterTable;
      if (startDate) filters.startDate = `${startDate}T00:00:00`;
      if (endDate) filters.endDate = `${endDate}T23:59:59`;

      const result = await api.adminGetAuditLogs(filters, pageSize, logs.length);
      setTotal(result.total);
      setLogs(prev => {
        const combined = [...prev, ...result.logs];
        setHasMore(combined.length < result.total);
        return combined;
      });
    } catch (error) {
      console.error('Error loading more audit logs:', error);
      showToast('error', 'Erro ao carregar mais logs');
    } finally {
      setLoadingMore(false);
    }
  };

  const getActionBadge = (action: string) => {
    const badges: { [key: string]: { bg: string, text: string } } = {
      'CREATE': { bg: 'bg-green-100', text: 'text-green-800' },
      'UPDATE': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'DELETE': { bg: 'bg-red-100', text: 'text-red-800' },
      'LOGIN': { bg: 'bg-purple-100', text: 'text-purple-800' },
      'LOGIN_FAILED': { bg: 'bg-orange-100', text: 'text-orange-800' },
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

  return (
    <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-2">Logs de Auditoria</h1>
          <p className="text-text-dim">Visualizar todas as ações administrativas no sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-text-dim">
            <Shield size={20} />
            <span className="font-medium">{total} registos</span>
          </div>
          <button
            onClick={() => {
              if (filteredLogs.length === 0) {
                showToast('warning', 'Nenhum log para exportar');
                return;
              }
              exportAuditLogsToCSV(filteredLogs);
              void api.logAudit({
                condominium_id: user?.condominium_id ?? null,
                actor_id: user?.id ?? null,
                action: 'EXPORT',
                target_table: 'audit_logs',
                target_id: null,
                details: {
                  format: 'CSV',
                  count: filteredLogs.length,
                  filters: {
                    search: searchTerm || null,
                    condominium_id: filterCondoId ?? null,
                    action: filterAction || null,
                    target_table: filterTable || null,
                    start_date: startDate || null,
                    end_date: endDate || null
                  }
                }
              });
              showToast('success', `${filteredLogs.length} logs exportados para CSV`);
            }}
            disabled={loading || filteredLogs.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download size={18} />
            Exportar CSV
          </button>
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
              className="w-full pl-10 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <SearchableSelect
            options={[
              { value: 'ALL', label: 'Todos os Condomínios' },
              ...condominiums.map(condo => ({ value: condo.id, label: condo.name }))
            ]}
            value={filterCondoId}
            onChange={(val) => {
              setFilterCondoId(val === 'ALL' ? null : val as number | null);
              setCurrentPage(1);
            }}
            placeholder="Todos os condomínios"
            searchPlaceholder="Pesquisar condomínio..."
            emptyMessage="Nenhum condomínio encontrado"
            alwaysVisibleValues={['ALL']}
          />

          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Ações</option>
            <option value="CREATE">Criar</option>
            <option value="UPDATE">Atualizar</option>
            <option value="DELETE">Eliminar</option>
            <option value="LOGIN">Login</option>
            <option value="LOGIN_FAILED">Login falhou</option>
            <option value="LOGOUT">Logout</option>
          </select>

          <select
            value={filterTable}
            onChange={(e) => {
              setFilterTable(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <Calendar size={20} className="text-text-dim" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Data Início"
            />
            <span className="text-text-dim">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Data Fim"
            />
          </div>

          {(filterCondoId || filterAction || filterTable || startDate || endDate || searchTerm) && (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm text-text-dim hover:text-text-main hover:bg-bg-root rounded-lg transition-colors"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-text-dim">Carregando logs de auditoria...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-8 text-center">
          <FileText size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-main mb-2">
            {searchTerm || filterCondoId || filterAction || filterTable ? 'Nenhum resultado encontrado' : 'Nenhum log de auditoria'}
          </h3>
          <p className="text-text-dim">
            {searchTerm || filterCondoId || filterAction || filterTable ? 'Tente ajustar os filtros de pesquisa' : 'Logs de auditoria aparecerão aqui quando ações forem realizadas'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg-root border-b border-border-main">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                      Ação
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                      Tabela
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                      Utilizador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                      Condomínio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-bg-root transition-colors">
                      <td className="px-4 py-3 text-sm text-text-main whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-main font-mono">
                        {log.target_table}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-main">
                        {log.actor ? (
                          <div>
                            <div className="font-medium">{log.actor.first_name} {log.actor.last_name}</div>
                            <div className="text-xs text-text-dim">{log.actor.role}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-main">
                        {log.condominium?.name || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-main">
                        {log.details ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-700">Ver detalhes</summary>
                            <pre className="mt-2 p-2 bg-bg-root rounded text-xs overflow-x-auto">
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

          {!loading && logs.length > 0 && hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingMore && <Loader2 size={18} className="animate-spin" />}
                {loadingMore ? 'Carregando...' : 'Mostrar mais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
