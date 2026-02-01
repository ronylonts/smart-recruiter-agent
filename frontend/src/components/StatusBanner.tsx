import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export const StatusBanner = () => {
  const { user } = useAuth();
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStatus();
      
      // Écouter les changements en temps réel
      const channel = supabase
        .channel(`user-status:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔔 Mise à jour auto_send_enabled:', payload.new.auto_send_enabled);
            setAutoSendEnabled(payload.new.auto_send_enabled || false);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadStatus = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('auto_send_enabled')
        .eq('id', user.id)
        .single() as {
          data: { auto_send_enabled?: boolean } | null;
          error: any;
        };

      if (error) throw error;

      setAutoSendEnabled(data?.auto_send_enabled || false);
    } catch (err: any) {
      console.error('Error loading status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-20 rounded-lg mb-6"></div>
    );
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg p-6 mb-6
        ${autoSendEnabled 
          ? 'bg-gradient-to-r from-green-500 to-green-600' 
          : 'bg-gradient-to-r from-gray-500 to-gray-600'
        }
        shadow-lg transition-all duration-500
      `}
    >
      {/* Animation de fond */}
      {autoSendEnabled && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-white opacity-10 rounded-full -top-48 -right-48 animate-pulse"></div>
          <div className="absolute w-64 h-64 bg-white opacity-5 rounded-full -bottom-32 -left-32 animate-pulse delay-500"></div>
        </div>
      )}

      <div className="relative flex items-center justify-between">
        {/* Gauche : Icône + Texte */}
        <div className="flex items-center space-x-4">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${autoSendEnabled ? 'bg-white/20' : 'bg-white/10'}
          `}>
            {autoSendEnabled ? (
              <svg 
                className="w-8 h-8 text-white animate-pulse" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 10V3L4 14h7v7l9-11h-7z" 
                />
              </svg>
            ) : (
              <svg 
                className="w-8 h-8 text-white/70" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
                />
              </svg>
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {autoSendEnabled ? '🚀 Recherche Active' : '💤 En Veille'}
            </h3>
            <p className="text-white/90 text-sm">
              {autoSendEnabled 
                ? 'Le système envoie automatiquement vos candidatures' 
                : 'Activez l\'envoi automatique pour postuler sans intervention'
              }
            </p>
          </div>
        </div>

        {/* Droite : Badge de statut */}
        <div className={`
          px-6 py-3 rounded-full font-semibold text-sm
          ${autoSendEnabled 
            ? 'bg-white text-green-600' 
            : 'bg-white/20 text-white'
          }
          shadow-lg
        `}>
          {autoSendEnabled ? 'ACTIF' : 'INACTIF'}
        </div>
      </div>

      {/* Barre de progression (seulement si actif) */}
      {autoSendEnabled && (
        <div className="mt-4 relative">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full animate-pulse"
              style={{ width: '70%' }}
            ></div>
          </div>
          <p className="text-white/80 text-xs mt-2">
            ⚡ Prêt à envoyer vos prochaines candidatures automatiquement
          </p>
        </div>
      )}
    </div>
  );
};
