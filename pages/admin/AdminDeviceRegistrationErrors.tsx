import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, FileText, Loader2, Search } from 'lucide-react';
import { api } from '../../services/dataService';
import { DeviceRegistrationError } from '../../types';
import { useToast } from '../../components/Toast';

export default function AdminDeviceRegistrationErrors() {
  const { showToast } = useToast();
  const [errors, setErrors] = useState<DeviceRegistrationError[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDeviceId, setFilterDeviceId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, [currentPage, filterDeviceId, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (filterDeviceId.trim()) filters.deviceIdentifier = filterDeviceId.trim();
      if (startDate) filters.startDate = `${startDate}T00:00:00`;
      if (endDate) filters.endDate = `${endDate}T23:59:59`;

      const offset = (currentPage - 1) * pageSize;
      const result = await api.adminGetDeviceRegistrationErrors(filters, pageSize, offset);
      setErrors(result.errors);
      setTotal(result.total);
    } catch (error) {
      console.error('Error loading device registration errors:', error);
      showToast('error', 'Erro ao carregar erros de registo de dispositivos');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilterDeviceId('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setCurrentPage(1);
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

  const filteredErrors = errors.filter((entry) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      entry.device_identifier?.toLowerCase().includes(search) ||
      entry.error_message?.toLowerCase().includes(search) ||
      JSON.stringify(entry.payload)?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Erros de Registo de Dispositivos</h1>
          <p className="text-slate-600">Monitorize falhas na criaÇão de dispositivos no backend</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <AlertTriangle size={20} />
          <span className="font-medium">{total} registos</span>
        </div>
      </div>

      <div className="mb-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por device_id, erro, payload..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            type="text"
            placeholder="Filtrar por device_identifier exato"
            value={filterDeviceId}
            onChange={(e) => {
              setFilterDeviceId(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

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
            />
            <span className="text-slate-500">atÇ¸</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {(filterDeviceId || startDate || endDate || searchTerm) && (
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">Carregando erros de registo...</p>
        </div>
      ) : filteredErrors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <FileText size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm || filterDeviceId || startDate || endDate ? 'Nenhum resultado encontrado' : 'Nenhum erro registado'}
          </h3>
          <p className="text-slate-600">
            {searchTerm || filterDeviceId || startDate || endDate ? 'Tente ajustar os filtros de pesquisa' : 'Erros de registo de dispositivos aparecerão aqui'}
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
                      Device Identifier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Erro
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Payload
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredErrors.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-mono">
                        {entry.device_identifier || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 max-w-md">
                        {entry.error_message}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {entry.payload ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-700">Ver payload</summary>
                            <pre className="mt-2 p-2 bg-slate-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(entry.payload, null, 2)}
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
