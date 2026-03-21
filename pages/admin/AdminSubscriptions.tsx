import React, { useState, useEffect, useContext, useRef } from 'react';
import { api } from '../../services/dataService';
import { AppPricingRule, CondominiumSubscription, UserRole, SubscriptionPayment } from '../../types';
import { useToast } from '../../components/Toast';
import { AuthContext } from '../../App';
import { 
  Building2, 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Users,
  CreditCard,
  Search,
  RefreshCw,
  Receipt,
  BarChart,
  Calendar,
  Filter,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

// --- Searchable Select Component (matches app-wide pattern) ---
interface SearchableSelectProps {
  options: { value: number | string; label: string }[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  alwaysVisibleValues?: Array<number | string>;
  className?: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhum resultado encontrado',
  alwaysVisibleValues = [],
  className = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    alwaysVisibleValues.includes(option.value) ||
    (option.label || '').toLowerCase().includes(search.toLowerCase())
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
    if (isOpen && inputRef.current) inputRef.current.focus();
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
        className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between cursor-pointer"
      >
        <span className={selectedOption ? 'text-text-main' : 'text-text-dim'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && (
            <button type="button" onClick={handleClear} className="p-1 hover:bg-bg-root rounded transition-colors">
              <X size={14} className="text-text-dim" />
            </button>
          )}
          <ChevronDown size={18} className={`text-text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-bg-surface border border-border-main rounded-lg shadow-lg">
          <div className="p-2 border-b border-border-main">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-dim text-center">{emptyMessage}</div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-bg-root flex items-center justify-between transition-colors ${option.value === value ? 'bg-accent/10 text-accent' : 'text-text-main'}`}
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

export default function AdminSubscriptions() {
  const { user } = useContext(AuthContext);
  const { showToast, showConfirm } = useToast();
  const showSuccess = (msg: string) => showToast('success', msg);
  const showError = (msg: string) => showToast('error', msg);
  
  const [activeTab, setActiveTab] = useState<'subscriptions'|'rules'|'payments'|'reports'>('subscriptions');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [subscriptions, setSubscriptions] = useState<CondominiumSubscription[]>([]);
  const [rules, setRules] = useState<AppPricingRule[]>([]);
  
  // Condominium Subscription Form State
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<CondominiumSubscription | null>(null);
  const [subscriptionFormData, setSubscriptionFormData] = useState({
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'TRIAL',
    custom_price_per_resident: '' as string | number,
    discount_percentage: 0 as string | number
  });
  
  // Dashboard Filters
  const [subFilters, setSubFilters] = useState({
    condominium_id: '' as string | number,
    status: 'ALL' as string,
    paymentStatus: 'ALL' as string
  });
  
  // Rule Form State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AppPricingRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState({
    min_residents: 1,
    max_residents: '' as number | string,
    price_per_resident: 0,
    currency: 'AOA'
  });

  // Payment State
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [paymentFilters, setPaymentFilters] = useState({
    condominium_id: '',
    year: new Date().getFullYear(),
    month: (new Date().getMonth() + 1) as number | 'ALL'
  });
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    condominium_id: '',
    amount: 0,
    currency: 'AOA',
    payment_date: new Date().toISOString().split('T')[0],
    reference_period: '',
    status: 'PAID',
    notes: ''
  });

  // Arrears Modal State
  const [isArrearsModalOpen, setIsArrearsModalOpen] = useState(false);
  const [selectedArrearsSub, setSelectedArrearsSub] = useState<CondominiumSubscription | null>(null);

  // Security Check
  if (user?.role !== UserRole.SUPER_ADMIN) {
    return <Navigate to="/admin" replace />;
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsData, rulesData] = await Promise.all([
        api.adminGetCondominiumSubscriptions(),
        api.getAppPricingRules()
      ]);
      setSubscriptions(subsData);
      setRules(rulesData);
    } catch (error) {
      showError('Erro ao carregar os dados das assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    setIsPaymentLoading(true);
    try {
      const filters: any = { 
        year: paymentFilters.year, 
        month: paymentFilters.month === 'ALL' ? null : paymentFilters.month 
      };
      if (paymentFilters.condominium_id) {
        filters.condominium_id = Number(paymentFilters.condominium_id);
      }
      const data = await api.adminGetSubscriptionPayments(filters);
      setPayments(data);
    } catch (e) {
      showError('Erro ao carregar pagamentos');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'payments' || activeTab === 'reports') {
      loadPayments();
    }
  }, [activeTab, paymentFilters.year, paymentFilters.month, paymentFilters.condominium_id]);

  // Derived filtered subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesCondo = !subFilters.condominium_id || subFilters.condominium_id === 'ALL' || sub.condominium_id === Number(subFilters.condominium_id);
    const matchesStatus = subFilters.status === 'ALL' || sub.status === subFilters.status;
    const matchesPayment = subFilters.paymentStatus === 'ALL' || sub.payment_status === subFilters.paymentStatus;
    
    return matchesCondo && matchesStatus && matchesPayment;
  });

  // Compute calculated price for a subscription based on current residents count
  const calculateSubscriptionPrice = (sub: CondominiumSubscription) => {
    const residentsCount = sub.current_residents_count || 0;
    let unitPrice = 0;
    
    if (sub.custom_price_per_resident !== null && sub.custom_price_per_resident !== undefined) {
      unitPrice = sub.custom_price_per_resident;
    } else {
      const matchingRule = rules.find(r => 
        residentsCount >= r.min_residents && 
        (r.max_residents === null || residentsCount <= r.max_residents)
      );
      if (matchingRule) unitPrice = matchingRule.price_per_resident;
    }

    let totalPrice = unitPrice * residentsCount;
    if (sub.discount_percentage && sub.discount_percentage > 0) {
      totalPrice = totalPrice - (totalPrice * (sub.discount_percentage / 100));
    }

    return { 
      unitPrice, 
      price: totalPrice, 
      currency: 'AOA',
      isCustom: sub.custom_price_per_resident !== null && sub.custom_price_per_resident !== undefined,
      discount: sub.discount_percentage || 0
    };
  };

  const handleRegularize = (p: SubscriptionPayment) => {
    const sub = subscriptions.find(s => String(s.condominium_id) === String(p.condominium_id));
    if (!sub) return;

    const priceInfo = calculateSubscriptionPrice(sub);
    const expected = priceInfo.price;
    
    const totalPaidForPeriod = payments
      .filter(pay => String(pay.condominium_id) === String(p.condominium_id) && pay.reference_period === p.reference_period && (pay.status === 'PAID' || pay.status === 'PARTIAL'))
      .reduce((sum, pay) => sum + pay.amount, 0);
    
    const remaining = expected - totalPaidForPeriod;

    if (remaining <= 0) return;

    setPaymentFormData({
      condominium_id: String(p.condominium_id),
      amount: remaining,
      currency: p.currency,
      payment_date: new Date().toISOString().split('T')[0],
      reference_period: p.reference_period || '',
      status: 'PAID',
      notes: `Regularização de ${p.reference_period}`
    });
    setIsPaymentModalOpen(true);
  };

  // --- Subscriptions Actions ---
  const handleOpenSubscriptionModal = (sub: CondominiumSubscription) => {
    setEditingSubscription(sub);
    setSubscriptionFormData({
      status: sub.status,
      custom_price_per_resident: sub.custom_price_per_resident ?? '',
      discount_percentage: sub.discount_percentage ?? 0
    });
    setIsSubscriptionModalOpen(true);
  };

  const handleSaveSubscriptionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscription) return;

    try {
      const customPrice = subscriptionFormData.custom_price_per_resident === '' ? null : Number(subscriptionFormData.custom_price_per_resident);
      const discount = Number(subscriptionFormData.discount_percentage);

      const success = await api.adminUpdateSubscriptionDetails(
        editingSubscription.id,
        editingSubscription.condominium_id,
        {
          status: subscriptionFormData.status,
          custom_price_per_resident: customPrice,
          discount_percentage: discount
        }
      );

      if (success) {
        showSuccess('Definições atualizadas com sucesso');
        setSubscriptions(prev => prev.map(s => 
          s.id === editingSubscription.id 
            ? { ...s, status: subscriptionFormData.status, custom_price_per_resident: customPrice, discount_percentage: discount } 
            : s
        ));
        setIsSubscriptionModalOpen(false);
      } else {
        showError('Erro ao atualizar definições');
      }
    } catch (error) {
      showError('Erro ao atualizar definições');
    }
  };

  // --- Rules Actions ---
  const handleOpenRuleModal = (rule?: AppPricingRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleFormData({
        min_residents: rule.min_residents,
        max_residents: rule.max_residents ?? '',
        price_per_resident: rule.price_per_resident,
        currency: rule.currency
      });
    } else {
      setEditingRule(null);
      setRuleFormData({
        min_residents: 1,
        max_residents: '',
        price_per_resident: 0,
        currency: 'AOA'
      });
    }
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const maxRes = ruleFormData.max_residents === '' ? null : Number(ruleFormData.max_residents);
    if (maxRes !== null && maxRes < ruleFormData.min_residents) {
      showError('O limite máximo não pode ser menor que o limite mínimo');
      return;
    }

    const payload = {
      min_residents: ruleFormData.min_residents,
      max_residents: maxRes,
      price_per_resident: ruleFormData.price_per_resident,
      currency: ruleFormData.currency
    };

    try {
      if (editingRule) {
        const updated = await api.adminUpdatePricingRule(editingRule.id, payload);
        if (updated) {
          showSuccess('Regra atualizada com sucesso');
          setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
        }
      } else {
        const created = await api.adminCreatePricingRule(payload);
        if (created) {
          showSuccess('Regra criada com sucesso');
          setRules(prev => [...prev, created].sort((a, b) => a.min_residents - b.min_residents));
        }
      }
      setIsRuleModalOpen(false);
    } catch (error) {
      showError('Erro ao salvar a regra');
    }
  };

  const handleDeleteRule = async (id: number) => {
    showConfirm(
      'Tem certeza que deseja apagar esta regra de preço? Isto pode afetar os cálculos das assinaturas.',
      async () => {
        try {
          const success = await api.adminDeletePricingRule(id);
          if (success) {
            showSuccess('Regra apagada com sucesso');
            setRules(prev => prev.filter(r => r.id !== id));
          } else {
            showError('Erro ao apagar a regra');
          }
        } catch (error) {
          showError('Erro ao apagar a regra');
        }
      }
    );
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-accent" />
            Gestão de Assinaturas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gira os preços da aplicação baseados no número de residentes
          </p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'subscriptions' 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Building2 size={16} />
            <span className="hidden sm:inline">Condomínios</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'rules' 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Regras de Preço</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'payments' 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Receipt size={16} />
            <span className="hidden sm:inline">Pagamentos</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'reports' 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <BarChart size={16} />
            <span className="hidden sm:inline">Relatórios</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="animate-spin text-accent" size={32} />
        </div>
      ) : activeTab === 'subscriptions' ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Building2 size={18} className="text-slate-400" />
              Estado das Assinaturas
            </h2>
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          
          {/* Dashboard Filters Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50/30 dark:bg-slate-800/20">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Filtrar Condomínio</label>
              <SearchableSelect
                options={[
                  { value: 'ALL', label: 'Todos os Condomínios' },
                  ...subscriptions.map(s => ({ value: s.condominium_id, label: s.condominium_name || `ID: ${s.condominium_id}` }))
                ]}
                value={subFilters.condominium_id || 'ALL'}
                onChange={(val) => setSubFilters(prev => ({ ...prev, condominium_id: val === 'ALL' ? '' : (val || '') }))}
                placeholder="Todos os Condomínios"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Estado Subscrição</label>
                <select
                  value={subFilters.status}
                  onChange={(e) => setSubFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="ALL">Todos os Estados</option>
                  <option value="ACTIVE">Ativo</option>
                  <option value="TRIAL">Período de Teste</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Estado Pagamento</label>
                <select
                  value={subFilters.paymentStatus}
                  onChange={(e) => setSubFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="ALL">Todos</option>
                  <option value="PAID">Pago</option>
                  <option value="PARTIAL">Parcial</option>
                  <option value="PENDING">Pendente</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubFilters({ condominium_id: '', status: 'ALL', paymentStatus: 'ALL' })}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-2"
              >
                <Filter size={14} />
                Limpar Filtros
              </button>
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Condomínios</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {filteredSubscriptions.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {filteredSubscriptions.filter(s => s.status === 'ACTIVE').length} Ativos
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-full">
                <Building2 size={24} className="text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total de Residentes</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {filteredSubscriptions.reduce((acc, sub) => acc + (sub.current_residents_count || 0), 0).toLocaleString('pt-AO')}
                </p>
                <p className="text-xs text-slate-400 mt-1">No conjunto filtrado</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-full">
                <Users size={24} className="text-emerald-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Receita Mensal Estimada</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {filteredSubscriptions
                    .filter(s => s.status === 'ACTIVE')
                    .reduce((acc, sub) => acc + calculateSubscriptionPrice(sub).price, 0)
                    .toLocaleString('pt-AO')} AOA
                </p>
                <p className="text-xs text-slate-400 mt-1">Filtro aplicado</p>
              </div>
              <div className="bg-accent/10 dark:bg-accent/20 p-3 rounded-full">
                <CreditCard size={24} className="text-accent" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Cobranças em Atraso</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {filteredSubscriptions.reduce((acc, sub) => {
                    const subDebt = sub.arrears_details?.reduce((sAcc: number, item: any) => sAcc + (Number(item.expected) - Number(item.paid)), 0) || 0;
                    return acc + subDebt;
                  }, 0).toLocaleString('pt-AO')} AOA
                </p>
                <p className="text-xs text-red-400 mt-1">
                  {filteredSubscriptions.filter(s => s.months_in_arrears && s.months_in_arrears > 0).length} conds | {filteredSubscriptions.reduce((acc, s) => acc + (s.months_in_arrears || 0), 0)} meses
                </p>

              </div>
              <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-full">
                <AlertCircle size={24} className="text-red-500" />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Condomínio</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Nº Residentes</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Preço Unit.</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Preço Total Mensal</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Último Pagamento</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Atraso</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Mês Actual</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Estado Subscrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                        Nenhum condomínio corresponde aos filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriptions.map((sub) => {
                      const priceInfo = calculateSubscriptionPrice(sub);
                    const unitPrice = priceInfo.unitPrice;
                    const isActive = sub.status === 'ACTIVE';
                    
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {sub.condominium_name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            ID: {sub.condominium_id}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm font-semibold">
                            <Users size={14} />
                            {sub.current_residents_count || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                            {unitPrice.toLocaleString('pt-AO')} {priceInfo.currency}
                          </div>
                          {priceInfo.isCustom && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-bold text-[10px] rounded uppercase tracking-wider">
                              Preço Manual
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {priceInfo.price.toLocaleString('pt-AO')} {priceInfo.currency}
                          </div>
                          {priceInfo.discount > 0 && (
                            <div className="text-[10px] text-emerald-500 font-bold tracking-wider uppercase mt-1">
                              -{priceInfo.discount}% Desconto
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {sub.last_payment_date ? new Date(sub.last_payment_date).toLocaleDateString('pt-AO') : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {sub.months_in_arrears && sub.months_in_arrears > 0 ? (
                            <button 
                              onClick={() => {
                                setSelectedArrearsSub(sub);
                                setIsArrearsModalOpen(true);
                              }}
                              className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200 transition-colors shadow-sm"
                              title="Clique para ver detalhes"
                            >
                              {sub.months_in_arrears} {sub.months_in_arrears === 1 ? 'mês' : 'meses'}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            sub.payment_status === 'PAID' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' 
                              : sub.payment_status === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                          }`}>
                            {sub.payment_status === 'PAID' ? 'PAGO' : sub.payment_status === 'PARTIAL' ? 'PARCIAL' : 'PENDENTE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isActive 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
                              : sub.status === 'TRIAL' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                                : 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                          }`}>
                            {isActive ? <CheckCircle2 size={12} /> : sub.status === 'TRIAL' ? <RefreshCw size={12} /> : <XCircle size={12} />}
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleOpenSubscriptionModal(sub)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Configurar Assinatura"
                          >
                            <Settings size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'rules' ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Settings size={18} className="text-slate-400" />
                  Tabelas de Preço (Por Residente)
                </h2>
                <p className="text-xs text-slate-500 mt-1">O cálculo será baseado na primeira regra onde o número de residentes se enquadra.</p>
              </div>
              <button
                onClick={() => handleOpenRuleModal()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                <Plus size={20} />
                <span>Nova Regra</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Intervalo de Residentes</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preço por Residente</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rules.length > 0 ? (
                    rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Users size={16} className="text-slate-400" />
                            {rule.min_residents} - {rule.max_residents ? rule.max_residents : 'Sem Limite (+)'}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                          {rule.price_per_resident.toLocaleString('pt-AO')} {rule.currency}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenRuleModal(rule)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar Regra"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Apagar Regra"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                        Nenhuma regra de preço definida.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'payments' ? (
        <div className="space-y-6">
          {/* Pagamentos Tab */}
          <div className="flex flex-col md:flex-row gap-4 items-end bg-bg-surface p-4 rounded-xl border border-border-main shadow-sm mb-6">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-bold text-text-dim uppercase mb-2">Ano</label>
              <select 
                value={paymentFilters.year}
                onChange={(e) => setPaymentFilters(p => ({ ...p, year: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {Array.from({ length: (new Date().getFullYear() + 1) - 2025 + 1 }, (_, i) => 2025 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-bold text-text-dim uppercase mb-2">Mês</label>
              <select 
                value={paymentFilters.month}
                onChange={(e) => setPaymentFilters(p => ({ ...p, month: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="ALL">Todos os Meses</option>
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('pt-AO', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div className="flex-[2] min-w-[240px]">
              <label className="block text-xs font-bold text-text-dim uppercase mb-2">Condomínio</label>
              <SearchableSelect
                options={[
                  { value: 'ALL', label: 'Todos os Condomínios' },
                  ...subscriptions.map(s => ({ value: s.condominium_id, label: s.condominium_name || `Condomínio ${s.condominium_id}` }))
                ]}
                value={paymentFilters.condominium_id ? Number(paymentFilters.condominium_id) : 'ALL'}
                onChange={(val) => setPaymentFilters(p => ({ ...p, condominium_id: val === 'ALL' ? '' : String(val) }))}
                placeholder="Todos os Condomínios"
                searchPlaceholder="Pesquisar condomínio..."
                alwaysVisibleValues={['ALL']}
              />
            </div>
            <button
              onClick={() => {
                const defaultMonth = paymentFilters.month === 'ALL' ? new Date().getMonth() + 1 : paymentFilters.month;
                setPaymentFormData(prev => ({ 
                  ...prev, 
                  amount: 0, 
                  reference_period: `${paymentFilters.year}-${String(defaultMonth).padStart(2, '0')}`, 
                  notes: '' 
                }));
                setIsPaymentModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 whitespace-nowrap"
            >
              <Plus size={20} />
              <span>Registar Pagamento</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {isPaymentLoading ? (
               <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-slate-400" /></div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Data</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Condomínio</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Referência</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Valor</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-center">Estado</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.length > 0 ? payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {new Date(p.payment_date).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {p.condominium_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {p.reference_period || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {p.amount.toLocaleString('pt-AO')} {p.currency}
                        </div>
                        {p.status === 'PARTIAL' && (() => {
                          const sub = subscriptions.find(s => String(s.condominium_id) === String(p.condominium_id));
                          if (!sub) return null;
                          const expected = calculateSubscriptionPrice(sub).price;
                          const totalPaidForPeriod = payments
                            .filter(pay => String(pay.condominium_id) === String(p.condominium_id) && pay.reference_period === p.reference_period && (pay.status === 'PAID' || pay.status === 'PARTIAL'))
                            .reduce((sum, pay) => sum + pay.amount, 0);
                          const remaining = expected - totalPaidForPeriod;
                          if (remaining > 0.01) {
                            return (
                              <button 
                                onClick={() => handleRegularize(p)}
                                className="text-[10px] text-red-500 font-bold whitespace-nowrap hover:underline block ml-auto mt-1"
                              >
                                Falta: {remaining.toLocaleString('pt-AO')} {p.currency}
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const sub = subscriptions.find(s => String(s.condominium_id) === String(p.condominium_id));
                          if (!sub) return null;
                          const expected = calculateSubscriptionPrice(sub).price;
                          const totalPaidForPeriod = payments
                            .filter(pay => String(pay.condominium_id) === String(p.condominium_id) && pay.reference_period === p.reference_period && (pay.status === 'PAID' || pay.status === 'PARTIAL'))
                            .reduce((sum, pay) => sum + pay.amount, 0);
                          const isFullyPaid = totalPaidForPeriod >= (expected - 0.1);

                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isFullyPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                              p.status === 'PARTIAL' ? 'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400' :
                              p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                            }`}>
                              {isFullyPaid ? 'PAGO' : p.status === 'PARTIAL' ? 'PARCIAL' : p.status === 'PENDING' ? 'PENDENTE' : 'FALHADO'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(() => {
                           const sub = subscriptions.find(s => String(s.condominium_id) === String(p.condominium_id));
                           if (!sub) return null;
                           const expected = calculateSubscriptionPrice(sub).price;
                           const totalPaidForPeriod = payments
                             .filter(pay => String(pay.condominium_id) === String(p.condominium_id) && pay.reference_period === p.reference_period && (pay.status === 'PAID' || pay.status === 'PARTIAL'))
                             .reduce((sum, pay) => sum + pay.amount, 0);
                           const remaining = expected - totalPaidForPeriod;

                           if (p.status === 'PARTIAL' && remaining > 0.1) {
                             return (
                               <button
                                 onClick={() => handleRegularize(p)}
                                 className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                 title="Regularizar Dívida"
                               >
                                 <CreditCard size={16} />
                               </button>
                             );
                           }
                           return null;
                        })()}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                        Sem pagamentos registados neste período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Relatórios Tab */}
          <div className="flex flex-col md:flex-row gap-4 items-end bg-bg-surface p-4 rounded-xl border border-border-main shadow-sm">
            <div className="flex-1">
              <label className="block text-xs font-bold text-text-dim uppercase mb-2">Ano</label>
              <select 
                value={paymentFilters.year}
                onChange={(e) => setPaymentFilters(p => ({ ...p, year: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {Array.from({ length: (new Date().getFullYear() + 1) - 2025 + 1 }, (_, i) => 2025 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-text-dim uppercase mb-2">Mês</label>
              <select 
                value={paymentFilters.month}
                onChange={(e) => setPaymentFilters(p => ({ ...p, month: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="ALL">Todos os Meses</option>
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('pt-AO', { month: 'long' })}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-xl border border-emerald-100 dark:border-emerald-800/30 text-center">
              <p className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-2">Receita Faturada (Paga)</p>
              <h3 className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">
                {payments
                  .filter(p => p.status === 'PAID' || p.status === 'PARTIAL')
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString('pt-AO')} AOA
              </h3>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-xl border border-yellow-100 dark:border-yellow-800/30 text-center">
              <p className="text-yellow-600 dark:text-yellow-400 text-sm font-semibold mb-2">Receita Pendente</p>
              <h3 className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                {(() => {
                  const year = paymentFilters.year;
                  const month = paymentFilters.month;
                  const totalArrears = subscriptions.reduce((acc, sub) => {
                    const relevantArrears = sub.arrears_details?.filter(item => {
                      if (month === 'ALL') {
                        return item.period.startsWith(`${year}-`);
                      } else {
                        const monthStr = String(month).padStart(2, '0');
                        return item.period === `${year}-${monthStr}`;
                      }
                    }) || [];
                    return acc + relevantArrears.reduce((sAcc, item) => sAcc + (Number(item.expected) - Number(item.paid)), 0);
                  }, 0);
                  return totalArrears.toLocaleString('pt-AO');
                })()} AOA
              </h3>
            </div>
            <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-100 dark:border-red-800/30 text-center">
              <p className="text-red-600 dark:text-red-400 text-sm font-semibold mb-2">Pagamentos Falhados</p>
              <h3 className="text-3xl font-bold text-red-700 dark:text-red-300">
                {payments.filter(p => p.status === 'FAILED').reduce((sum, p) => sum + p.amount, 0).toLocaleString('pt-AO')} AOA
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Rule Form Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                <Settings size={20} className="text-blue-600" />
                {editingRule ? 'Editar Regra de Preço' : 'Nova Regra de Preço'}
              </h2>
              <button onClick={() => setIsRuleModalOpen(false)} className="p-2 hover:bg-bg-root rounded-lg transition-colors">
                <X size={20} className="text-text-dim" />
              </button>
            </div>
            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Mínimo Residentes <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" min="1" required
                    value={ruleFormData.min_residents}
                    onChange={(e) => setRuleFormData(prev => ({ ...prev, min_residents: Number(e.target.value) }))}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Máximo Residentes
                  </label>
                  <input
                    type="number"
                    min={ruleFormData.min_residents}
                    value={ruleFormData.max_residents}
                    onChange={(e) => setRuleFormData(prev => ({ ...prev, max_residents: e.target.value }))}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sem limite"
                  />
                  <p className="text-xs text-text-dim mt-1">Deixe vazio para 'Sem Limite'</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Preço por Residente ({ruleFormData.currency}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="0" step="0.01" required
                  value={ruleFormData.price_per_resident}
                  onChange={(e) => setRuleFormData(prev => ({ ...prev, price_per_resident: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsRuleModalOpen(false)}
                  className="flex-1 px-6 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg hover:bg-bg-root transition-colors font-semibold">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Condominium Settings Modal */}
      {isSubscriptionModalOpen && editingSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border-main flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                <Settings size={20} className="text-blue-600" />
                Configurar Assinatura
              </h2>
              <button onClick={() => setIsSubscriptionModalOpen(false)} className="p-2 hover:bg-bg-root rounded-lg transition-colors">
                <X size={20} className="text-text-dim" />
              </button>
            </div>
            <form onSubmit={handleSaveSubscriptionSettings} className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-bg-root border border-border-main">
                <p className="text-xs text-text-dim uppercase font-semibold mb-1">Condomínio</p>
                <p className="text-sm font-bold text-text-main">{editingSubscription.condominium_name}</p>
                <p className="text-xs text-text-dim mt-1">ID: {editingSubscription.condominium_id} | {editingSubscription.current_residents_count || 0} Residentes</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Estado da Subscrição <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={[
                    { value: 'ACTIVE', label: 'ATIVO' },
                    { value: 'TRIAL', label: 'TRIAL' },
                    { value: 'INACTIVE', label: 'INATIVO' }
                  ]}
                  value={subscriptionFormData.status}
                  onChange={(val) => setSubscriptionFormData(prev => ({ ...prev, status: val as any || 'ACTIVE' }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Preço Excecional (Por Residente)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={subscriptionFormData.custom_price_per_resident}
                  onChange={(e) => setSubscriptionFormData(prev => ({ ...prev, custom_price_per_resident: e.target.value }))}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Deixe vazio para usar regra global"
                />
                <p className="text-xs text-text-dim mt-1">Substitui completamente o cálculo da regra por escalão.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Desconto Final (%)</label>
                <input
                  type="number" min="0" max="100" step="1"
                  value={subscriptionFormData.discount_percentage}
                  onChange={(e) => setSubscriptionFormData(prev => ({ ...prev, discount_percentage: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-text-dim mt-1">Aplica-se em cima do valor total já calculado (0 = Sem desconto).</p>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsSubscriptionModalOpen(false)}
                  className="flex-1 px-6 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg hover:bg-bg-root transition-colors font-semibold">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-bg-surface rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border-main flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                <Receipt size={20} className="text-blue-600" />
                Registar Pagamento
              </h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-bg-root rounded-lg transition-colors">
                <X size={20} className="text-text-dim" />
              </button>
            </div>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!paymentFormData.condominium_id) return showError('Selecione um condomínio');
                const res = await api.adminCreateSubscriptionPayment({
                  ...paymentFormData,
                  condominium_id: Number(paymentFormData.condominium_id)
                });
                if (res) {
                  showSuccess('Pagamento registado!');
                  setIsPaymentModalOpen(false);
                  loadPayments();
                  loadData();
                } else {
                  showError('Erro ao registar pagamento');
                }
              }} 
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Scrollable Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1 pb-10">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Condomínio <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={subscriptions.map(s => ({ value: s.condominium_id, label: s.condominium_name || String(s.condominium_id) }))}
                    value={paymentFormData.condominium_id ? Number(paymentFormData.condominium_id) : null}
                    onChange={(val) => {
                      const subId = val ? String(val) : '';
                      const sub = subscriptions.find(s => String(s.condominium_id) === subId);
                      if (sub) {
                        const priceInfo = calculateSubscriptionPrice(sub);
                        setPaymentFormData(prev => ({ 
                          ...prev, 
                          condominium_id: subId,
                          amount: priceInfo.price,
                          currency: priceInfo.currency
                        }));
                      } else {
                        setPaymentFormData(prev => ({ ...prev, condominium_id: subId }));
                      }
                    }}
                    placeholder="Selecione um condomínio"
                    searchPlaceholder="Pesquisar condomínio..."
                    emptyMessage="Nenhum condomínio encontrado"
                  />
                </div>

                {paymentFormData.condominium_id && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Cálculo por Regra:</span>
                      {(() => {
                        const sub = subscriptions.find(s => String(s.condominium_id) === paymentFormData.condominium_id);
                        if (!sub) return null;
                        const info = calculateSubscriptionPrice(sub);
                        return (
                          <div className="text-right">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {info.price.toLocaleString('pt-AO')} {info.currency}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {sub.current_residents_count || 0} res. × {info.unitPrice.toLocaleString('pt-AO')} {info.currency}
                              {info.discount > 0 && ` (-${info.discount}%)`}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs text-slate-500 font-medium">Diferença / Acerto:</span>
                      {(() => {
                        const sub = subscriptions.find(s => String(s.condominium_id) === paymentFormData.condominium_id);
                        if (!sub) return null;
                        const expectedPrice = calculateSubscriptionPrice(sub).price;
                        
                        const getAlreadyPaid = () => {
                          const monthKey = paymentFormData.reference_period;
                          return payments
                            .filter(p => 
                              String(p.condominium_id) === paymentFormData.condominium_id && 
                              p.reference_period === monthKey &&
                              (p.status === 'PAID' || p.status === 'PARTIAL')
                            )
                            .reduce((acc, p) => acc + p.amount, 0);
                        };

                        const alreadyPaidFound = getAlreadyPaid();
                        const remainingForMonth = expectedPrice - alreadyPaidFound;
                        const currentBalanceAfterThis = remainingForMonth - paymentFormData.amount;

                        return (
                          <div className="flex flex-col gap-1 mt-1 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">Já pago este período:</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {alreadyPaidFound.toLocaleString('pt-AO')} {paymentFormData.currency}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Saldo Final (Após este):</span>
                              {currentBalanceAfterThis <= 0.01 && currentBalanceAfterThis >= -0.01 ? (
                                <span className="text-emerald-500 font-bold">Liquidado</span>
                              ) : currentBalanceAfterThis > 0 ? (
                                <span className="text-red-500 font-bold">
                                  Em falta: {currentBalanceAfterThis.toLocaleString('pt-AO')} {paymentFormData.currency}
                                </span>
                              ) : (
                                <span className="text-blue-500 font-bold">
                                  Crédito: {Math.abs(currentBalanceAfterThis).toLocaleString('pt-AO')} {paymentFormData.currency}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">Valor Pago <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type="number"
                        value={paymentFormData.amount || ''}
                        onChange={(e) => {
                          const newAmount = Number(e.target.value);
                          const sub = subscriptions.find(s => String(s.condominium_id) === paymentFormData.condominium_id);
                          let newStatus = paymentFormData.status;
                          
                          if (sub && newAmount > 0) {
                            const expected = calculateSubscriptionPrice(sub).price;
                            if (newAmount < expected) {
                              newStatus = 'PARTIAL';
                            } else if (Math.abs(newAmount - expected) < 0.01) {
                              newStatus = 'PAID';
                            }
                          }
                          
                          setPaymentFormData(prev => ({ 
                            ...prev, 
                            amount: newAmount,
                            status: newStatus as any
                          }));
                        }}
                        className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
                        placeholder="0.00"
                        required
                      />
                      {paymentFormData.condominium_id && (
                        <button 
                          type="button"
                          onClick={() => {
                            const sub = subscriptions.find(s => String(s.condominium_id) === paymentFormData.condominium_id);
                            if (sub) {
                              const info = calculateSubscriptionPrice(sub);
                              setPaymentFormData(prev => ({ ...prev, amount: info.price }));
                            }
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 hover:text-accent rounded transition-colors"
                        >
                          FIXAR
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">Moeda</label>
                    <input
                      type="text" required
                      value={paymentFormData.currency}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">Data <span className="text-red-500">*</span></label>
                    <input
                      type="date" required
                      value={paymentFormData.payment_date}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">Período de Ref.</label>
                    <input
                      type="month"
                      value={paymentFormData.reference_period}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, reference_period: e.target.value }))}
                      className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-dim uppercase mb-2">Estado *</label>
                  <SearchableSelect
                    options={[
                      { value: 'PAID', label: 'Pago (Total)' },
                      { value: 'PARTIAL', label: 'Parcial' },
                      { value: 'PENDING', label: 'Pendente' },
                      { value: 'FAILED', label: 'Falhado' }
                    ]}
                    value={paymentFormData.status}
                    onChange={(val) => setPaymentFormData(prev => ({ ...prev, status: val as any || 'PAID' }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Notas</label>
                  <input
                    type="text"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2 border border-border-main bg-bg-surface text-text-main rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Referência bancária, etc."
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 border-t border-border-main bg-bg-surface shrink-0 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border-main text-text-main rounded-lg hover:bg-bg-root transition-colors font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  Guardar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Arrears Details Modal */}
      {isArrearsModalOpen && selectedArrearsSub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-surface w-full max-w-md rounded-2xl shadow-2xl border border-border-main overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border-main shrink-0 flex items-center justify-between bg-red-50 dark:bg-red-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-main">Meses em Atraso</h3>
                  <p className="text-sm text-text-dim">{selectedArrearsSub.condominium_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsArrearsModalOpen(false)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
                title="Fechar"
              >
                <X size={20} className="text-text-dim" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-6">
                <p className="text-sm text-text-dim mb-4 italic">
                  O sistema identificou {selectedArrearsSub.months_in_arrears} {selectedArrearsSub.months_in_arrears === 1 ? 'mês' : 'meses'} com valores pendentes:
                </p>
                
                <div className="border border-border-main rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-bg-root border-b border-border-main text-text-dim uppercase text-[10px] font-bold">
                        <th className="px-4 py-3">Período</th>
                        <th className="px-4 py-3 text-right">Devido</th>
                        <th className="px-4 py-3 text-right">Pago</th>
                        <th className="px-4 py-3 text-right">Dívida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/50">
                      {selectedArrearsSub.arrears_details?.map((item: any) => (
                        <tr key={item.period} className="hover:bg-bg-root transition-colors">
                          <td className="px-4 py-3 font-semibold text-text-main">
                            {new Date(item.period + '-01').toLocaleString('pt-AO', { month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-right text-text-dim">
                            {Number(item.expected).toLocaleString()} AOA
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                            {Number(item.paid) > 0 ? `${Number(item.paid).toLocaleString()} AOA` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 font-bold">
                            {(Number(item.expected) - Number(item.paid)).toLocaleString()} AOA
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-red-50/50 dark:bg-red-500/5 font-bold">
                        <td className="px-4 py-3 text-text-main">TOTAL</td>
                        <td className="px-4 py-3 text-right">
                          {selectedArrearsSub.arrears_details?.reduce((acc: number, curr: any) => acc + Number(curr.expected), 0).toLocaleString()} AOA
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600">
                          {selectedArrearsSub.arrears_details?.reduce((acc: number, curr: any) => acc + Number(curr.paid), 0).toLocaleString()} AOA
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          {selectedArrearsSub.arrears_details?.reduce((acc: number, curr: any) => acc + (Number(curr.expected) - Number(curr.paid)), 0).toLocaleString()} AOA
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <div className="flex gap-3">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>Nota:</strong> Esta lista inclui meses com pagamentos <strong>PARCIAIS</strong> ou sem qualquer registo. Para regularizar, aceda ao separador "Pagamentos" e liquide o valor em falta.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border-main bg-bg-surface shrink-0">
              <button
                onClick={() => setIsArrearsModalOpen(false)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
