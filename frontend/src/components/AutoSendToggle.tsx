import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

interface AutoSendToggleProps {
  className?: string;
}

export const AutoSendToggle = ({ className = '' }: AutoSendToggleProps) => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadAutoSendStatus();
    }
  }, [user]);

  const loadAutoSendStatus = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('auto_send_enabled')
        .eq('id', user.id)
        .single() as { data: { auto_send_enabled?: boolean } | null; error: any };

      if (error) throw error;

      setEnabled(data?.auto_send_enabled || false);
    } catch (err: any) {
      console.error('Error loading auto send status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!user || updating) return;

    setUpdating(true);

    const newStatus = !enabled;

    try {
      // @ts-ignore - Supabase type inference issue
      const { error } = (await supabase
        .from('users')
        .update({ auto_send_enabled: newStatus })
        .eq('id', user.id)) as { error: any };

      if (error) throw error;

      setEnabled(newStatus);
      
      // Afficher le toast de confirmation
      setToastMessage(
        newStatus 
          ? '✅ Envoi automatique activé' 
          : '⏸️ Envoi automatique désactivé'
      );
      setShowToast(true);

      // Masquer le toast après 3 secondes
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating auto send status:', err);
      setToastMessage('❌ Erreur lors de la mise à jour');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <div>
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="h-8 w-16 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center justify-between ${className}`}>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            Envoi automatique de candidatures
          </h3>
          <p className="text-sm text-gray-600">
            {enabled 
              ? '✅ Activé - Vos candidatures seront envoyées automatiquement'
              : '⏸️ Désactivé - Aucune candidature ne sera envoyée automatiquement'
            }
          </p>
        </div>

        {/* Switch style iOS */}
        <button
          onClick={handleToggle}
          disabled={updating}
          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            enabled 
              ? 'bg-green-600 focus:ring-green-500' 
              : 'bg-gray-300 focus:ring-gray-400'
          } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
          aria-label={enabled ? 'Désactiver l\'envoi automatique' : 'Activer l\'envoi automatique'}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${
              enabled ? 'translate-x-9' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Message détaillé quand activé */}
      {enabled && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                L'envoi automatique est activé
              </p>
              <p className="text-sm text-green-700 mt-1">
                Le système recherchera automatiquement des offres d'emploi correspondant à votre profil et enverra des candidatures en votre nom. Vous recevrez une notification pour chaque candidature envoyée.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast de confirmation */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`px-6 py-4 rounded-lg shadow-2xl border-2 ${
            toastMessage.includes('Erreur')
              ? 'bg-red-50 border-red-300 text-red-800'
              : enabled
              ? 'bg-green-50 border-green-300 text-green-800'
              : 'bg-gray-50 border-gray-300 text-gray-800'
          }`}>
            <div className="flex items-center">
              <span className="text-2xl mr-3">
                {toastMessage.includes('Erreur') 
                  ? '❌' 
                  : enabled 
                  ? '✅' 
                  : '⏸️'
                }
              </span>
              <span className="font-medium">{toastMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Styles pour l'animation du toast */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};
