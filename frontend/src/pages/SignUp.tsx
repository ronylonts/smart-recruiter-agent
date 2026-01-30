import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useFormValidation } from '../hooks/useFormValidation';
import { signUp } from '../services/auth.service';

interface SignUpFormData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  profession: string;
  city: string;
  country: string;
}

const PROFESSIONS = [
  'Développeur',
  'Designer',
  'Marketing',
  'RH',
  'Comptable',
  'Autre',
];

const COUNTRIES = [
  'France',
  'Belgique',
  'Suisse',
  'Canada',
  'Autre',
];

export const SignUp = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, errors, isSubmitting } = useFormValidation<SignUpFormData>();

  const onSubmit = async (data: SignUpFormData) => {
    setError('');
    setSuccess(false);

    // Utilisation du service auth amélioré
    const result = await signUp(data.email, data.password, {
      fullName: data.fullName,
      phone: data.phone,
      profession: data.profession,
      city: data.city,
      country: data.country,
    });

    if (!result.success) {
      setError(result.error || 'Une erreur est survenue');
      return;
    }

    // Succès !
    setSuccess(true);
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-center text-gray-800">
            Créer un compte
          </h2>
          <p className="text-center text-gray-600 mt-2">
            Rejoignez Smart Recruiter Agent
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Erreur</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Succès !</p>
            <p className="text-sm">Votre compte a été créé. Redirection...</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email', {
                required: 'Email requis',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email invalide',
                },
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

          {/* Mot de passe */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              {...register('password', {
                required: 'Mot de passe requis',
                minLength: {
                  value: 8,
                  message: 'Le mot de passe doit contenir au moins 8 caractères',
                },
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

          {/* Nom complet */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              {...register('fullName', {
                required: 'Nom complet requis',
                minLength: {
                  value: 2,
                  message: 'Le nom doit contenir au moins 2 caractères',
                },
              })}
              type="text"
              id="fullName"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Jean Dupont"
            />
            {errors.fullName && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Grille pour Téléphone et Profession */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Téléphone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                {...register('phone', {
                  pattern: {
                    value: /^(\+33|0)[1-9](\d{2}){4}$/,
                    message: 'Format invalide (ex: +33612345678)',
                  },
                })}
                type="tel"
                id="phone"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="+33612345678"
              />
              {errors.phone && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Profession */}
            <div>
              <label htmlFor="profession" className="block text-sm font-semibold text-gray-700 mb-2">
                Profession
              </label>
              <select
                {...register('profession')}
                id="profession"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
              >
                <option value="">Sélectionnez...</option>
                {PROFESSIONS.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
              {errors.profession && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.profession.message}
                </p>
              )}
            </div>
          </div>

          {/* Grille pour Ville et Pays */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Ville */}
            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                Ville <span className="text-red-500">*</span>
              </label>
              <input
                {...register('city', {
                  required: 'Ville requise',
                  minLength: {
                    value: 2,
                    message: 'Le nom de la ville doit contenir au moins 2 caractères',
                  },
                })}
                type="text"
                id="city"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Paris"
              />
              {errors.city && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.city.message}
                </p>
              )}
            </div>

            {/* Pays */}
            <div>
              <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
                Pays <span className="text-red-500">*</span>
              </label>
              <select
                {...register('country', {
                  required: 'Pays requis',
                })}
                id="country"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
              >
                <option value="">Sélectionnez...</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.country.message}
                </p>
              )}
            </div>
          </div>

          {/* Bouton d'inscription */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              className="w-full text-lg py-3"
              isLoading={isSubmitting}
            >
              S'inscrire
            </Button>
          </div>

          {/* Lien vers la connexion */}
          <div className="text-center pt-4">
            <p className="text-gray-600">
              Vous avez déjà un compte ?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition">
                Se connecter
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
};
