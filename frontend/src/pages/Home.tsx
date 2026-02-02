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
        
        {/* Présentation de l'application */}
        <Card className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            🚀 Votre assistant de candidature automatique
          </h2>
          <p className="text-gray-700 mb-4">
            Smart Recruiter Agent vous aide à trouver et postuler automatiquement aux offres d'emploi en Europe qui correspondent à votre profil.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-3xl mb-2">📄</div>
              <h3 className="font-semibold text-gray-800 mb-1">Téléchargez votre CV</h3>
              <p className="text-sm text-gray-600">Importez votre CV et définissez vos critères de recherche</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-3xl mb-2">🌍</div>
              <h3 className="font-semibold text-gray-800 mb-1">Choisissez vos pays</h3>
              <p className="text-sm text-gray-600">Sélectionnez les pays et villes qui vous intéressent en Europe</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-3xl mb-2">✨</div>
              <h3 className="font-semibold text-gray-800 mb-1">Recevez des offres</h3>
              <p className="text-sm text-gray-600">Nous recherchons et candidatons automatiquement pour vous</p>
            </div>
          </div>
        </Card>

        {/* Actions principales */}
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
            📄 Mon CV
          </Button>
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => navigate('/preferences')}
          >
            🌍 Pays & Villes
          </Button>
        </div>
      </div>
    </div>
  );
};
