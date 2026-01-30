import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatsCards } from '../components/StatsCards';
import { AutoSendToggle } from '../components/AutoSendToggle';
import { StatusBanner } from '../components/StatusBanner';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

interface Application {
  id: string;
  job_offer_id: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview';
  applied_at: string;
  response_received_at: string | null;
  job_offers: {
    title: string;
    company: string;
  };
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadApplications();
    }
  }, [user]);

  const loadApplications = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Récupérer les candidatures avec les infos des offres d'emploi
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job_offers (title, company)
        `)
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setApplications(data || []);
    } catch (err: any) {
      console.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'rejected':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'interview':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'sent':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
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

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Bonjour {user?.email?.split('@')[0] || 'Utilisateur'} 👋
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez vos candidatures et suivez vos progrès
            </p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Déconnexion
          </Button>
        </div>

        {/* Bannière de statut */}
        <StatusBanner />

        {/* Statistiques - 3 cards horizontales */}
        <div className="mb-8">
          {user && <StatsCards userId={user.id} />}
        </div>

        {/* Toggle envoi automatique */}
        <Card className="bg-white shadow-md mb-8">
          <AutoSendToggle />
        </Card>

        {/* Tableau des candidatures récentes */}
        <Card className="bg-white shadow-md">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Candidatures récentes
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Les 5 dernières candidatures envoyées
              </p>
            </div>
            <Button variant="primary" onClick={() => navigate('/applications')}>
              📋 Voir toutes les candidatures
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-xl text-gray-600 mb-2">Aucune candidature</p>
              <p className="text-gray-500 mb-6">
                Commencez par télécharger votre CV et postuler à des offres
              </p>
              <Button variant="primary" onClick={() => navigate('/upload-cv')}>
                Télécharger mon CV
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entreprise
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Poste
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {app.job_offers?.company || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {app.job_offers?.title || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(app.applied_at).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(app.status)}`}>
                          {getStatusText(app.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-between items-center border-t border-gray-200 pt-4">
            <Button variant="secondary" onClick={() => navigate('/')}>
              ← Retour à l'accueil
            </Button>
            <Button variant="primary" onClick={() => navigate('/upload-cv')}>
              📄 Gérer mes CVs
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
