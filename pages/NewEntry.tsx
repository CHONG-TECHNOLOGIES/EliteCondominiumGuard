

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { api } from '../services/dataService';
import { Unit, VisitType, ApprovalMode, VisitStatus, VisitTypeConfig, ServiceTypeConfig, Restaurant, Sport } from '../types';
import CameraCapture from '../components/CameraCapture';
import ErrorBoundary from '../components/ErrorBoundary';
import ApprovalModeSelector from '../components/ApprovalModeSelector';
import {
  QrCode, User, Truck, Wrench, GraduationCap, Save, ArrowLeft, Phone,
  CheckCircle, Search, Building, Briefcase,
  Hammer, Wifi, Zap, Droplets, Flower2, Sparkles, MoreHorizontal, ScanLine, Users,
  UtensilsCrossed, Dumbbell, X, MapPin
} from 'lucide-react';

export default function NewEntry() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Dynamic Config State
  const [visitTypes, setVisitTypes] = useState<VisitTypeConfig[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeConfig[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);

  // Data State
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedType, setSelectedType] = useState<string>(''); // Now holding ID or Name
  const [selectedTypeConfig, setSelectedTypeConfig] = useState<VisitTypeConfig | null>(null);

  // Form State
  const [visitorName, setVisitorName] = useState('');
  const [visitorDoc, setVisitorDoc] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [unitId, setUnitId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState(''); // ID
  const [restaurantId, setRestaurantId] = useState(''); // ID for restaurant visits
  const [sportId, setSportId] = useState(''); // ID for sport visits
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(ApprovalMode.APP);
  const [qrConfirmed, setQrConfirmed] = useState(false);

  const handlePhotoCapture = (photoDataUrl: string) => {
    setPhoto(photoDataUrl);
  };

  // Modals State
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');

  const [isOffline, setIsOffline] = useState(!api.checkOnline());

  // QR Question Modal State
  const [showQrQuestionModal, setShowQrQuestionModal] = useState(false);
  const [pendingVisitType, setPendingVisitType] = useState<VisitTypeConfig | null>(null);
  const [hideQrButton, setHideQrButton] = useState(false);
  const [isScanningQr, setIsScanningQr] = useState(false);

  useEffect(() => {
    if (user?.condominium_id) {
      // Fetch units with residents (online) or without residents (offline)
      api.getUnitsWithResidents().then(setUnits);
      api.getVisitTypes().then(setVisitTypes);
      api.getServiceTypes().then(setServiceTypes);
      api.getRestaurants().then(setRestaurants);
      api.getSports().then(setSports);
    }
    window.addEventListener('offline', () => setIsOffline(true));
    window.addEventListener('online', () => setIsOffline(false));
  }, [user]);

  // --- Helpers ---

  // Helper to map DB icon keys to Lucide Components
  const getIconComponent = (iconKey: string | undefined, visitTypeName: string, size: number = 32) => {
    // If icon_key is provided and valid, use it
    if (iconKey) {
      switch (iconKey.toUpperCase()) {
        case 'USER': return <User size={size} />;
        case 'TRUCK': return <Truck size={size} />;
        case 'WRENCH': return <Wrench size={size} />;
        case 'GRADUATION':
        case 'GRADUATIONCAP': return <GraduationCap size={size} />;
        case 'RESTAURANT':
        case 'UTENSILSCROSSED': return <UtensilsCrossed size={size} />;
        case 'SPORT':
        case 'DUMBBELL': return <Dumbbell size={size} />;
      }
    }

    // Fallback: Infer icon from visit type name
    const name = visitTypeName.toLowerCase();
    if (name.includes('entrega') || name.includes('delivery')) return <Truck size={size} />;
    if (name.includes('serviço') || name.includes('service')) return <Wrench size={size} />;
    if (name.includes('estudante') || name.includes('student')) return <GraduationCap size={size} />;
    if (name.includes('restaurante') || name.includes('restaurant')) return <UtensilsCrossed size={size} />;
    if (name.includes('desporto') || name.includes('sport')) return <Dumbbell size={size} />;

    // Default to USER icon for visitors
    return <User size={size} />;
  };

  const getServiceIcon = (name: string) => {
    const s = name.toLowerCase();
    if (s.includes("obras") || s.includes("construção")) return <Hammer size={40} />;
    if (s.includes("canalização")) return <Droplets size={40} />;
    if (s.includes("eletricista")) return <Zap size={40} />;
    if (s.includes("internet") || s.includes("tv")) return <Wifi size={40} />;
    if (s.includes("limpeza")) return <Sparkles size={40} />;
    if (s.includes("jardinagem")) return <Flower2 size={40} />;
    if (s.includes("mudanças")) return <Truck size={40} />;
    return <MoreHorizontal size={40} />;
  };

  const handleTypeSelect = (typeConfig: VisitTypeConfig) => {
    const name = typeConfig.name.toLowerCase();
    // Intercept specific types
    if (name.includes('visitante') || name.includes('entrega') || name.includes('serviço') || name.includes('service') || name.includes('delivery') || name.includes('visitor')) {
      setPendingVisitType(typeConfig);
      setShowQrQuestionModal(true);
      return;
    }

    setHideQrButton(false); // Default reset
    if (name.includes('alunos') || name.includes('student') || name.includes('restaurante') || name.includes('restaurant') || name.includes('desporto') || name.includes('sport')) {
      setHideQrButton(true);
    }

    setSelectedType(typeConfig.id);
    setSelectedTypeConfig(typeConfig);
    setStep(2);
  };

  const handleQrQuestionResponse = (hasQr: boolean) => {
    if (!pendingVisitType) return;

    setSelectedType(pendingVisitType.id);
    setSelectedTypeConfig(pendingVisitType);

    if (hasQr) {
      handleStartQrFlow();
    } else {
      setHideQrButton(true);
      setStep(2);
    }

    setShowQrQuestionModal(false);
    setPendingVisitType(null);
  };

  const handleStartQrFlow = () => {
    setApprovalMode(ApprovalMode.QR_SCAN);
    setQrToken('');
    setQrConfirmed(false);
    setVisitorName('');
    setVisitorPhone('');
    setReason('');
    setUnitId('');
    setIsScanningQr(false); // Reset scanning state
    setStep(3);
  };

  const handlePerformScan = () => {
    setIsScanningQr(true);
    // Camera will stay open for scanning
    // TODO: Implement actual QR code scanning logic
    // For now, this is a placeholder that keeps camera open
  };

  const handleQrScanned = (qrData: string) => {
    // This will be called when QR code is actually scanned
    setQrToken(qrData);
    setVisitorName("Ricardo Mota (QR)");
    setVisitorPhone("912345678");
    setReason("Jantar de Aniversário");
    if (units.length > 0) setUnitId(units[0].id);
    setQrConfirmed(true);
    setIsScanningQr(false);
    setStep(2); // Go to form with filled data
  };

  const handleSubmit = async () => {
    // Validate visitor name
    if (!visitorName) return alert("Nome do visitante é obrigatório");

    // Validate based on visit type requirements
    if (selectedTypeConfig?.requires_service_type && !serviceTypeId) {
      return alert("Tipo de serviço obrigatório");
    }
    if (selectedTypeConfig?.requires_restaurant && !restaurantId) {
      return alert("Restaurante obrigatório");
    }
    if (selectedTypeConfig?.requires_sport && !sportId) {
      return alert("Desporto obrigatório");
    }

    // Validate unit (only required if NOT restaurant or sport visit)
    if (!selectedTypeConfig?.requires_restaurant && !selectedTypeConfig?.requires_sport && !unitId) {
      return alert("Unidade é obrigatória");
    }

    // Check if this is a free entry (restaurant/sport)
    const isFreeEntry = selectedTypeConfig?.requires_restaurant || selectedTypeConfig?.requires_sport;

    const visitData = {
      condominium_id: user!.condominium_id,
      visitor_name: visitorName,
      visitor_doc: visitorDoc || undefined,
      visitor_phone: visitorPhone || undefined,
      visit_type_id: selectedType, // Send UUID instead of name
      service_type_id: serviceTypeId || undefined,
      restaurant_id: restaurantId || undefined,
      sport_id: sportId || undefined,
      unit_id: unitId || undefined,
      reason: reason || undefined,
      photo_data_url: photo || undefined, // Base64 data URL for upload to Storage
      qr_token: qrToken || undefined,
      approval_mode: isFreeEntry ? 'ENTRADA_LIVRE' : approvalMode, // Free entry or selected mode
      status: isFreeEntry ? VisitStatus.APPROVED : VisitStatus.PENDING, // Auto-approve free entry
      guard_id: user!.id
    };

    await api.createVisit(visitData);
    navigate('/day-list');
  };

  const getSelectedUnitLabel = () => {
    const u = units.find(u => u.id === unitId);
    return u ? `Bloco ${u.code_block || ''} - ${u.number}` : '';
  };

  const getSelectedServiceLabel = () => {
    const s = serviceTypes.find(s => s.id === serviceTypeId);
    return s ? s.name : '';
  };

  const getSelectedRestaurantLabel = () => {
    const r = restaurants.find(r => String(r.id) === restaurantId);
    return r ? r.name : '';
  };

  const getSelectedSportLabel = () => {
    const s = sports.find(s => String(s.id) === sportId);
    return s ? s.name : '';
  };

  const filteredUnits = units.filter(u => {
    const search = unitSearch.toLowerCase();
    const matchesNumber = u.number.toLowerCase().includes(search);
    const matchesBlock = u.code_block?.toLowerCase().includes(search) || false;
    const matchesResident = u.residents?.some(r => r.name.toLowerCase().includes(search)) || false;
    return matchesNumber || matchesBlock || matchesResident;
  });

  // Validation for Step 2
  const isStep2Valid = (): boolean => {
    // Nome Completo is always required
    if (!visitorName.trim()) return false;

    // Check conditional requirements based on visit type
    if (selectedTypeConfig?.requires_restaurant && !restaurantId) return false;
    if (selectedTypeConfig?.requires_sport && !sportId) return false;
    if (selectedTypeConfig?.requires_service_type && !serviceTypeId) return false;

    // Unidade is required unless restaurant or sport
    if (!selectedTypeConfig?.requires_restaurant && !selectedTypeConfig?.requires_sport && !unitId) {
      return false;
    }

    return true;
  };

  // --- Render Steps ---

  const renderStep1 = () => (
    <div className="flex flex-col h-full p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center pb-10">
        <div className="text-center mb-8 md:mb-12 animate-in slide-in-from-bottom-5 fade-in duration-500">
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-3 tracking-tight">
            Tipo de Visita
          </h2>
          <p className="text-lg text-slate-400 font-medium max-w-xl mx-auto">
            Selecione a categoria apropriada abaixo para iniciar o processo de registo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {visitTypes.map(vt => (
            <button
              key={vt.id}
              onClick={() => handleTypeSelect(vt)}
              className="h-24 md:h-40 bg-white border-2 border-slate-200 hover:border-accent hover:bg-sky-50 rounded-2xl flex flex-row md:flex-col items-center justify-start md:justify-center px-8 gap-6 shadow-sm hover:shadow-lg transition-all group"
            >
              <div className="bg-slate-100 p-4 rounded-full group-hover:bg-white transition-colors">
                <div className="text-slate-600 group-hover:text-accent md:w-10 md:h-10 transition-colors flex items-center justify-center">
                  {getIconComponent(vt.icon_key, vt.name, 32)}
                </div>
              </div>
              <span className="text-xl md:text-2xl font-bold text-slate-700 group-hover:text-slate-900 uppercase">
                {vt.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
              <User size={28} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                Detalhes: {selectedTypeConfig?.name}
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Preencha as informações do visitante</p>
            </div>
          </div>
          {!hideQrButton && (
            <button
              onClick={handleStartQrFlow}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-xl hover:from-slate-800 hover:to-black w-full md:w-auto text-sm font-bold transition-all active:scale-95"
            >
              <QrCode size={20} /> Tenho QR Code
            </button>
          )}
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left Column: Personal Info */}
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={16} className="text-accent" />
              Informações Pessoais
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Nome Completo *</label>
                <input
                  value={visitorName}
                  onChange={e => setVisitorName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400 hover:border-slate-300"
                  placeholder="Nome e sobrenome"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Documento / CC</label>
                <input
                  value={visitorDoc}
                  onChange={e => setVisitorDoc(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400 hover:border-slate-300"
                  placeholder="Número do documento"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Telefone</label>
                <input
                  type="tel"
                  value={visitorPhone}
                  onChange={e => setVisitorPhone(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400 hover:border-slate-300"
                  placeholder="+351 912 345 678"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visit Details */}
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-accent" />
              Destino & Detalhes
            </h3>
            <div className="space-y-4">

              {/* Restaurant Selection */}
              {selectedTypeConfig?.requires_restaurant && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Restaurante *</label>
                  <button
                    onClick={() => setShowRestaurantModal(true)}
                    className={`w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all hover:shadow-md ${
                      restaurantId
                        ? 'bg-gradient-to-r from-blue-50 to-sky-50 border-accent text-slate-800 font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-accent/50'
                    }`}
                  >
                    <span className={restaurantId ? 'text-slate-800' : 'text-slate-400'}>
                      {restaurantId ? getSelectedRestaurantLabel() : 'Selecione o Restaurante...'}
                    </span>
                    <UtensilsCrossed size={18} className={restaurantId ? 'text-accent' : 'text-slate-400'} />
                  </button>
                </div>
              )}

              {/* Sport Selection */}
              {selectedTypeConfig?.requires_sport && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Desporto *</label>
                  <button
                    onClick={() => setShowSportModal(true)}
                    className={`w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all hover:shadow-md ${
                      sportId
                        ? 'bg-gradient-to-r from-blue-50 to-sky-50 border-accent text-slate-800 font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-accent/50'
                    }`}
                  >
                    <span className={sportId ? 'text-slate-800' : 'text-slate-400'}>
                      {sportId ? getSelectedSportLabel() : 'Selecione o Desporto...'}
                    </span>
                    <Dumbbell size={18} className={sportId ? 'text-accent' : 'text-slate-400'} />
                  </button>
                </div>
              )}

              {/* Unit Selection */}
              {!selectedTypeConfig?.requires_restaurant && !selectedTypeConfig?.requires_sport && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Unidade de Destino *</label>
                  <button
                    onClick={() => setShowUnitModal(true)}
                    className={`w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all hover:shadow-md ${
                      unitId
                        ? 'bg-gradient-to-r from-blue-50 to-sky-50 border-accent text-slate-800 font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-accent/50'
                    }`}
                  >
                    <span className={unitId ? 'text-slate-800' : 'text-slate-400'}>
                      {unitId ? getSelectedUnitLabel() : 'Selecione a Unidade...'}
                    </span>
                    <Search size={18} className={unitId ? 'text-accent' : 'text-slate-400'} />
                  </button>
                </div>
              )}

              {/* Service Type Selection */}
              {selectedTypeConfig?.requires_service_type && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Tipo de Serviço *</label>
                  <button
                    onClick={() => setShowServiceModal(true)}
                    className={`w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all hover:shadow-md ${
                      serviceTypeId
                        ? 'bg-gradient-to-r from-blue-50 to-sky-50 border-accent text-slate-800 font-bold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-accent/50'
                    }`}
                  >
                    <span className={serviceTypeId ? 'text-slate-800' : 'text-slate-400'}>
                      {serviceTypeId ? getSelectedServiceLabel() : 'Selecione o Serviço...'}
                    </span>
                    <Briefcase size={18} className={serviceTypeId ? 'text-accent' : 'text-slate-400'} />
                  </button>
                </div>
              )}

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Motivo / Notas</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400 hover:border-slate-300 resize-none h-28"
                  placeholder="Informações adicionais sobre a visita..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Next Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={() => setStep(3)}
          disabled={!isStep2Valid()}
          className={`
            group relative overflow-hidden
            w-full md:w-auto px-10 py-4 text-lg font-black rounded-2xl
            transition-all duration-300 transform
            flex items-center justify-center gap-3
            ${isStep2Valid()
              ? 'bg-gradient-to-r from-accent via-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/40 hover:shadow-2xl hover:shadow-blue-600/50 hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {isStep2Valid() && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></div>
          )}
          <span className="relative z-10">Seguinte: Foto & Autorização</span>
          <svg className="w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const selectedUnit = units.find(u => u.id === unitId);

    // Check if visit type requires approval (restaurant and sport don't need approval)
    const isFreeEntry = selectedTypeConfig?.requires_restaurant || selectedTypeConfig?.requires_sport;
    const titleText = isFreeEntry ? 'Foto & Registo' : 'Foto & Autorização';
    const subtitleText = isFreeEntry
      ? 'Capture a foto do visitante - entrada livre, sem necessidade de aprovação'
      : 'Capture a foto do visitante e selecione o método de aprovação';

    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col gap-6">
        <div className="mb-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mb-2">
            {titleText}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {subtitleText}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Camera */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">
              Captura de Imagem
            </h3>
            {approvalMode === ApprovalMode.QR_SCAN && !isScanningQr ? (
              <div className="flex flex-col items-center justify-center h-80 w-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                <QrCode size={48} className="mb-4 opacity-20" />
                <p className="font-medium">Câmara em espera...</p>
              </div>
            ) : (
              <ErrorBoundary>
                <CameraCapture
                  onCapture={handlePhotoCapture}
                  mode={approvalMode === ApprovalMode.QR_SCAN ? 'scan' : 'photo'}
                  onQrScanned={handleQrScanned}
                />
              </ErrorBoundary>
            )}

            {/* Visit Summary */}
            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Resumo da Visita
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500 font-medium">Visitante:</span>
                  <p className="font-bold text-slate-800">{visitorName || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Tipo:</span>
                  <p className="font-bold text-slate-800">{selectedTypeConfig?.name || '-'}</p>
                </div>
                {unitId && (
                  <div>
                    <span className="text-slate-500 font-medium">Unidade:</span>
                    <p className="font-bold text-slate-800">{getSelectedUnitLabel()}</p>
                  </div>
                )}
                {restaurantId && (
                  <div>
                    <span className="text-slate-500 font-medium">Restaurante:</span>
                    <p className="font-bold text-slate-800">{getSelectedRestaurantLabel()}</p>
                  </div>
                )}
                {sportId && (
                  <div>
                    <span className="text-slate-500 font-medium">Desporto:</span>
                    <p className="font-bold text-slate-800">{getSelectedSportLabel()}</p>
                  </div>
                )}
                {serviceTypeId && (
                  <div>
                    <span className="text-slate-500 font-medium">Serviço:</span>
                    <p className="font-bold text-slate-800">{getSelectedServiceLabel()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Approval Mode Selector OR Free Entry Message */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              {isFreeEntry ? (
                /* Free Entry (Restaurant/Sport - No Approval Needed) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">
                      Modo de Entrada
                    </h3>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl">
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle size={32} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-emerald-800 mb-1">
                          Entrada Livre
                        </p>
                        <p className="text-sm text-emerald-700 font-medium">
                          {selectedTypeConfig?.requires_restaurant && 'Acesso direto ao restaurante'}
                          {selectedTypeConfig?.requires_sport && 'Acesso direto às instalações desportivas'}
                        </p>
                      </div>
                      <div className="w-full pt-4 border-t border-emerald-200">
                        <p className="text-xs text-emerald-600 leading-relaxed">
                          ✓ Sem necessidade de aprovação<br />
                          ✓ Registo automático da entrada<br />
                          ✓ Visitante pode prosseguir diretamente
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-xs text-blue-800 font-medium">
                      ℹ️ <strong>Informação:</strong> Áreas comuns não requerem autorização prévia. O registo é feito apenas para controlo de acesso.
                    </p>
                  </div>
                </div>
              ) : approvalMode === ApprovalMode.QR_SCAN ? (
                <>
                  {!qrToken ? (
                    <div className="bg-blue-50 p-6 rounded-xl text-center border border-blue-200 flex flex-col gap-4">
                      <ScanLine size={48} className="mx-auto text-blue-400" />
                      <p className="text-blue-800 font-bold">Aguardando Leitura...</p>
                      <button
                        onClick={handlePerformScan}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        <QrCode size={20} /> Scan QRCODE
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border-2 bg-green-50 border-green-200">
                      <div className="flex items-center gap-2 mb-3 text-green-800 font-bold border-b border-green-200 pb-2">
                        <QrCode size={20} />
                        <span>Dados Lidos do QR</span>
                      </div>
                      <div className="text-sm text-slate-700 space-y-1.5">
                        <p><span className="font-semibold text-slate-500">Nome:</span> {visitorName}</p>
                        <p><span className="font-semibold text-slate-500">Unidade:</span> {getSelectedUnitLabel()}</p>
                        <p><span className="font-semibold text-slate-500">Motivo:</span> {reason}</p>
                      </div>
                      <div className="mt-3 bg-green-100 text-green-700 text-xs p-2 rounded flex items-center gap-1">
                        <CheckCircle size={12} /> Identidade Verificada
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <ApprovalModeSelector
                  selectedMode={approvalMode}
                  onModeSelect={setApprovalMode}
                  isOnline={!isOffline}
                  unit={selectedUnit}
                  visitorPhone={visitorPhone}
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSubmit}
                disabled={(!photo && approvalMode !== ApprovalMode.QR_SCAN) || (approvalMode === ApprovalMode.QR_SCAN && !qrConfirmed)}
                className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <CheckCircle size={20} />
                {approvalMode === ApprovalMode.QR_SCAN ? 'CONFIRMAR ENTRADA' : 'REGISTAR ENTRADA'}
              </button>

              {approvalMode === ApprovalMode.QR_SCAN && isScanningQr ? (
                <button
                  onClick={() => {
                    setIsScanningQr(false);
                    setApprovalMode(ApprovalMode.APP);
                    navigate('/');
                  }}
                  className="w-full py-3 bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <X size={18} />
                  Cancelar Leitura
                </button>
              ) : (
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3 text-slate-500 hover:text-slate-700 font-semibold text-sm transition-colors"
                >
                  ← Voltar atrás
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full relative bg-slate-50">
      <div className="px-4 pt-4 md:px-6 md:pt-6 flex items-center">
        {step > 1 && (
          <button onClick={() => setStep(step - 1 as any)} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-full shadow-sm hover:bg-slate-100 mr-4">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-md">
          <div className={`h-full bg-accent transition-all duration-500 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`}></div>
        </div>
        <span className="ml-4 text-sm font-bold text-slate-400">Passo {step}/3</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {showUnitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Selecionar Unidade</h3>
              <button onClick={() => setShowUnitModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
            </div>
            <div className="p-4 border-b bg-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-accent"
                  placeholder="Pesquisar bloco, número ou morador..."
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredUnits.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setUnitId(u.id); setShowUnitModal(false); }}
                  className={`relative group overflow-hidden h-32 rounded-2xl border-2 transition-all duration-300 flex flex-col items-start justify-end p-4 shadow-sm hover:shadow-md ${unitId === u.id
                    ? 'border-accent bg-sky-50'
                    : 'border-slate-100 bg-white hover:border-accent/50'
                    }`}
                >
                  <div className={`absolute -right-4 -top-4 transition-transform duration-500 group-hover:scale-110 ${unitId === u.id ? 'text-accent/20' : 'text-slate-100'
                    }`}>
                    <Building size={80} />
                  </div>

                  <div className="relative z-10 w-full text-left">
                    <span className={`text-xs font-bold uppercase tracking-wider mb-0.5 block ${unitId === u.id ? 'text-accent' : 'text-slate-400'
                      }`}>
                      Bloco {u.code_block || '-'}
                    </span>
                    <span className={`text-3xl font-black ${unitId === u.id ? 'text-slate-800' : 'text-slate-600'
                      }`}>
                      {u.number}
                    </span>

                    {/* Resident Names (Online) or Floor/Building (Offline/No Residents) */}
                    <div className="mt-1 flex items-center gap-1 overflow-hidden">
                      <p className="text-[10px] text-slate-500 truncate w-full">
                        {u.residents && u.residents.length > 0
                          ? u.residents.map(r => r.name.split(' ')[0]).join(', ')
                          : (u.floor ? `Andar ${u.floor}` : '') + (u.building_name ? ` - ${u.building_name}` : '')
                        }
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {filteredUnits.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-400">Nenhuma unidade encontrada.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Tipo de Serviço</h3>
              <button onClick={() => setShowServiceModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
              {serviceTypes.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setServiceTypeId(s.id); setShowServiceModal(false); }}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col items-center justify-center gap-2 ${serviceTypeId === s.id ? 'border-accent bg-sky-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                >
                  <div className={serviceTypeId === s.id ? 'text-accent' : 'text-slate-400'}>
                    {getServiceIcon(s.name)}
                  </div>
                  <span className="font-bold text-sm text-center text-slate-700">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRestaurantModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Selecionar Restaurante</h3>
              <button onClick={() => setShowRestaurantModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
              {restaurants.map(r => (
                <button
                  key={r.id}
                  onClick={() => { setRestaurantId(String(r.id)); setShowRestaurantModal(false); }}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col items-center justify-center gap-2 ${restaurantId === String(r.id) ? 'border-accent bg-sky-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                >
                  <div className={restaurantId === String(r.id) ? 'text-accent' : 'text-slate-400'}>
                    <UtensilsCrossed size={40} />
                  </div>
                  <span className="font-bold text-sm text-center text-slate-700">{r.name}</span>
                  {r.description && <span className="text-xs text-slate-500 text-center">{r.description}</span>}
                </button>
              ))}
              {restaurants.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-400">Nenhum restaurante encontrado.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Selecionar Desporto</h3>
              <button onClick={() => setShowSportModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
              {sports.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSportId(String(s.id)); setShowSportModal(false); }}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col items-center justify-center gap-2 ${sportId === String(s.id) ? 'border-accent bg-sky-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                >
                  <div className={sportId === String(s.id) ? 'text-accent' : 'text-slate-400'}>
                    <Dumbbell size={40} />
                  </div>
                  <span className="font-bold text-sm text-center text-slate-700">{s.name}</span>
                  {s.description && <span className="text-xs text-slate-500 text-center">{s.description}</span>}
                </button>
              ))}
              {sports.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-400">Nenhum desporto encontrado.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showQrQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
              <QrCode size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Dispõe de QR Code?</h3>
            <p className="text-slate-500 mb-8">
              O visitante possui um código QR para entrada rápida?
            </p>
            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => handleQrQuestionResponse(false)}
                className="py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Não
              </button>
              <button
                onClick={() => handleQrQuestionResponse(true)}
                className="py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
