import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { BarChart3, Loader2, MapPin, Users, AlertTriangle, RefreshCw, Search, X } from 'lucide-react';
import { api } from '../../services/dataService';
import { CondominiumStats } from '../../types';
import { useToast } from '../../components/Toast';
import { logger, ErrorCategory } from '@/services/logger';

export default function AdminAnalytics() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<CondominiumStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Default center (Lisbon, Portugal - can be adjusted)
  const defaultCenter: [number, number] = [38.7223, -9.1393];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);

  useEffect(() => {
    logger.info('AdminAnalytics mounted');
    loadData();
    // Auto-refresh every 30 seconds for real-time data
    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    logger.info('Loading analytics data...');
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminGetCondominiumStats();
      logger.info('Received analytics data', { data: data });
      setStats(data);
      setLastUpdated(new Date());

      // Center map on first condominium with coordinates
      if (data.length > 0) {
        const firstWithCoords = data.find(c => c.latitude && c.longitude);
        if (firstWithCoords && firstWithCoords.latitude && firstWithCoords.longitude) {
          setMapCenter([firstWithCoords.latitude, firstWithCoords.longitude]);
        }
      }
    } catch (error: any) {
      logger.error('Error loading analytics data', error, ErrorCategory.NETWORK);
      setError(error.message || 'Erro desconhecido');
      showToast('error', 'Erro ao carregar dados de analytics');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const data = await api.adminGetCondominiumStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      logger.error('Error refreshing analytics data', error, ErrorCategory.NETWORK);
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Create custom marker icon with badge showing counts
  const createCustomIcon = (visits: number, incidents: number) => {
    return new DivIcon({
      className: 'custom-marker',
      html: `
        <div style="position: relative;">
          <div style="
            width: 40px;
            height: 40px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          "></div>
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            display: flex;
            flex-direction: column;
            gap: 2px;
          ">
            ${visits > 0 ? `
              <div style="
                background: #10b981;
                color: white;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                white-space: nowrap;
              ">${visits}</div>
            ` : ''}
            ${incidents > 0 ? `
              <div style="
                background: #ef4444;
                color: white;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                white-space: nowrap;
              ">${incidents}</div>
            ` : ''}
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  };

  // Filter stats based on search query
  const filteredStats = useMemo(() => {
    if (!searchQuery.trim()) return stats;

    const query = searchQuery.toLowerCase().trim();
    return stats.filter(condo =>
      condo.name.toLowerCase().includes(query) ||
      (condo.address && condo.address.toLowerCase().includes(query))
    );
  }, [stats, searchQuery]);

  // Calculate totals from filtered stats
  const totalVisits = filteredStats.reduce((sum, s) => sum + s.total_visits_today, 0);
  const totalIncidents = filteredStats.reduce((sum, s) => sum + s.total_incidents_open, 0);
  const condosWithCoords = filteredStats.filter(s => s.latitude && s.longitude);

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-2">Analytics & Relatórios</h1>
          <p className="text-text-dim">Visualizar estatísticas e localização dos condomínios em tempo real</p>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome ou endereço do condomínio..."
            className="w-full pl-12 pr-12 py-3 border border-border-main bg-bg-surface text-text-main rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Limpar pesquisa"
            >
              <X size={20} />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-text-dim">
            {filteredStats.length === 0 ? (
              <span className="text-amber-600">Nenhum condomínio encontrado</span>
            ) : (
              <span>
                {filteredStats.length} {filteredStats.length === 1 ? 'condomínio encontrado' : 'condomínios encontrados'}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle size={20} />
            <span className="font-medium">Erro: {error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <MapPin className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-text-dim">Condomínios Ativos</p>
              <p className="text-2xl font-bold text-text-main">{filteredStats.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <Users className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-text-dim">Visitas Hoje</p>
              <p className="text-2xl font-bold text-green-600">{totalVisits}</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-text-dim">Incidentes Abertos</p>
              <p className="text-2xl font-bold text-red-600">{totalIncidents}</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <BarChart3 className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-text-dim">Última Atualização</p>
              <p className="text-sm font-bold text-text-main">
                {lastUpdated ? formatTime(lastUpdated) : '--:--:--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      {loading ? (
        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-8 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-text-dim">Carregando mapa...</p>
        </div>
      ) : condosWithCoords.length === 0 ? (
        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main p-8 text-center">
          <MapPin size={64} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-main mb-2">Sem Dados de Localização</h3>
          <p className="text-text-dim">
            Nenhum condomínio tem coordenadas GPS configuradas para exibição no mapa
          </p>
        </div>
      ) : (
        <div className="bg-bg-surface rounded-xl shadow-sm border border-border-main overflow-hidden">
          <div className="p-4 border-b border-border-main">
            <h2 className="text-lg font-bold text-text-main">Mapa de Condomínios</h2>
            <p className="text-sm text-text-dim">
              Badges verdes = Visitas hoje | Badges vermelhos = Incidentes abertos
            </p>
          </div>
          <div style={{ height: '600px', width: '100%' }} className="relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="relative z-0"
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {condosWithCoords.map((condo) => (
                <Marker
                  key={condo.id}
                  position={[condo.latitude!, condo.longitude!]}
                  icon={createCustomIcon(condo.total_visits_today, condo.total_incidents_open)}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg text-slate-900 mb-2">{condo.name}</h3>
                      {condo.address && (
                        <p className="text-sm text-slate-600 mb-3">{condo.address}</p>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm">
                            <span className="font-bold text-green-700">{condo.total_visits_today}</span>{' '}
                            {condo.total_visits_today === 1 ? 'visita' : 'visitas'} hoje
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm">
                            <span className="font-bold text-red-700">{condo.total_incidents_open}</span>{' '}
                            {condo.total_incidents_open === 1 ? 'incidente aberto' : 'incidentes abertos'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                  <Tooltip direction="top" offset={[0, -40]} opacity={1}>
                    <div className="text-center">
                      <div className="font-bold">{condo.name}</div>
                      <div className="text-xs">
                        <span className="text-green-600 font-bold">{condo.total_visits_today}</span> visitas |{' '}
                        <span className="text-red-600 font-bold">{condo.total_incidents_open}</span> incidentes
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Condominium List */}
      <div className="mt-6 bg-bg-surface rounded-xl shadow-sm border border-border-main p-6">
        <h2 className="text-xl font-bold text-text-main mb-4">Lista de Condomínios</h2>
        {filteredStats.length === 0 ? (
          <div className="text-center py-12">
            <Search size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text-main mb-2">
              {searchQuery ? 'Nenhum condomínio encontrado' : 'Sem dados disponíveis'}
            </h3>
            <p className="text-text-dim">
              {searchQuery
                ? 'Tente ajustar sua pesquisa ou limpar os filtros'
                : 'Nenhum condomínio cadastrado no sistema'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredStats.map((condo) => (
              <div
                key={condo.id}
                className="p-4 border border-border-main rounded-lg hover:bg-bg-root transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="text-blue-600" size={20} />
                    <div>
                      <h3 className="font-bold text-text-main">{condo.name}</h3>
                      {condo.address && (
                        <p className="text-sm text-text-dim">{condo.address}</p>
                      )}
                      {!condo.latitude || !condo.longitude ? (
                        <p className="text-xs text-amber-600 mt-1">⚠️ Sem coordenadas GPS</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{condo.total_visits_today}</div>
                      <div className="text-xs text-text-dim">Visitas Hoje</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{condo.total_incidents_open}</div>
                      <div className="text-xs text-text-dim">Incidentes Abertos</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
