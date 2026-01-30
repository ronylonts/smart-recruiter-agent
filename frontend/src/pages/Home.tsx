import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';

// Page d'accueil
export const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header avec déconnexion */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            Bienvenue sur Smart Recruiter Agent
          </h1>
          <Button variant="secondary" onClick={handleLogout}>
            Déconnexion
          </Button>
        </div>

        {/* Info utilisateur */}
        {user && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Connecté en tant que</p>
                <p className="text-lg font-semibold text-gray-800">{user.email}</p>
              </div>
            </div>
          </Card>
        )}
        
        <Card className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Projet React + TypeScript + Vite</h2>
          <p className="text-gray-600 mb-4">
            Cette application est configurée avec :
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>React 19 avec TypeScript</li>
            <li>Vite pour un build ultra-rapide</li>
            <li>React Router DOM pour la navigation</li>
            <li>Tailwind CSS pour le styling</li>
            <li>Supabase pour l'authentification et la base de données</li>
            <li>Axios pour les appels API</li>
            <li>React Hook Form pour la gestion des formulaires</li>
          </ul>
        </Card>

        <Card>
          <h3 className="text-xl font-semibold mb-4">Structure du projet</h3>
          <div className="space-y-2 text-gray-700">
            <div><code className="bg-gray-100 px-2 py-1 rounded">src/components</code> - Composants UI réutilisables</div>
            <div><code className="bg-gray-100 px-2 py-1 rounded">src/services</code> - Services API et Supabase</div>
            <div><code className="bg-gray-100 px-2 py-1 rounded">src/hooks</code> - Hooks personnalisés</div>
            <div><code className="bg-gray-100 px-2 py-1 rounded">src/types</code> - Définitions TypeScript</div>
            <div><code className="bg-gray-100 px-2 py-1 rounded">src/pages</code> - Pages de l'application</div>
          </div>
        </Card>

        <div className="flex gap-4 justify-center mt-8 flex-wrap">
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => navigate('/dashboard')}
          >
            📊 Mon Dashboard
          </Button>
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => navigate('/upload-cv')}
          >
            📄 Télécharger mon CV
          </Button>
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => window.open('https://github.com', '_blank')}
          >
            📚 Documentation
          </Button>
        </div>
      </div>
    </div>
  );
};
