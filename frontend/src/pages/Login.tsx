import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useFormValidation } from '../hooks/useFormValidation';
import { useAuth } from '../hooks/useAuth';

interface LoginFormData {
  email: string;
  password: string;
}

// Page de connexion
export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const { register, handleSubmit, errors, isSubmitting } = useFormValidation<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    const { error } = await login(data.email, data.password);
    
    if (error) {
      setError(error.message || 'Erreur de connexion');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-center text-gray-800">Connexion</h2>
          <p className="text-center text-gray-600 mt-2">
            Bienvenue sur Smart Recruiter Agent
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Erreur</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              {...register('email', { 
                required: 'Email requis',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email invalide'
                }
              })}
              type="email"
              id="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="votre@email.com"
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              {...register('password', { 
                required: 'Mot de passe requis',
                minLength: {
                  value: 6,
                  message: 'Le mot de passe doit contenir au moins 6 caractères'
                }
              })}
              type="password"
              id="password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full text-lg py-3"
              isLoading={isSubmitting}
            >
              Se connecter
            </Button>
          </div>

          {/* Lien vers l'inscription */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-gray-600">
              Vous n'avez pas encore de compte ?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold transition">
                Créer un compte
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
};
