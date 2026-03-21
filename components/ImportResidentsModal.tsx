import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, AlertCircle, Check, Trash2, Building2, UserCircle2 } from 'lucide-react';
import { GeminiService, ParsedResident } from '../services/geminiService';
import { api } from '../services/dataService';
import { Condominium, Unit } from '../types';
import { useToast } from '../components/Toast';

interface ImportResidentsModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialCondoId?: number | null;
  condominiums: Condominium[];
}

export default function ImportResidentsModal({ onClose, onSuccess, initialCondoId, condominiums }: ImportResidentsModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [selectedCondoId, setSelectedCondoId] = useState<number | null>(initialCondoId || null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [parsedData, setParsedData] = useState<ParsedResident[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCondoId) {
      loadUnits(selectedCondoId);
    }
  }, [selectedCondoId]);

  const loadUnits = async (condoId: number) => {
    try {
      const data = await api.adminGetAllUnits(condoId);
      setUnits(data);
    } catch (err) {
      console.error("Error loading units:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedCondoId) {
      showToast('warning', 'Por favor, selecione um condomínio primeiro.');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const results = await GeminiService.analyzeResidentFile(file);
      setParsedData(results);
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Falha ao processar o ficheiro.');
      setStep('upload');
    }
  };

  const handleImport = async () => {
    if (!selectedCondoId) return;
    
    setImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const resident of parsedData) {
      // Find matching unit ID
      const matchedUnit = units.find(u => {
        const unitLabel = `${u.code_block} ${u.number}`.toLowerCase();
        const extractedLabel = `${resident.unit_block || ''} ${resident.unit_number || ''}`.trim().toLowerCase();
        return unitLabel.includes(extractedLabel) || extractedLabel.includes(unitLabel);
      });

      if (!matchedUnit) {
        failCount++;
        continue;
      }

      try {
        const result = await api.adminCreateResident({
          ...resident,
          condominium_id: selectedCondoId,
          unit_id: matchedUnit.id
        });
        if (result) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }
    }

    setImporting(false);
    showToast('success', `Importação concluída: ${successCount} residentes criados.`);
    if (failCount > 0) {
      showToast('warning', `${failCount} residentes não puderam ser importados (Unidade não encontrada ou erro).`);
    }
    
    if (successCount > 0) {
      onSuccess();
    }
    onClose();
  };

  const removeResident = (index: number) => {
    setParsedData(prev => prev.filter((_, i) => i !== index));
  };

  const updateResidentField = (index: number, field: keyof ParsedResident, value: string) => {
    setParsedData(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Importar Residentes</h2>
            <p className="text-slate-500 text-sm">Carregue um ficheiro PDF, Excel ou CSV para extração automática</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800">
                <AlertCircle className="shrink-0" size={20} />
                <p className="text-sm">
                  O nosso sistema usa IA para ler o seu documento. Certifique-se de que o documento contém nomes, unidades e contactos legíveis.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Condomínio Destino</label>
                <select
                  value={selectedCondoId || ''}
                  onChange={(e) => setSelectedCondoId(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione um condomínio...</option>
                  {condominiums.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-blue-400 transition-colors bg-slate-50">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.csv,.xlsx,.xls"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={!selectedCondoId}
                />
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                    <Upload size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Clique para carregar ou arraste o ficheiro</h3>
                  <p className="text-slate-500 text-sm">PDF, Excel ou CSV (Max 10MB)</p>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 flex gap-2">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
              <h3 className="text-xl font-bold text-slate-800 mb-2">A analisar o ficheiro...</h3>
              <p className="text-slate-500">Isto pode demorar alguns segundos conforme o tamanho do documento.</p>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800">Revisão de Dados ({parsedData.length})</h3>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">Extraído com Sucesso</span>
              </div>
              
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Residente</th>
                      <th className="px-4 py-3">Unidade Reconhecida</th>
                      <th className="px-4 py-3">Contacto</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {parsedData.map((resident, idx) => {
                      const matched = units.find(u => {
                        const label = `${u.code_block} ${u.number}`.toLowerCase();
                        const extracted = `${resident.unit_block || ''} ${resident.unit_number || ''}`.trim().toLowerCase();
                        return label.includes(extracted) || extracted.includes(label);
                      });

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              value={resident.name}
                              onChange={(e) => updateResidentField(idx, 'name', e.target.value)}
                              className="w-full bg-transparent font-medium text-slate-800 focus:outline-blue-500 px-1 rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className={`flex items-center gap-1.5 ${matched ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {matched ? (
                                <><Check size={14} /> <span>{matched.code_block} {matched.number}</span></>
                              ) : (
                                <><AlertCircle size={14} /> <span>{resident.unit_block} {resident.unit_number} (N?o mapeado)</span></>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            <div>{resident.phone || 'Sem telf.'}</div>
                            <div className="text-xs">{resident.email || 'Sem email'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={resident.type}
                              onChange={(e) => updateResidentField(idx, 'type', e.target.value as any)}
                              className="bg-transparent text-xs font-bold border rounded px-1 py-0.5"
                            >
                              <option value="OWNER">Proprietário</option>
                              <option value="TENANT">Inquilino</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => removeResident(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!parsedData.some(r => units.some(u => {
                const label = `${u.code_block} ${u.number}`.toLowerCase();
                const extracted = `${r.unit_block || ''} ${r.unit_number || ''}`.trim().toLowerCase();
                return label.includes(extracted) || extracted.includes(label);
              })) && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-xs flex gap-2">
                  <AlertCircle size={16} />
                  <span>Atenção: Algumas unidades extraídas não coincidem exatamente com as unidades cadastradas no sistema. Apenas residentes com unidades correspondentes serão criados.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          
          {step === 'review' && (
            <button
              onClick={handleImport}
              disabled={importing || parsedData.length === 0}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {importing ? (
                <><Loader2 className="animate-spin" size={20} /> A Importar...</>
              ) : (
                <><Check size={20} /> Confirmar Importação</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
