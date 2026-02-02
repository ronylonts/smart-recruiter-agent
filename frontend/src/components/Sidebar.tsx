import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  action?: () => void;
}

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      path: '/dashboard'
    },
    {
      id: 'cv',
      label: 'Mon CV',
      icon: '📄',
      path: '/upload-cv'
    },
    {
      id: 'preferences',
      label: 'Pays & Villes',
      icon: '🌍',
      path: '/preferences'
    },
    {
      id: 'applications',
      label: 'Candidatures',
      icon: '📨',
      path: '/applications'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: '🔔',
      path: '/notifications'
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: '⚙️',
      path: '/settings'
    }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavigation = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* Sidebar Desktop - Fixe à gauche */}
      <aside className="hidden md:flex md:flex-col fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white shadow-2xl z-30">
        {/* Logo / Header */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-green-400">
            Smart Recruiter
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Votre assistant candidatures
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-6 overflow-y-auto">
          <ul className="space-y-2 px-3">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-green-600 text-white shadow-lg scale-105'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bouton Déconnexion */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
          >
            <span className="text-2xl">🚪</span>
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Bottom Navigation Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-2xl z-30 border-t border-gray-800">
        <ul className="flex justify-around items-center h-16">
          {menuItems.slice(0, 4).map((item) => (
            <li key={item.id} className="flex-1">
              <button
                onClick={() => handleNavigation(item)}
                className={`w-full h-16 flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 active:bg-gray-800'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </li>
          ))}
          
          {/* Menu Plus pour mobile */}
          <li className="flex-1 relative group">
            <button
              className="w-full h-16 flex flex-col items-center justify-center gap-1 text-gray-400 active:bg-gray-800"
            >
              <span className="text-xl">⋮</span>
              <span className="text-xs font-medium">Plus</span>
            </button>
            
            {/* Dropdown menu */}
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 rounded-lg shadow-xl opacity-0 invisible group-active:opacity-100 group-active:visible transition-all duration-200">
              <ul className="py-2">
                <li>
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-gray-700"
                  >
                    <span className="text-xl">⚙️</span>
                    <span>Paramètres</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-red-600"
                  >
                    <span className="text-xl">🚪</span>
                    <span>Déconnexion</span>
                  </button>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </nav>

      {/* Spacer pour le contenu principal */}
      {/* Desktop: marge à gauche de 256px (w-64) */}
      <div className="hidden md:block w-64 flex-shrink-0"></div>
      {/* Mobile: marge en bas de 64px (h-16) */}
      <div className="md:hidden h-16"></div>
    </>
  );
};
