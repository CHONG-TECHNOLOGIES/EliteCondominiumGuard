import React, { useState, useEffect } from 'react';
import { Home, Plus, Edit2, Trash2, Loader2, Search, X, Building2 } from 'lucide-react';
import { api } from '../../services/dataService';
import { Unit, Condominium } from '../../types';
import { useToast } from '../../components/Toast';

export default function AdminUnits() {
  const { showToast, showConfirm } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    condominium_id: null as number | null,
    code_block: '',
    number: '',
    floor: undefined as number | undefined,
    building_name: ''
  });

  useEffect(() => {
    loadData();
  }, [filterCondoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitsData, condosData] = await Promise.all([
        api.adminGetAllUnits(filterCondoId || undefined),
        api.adminGetAllCondominiums()
      ]);
      setUnits(unitsData);
      setCondominiums(condosData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.condominium_id) {
      showToast('warning', 'Condomínio é obrigatório');
      return;
    }
    if (!formData.code_block.trim() || !formData.number.trim()) {
      showToast('warning', 'Bloco e Número são obrigatórios');
      return;
    }

    try {
      const result = await api.adminCreateUnit(formData);
      if (result) {
        await loadData();
        setShowCreateModal(false);
        resetForm();
        showToast('success', 'Unidade criada com sucesso!');
      } else {
        showToast('error', 'Erro ao criar unidade');
      }
    } catch (error) {
      console.error('Error creating unit:', error);
      showToast('error', 'Erro ao criar unidade');
    }
  };

  const handleEdit = async () => {
    if (!selectedUnit) return;
    if (!formData.code_block.trim() || !formData.number.trim()) {
      showToast('warning', 'Bloco e Número são obrigatórios');
      return;
    }

    try {
      const result = await api.adminUpdateUnit(String(selectedUnit.id), formData);
      if (result) {
        await loadData();
        setShowEditModal(false);
        setSelectedUnit(null);
        resetForm();
        showToast('success', 'Unidade atualizada com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar unidade');
      }
    } catch (error) {
      console.error('Error updating unit:', error);
      showToast('error', 'Erro ao atualizar unidade');
    }
  };

  const handleDelete = async (unit: Unit) => {
    showConfirm(
      `Deseja realmente remover a unidade ${unit.code_block} ${unit.number}?`,
      async () => {
        try {
          const result = await api.adminDeleteUnit(String(unit.id));
          if (result) {
            await loadData();
            showToast('success', 'Unidade removida com sucesso!');
          } else {
            showToast('error', 'Erro ao remover unidade');
          }
        } catch (error) {
          console.error('Error deleting unit:', error);
          showToast('error', 'Erro ao remover unidade');
        }
      }
    );
  };

  const openEditModal = (unit: Unit) => {
    setSelectedUnit(unit);
    setFormData({
      condominium_id: unit.condominium_id,
      code_block: unit.code_block,
      number: unit.number,
      floor: unit.floor,
      building_name: unit.building_name || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      condominium_id: null,
      code_block: '',
      number: '',
      floor: undefined,
      building_name: ''
    });
  };

  const getCondominiumName = (condoId: number) => {
    const condo = condominiums.find(c => c.id === condoId);
    return condo?.name || 'Desconhecido';
  };

  const filteredUnits = units.filter(unit =>
    `${unit.code_block} ${unit.number}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.building_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Unidades</h1>
          <p className="text-slate-600">Gerir apartamentos e frações dos condomínios</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus size={20} />
          Nova Unidade
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por bloco, número ou edifício..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCondoId || ''}
          onChange={(e) => setFilterCondoId(e.target.value ? parseInt(e.target.value) : null)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os Condomínios</option>
          {condominiums.map(condo => (
            <option key={condo.id} value={condo.id}>{condo.name}</option>
          ))}
        </select>
      </div>

      {/* Units List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">Carregando unidades...</p>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Home size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma unidade cadastrada'}
          </h3>
          <p className="text-slate-600">
            {searchTerm
              ? 'Tente buscar com outros termos'
              : 'Clique em "Nova Unidade" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Home className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-slate-900">
                        {unit.code_block} {unit.number}
                      </h3>
                      {unit.floor !== null && unit.floor !== undefined && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          Piso {unit.floor}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Building2 size={14} />
                        <span>{getCondominiumName(unit.condominium_id)}</span>
                      </div>
                      {unit.building_name && (
                        <span className="text-slate-500">• Edifício: {unit.building_name}</span>
                      )}
                    </div>
                    {unit.residents && unit.residents.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        {unit.residents.length} residente(s)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(unit)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(unit)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Nova Unidade</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Condomínio <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.condominium_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      condominium_id: e.target.value ? parseInt(e.target.value) : null
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um condomínio</option>
                  {condominiums
                    .filter(c => c.status === 'ACTIVE')
                    .map(condo => (
                      <option key={condo.id} value={condo.id}>{condo.name}</option>
                    ))
                  }
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Bloco <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code_block}
                    onChange={(e) => setFormData({ ...formData, code_block: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="A, B, C..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="101, 202..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Piso</label>
                  <input
                    type="number"
                    value={formData.floor !== undefined ? formData.floor : ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        floor: e.target.value ? parseInt(e.target.value) : undefined
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0, 1, 2..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome do Edifício
                  </label>
                  <input
                    type="text"
                    value={formData.building_name}
                    onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Torre Sul, Bloco Norte..."
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Criar Unidade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Editar Unidade</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUnit(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Condomínio (Apenas Leitura)
                </label>
                <input
                  type="text"
                  value={getCondominiumName(selectedUnit.condominium_id)}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Bloco <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code_block}
                    onChange={(e) => setFormData({ ...formData, code_block: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="A, B, C..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="101, 202..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Piso</label>
                  <input
                    type="number"
                    value={formData.floor !== undefined ? formData.floor : ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        floor: e.target.value ? parseInt(e.target.value) : undefined
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0, 1, 2..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome do Edifício
                  </label>
                  <input
                    type="text"
                    value={formData.building_name}
                    onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Torre Sul, Bloco Norte..."
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUnit(null);
                }}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
