import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

interface Notification {
  id: string;
  user_id: string;
  application_id: string;
  message: string;
  sent_at: string;
  applications?: {
    id: string;
    status: string;
    job_offers: {
      title: string;
      company: string;
    };
  };
}

type NotificationType = 'all' | 'accepted' | 'rejected' | 'other';
type DateFilter = 'all' | 'today' | 'week' | 'month';

export const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [typeFilter, setTypeFilter] = useState<NotificationType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
    filterNotifications();
  }, [notifications, typeFilter, dateFilter]);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          applications (
            id,
            status,
            job_offers (title, company)
          )
        `)
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (err: any) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // Filtre par type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(notif => {
        const message = notif.message.toLowerCase();
        switch (typeFilter) {
          case 'accepted':
            return message.includes('accepté') || message.includes('accepted') || 
                   message.includes('retenu') || notif.applications?.status === 'accepted';
          case 'rejected':
            return message.includes('refusé') || message.includes('rejected') || 
                   message.includes('décliné') || notif.applications?.status === 'rejected';
          case 'other':
            return !message.includes('accepté') && !message.includes('accepted') &&
                   !message.includes('refusé') && !message.includes('rejected');
          default:
            return true;
        }
      });
    }

    // Filtre par date
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(notif => {
        const notifDate = new Date(notif.sent_at);
        switch (dateFilter) {
          case 'today':
            return notifDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return notifDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return notifDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredNotifications(filtered);
  };

  const getNotificationIcon = (notification: Notification) => {
    const message = notification.message.toLowerCase();
    const status = notification.applications?.status;

    if (message.includes('accepté') || message.includes('accepted') || 
        message.includes('retenu') || status === 'accepted') {
      return { icon: '✅', color: 'text-green-600 bg-green-100' };
    } else if (message.includes('refusé') || message.includes('rejected') || 
               message.includes('décliné') || status === 'rejected') {
      return { icon: '❌', color: 'text-red-600 bg-red-100' };
    } else if (message.includes('entretien') || message.includes('interview') || 
               status === 'interview') {
      return { icon: '📞', color: 'text-blue-600 bg-blue-100' };
    } else {
      return { icon: '📩', color: 'text-gray-600 bg-gray-100' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Il y a moins d'une minute
    if (diffInSeconds < 60) {
      return 'À l\'instant';
    }

    // Il y a moins d'une heure
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    // Il y a moins de 24h
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    }

    // Il y a moins de 7 jours
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }

    // Format complet
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              📬 Notifications
            </h1>
            <p className="text-gray-600 mt-1">
              Tous vos SMS et notifications de candidatures
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            ← Retour au Dashboard
          </Button>
        </div>

        <Card className="bg-white shadow-md mb-6">
          {/* Filtres */}
          <div className="mb-6 space-y-4">
            {/* Filtre par type */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Filtrer par type :
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Toutes', icon: '📬' },
                  { value: 'accepted', label: 'Acceptations', icon: '✅' },
                  { value: 'rejected', label: 'Refus', icon: '❌' },
                  { value: 'other', label: 'Autres', icon: '📩' }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setTypeFilter(filter.value as NotificationType)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      typeFilter === filter.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {filter.icon} {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtre par date */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Filtrer par période :
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Toutes' },
                  { value: 'today', label: 'Aujourd\'hui' },
                  { value: 'week', label: 'Cette semaine' },
                  { value: 'month', label: 'Ce mois' }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setDateFilter(filter.value as DateFilter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateFilter === filter.value
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compteur */}
            <div className="text-sm text-gray-600 pt-2 border-t border-gray-200">
              <span className="font-semibold">{filteredNotifications.length}</span> notification(s) trouvée(s)
            </div>
          </div>

          {/* Timeline des notifications */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl text-gray-600 mb-2">Aucune notification</p>
              <p className="text-gray-500 mb-6">
                {typeFilter !== 'all' || dateFilter !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : 'Vous recevrez des notifications lors de réponses à vos candidatures'}
              </p>
              {(typeFilter !== 'all' || dateFilter !== 'all') && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTypeFilter('all');
                    setDateFilter('all');
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Ligne verticale verte de la timeline */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-green-300"></div>

              {/* Liste des notifications */}
              <div className="space-y-6">
                {filteredNotifications.map((notification, index) => {
                  const { icon, color } = getNotificationIcon(notification);
                  
                  return (
                    <div key={notification.id} className="relative flex gap-4">
                      {/* Icône sur la timeline */}
                      <div className={`flex-shrink-0 w-16 h-16 rounded-full ${color} flex items-center justify-center text-2xl shadow-lg z-10 border-4 border-white`}>
                        {icon}
                      </div>

                      {/* Card de la notification */}
                      <div className="flex-1">
                        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
                          {/* Date relative */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500">
                              {formatDate(notification.sent_at)}
                            </span>
                            {notification.applications && (
                              <button
                                onClick={() => navigate(`/applications`)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Voir la candidature →
                              </button>
                            )}
                          </div>

                          {/* Message du SMS */}
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {notification.message}
                          </p>

                          {/* Infos de la candidature associée */}
                          {notification.applications && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Candidature :</span>{' '}
                                {notification.applications.job_offers?.title} chez{' '}
                                {notification.applications.job_offers?.company}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
