# 🚀 Démarrage Rapide - Smart Recruiter Agent

## ✅ Ce qui a été fait

### 1. Structure créée
```
src/
├── components/     ✅ Composants UI (Button, Card)
├── services/       ✅ API (Axios) + Supabase
├── hooks/          ✅ useAuth, useFormValidation
├── types/          ✅ Types TypeScript
└── pages/          ✅ Home, Login
```

### 2. Packages installés
- ✅ React Router DOM (v7.13.0)
- ✅ Supabase JS (v2.93.3)
- ✅ Axios (v1.13.4)
- ✅ React Hook Form (v7.71.1)
- ✅ Tailwind CSS (v4.1.18)

### 3. Configuration
- ✅ Tailwind CSS configuré (`tailwind.config.js`)
- ✅ PostCSS configuré (`postcss.config.js`)
- ✅ React Router avec routes protégées
- ✅ Fichier `.env.example` créé

## 🎯 Prochaines étapes

### 1. Configuration Supabase (OBLIGATOIRE)

Créez un fichier `.env` à la racine de `frontend/` :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_supabase
VITE_API_URL=http://localhost:3000/api
```

**Comment obtenir les clés Supabase :**
1. Allez sur https://supabase.com
2. Créez un projet
3. Settings → API → Project URL et anon/public key

### 2. Tester l'application

Le serveur dev tourne déjà sur : **http://localhost:5173**

Si besoin de redémarrer :
```bash
cd frontend
npm run dev
```

### 3. Vérifier le build

```bash
npm run build
```

## 📝 Exemples d'Utilisation

### Créer une nouvelle page

```tsx
// src/pages/Dashboard.tsx
export const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
    </div>
  );
};
```

Puis ajoutez la route dans `App.tsx` :
```tsx
import { Dashboard } from './pages/Dashboard';

<Route path="/dashboard" element={<Dashboard />} />
```

### Utiliser l'authentification

```tsx
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, login, logout } = useAuth();
  
  return (
    <div>
      {user ? (
        <button onClick={logout}>Déconnexion</button>
      ) : (
        <button onClick={() => login(email, password)}>
          Connexion
        </button>
      )}
    </div>
  );
}
```

### Appel API

```tsx
import api from './services/api';

const fetchData = async () => {
  try {
    const response = await api.get('/users');
    console.log(response.data);
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```

### Formulaire validé

```tsx
import { useFormValidation } from './hooks/useFormValidation';

interface FormData {
  name: string;
  email: string;
}

function MyForm() {
  const { register, handleSubmit, errors } = useFormValidation<FormData>();

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name', { required: 'Nom requis' })} />
      {errors.name && <p>{errors.name.message}</p>}
      
      <button type="submit">Envoyer</button>
    </form>
  );
}
```

## 🎨 Utiliser Tailwind CSS

```tsx
<div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
  <div className="bg-white p-8 rounded-lg shadow-2xl">
    <h1 className="text-4xl font-bold text-gray-800 mb-4">
      Titre
    </h1>
    <p className="text-gray-600">Description</p>
  </div>
</div>
```

## 🔧 Commandes utiles

```bash
npm run dev      # Démarrer le serveur de développement
npm run build    # Build de production
npm run preview  # Prévisualiser le build
npm run lint     # Vérifier le code
```

## 📦 Structure des imports

Utilisez les imports groupés :

```tsx
// ✅ Recommandé
import { Button, Card } from './components';
import { useAuth, useFormValidation } from './hooks';
import { Home, Login } from './pages';

// ❌ À éviter
import { Button } from './components/Button';
import { Card } from './components/Card';
```

## 🐛 Débogage

### Le serveur ne démarre pas
```bash
# Supprimez node_modules et réinstallez
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Tailwind ne fonctionne pas
Vérifiez que `index.css` contient :
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Erreur d'authentification Supabase
Vérifiez votre fichier `.env` et assurez-vous que :
- `VITE_SUPABASE_URL` est correct
- `VITE_SUPABASE_ANON_KEY` est correct
- Le fichier `.env` est à la racine de `frontend/`

## 📚 Documentation

- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)
- [React Router](https://reactrouter.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com/docs)
- [React Hook Form](https://react-hook-form.com)
- [Axios](https://axios-http.com)

## ✨ Fonctionnalités clés

- ✅ Authentification avec Supabase
- ✅ Routes protégées
- ✅ Gestion des formulaires
- ✅ Appels API avec intercepteurs
- ✅ Composants UI réutilisables
- ✅ TypeScript strict
- ✅ Hot Module Replacement (HMR)

---

**Bon développement ! 🚀**
