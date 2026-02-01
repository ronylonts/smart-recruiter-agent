import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Application {
  id: string;
  user_id: string;
  cv_id: string;
  job_offer_id: string;
  status: 'draft' | 'processing' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview' | 'failed';
  cover_letter: string;
  applied_at: string;
  response_received_at: string | null;
  error_message: string | null;
  retry_count: number;
}

/**
 * Hook personnalisé pour les mises à jour en temps réel des candidatures
 * Utilise Supabase Realtime Subscriptions
 * 
 * @param userId - ID de l'utilisateur
 * @returns Applications + loading state + refresh function
 */
export const useRealtimeApplications = (userId: string | undefined) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  // Fonction pour charger les applications initiales
  const loadApplications = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job_offers (
            id,
            title,
            company,
            city,
            country
          )
        `)
        .eq('user_id', userId)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Setup Realtime subscription
  useEffect(() => {
    if (!userId) return;

    // Charger les données initiales
    loadApplications();

    // Créer le canal Realtime
    const channel = supabase
      .channel(`applications:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Realtime update:', payload);

          if (payload.eventType === 'INSERT') {
            // Nouvelle candidature
            const newApp = payload.new as Application;
            setApplications(prev => [newApp, ...prev]);
            
            // Notification toast (optionnel)
            console.log('✅ Nouvelle candidature créée:', newApp.id);
          } 
          else if (payload.eventType === 'UPDATE') {
            // Candidature mise à jour
            const updatedApp = payload.new as Application;
            setApplications(prev =>
              prev.map(app =>
                app.id === updatedApp.id ? updatedApp : app
              )
            );
            
            // Notification si changement de statut
            if (payload.old?.status !== updatedApp.status) {
              console.log(`🔄 Statut changé: ${payload.old?.status} → ${updatedApp.status}`);
            }
          } 
          else if (payload.eventType === 'DELETE') {
            // Candidature supprimée
            const deletedId = payload.old.id;
            setApplications(prev =>
              prev.filter(app => app.id !== deletedId)
            );
            console.log('🗑️ Candidature supprimée:', deletedId);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    setRealtimeChannel(channel);

    // Cleanup
    return () => {
      console.log('🔌 Unsubscribing from Realtime');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    applications,
    loading,
    refresh: loadApplications,
    isConnected: realtimeChannel?.state === 'subscribed'
  };
};
