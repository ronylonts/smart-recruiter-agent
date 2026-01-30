# Service de Gestion des CVs

Documentation du service `cv.service.ts` pour gérer les CVs des utilisateurs.

## 🎯 Fonctionnalités

Le service CV gère :
- ✅ Upload de CV (fichier + métadonnées)
- ✅ Récupération des CVs d'un utilisateur
- ✅ Récupération d'un CV spécifique
- ✅ Mise à jour des métadonnées
- ✅ Suppression de CV (storage + DB)
- ✅ Téléchargement sécurisé avec URL signée
- ✅ Gestion des erreurs avec messages clairs

## 📦 Import

```typescript
import {
  uploadCV,
  getUserCV,
  getCVById,
  updateCV,
  deleteCV,
  downloadCV,
  type CVMetadata,
  type CVServiceResponse
} from '../services/cv.service';
```

## 🔧 Fonctions disponibles

### 1. uploadCV()

Upload un CV avec ses métadonnées dans Supabase Storage et la base de données.

```typescript
const result = await uploadCV(userId, file, metadata);

// Paramètres
userId: string
file: File (PDF uniquement)
metadata: CVMetadata {
  skills: string[];
  experienceYears: number;
  education: string;
}

// Retour
CVServiceResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any; // Données du CV créé
}
```

**Exemple :**

```typescript
const handleUpload = async (file: File, formData: any) => {
  const skills = formData.skills
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  const result = await uploadCV(user.id, file, {
    skills,
    experienceYears: Number(formData.experience),
    education: formData.education
  });

  if (result.success) {
    console.log('CV uploadé !', result.data);
    navigate('/dashboard');
  } else {
    setError(result.error);
  }
};
```

**Validations automatiques :**
- Type de fichier : PDF uniquement
- Taille : Maximum 5MB
- Nettoyage automatique si erreur DB

### 2. getUserCV()

Récupère tous les CVs d'un utilisateur (triés par date, plus récent en premier).

```typescript
const result = await getUserCV(userId);

// Paramètres
userId: string

// Retour
CVServiceResponse avec data: CV[]
```

**Exemple :**

```typescript
useEffect(() => {
  const loadUserCVs = async () => {
    const result = await getUserCV(user.id);
    
    if (result.success) {
      setCVList(result.data);
      setHasCV(result.data.length > 0);
    } else {
      console.error(result.error);
    }
  };
  
  loadUserCVs();
}, [user.id]);
```

### 3. getCVById()

Récupère un CV spécifique par son ID.

```typescript
const result = await getCVById(cvId);

// Paramètres
cvId: string

// Retour
CVServiceResponse avec data: CV
```

**Exemple :**

```typescript
const loadCV = async (cvId: string) => {
  const result = await getCVById(cvId);
  
  if (result.success) {
    setCV(result.data);
    setSkills(result.data.skills.join(', '));
    setExperience(result.data.experience_years);
    setEducation(result.data.education);
  } else {
    setError(result.error);
  }
};
```

### 4. updateCV()

Met à jour les métadonnées d'un CV (ne modifie pas le fichier PDF).

```typescript
const result = await updateCV(cvId, metadata);

// Paramètres
cvId: string
metadata: Partial<CVMetadata> {
  skills?: string[];
  experienceYears?: number;
  education?: string;
}

// Retour
CVServiceResponse avec data: CV mis à jour
```

**Exemple :**

```typescript
const handleUpdate = async (cvId: string, formData: any) => {
  const updates: Partial<CVMetadata> = {};
  
  if (formData.skills) {
    updates.skills = formData.skills.split(',').map((s: string) => s.trim());
  }
  
  if (formData.experience !== undefined) {
    updates.experienceYears = Number(formData.experience);
  }
  
  if (formData.education) {
    updates.education = formData.education;
  }

  const result = await updateCV(cvId, updates);
  
  if (result.success) {
    console.log('CV mis à jour !');
    setSuccess(true);
  } else {
    setError(result.error);
  }
};
```

### 5. deleteCV()

Supprime un CV (fichier du storage + entrée DB).

```typescript
const result = await deleteCV(cvId);

// Paramètres
cvId: string

// Retour
CVServiceResponse
```

**Exemple :**

```typescript
const handleDelete = async (cvId: string) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce CV ?')) {
    return;
  }

  setDeleting(true);
  
  const result = await deleteCV(cvId);
  
  setDeleting(false);
  
  if (result.success) {
    console.log('CV supprimé !');
    // Recharger la liste
    loadUserCVs();
  } else {
    setError(result.error);
  }
};
```

**Note :** La suppression du fichier storage continue même en cas d'erreur DB pour éviter les fichiers orphelins.

### 6. downloadCV()

Génère une URL signée temporaire (valide 60 secondes) pour télécharger un CV de manière sécurisée.

```typescript
const result = await downloadCV(cvId);

// Paramètres
cvId: string

// Retour
CVServiceResponse avec data: {
  signedUrl: string;
  expiresIn: number; // secondes
}
```

**Exemple :**

