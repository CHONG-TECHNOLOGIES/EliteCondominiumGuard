import React from 'react';
import { AlertTriangle, Map, Download } from 'lucide-react';

export default function AdminIncidents() {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Incidentes</h1>
          <p className="text-slate-600">Ver e analisar todos os incidentes do sistema</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors">
            <Map size={20} />
            Ver Mapa
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors">
            <Download size={20} />
            Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <AlertTriangle size={64} className="text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Em Construção</h3>
        <p className="text-slate-600">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  );
}
