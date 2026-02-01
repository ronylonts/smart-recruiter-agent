import { useState, useEffect } from 'react';
import { Button } from './Button';
import { supabase } from '../services/supabase';

interface JobOffer {
  title: string;
  company: string;
  description: string | null;
  job_url: string | null;
  city: string;
  country: string;
}

interface Notification {
  id: string;
  message: string;
  sent_at: string;
}

interface Application {
  id: string;
  user_id: string;
  job_offer_id: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview';
  cover_letter: string | null;
  applied_at: string;
  response_received_at: string | null;
  job_offers: JobOffer;
}

interface ApplicationModalProps {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ApplicationModal = ({
  applicationId,
  isOpen,
  onClose
}: ApplicationModalProps) => {
  const [application, setApplication] = useState<Application | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen && applicationId) {
      loadApplicationDetails();
    }
  }, [isOpen, applicationId]);

  const loadApplicationDetails = async () => {
    setLoading(true);

    try {
      // Charger les détails de la candidature
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select(`
          *,
          job_offers (title, company, description, job_url, city, country)
        `)
        .eq('id', applicationId)
        .single() as { data: Application | null; error: any };

      if (appError) throw appError;

      setApplication(appData);
      setNewStatus(appData?.status || '');

      // Charger les notifications liées
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('application_id', applicationId)
        .order('sent_at', { ascending: false });

      if (notifError) throw notifError;

      setNotifications(notifData || []);
    } catch (err: any) {
      console.error('Error loading application details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!application || newStatus === application.status) return;

    setUpdating(true);

    try {
      const { error } = (await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId)) as { error: any };

      if (error) throw error;

      // Mettre à jour localement
      setApplication({ ...application, status: newStatus as any });
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'interview':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'sent':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'En attente',
      sent: 'Envoyé',
      accepted: 'Accepté',
      rejected: 'Refusé',
      interview: 'Entretien'
    };
    return statusMap[status] || status;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay sombre */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des détails...</p>
            </div>
          ) : !application ? (
            <div className="p-12 text-center">
              <p className="text-xl text-gray-600">Candidature introuvable</p>
            </div>
          ) : (
            <div className="p-8">
              {/* Header avec statut */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                      {application.job_offers.title}
                    </h2>
                    <p className="text-xl text-gray-600">
                      {application.job_offers.company}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      📍 {application.job_offers.city}, {application.job_offers.country}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(
                      application.status
                    )}`}
                  >
                    {getStatusText(application.status)}
                  </span>
                </div>
              </div>

              {/* Description de l'offre */}
              {application.job_offers.description && (
                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    📋 Description de l'offre
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {application.job_offers.description}
                  </p>
                </div>
              )}

              {/* Lettre de motivation */}
              {application.cover_letter && (
                <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                    <svg className="h-5 w-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Lettre de motivation (générée par IA)
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {application.cover_letter}
                  </p>
                </div>
              )}

              {/* Historique */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="h-5 w-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historique
                </h3>

                <div className="space-y-3">
                  {/* Date d'envoi */}
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-32 text-sm font-medium text-gray-600">
                      Date d'envoi :
                    </div>
                    <div className="text-sm text-gray-800">
                      {new Date(application.applied_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Date de réponse */}
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-32 text-sm font-medium text-gray-600">
                      Date de réponse :
                    </div>
                    <div className="text-sm text-gray-800">
                      {application.response_received_at ? (
                        new Date(application.response_received_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        <span className="text-gray-500 italic">Aucune réponse reçue</span>
                      )}
                    </div>
                  </div>

                  {/* Notifications SMS */}
                  {notifications.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <div className="text-sm font-medium text-gray-600 mb-2">
                        📱 Notifications SMS reçues :
                      </div>
                      <div className="space-y-2">
                        {notifications.map((notif) => (
                          <div key={notif.id} className="bg-white p-3 rounded border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">
                              {new Date(notif.sent_at).toLocaleString('fr-FR')}
                            </div>
                            <div className="text-sm text-gray-800">{notif.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mettre à jour le statut */}
              <div className="mb-6 bg-white p-4 rounded-lg border border-gray-300">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  🔄 Mettre à jour le statut
                </h3>
                <div className="flex items-center gap-4">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">En attente</option>
                    <option value="sent">Envoyé</option>
                    <option value="accepted">Accepté</option>
                    <option value="rejected">Refusé</option>
                    <option value="interview">Entretien</option>
                  </select>
                  <Button
                    variant="primary"
                    onClick={handleUpdateStatus}
                    disabled={updating || newStatus === application.status}
                  >
                    {updating ? 'Mise à jour...' : 'Mettre à jour'}
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 border-t border-gray-200 pt-6">
                <Button variant="secondary" onClick={onClose} className="flex-1">
                  Fermer
                </Button>
                {application.job_offers.job_url && (
                  <Button
                    variant="primary"
                    onClick={() => window.open(application.job_offers.job_url!, '_blank')}
                    className="flex-1"
                  >
                    🔗 Voir l'offre originale
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