```typescript
const handleDownload = async (cvId: string) => {
  const result = await downloadCV(cvId);
  
  if (result.success) {
    // Ouvrir le PDF dans un nouvel onglet
    window.open(result.data.signedUrl, '_blank');
    
    // Ou télécharger directement
    const link = document.createElement('a');
    link.href = result.data.signedUrl;
    link.download = 'mon-cv.pdf';
    link.click();
  } else {
    setError(result.error);
  }
};
```

## 🎨 Utilisation dans un composant React

### Exemple complet : Liste de CVs avec actions

```typescript
import { useState, useEffect } from 'react';
import { getUserCV, deleteCV, downloadCV } from '../services/cv.service';
import { useAuth } from '../hooks/useAuth';

const CVList = () => {
  const { user } = useAuth();
  const [cvs, setCVs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCVs();
  }, []);

  const loadCVs = async () => {
    setLoading(true);
    const result = await getUserCV(user.id);
    
    if (result.success) {
      setCVs(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleDelete = async (cvId: string) => {
    if (!confirm('Supprimer ce CV ?')) return;
    
    const result = await deleteCV(cvId);
    
    if (result.success) {
      loadCVs(); // Recharger la liste
    } else {
      alert(result.error);
    }
  };

  const handleDownload = async (cvId: string) => {
    const result = await downloadCV(cvId);
    
    if (result.success) {
      window.open(result.data.signedUrl, '_blank');
    } else {
      alert(result.error);
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      <h2>Mes CVs ({cvs.length})</h2>
      {cvs.map((cv) => (
        <div key={cv.id} className="cv-card">
          <h3>{cv.education}</h3>
          <p>{cv.experience_years} ans d'expérience</p>
          <p>Compétences: {cv.skills.join(', ')}</p>
          
          <button onClick={() => handleDownload(cv.id)}>
            Télécharger
          </button>
          <button onClick={() => handleDelete(cv.id)}>
            Supprimer
          </button>
        </div>
      ))}
    </div>
  );
};
```

## 📋 Structure de données

### CV (Table `cvs`)

```typescript
{
  id: string;                    // UUID généré par Supabase
  user_id: string;               // Référence à l'utilisateur
  file_url: string;              // URL publique du fichier
  skills: string[];              // Array de compétences
  experience_years: number;      // Années d'expérience
  education: string;             // Formation/diplôme
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}
```

### Stockage des fichiers

```
Bucket: cvs
Path: {userId}/{timestamp}_{filename}.pdf

Exemple:
cvs/
  ├── abc-123-def/
  │   ├── 1706543210123_mon-cv.pdf
  │   └── 1706987654321_cv-updated.pdf
  └── xyz-456-ghi/
      └── 1706123456789_curriculum.pdf
```

## 🔒 Sécurité

- ✅ Validation stricte des types de fichiers (PDF uniquement)
- ✅ Limite de taille de fichier (5MB)
- ✅ URLs signées pour les téléchargements (expire après 60s)
- ✅ Isolation des fichiers par utilisateur (dossier `{userId}/`)
- ✅ Nettoyage automatique si erreur lors de l'upload
- ✅ RLS Supabase pour la sécurité des données

## 🐛 Gestion des erreurs

Toutes les fonctions retournent une `CVServiceResponse` :

```typescript
{
  success: boolean;    // true si l'opération a réussi
  message?: string;    // Message de succès
  error?: string;      // Message d'erreur lisible
  data?: any;          // Données retournées (CV, liste, etc.)
}
```

**Toujours vérifier `success` avant d'accéder à `data` :**

```typescript
const result = await uploadCV(...);

if (result.success) {
  console.log('CV uploadé:', result.data);
} else {
  alert(result.error);
}
```

## 📝 Notes importantes

1. **Upload atomique :**
   - Si l'insertion DB échoue, le fichier est automatiquement supprimé du storage

2. **Format des compétences :**
   - Stockées comme array de strings dans la DB
   - Interface utilisateur : séparées par virgules

3. **Nommage des fichiers :**
   - Format : `{userId}/{timestamp}_{originalName}.pdf`
   - Évite les collisions de noms

4. **URLs publiques vs signées :**
   - `file_url` : URL publique (accessible à tous si le bucket est public)
   - `downloadCV()` : URL signée temporaire (plus sécurisé)

## 💡 Bonnes pratiques

1. **Toujours vérifier l'utilisateur connecté :**
```typescript
if (!user) {
  return { success: false, error: 'Non authentifié' };
}
```

2. **Afficher un loader pendant l'upload :**
```typescript
setUploading(true);
const result = await uploadCV(...);
setUploading(false);
```

3. **Confirmation avant suppression :**
```typescript
if (!confirm('Supprimer ce CV ?')) return;
await deleteCV(cvId);
```

4. **Rafraîchir la liste après modification :**
```typescript
await deleteCV(cvId);
loadUserCVs(); // Recharger la liste
```

## 🔗 Liens utiles

- [Documentation Supabase Storage](https://supabase.com/docs/guides/storage)
- [Types Database](../types/database.types.ts)
- [Service Auth](./auth.service.ts)
- [Client Supabase](./supabase.ts)
