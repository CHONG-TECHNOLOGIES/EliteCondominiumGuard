import React, { useState, useEffect, useRef, useContext } from 'react';
import { Users, Plus, Edit2, Trash2, Key, Loader2, Search, X, Building2, Shield, Eye, EyeOff, Camera, User, ChevronDown, Check } from 'lucide-react';
import { api } from '../../services/dataService';
import { Staff, Condominium, UserRole } from '../../types';
import { useToast } from '../../components/Toast';
import CameraCapture from '../../components/CameraCapture';
import { SupabaseService } from '../../services/Supabase';
import { AuthContext } from '../../App';

// Searchable Select Component
interface SearchableSelectProps {
  options: { value: number | string; label: string }[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhum resultado encontrado',
  className = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
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
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between cursor-pointer"
      >
        <span className={selectedOption ? 'text-slate-900' : 'text-slate-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X size={14} className="text-slate-400" />
            </button>
          )}
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between transition-colors ${option.value === value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
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

export default function AdminStaff() {
  const { showToast, showConfirm } = useToast();
  const { user: currentUser } = useContext(AuthContext);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondoId, setFilterCondoId] = useState<number | null>(null);
  const [filterRole, setFilterRole] = useState<string>('');

  // Only SUPER_ADMIN can create/edit SUPER_ADMIN users
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  // Available roles based on current user's permissions
  const availableRoles = isSuperAdmin
    ? [
      { value: UserRole.GUARD, label: 'Guarda' },
      { value: UserRole.ADMIN, label: 'Admin' },
      { value: UserRole.SUPER_ADMIN, label: 'Super Admin' }
    ]
    : [
      { value: UserRole.GUARD, label: 'Guarda' },
      { value: UserRole.ADMIN, label: 'Admin' }
    ];
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

  // PIN visibility states
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Photo states
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
      setUploadingPhoto(true);

      // Create staff first to avoid orphaned photos on insert failure
      const result = await api.adminCreateStaffWithPin(
        formData.first_name,
        formData.last_name,
        formData.condominium_id,
        formData.role,
        formData.pin,
        undefined
      );

      if (!result) {
        showToast('error', 'Erro ao criar staff');
        return;
      }

      // Upload photo and update staff only after creation succeeds
      if (photoBase64) {
        const staffName = `${formData.first_name}_${formData.last_name}`;
        const photoUrl = await SupabaseService.uploadStaffPhoto(
          photoBase64,
          staffName,
          formData.condominium_id || undefined
        );
        if (photoUrl) {
          const updated = await api.adminUpdateStaff(result.id, { photo_url: photoUrl });
          if (!updated) {
            showToast('warning', 'Foto enviada, mas falha ao vincular ao staff');
          }
        } else {
          showToast('warning', 'Erro ao fazer upload da foto, mas o staff foi criado sem foto');
        }
      }

      await loadData();
      setShowCreateModal(false);
      resetForm();
      showToast('success', 'Staff criado com sucesso!');
    } catch (error) {
      console.error('Error creating staff:', error);
      showToast('error', 'Erro ao criar staff');
    } finally {
      setUploadingPhoto(false);
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
      setUploadingPhoto(true);

      // Upload photo if new one was captured
      let photoUrl: string | null | undefined = undefined;
      if (photoBase64) {
        const staffName = `${formData.first_name}_${formData.last_name}`;
        photoUrl = await SupabaseService.uploadStaffPhoto(
          photoBase64,
          staffName,
          formData.condominium_id || undefined
        );
        if (!photoUrl) {
          showToast('warning', 'Erro ao fazer upload da foto');
        }
      }

      const result = await api.adminUpdateStaff(selectedStaff.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        condominium_id: formData.condominium_id,
        role: formData.role,
        ...(photoUrl && { photo_url: photoUrl })
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
    } finally {
      setUploadingPhoto(false);
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
      // Use server-side PIN hashing - send plain PIN to RPC
      const result = await api.adminUpdateStaffPin(selectedStaff.id, pinData.newPin);

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
          const result = await api.adminDeleteStaff(staffMember.id, staffMember.photo_url);
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
    setPhotoBase64(''); // Reset photo capture (existing photo shown from staffMember.photo_url)
    setShowCamera(false);
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
    setPhotoBase64('');
    setShowCamera(false);
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
                  {/* Staff Photo or Icon */}
                  {staffMember.photo_url ? (
                    <img
                      src={staffMember.photo_url}
                      alt={`${staffMember.first_name} ${staffMember.last_name}`}
                      className="w-14 h-14 rounded-full object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      {staffMember.role === UserRole.SUPER_ADMIN ? (
                        <Shield className="text-rose-600" size={32} />
                      ) : staffMember.role === UserRole.ADMIN ? (
                        <Shield className="text-purple-600" size={32} />
                      ) : (
                        <Users className="text-blue-600" size={32} />
                      )}
                    </div>
                  )}
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
                onClick={() => {
                  setShowCreateModal(false);
                  setShowCreatePin(false);
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
                <SearchableSelect
                  options={condominiums
                    .filter(c => c.status === 'ACTIVE')
                    .map(condo => ({ value: condo.id, label: condo.name }))
                  }
                  value={formData.condominium_id}
                  onChange={(val) => setFormData({ ...formData, condominium_id: val as number | null })}
                  placeholder="Selecione um condomínio"
                  searchPlaceholder="Pesquisar condomínio..."
                  emptyMessage="Nenhum condomínio encontrado"
                />
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
                  {availableRoles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  PIN <span className="text-red-500">*</span> <span className="text-xs text-slate-500">(mínimo 4 dígitos)</span>
                </label>
                <div className="relative">
                  <input
                    type={showCreatePin ? "text" : "password"}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="****"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePin(!showCreatePin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showCreatePin ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Photo capture section */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Foto do Staff
                </label>
                {!showCamera ? (
                  <div className="flex items-center gap-4">
                    {photoBase64 ? (
                      <div className="relative">
                        <img
                          src={photoBase64}
                          alt="Staff"
                          className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotoBase64('')}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                        <User size={40} className="text-slate-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Camera size={20} />
                      {photoBase64 ? 'Trocar Foto' : 'Tirar Foto'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <CameraCapture
                      onCapture={(base64) => {
                        if (base64) {
                          setPhotoBase64(base64);
                          setShowCamera(false);
                        }
                      }}
                      mode="photo"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCamera(false)}
                      className="w-full py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowCreatePin(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={uploadingPhoto}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={uploadingPhoto}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploadingPhoto && <Loader2 size={18} className="animate-spin" />}
                {uploadingPhoto ? 'Criando...' : 'Criar Staff'}
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
                <SearchableSelect
                  options={condominiums
                    .filter(c => c.status === 'ACTIVE')
                    .map(condo => ({ value: condo.id, label: condo.name }))
                  }
                  value={formData.condominium_id}
                  onChange={(val) => setFormData({ ...formData, condominium_id: val as number | null })}
                  placeholder="Selecione um condomínio"
                  searchPlaceholder="Pesquisar condomínio..."
                  emptyMessage="Nenhum condomínio encontrado"
                />
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
                  {availableRoles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              {/* Photo section */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Foto do Staff
                </label>
                {!showCamera ? (
                  <div className="flex items-center gap-4">
                    {photoBase64 ? (
                      <div className="relative">
                        <img
                          src={photoBase64}
                          alt="Staff"
                          className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotoBase64('')}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : selectedStaff.photo_url ? (
                      <img
                        src={selectedStaff.photo_url}
                        alt="Staff"
                        className="w-24 h-24 rounded-full object-cover border-4 border-slate-300"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                        <User size={40} className="text-slate-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Camera size={20} />
                      {photoBase64 || selectedStaff.photo_url ? 'Trocar Foto' : 'Tirar Foto'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <CameraCapture
                      onCapture={(base64) => {
                        if (base64) {
                          setPhotoBase64(base64);
                          setShowCamera(false);
                        }
                      }}
                      mode="photo"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCamera(false)}
                      className="w-full py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
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
                  resetForm();
                }}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={uploadingPhoto}
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={uploadingPhoto}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploadingPhoto && <Loader2 size={18} className="animate-spin" />}
                {uploadingPhoto ? 'Salvando...' : 'Salvar Alterações'}
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
                  setShowNewPin(false);
                  setShowConfirmPin(false);
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
                <div className="relative">
                  <input
                    type={showNewPin ? "text" : "password"}
                    value={pinData.newPin}
                    onChange={(e) => setPinData({ ...pinData, newPin: e.target.value })}
                    className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="****"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPin ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirmar PIN <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPin ? "text" : "password"}
                    value={pinData.confirmPin}
                    onChange={(e) => setPinData({ ...pinData, confirmPin: e.target.value })}
                    className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="****"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPin ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setSelectedStaff(null);
                  setPinData({ newPin: '', confirmPin: '' });
                  setShowNewPin(false);
                  setShowConfirmPin(false);
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

