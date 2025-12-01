import React from 'react';
import { Dumbbell, Plus } from 'lucide-react';

export default function AdminSports() {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Desportos</h1>
          <p className="text-slate-600">Gerir instalações desportivas e áreas recreativas</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors">
          <Plus size={20} />
          Novo Desporto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <Dumbbell size={64} className="text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Em Construção</h3>
        <p className="text-slate-600">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  );
}
