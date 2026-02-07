import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Newspaper, RefreshCw, Clock, X, Calendar } from 'lucide-react';
import { api } from '../services/dataService';
import { CondominiumNews } from '../types';
import { useToast } from '../components/Toast';
import { logger, ErrorCategory } from '@/services/logger';

export default function News() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [news, setNews] = useState<CondominiumNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNews, setSelectedNews] = useState<CondominiumNews | null>(null);
  const [isOnline, setIsOnline] = useState(api.checkOnline());

  const loadNews = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setRefreshing(true);
      else setLoading(true);

      const data = await api.getNews();
      setNews(data);
    } catch (error) {
      logger.error('Error loading news', error, ErrorCategory.NETWORK);
      showToast('error', 'Erro ao carregar notícias');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews();

    // Check online status
    const checkStatus = () => setIsOnline(api.checkOnline());
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      if (api.checkOnline()) {
        loadNews(true);
      }
    }, 60000);

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
      clearInterval(interval);
    };
  }, []);

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    return `há ${diffDays} dias`;
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Últimas Notícias</h1>
            <p className="text-sm text-slate-500">
              {isOnline ? 'Notícias dos últimos 7 dias' : 'Modo offline - dados em cache'}
            </p>
          </div>
        </div>
        <button
          onClick={() => loadNews(true)}
          disabled={refreshing || !isOnline}
          className={`p-2 rounded-xl transition-colors ${
            refreshing || !isOnline
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RefreshCw size={24} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={48} className="text-slate-300 animate-spin mb-4" />
            <p className="text-slate-500">Carregando notícias...</p>
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <Newspaper size={64} className="text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">Sem notícias</h3>
            <p className="text-slate-400 text-center">
              Não há notícias nos últimos 7 dias.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md"
              >
                {/* Category badge and time */}
                <div className="flex items-center justify-between mb-3">
                  {item.category_label && (
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                      {item.category_label}
                    </span>
                  )}
                  {!item.category_label && <span />}
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} />
                    {item.created_at && formatRelativeTime(item.created_at)}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-lg font-bold text-slate-800 mb-2">
                  {item.title}
                </h2>

                {/* Description */}
                {item.description && (
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Read more button */}
                <button
                  onClick={() => setSelectedNews(item)}
                  className="text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors"
                >
                  Ler Mais →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Notícia</h2>
              <button
                onClick={() => setSelectedNews(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={24} className="text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Image */}
              {selectedNews.image_url && (
                <div className="mb-6 rounded-2xl overflow-hidden">
                  <img
                    src={selectedNews.image_url}
                    alt={selectedNews.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* Category */}
              {selectedNews.category_label && (
                <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">
                  {selectedNews.category_label}
                </span>
              )}

              {/* Title */}
              <h1 className="text-2xl font-bold text-slate-800 mb-3">
                {selectedNews.title}
              </h1>

              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <Calendar size={16} />
                {selectedNews.created_at && formatFullDate(selectedNews.created_at)}
              </div>

              {/* Description */}
              {selectedNews.description && (
                <p className="text-slate-600 font-medium mb-4">
                  {selectedNews.description}
                </p>
              )}

              {/* Content */}
              {selectedNews.content && (
                <div className="text-slate-700 whitespace-pre-wrap">
                  {selectedNews.content}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedNews(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
