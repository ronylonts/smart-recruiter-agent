import { useState, useEffect } from 'react';
import { Button } from './Button';
import { supabase } from '../services/supabase';

interface CoverLetterEditorProps {
  applicationId: string;
  initialLetter: string;
  isManuallyEdited: boolean;
  onSave: (editedLetter: string) => void;
  onCancel: () => void;
}

/**
 * Composant pour éditer une lettre de motivation générée par l'IA
 * Permet à l'utilisateur de modifier avant envoi
 */
export const CoverLetterEditor = ({
  applicationId,
  initialLetter,
  isManuallyEdited,
  onSave,
  onCancel
}: CoverLetterEditorProps) => {
  const [editedLetter, setEditedLetter] = useState(initialLetter);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    const words = editedLetter.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = editedLetter.length;
    setWordCount(words);
    setCharCount(chars);
    setHasChanges(editedLetter !== initialLetter);
  }, [editedLetter, initialLetter]);

  const handleSave = async () => {
    if (!hasChanges) {
      onCancel();
      return;
    }

    setSaving(true);

    try {
      // @ts-ignore - Supabase type inference issue
      const { error } = (await supabase
        .from('applications')
        .update({
          cover_letter_edited: editedLetter,
          is_manually_edited: true
        })
        .eq('id', applicationId)) as { error: any };

      if (error) throw error;

      onSave(editedLetter);
    } catch (err: any) {
      console.error('Error saving edited letter:', err);
      alert('Erreur lors de la sauvegarde de la lettre modifiée');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser la lettre à la version IA ?')) {
      setEditedLetter(initialLetter);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                ✏️ Éditer la lettre de motivation
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {isManuallyEdited ? (
                  <span className="text-orange-600">⚠️ Cette lettre a déjà été modifiée manuellement</span>
                ) : (
                  <span>Modifiez la lettre générée par l'IA avant envoi</span>
                )}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between text-sm">
            <div className="flex gap-4 text-gray-600">
              <span className={wordCount < 150 ? 'text-orange-500' : wordCount > 250 ? 'text-red-500' : 'text-green-600'}>
                📝 {wordCount} mots {wordCount < 150 && '(trop court)'} {wordCount > 250 && '(trop long)'}
              </span>
              <span className="text-gray-500">
                | {charCount} caractères
              </span>
            </div>
            {hasChanges && (
              <span className="text-blue-600 font-medium">
                ✏️ Modifications non sauvegardées
              </span>
            )}
          </div>

          <textarea
            value={editedLetter}
            onChange={(e) => setEditedLetter(e.target.value)}
            className="w-full h-[400px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans text-base leading-relaxed"
            placeholder="Écrivez votre lettre de motivation ici..."
          />

          {/* Tips */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Conseils</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Longueur recommandée : 150-250 mots</li>
              <li>• Mettez en avant 2-3 compétences clés en lien avec le poste</li>
              <li>• Personnalisez en mentionnant l'entreprise et le poste</li>
              <li>• Évitez les formules trop formelles</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
              className="flex-1"
              disabled={!hasChanges}
            >
              🔄 Réinitialiser
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              className="flex-1"
              isLoading={saving}
              disabled={!hasChanges || wordCount < 50}
            >
              💾 Sauvegarder les modifications
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
