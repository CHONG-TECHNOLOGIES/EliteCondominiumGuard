import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

export default function AdminAnalytics() {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics & Relatórios</h1>
        <p className="text-slate-600">Visualizar estatísticas e tendências do sistema</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <BarChart3 size={64} className="text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Em Construção</h3>
        <p className="text-slate-600">Esta funcionalidade será implementada em breve.</p>
        <p className="text-sm text-slate-500 mt-2">
          Em breve: Gráficos, tendências, relatórios exportáveis e métricas detalhadas
        </p>
      </div>
    </div>
  );
}
