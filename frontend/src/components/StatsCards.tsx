import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Card } from './Card';

interface Stats {
  totalApplications: number;
  positiveResponses: number;
  responseRate: number;
}

interface StatsCardsProps {
  userId: string;
}

export const StatsCards = ({ userId }: StatsCardsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalApplications: 0,
    positiveResponses: 0,
    responseRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  const loadStats = async () => {
    setLoading(true);

    try {
      // Récupérer toutes les candidatures de l'utilisateur
      const { data: applications, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (applications) {
        // Calculer les statistiques
        const total = applications.length;
        const positive = applications.filter(
          app => app.status === 'accepted' || app.status === 'interview'
        ).length;
        const rate = total > 0 ? Math.round((positive / total) * 100) : 0;

        setStats({
          totalApplications: total,
          positiveResponses: positive,
          responseRate: rate
        });
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white shadow-md">
            <div className="animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-12 bg-gray-200 rounded w-24"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1 : Candidatures envoyées */}
      <Card className="bg-gradient-to-br from-blue-50 to-white shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">
              Candidatures envoyées
            </p>
            <p className="text-5xl font-bold text-blue-600 mb-1">
              {stats.totalApplications}
            </p>
            <p className="text-xs text-gray-400">
              Total des candidatures
            </p>
          </div>
          <div className="text-4xl">
            📤
          </div>
        </div>
      </Card>

      {/* Card 2 : Réponses positives */}
      <Card className="bg-gradient-to-br from-green-50 to-white shadow-md hover:shadow-lg transition-all duration-300 border border-green-100">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">
              Réponses positives
            </p>
            <p className="text-5xl font-bold text-green-600 mb-1">
              {stats.positiveResponses}
            </p>
            <p className="text-xs text-gray-400">
              Acceptées ou entretiens
            </p>
          </div>
          <div className="text-4xl">
            ✅
          </div>
        </div>
      </Card>

      {/* Card 3 : Taux de réponse */}
      <Card className="bg-gradient-to-br from-purple-50 to-white shadow-md hover:shadow-lg transition-all duration-300 border border-purple-100">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">
              Taux de réponse
            </p>
            <p className="text-5xl font-bold text-purple-600 mb-1">
              {stats.responseRate}%
            </p>
            <p className="text-xs text-gray-400">
              Ratio de succès
            </p>
          </div>
          <div className="text-4xl">
            📊
          </div>
        </div>
      </Card>
    </div>
  );
};
