
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { api } from '../services/dataService';
import { Incident } from '../types';
import { CheckSquare, ArrowLeft } from 'lucide-react';

export default function Incidents() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const loadIncidents = async () => {
    const data = await api.getIncidents();
    setIncidents(data);
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleAcknowledge = async (id: string) => {
    await api.acknowledgeIncident(id, user?.first_name || 'Guard');
    alert("Visto. Residentes/Admin serão notificados.");
    // In real app, refresh list
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-20 md:pb-6">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-slate-200 rounded-full transition-colors active:scale-95"
        >
          <ArrowLeft size={28} className="text-slate-700" />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Registo de Incidentes</h2>
      </div>

      <div className="grid gap-4">
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
            Não há incidentes registados.
          </div>
        ) : (
          incidents.map(inc => (
            <div key={inc.id} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border-l-8 border-red-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg md:text-xl font-bold text-slate-800">{inc.title}</h3>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">{inc.severity}</span>
                </div>
                <p className="text-slate-600">{inc.description}</p>
                <p className="text-slate-400 text-xs md:text-sm mt-2">Reportado em: {new Date(inc.reported_at).toLocaleString()}</p>
              </div>
              
              {inc.status !== 'RESOLVIDO' && (
                <button 
                  onClick={() => handleAcknowledge(inc.id)}
                  className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 md:px-6 rounded-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <CheckSquare size={20}/> Confirmar Leitura
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
