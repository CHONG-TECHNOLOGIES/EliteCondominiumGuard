import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, AlertCircle, Delete, Lock } from 'lucide-react';
import { AuthContext } from '../App';
import { api } from '../services/dataService';
import { UserRole } from '../types';
import { audioService } from '../services/audioService';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [condoName, setCondoName] = useState<string>('');

  const [tapCount, setTapCount] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');

  useEffect(() => {
    api.getDeviceCondoDetails().then(condo => {
      if (condo) setCondoName(condo.name);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setTapCount(0), 2000);
    return () => clearTimeout(timer);
  }, [tapCount]);

  const handleSecretTap = () => {
    setTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setShowAdminModal(true);
        return 0;
      }
      return newCount;
    });
  };

  const confirmReset = async () => {
    if (adminPin === '123456') {
      await api.resetDevice();
    } else {
      alert("Código Inválido");
      setAdminPin('');
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firstName || !lastName || pin.length < 3) {
      setError("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const staff = await api.login(firstName, lastName, pin);
      if (staff) {
        login(staff);

        // Initialize audio service immediately after successful login
        console.log('[Login] 🔊 Initializing audio service after login...');
        audioService.initialize().then(success => {
          if (success) {
            console.log('[Login] ✅ Audio service initialized - alerts will work automatically');
          } else {
            console.warn('[Login] ⚠️ Audio initialization failed - user may need to enable manually');
          }
        });

        // Redirect based on user role
        if (staff.role === UserRole.ADMIN || staff.role === UserRole.SUPER_ADMIN) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        setError('Credenciais inválidas.');
        setPin('');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePinClick = (num: string) => {
    if (pin.length < 6) setPin(prev => prev + num);
  };

  const handleBackspace = () => setPin(prev => prev.slice(0, -1));
  const handleClear = () => {
    setPin('');
    setFirstName('');
    setLastName('');
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-900 overflow-hidden">
      <div className="relative w-full md:w-1/2 lg:w-2/3 h-[30vh] md:h-full bg-slate-800 shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop")' }}
        ></div>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
          <div
            onClick={handleSecretTap}
            className="w-16 h-16 md:w-24 md:h-24 bg-blue-600 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 shadow-2xl shadow-blue-500/30 cursor-pointer active:scale-95 transition-transform"
          >
            <ShieldCheck className="text-white w-8 h-8 md:w-12 md:h-12" />
          </div>
          <h1 className="text-2xl md:text-5xl font-black text-white mb-2 md:mb-4 tracking-tight">Elite AccesControl</h1>
          <p className="text-sm md:text-xl text-blue-100 font-light max-w-md hidden md:block">
            Sistema Inteligente de Controlo de Acessos.
          </p>
          <div className="mt-2 md:mt-12 px-4 py-2 bg-white/10 backdrop-blur-md rounded-lg md:rounded-2xl border border-white/10">
            <p className="text-[10px] md:text-xs uppercase tracking-widest text-blue-200 font-bold mb-0 md:mb-1">Condomínio</p>
            <p className="text-sm md:text-2xl font-bold text-white">{condoName || '...'}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full md:w-1/2 lg:w-1/3 bg-slate-50 flex flex-col h-[70vh] md:h-full">
        <div className="flex-1 overflow-y-auto p-4 md:p-12 flex flex-col justify-center">
          <div className="mb-4 md:mb-8 text-center md:text-left">
            <h2 className="text-xl md:text-3xl font-bold text-slate-800">Login de Staff</h2>
            <p className="text-sm md:text-base text-slate-500">Insira as credenciais para iniciar.</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-3 md:gap-5 h-full md:h-auto">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle size={18} /> {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-800"
                  placeholder="Primeiro"
                />
              </div>
              <div>
                <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Apelido</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-800"
                  placeholder="Último"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <div className="w-full h-12 md:h-16 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center text-2xl md:text-4xl tracking-[0.5em] font-black text-slate-800 shadow-inner">
                  {pin.split('').map(() => '•').join('')}
                  {pin.length === 0 && <span className="text-slate-300 text-xs md:text-sm tracking-normal font-normal">PIN</span>}
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                  <Lock size={18} className="md:w-6 md:h-6" />
                </div>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2 md:gap-3 min-h-[180px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinClick(num.toString())}
                  className="bg-white border-b-2 md:border-b-4 border-slate-200 rounded-lg md:rounded-xl text-xl md:text-2xl font-bold text-slate-700 active:translate-y-1 active:border-b-0 transition-all hover:bg-slate-50 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button type="button" onClick={handleClear} className="bg-red-50 border-b-2 md:border-b-4 border-red-100 rounded-lg md:rounded-xl text-red-500 font-bold text-xs md:text-sm active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center">LIMPAR</button>
              <button type="button" onClick={() => handlePinClick('0')} className="bg-white border-b-2 md:border-b-4 border-slate-200 rounded-lg md:rounded-xl text-xl md:text-2xl font-bold text-slate-700 active:translate-y-1 active:border-b-0 transition-all hover:bg-slate-50 flex items-center justify-center">0</button>
              <button type="button" onClick={handleBackspace} className="bg-slate-100 border-b-2 md:border-b-4 border-slate-200 rounded-lg md:rounded-xl text-slate-600 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center"><Delete size={20} /></button>
            </div>
            <button
              type="submit"
              disabled={loading || pin.length < 3}
              className="w-full py-3 md:py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'ENTRAR'}
            </button>
          </form>
        </div>
      </div>
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
            <h3 className="text-lg font-bold text-center mb-4">Reset de Quiosque</h3>
            <input
              type="password"
              className="w-full text-center text-2xl p-2 border-2 rounded-xl mb-4"
              placeholder="PIN Mestre"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAdminModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">Cancelar</button>
              <button onClick={confirmReset} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Resetar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
