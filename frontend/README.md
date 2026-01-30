# Smart Recruiter Agent - Frontend

Application React + TypeScript avec Vite, configurée avec toutes les dépendances modernes.

## 🚀 Stack Technique

- **React 19** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool ultra-rapide
- **React Router DOM** - Navigation côté client
- **Tailwind CSS** - Framework CSS utility-first
- **Supabase** - Authentification et base de données
- **Axios** - Client HTTP
- **React Hook Form** - Gestion des formulaires

## 📁 Structure du Projet

```
src/
├── components/     # Composants UI réutilisables
│   ├── Button.tsx  # Bouton avec variants et loading
│   └── Card.tsx    # Carte pour afficher du contenu
│
├── pages/          # Pages de l'application
│   ├── Home.tsx    # Page d'accueil
│   └── Login.tsx   # Page de connexion
│
├── services/       # Services API et externes
│   ├── api.ts      # Configuration Axios + intercepteurs
│   └── supabase.ts # Client et fonctions Supabase
│
├── hooks/          # Hooks React personnalisés
│   ├── useAuth.ts            # Gestion de l'authentification
│   └── useFormValidation.ts  # Wrapper react-hook-form
│
├── types/          # Types TypeScript
│   └── index.ts    # Types communs
│
├── App.tsx         # Composant racine avec React Router
├── main.tsx        # Point d'entrée
└── index.css       # Styles Tailwind
```

## 🛠️ Configuration

### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet frontend :

```bash
cp .env.example .env
```

Remplissez les valeurs :

```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

### 2. Installation

Les dépendances sont déjà installées. Si besoin :

```bash
npm install
```

### 3. Démarrage

Le serveur dev est déjà en cours d'exécution sur http://localhost:5173

Pour le redémarrer :

```bash
npm run dev
```

## 📖 Guide d'Utilisation

### Créer un nouveau composant

```tsx
// src/components/MonComposant.tsx
import React from 'react';

interface MonComposantProps {
  title: string;
}

export const MonComposant: React.FC<MonComposantProps> = ({ title }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
};
```

### Ajouter une nouvelle page

1. Créez le fichier dans `src/pages/`
2. Ajoutez la route dans `App.tsx` :

```tsx
<Route path="/ma-page" element={<MaPage />} />
```

### Utiliser les hooks personnalisés

```tsx
// Authentification
const { user, loading, login, logout } = useAuth();

// Formulaire
const { register, handleSubmit, errors } = useFormValidation<FormData>();
```

### Appels API avec Axios

```tsx
import api from '../services/api';

const fetchData = async () => {
  const response = await api.get('/endpoint');
  return response.data;
};
```

### Utiliser Supabase

```tsx
import { supabase, signIn, signUp } from '../services/supabase';

// Inscription
const { data, error } = await signUp(email, password);

// Connexion
const { data, error } = await signIn(email, password);
```

## 🎨 Tailwind CSS

Les classes Tailwind sont disponibles partout. Exemples :

```tsx
<div className="flex items-center justify-center min-h-screen bg-gray-100">
  <Button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
    Cliquez-moi
  </Button>
</div>
```

## 📦 Scripts Disponibles

```bash
npm run dev      # Démarrer le serveur de développement
npm run build    # Build de production
npm run preview  # Prévisualiser le build
npm run lint     # Linter le code
```

## 🔒 Routes Protégées

Les routes privées sont automatiquement protégées par le composant `PrivateRoute` dans `App.tsx`. Les utilisateurs non authentifiés sont redirigés vers `/login`.

## 🚧 Prochaines Étapes

1. Configurez vos variables d'environnement Supabase
2. Créez vos tables dans Supabase
3. Ajoutez de nouvelles pages selon vos besoins
4. Personnalisez les composants UI
5. Implémentez votre logique métier

## 📝 Notes

- Les types TypeScript sont définis dans `src/types/`
- Les intercepteurs Axios gèrent automatiquement les tokens d'authentification
- Le hook `useAuth` synchronise l'état d'authentification avec Supabase
- Tailwind est configuré pour scanner tous les fichiers `.tsx` et `.ts`
