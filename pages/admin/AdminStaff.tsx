import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Key, Loader2, Search, X, Building2, Shield } from 'lucide-react';
import { api } from '../../services/dataService';
import { Staff, Condominium, UserRole } from '../../types';
import bcrypt from 'bcryptjs';
import { useToast } from '../../components/Toast';

export default function AdminStaff() {
  const { showToast, showConfirm } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [filterRole, setFilterRole] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    condominium_id: null as number | null,
    role: UserRole.GUARD as UserRole,
    pin: ''
  });

  const [pinData, setPinData] = useState({
    newPin: '',
    confirmPin: ''
  });

  useEffect(() => {
    loadData();
  }, [filterCondoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffData, condosData] = await Promise.all([
        api.adminGetAllStaff(filterCondoId || undefined),
        api.adminGetAllCondominiums()
      ]);
      setStaff(staffData);
      setCondominiums(condosData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      showToast('warning', 'Nome e Sobrenome são obrigatórios');
      return;
    }
    if (!formData.condominium_id && formData.role !== UserRole.SUPER_ADMIN) {
      showToast('warning', 'Condomínio é obrigatório');
      return;
    }
    if (!formData.pin || formData.pin.length < 4) {
      showToast('warning', 'PIN deve ter no mínimo 4 dígitos');
      return;
    }

    try {
      const pinHash = await bcrypt.hash(formData.pin, 10);
      const result = await api.adminCreateStaff({
        first_name: formData.first_name,
        last_name: formData.last_name,
        condominium_id: formData.condominium_id,
        role: formData.role,
        pin_hash: pinHash
      });

      if (result) {
        await loadData();
        setShowCreateModal(false);
        resetForm();
        showToast('success', 'Staff criado com sucesso!');
      } else {
        showToast('error', 'Erro ao criar staff');
      }
    } catch (error) {
      console.error('Error creating staff:', error);
      showToast('error', 'Erro ao criar staff');
    }
  };

  const handleEdit = async () => {
    if (!selectedStaff) return;
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      showToast('warning', 'Nome e Sobrenome são obrigatórios');
      return;
    }
    if (!formData.condominium_id && formData.role !== UserRole.SUPER_ADMIN) {
      showToast('warning', 'Condomínio é obrigatório');
      return;
    }

    try {
      const result = await api.adminUpdateStaff(selectedStaff.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        condominium_id: formData.condominium_id,
        role: formData.role
      });

      if (result) {
        await loadData();
        setShowEditModal(false);
        setSelectedStaff(null);
        resetForm();
        showToast('success', 'Staff atualizado com sucesso!');
      } else {
        showToast('error', 'Erro ao atualizar staff');
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      showToast('error', 'Erro ao atualizar staff');
    }
  };

  const handleChangePin = async () => {
    if (!selectedStaff) return;
    if (!pinData.newPin || pinData.newPin.length < 4) {
      showToast('warning', 'PIN deve ter no mínimo 4 dígitos');
      return;
    }
    if (pinData.newPin !== pinData.confirmPin) {
      showToast('warning', 'Os PINs não coincidem');
      return;
    }

    try {
      const pinHash = await bcrypt.hash(pinData.newPin, 10);
      const result = await api.adminUpdateStaff(selectedStaff.id, {
        pin_hash: pinHash
      });

      if (result) {
        setShowPinModal(false);
        setSelectedStaff(null);
        setPinData({ newPin: '', confirmPin: '' });
        showToast('success', 'PIN alterado com sucesso!');
      } else {
        showToast('error', 'Erro ao alterar PIN');
      }
    } catch (error) {
      console.error('Error changing PIN:', error);
      showToast('error', 'Erro ao alterar PIN');
    }
  };

  const handleDelete = async (staffMember: Staff) => {
    showConfirm(
      `Deseja realmente remover ${staffMember.first_name} ${staffMember.last_name}?`,
      async () => {
        try {
          const result = await api.adminDeleteStaff(staffMember.id);
          if (result) {
            await loadData();
            showToast('success', 'Staff removido com sucesso!');
          } else {
            showToast('error', 'Erro ao remover staff');
          }
        } catch (error) {
          console.error('Error deleting staff:', error);
          showToast('error', 'Erro ao remover staff');
        }
      }
    );
  };

  const openEditModal = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setFormData({
      first_name: staffMember.first_name,
      last_name: staffMember.last_name,
      condominium_id: staffMember.condominium_id,
      role: staffMember.role,
      pin: ''
    });
    setShowEditModal(true);
  };

  const openPinModal = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setPinData({ newPin: '', confirmPin: '' });
    setShowPinModal(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      condominium_id: null,
      role: UserRole.GUARD,
      pin: ''
    });
  };

  const getCondominiumName = (condoId?: number) => {
    if (!condoId) return 'Global';
    const condo = condominiums.find(c => c.id === condoId);
    return condo?.name || 'Desconhecido';
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === UserRole.SUPER_ADMIN) {
      return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">SUPER ADMIN</span>;
    }
    if (role === UserRole.ADMIN) {
      return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">ADMIN</span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">GUARDA</span>;
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch =
      s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || s.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestão de Pessoal</h1>
          <p className="text-slate-600">Gerir guardas e administradores do sistema</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus size={20} />
          Novo Staff
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome..."
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
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as Funções</option>
          <option value={UserRole.GUARD}>Guarda</option>
          <option value={UserRole.ADMIN}>Admin</option>
          <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
        </select>
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">Carregando pessoal...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <Users size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum staff cadastrado'}
          </h3>
          <p className="text-slate-600">
            {searchTerm ? 'Tente buscar com outros termos' : 'Clique em "Novo Staff" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredStaff.map((staffMember) => (
            <div
              key={staffMember.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    {staffMember.role === UserRole.SUPER_ADMIN ? (
                      <Shield className="text-rose-600" size={32} />
                    ) : staffMember.role === UserRole.ADMIN ? (
                      <Shield className="text-purple-600" size={32} />
                    ) : (
                      <Users className="text-blue-600" size={32} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {staffMember.first_name} {staffMember.last_name}
                      </h3>
                      {getRoleBadge(staffMember.role)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building2 size={16} />
                      <span>{getCondominiumName(staffMember.condominium_id)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPinModal(staffMember)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Alterar PIN"
                  >
                    <Key size={20} />
                  </button>
                  <button
                    onClick={() => openEditModal(staffMember)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(staffMember)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={20} />
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
              <h2 className="text-2xl font-bold text-slate-900">Novo Staff</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sobrenome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sobrenome"
                  />
                </div>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Função <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={UserRole.GUARD}>Guarda</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  PIN <span className="text-red-500">*</span> <span className="text-xs text-slate-500">(mínimo 4 dígitos)</span>
                </label>
                <input
                  type="password"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="****"
                  maxLength={6}
                />
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
                Criar Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Editar Staff</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedStaff(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sobrenome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Função <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={UserRole.GUARD}>Guarda</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                </select>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Para alterar o PIN, use o botão "Alterar PIN" na lista de staff.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedStaff(null);
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

      {/* Change PIN Modal */}
      {showPinModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Alterar PIN</h2>
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setSelectedStaff(null);
                  setPinData({ newPin: '', confirmPin: '' });
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Alterando PIN para: <strong>{selectedStaff.first_name} {selectedStaff.last_name}</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Novo PIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={pinData.newPin}
                  onChange={(e) => setPinData({ ...pinData, newPin: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="****"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirmar PIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={pinData.confirmPin}
                  onChange={(e) => setPinData({ ...pinData, confirmPin: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="****"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setSelectedStaff(null);
                  setPinData({ newPin: '', confirmPin: '' });
                }}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePin}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Alterar PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
