import { useState, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useFormValidation } from '../hooks/useFormValidation';
import { uploadCV } from '../services/cv.service';
import { useAuth } from '../hooks/useAuth';

interface CVFormData {
  experienceYears: number;
  skills: string;
  education: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB en bytes

export const UploadCV = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, errors } = useFormValidation<CVFormData>();

  // Gérer la sélection du fichier
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];

    if (!file) return;

    // Vérifier le type de fichier
    if (file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Vérifier la taille du fichier
    if (file.size > MAX_FILE_SIZE) {
      setError('Le fichier ne doit pas dépasser 5MB');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  // Soumettre le formulaire
  const onSubmit = async (data: CVFormData) => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    if (!user) {
      setError('Vous devez être connecté');
      return;
    }

    setError('');
    setUploading(true);

    // Transformer les compétences en tableau
    const skillsArray = data.skills
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    // Utilisation du service cv
    const result = await uploadCV(user.id, selectedFile, {
      skills: skillsArray,
      experienceYears: Number(data.experienceYears),
      education: data.education,
    });

    setUploading(false);

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
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-center text-gray-800">
              Télécharger mon CV
            </h2>
            <p className="text-center text-gray-600 mt-2">
              Ajoutez votre CV et vos compétences à votre profil
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
              <p className="text-sm">Votre CV a été enregistré. Redirection...</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Upload de fichier */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fichier CV (PDF uniquement, max 5MB) <span className="text-red-500">*</span>
              </label>
              
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Télécharger un fichier</span>
                      <input
                        ref={fileInputRef}
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={handleFileChange}
                        required
                      />
                    </label>
                    <p className="pl-1">ou glisser-déposer</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF jusqu'à 5MB</p>
                </div>
              </div>

              {/* Prévisualisation du fichier sélectionné */}
              {selectedFile && (
                <div className="mt-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="flex items-center">
                    <svg className="h-6 w-6 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-600 hover:text-red-800 transition"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Années d'expérience */}
            <div>
              <label htmlFor="experienceYears" className="block text-sm font-semibold text-gray-700 mb-2">
                Années d'expérience <span className="text-red-500">*</span>
              </label>
              <input
                {...register('experienceYears', {
                  required: 'Nombre d\'années requis',
                  min: {
                    value: 0,
                    message: 'Le nombre doit être positif',
                  },
                  max: {
                    value: 50,
                    message: 'Maximum 50 ans',
                  },
                })}
                type="number"
                id="experienceYears"
                min="0"
                max="50"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="5"
              />
              {errors.experienceYears && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.experienceYears.message}
                </p>
              )}
            </div>

            {/* Compétences principales */}
            <div>
              <label htmlFor="skills" className="block text-sm font-semibold text-gray-700 mb-2">
                Compétences principales <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('skills', {
                  required: 'Compétences requises',
                  minLength: {
                    value: 3,
                    message: 'Au moins 3 caractères',
                  },
                })}
                id="skills"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                placeholder="React, TypeScript, Node.js, PostgreSQL, Docker"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Séparez les compétences par des virgules
              </p>
              {errors.skills && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.skills.message}
                </p>
              )}
            </div>

            {/* Formation/Diplôme */}
            <div>
              <label htmlFor="education" className="block text-sm font-semibold text-gray-700 mb-2">
                Formation / Diplôme <span className="text-red-500">*</span>
              </label>
              <input
                {...register('education', {
                  required: 'Formation requise',
                  minLength: {
                    value: 3,
                    message: 'Au moins 3 caractères',
                  },
                })}
                type="text"
                id="education"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Master en Informatique, Ingénieur, Licence..."
              />
              {errors.education && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.education.message}
                </p>
              )}
            </div>

            {/* Bouton d'envoi */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full text-lg py-3 bg-green-600 hover:bg-green-700"
                isLoading={uploading}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Upload en cours...
                  </span>
                ) : (
                  'Enregistrer mon CV'
                )}
              </Button>
            </div>

            {/* Lien retour */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-800 text-sm transition"
              >
                ← Retour au dashboard
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
