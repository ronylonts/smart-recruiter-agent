import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ApplicationModal } from '../components/ApplicationModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

interface Application {
  id: string;
  user_id: string;
  job_offer_id: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview';
  applied_at: string;
  response_received_at: string | null;
  job_offers: {
    title: string;
    company: string;
    city: string;
    country: string;
  };
}

type StatusFilter = 'all' | 'sent' | 'accepted' | 'rejected' | 'interview' | 'pending';

export const Applications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres et recherche
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadApplications();
      
      // 🔥 REALTIME SUBSCRIPTION - Mise à jour automatique
      const channel = supabase
        .channel(`applications:user_id=eq.${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'applications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔔 Realtime update:', payload.eventType, payload);

            if (payload.eventType === 'INSERT') {
              // Nouvelle candidature créée
              console.log('✅ Nouvelle candidature détectée, rechargement...');
              loadApplications(); // Recharger pour avoir les données complètes avec jointures
            } 
            else if (payload.eventType === 'UPDATE') {
              // Candidature mise à jour (status changé, lettre générée, etc.)
              console.log('🔄 Candidature mise à jour, rechargement...');
              loadApplications();
            } 
            else if (payload.eventType === 'DELETE') {
              // Candidature supprimée
              console.log('🗑️ Candidature supprimée');
              setApplications(prev => prev.filter(app => app.id !== payload.old.id));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime activé pour les applications');
          }
        });

      // Cleanup lors du démontage
      return () => {
        console.log('🔌 Déconnexion Realtime');
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    filterAndSortApplications();
  }, [applications, statusFilter, searchQuery]);

  const loadApplications = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job_offers (title, company, city, country)
        `)
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (err: any) {
      console.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortApplications = () => {
    let filtered = [...applications];

    // Filtrer par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Recherche par entreprise ou poste
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.job_offers?.company.toLowerCase().includes(query) ||
        app.job_offers?.title.toLowerCase().includes(query)
      );
    }

    setFilteredApplications(filtered);
    setCurrentPage(1); // Reset à la première page lors d'un filtre
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

  const handleOpenModal = (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedApplicationId(null);
    // Recharger les données pour refléter les changements
    loadApplications();
  };

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentApplications = filteredApplications.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Mes Candidatures 📋
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez et suivez toutes vos candidatures
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            ← Retour au Dashboard
          </Button>
        </div>

        <Card className="bg-white shadow-md">
          {/* Filtres et recherche */}
          <div className="mb-6 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par entreprise ou poste..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Filtres par statut */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 self-center mr-2">
                Filtrer par statut :
              </span>
              {[
                { value: 'all', label: 'Tous' },
                { value: 'sent', label: 'Envoyé' },
                { value: 'accepted', label: 'Accepté' },
                { value: 'rejected', label: 'Refusé' },
                { value: 'interview', label: 'Entretien' },
                { value: 'pending', label: 'En attente' }
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as StatusFilter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Compteur */}
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{filteredApplications.length}</span> candidature(s) trouvée(s)
            </div>
          </div>

          {/* Tableau */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl text-gray-600 mb-2">Aucune candidature trouvée</p>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : 'Commencez par envoyer des candidatures'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button variant="primary" onClick={() => navigate('/dashboard')}>
                  Aller au Dashboard
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entreprise
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Poste
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ville / Pays
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date d'envoi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentApplications.map((app, index) => (
                      <tr
                        key={app.id}
                        className={`transition-colors hover:bg-gray-50 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {app.job_offers?.company || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {app.job_offers?.title || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {app.job_offers?.city || 'N/A'} / {app.job_offers?.country || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(app.applied_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(
                              app.status
                            )}`}
                          >
                            {getStatusText(app.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleOpenModal(app.id)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Voir détails →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} sur {totalPages} ({startIndex + 1}-
                    {Math.min(endIndex, filteredApplications.length)} sur{' '}
                    {filteredApplications.length})
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      ← Précédent
                    </button>

                    {/* Numéros de pages */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => goToPage(pageNumber)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${
                            currentPage === pageNumber
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Suivant →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Modal de détails */}
      {selectedApplicationId && (
        <ApplicationModal
          applicationId={selectedApplicationId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
