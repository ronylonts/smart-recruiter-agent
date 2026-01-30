# Service d'Authentification

Documentation du service `auth.service.ts` pour gérer l'authentification des utilisateurs.

## 🎯 Fonctionnalités

Le service d'authentification gère :
- ✅ Inscription avec création automatique du profil
- ✅ Connexion
- ✅ Déconnexion
- ✅ Récupération de l'utilisateur connecté
- ✅ Récupération du profil utilisateur
- ✅ Gestion des erreurs avec messages clairs

## 📦 Import

```typescript
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getUserProfile,
  type UserSignUpData,
  type AuthResponse
} from '../services/auth.service';
```

## 🔧 Fonctions disponibles

### 1. signUp()

Inscription d'un nouvel utilisateur + création du profil dans la table `users`.

```typescript
const result = await signUp(email, password, userData);

// Paramètres
email: string
password: string
userData: UserSignUpData {
  fullName: string;
  phone?: string;
  profession?: string;
  city: string;
  country: string;
}

// Retour
AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: any;
}
```

**Exemple :**

```typescript
const result = await signUp(
  'jean@example.com',
  'password123',
  {
    fullName: 'Jean Dupont',
    phone: '+33612345678',
    profession: 'Développeur',
    city: 'Paris',
    country: 'France'
  }
);

if (result.success) {
  console.log('Inscription réussie !', result.user);
} else {
  console.error('Erreur :', result.error);
}
```

### 2. signIn()

Connexion d'un utilisateur existant.

```typescript
const result = await signIn(email, password);

// Paramètres
email: string
password: string

// Retour
AuthResponse
```

**Exemple :**

```typescript
const result = await signIn('jean@example.com', 'password123');

if (result.success) {
  console.log('Connexion réussie !', result.user);
  // Rediriger vers le dashboard
  navigate('/dashboard');
} else {
  console.error('Erreur :', result.error);
  setErrorMessage(result.error);
}
```

### 3. signOut()

Déconnexion de l'utilisateur.

```typescript
const result = await signOut();

// Retour
AuthResponse
```

**Exemple :**

```typescript
const handleLogout = async () => {
  const result = await signOut();
  
  if (result.success) {
    console.log('Déconnexion réussie');
    navigate('/login');
  } else {
    console.error('Erreur :', result.error);
  }
};
```

### 4. getCurrentUser()

Récupère l'utilisateur actuellement connecté (Auth).

```typescript
const result = await getCurrentUser();

// Retour
AuthResponse avec user?: User
```

**Exemple :**

```typescript
useEffect(() => {
  const checkAuth = async () => {
    const result = await getCurrentUser();
    
    if (result.success && result.user) {
      setUser(result.user);
      setIsAuthenticated(true);
    } else {
      navigate('/login');
    }
  };
  
  checkAuth();
}, []);
```

### 5. getUserProfile()

Récupère le profil complet depuis la table `users`.

```typescript
const result = await getUserProfile(userId);

// Paramètres
userId: string

// Retour
AuthResponse avec user?: {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  profession: string | null;
  city: string;
  country: string;
  created_at: string;
}
```

**Exemple :**

```typescript
const loadUserProfile = async (userId: string) => {
  const result = await getUserProfile(userId);
  
  if (result.success) {
    setProfile(result.user);
  } else {
    console.error('Erreur :', result.error);
  }
};
```

## 🎨 Utilisation dans un composant React

### Exemple : Formulaire d'inscription

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp } from '../services/auth.service';

const SignUpForm = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    
    const result = await signUp(
      formData.get('email') as string,
      formData.get('password') as string,
      {
        fullName: formData.get('fullName') as string,
        phone: formData.get('phone') as string,
        profession: formData.get('profession') as string,
        city: formData.get('city') as string,
        country: formData.get('country') as string,
      }
    );

    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Erreur lors de l\'inscription');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* Champs du formulaire */}
      <button type="submit" disabled={loading}>
        {loading ? 'Chargement...' : 'S\'inscrire'}
      </button>
    </form>
  );
};
```

### Exemple : Hook personnalisé useAuth

```typescript
import { useState, useEffect } from 'react';
import { getCurrentUser, signIn, signOut } from '../services/auth.service';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const result = await getCurrentUser();
      if (result.success) {
        setUser(result.user);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await signIn(email, password);
    if (result.success) {
      setUser(result.user);
    }
    return result;
  };

  const logout = async () => {
    const result = await signOut();
    if (result.success) {
      setUser(null);
    }
    return result;
  };

  return { user, loading, login, logout };
};
```

## 🔒 Sécurité

- ✅ Tous les mots de passe sont hashés par Supabase Auth
- ✅ Les tokens JWT sont gérés automatiquement
- ✅ Les erreurs ne révèlent pas d'informations sensibles
- ✅ Validation côté serveur via Supabase RLS

## 🐛 Gestion des erreurs

Toutes les fonctions retournent une `AuthResponse` :

```typescript
{
  success: boolean;    // true si l'opération a réussi
  message?: string;    // Message de succès
  error?: string;      // Message d'erreur lisible
  user?: any;          // Données utilisateur (si applicable)
}
```

**Toujours vérifier `success` avant d'accéder à `user` :**

```typescript
const result = await signUp(...);

if (result.success) {
  // Tout s'est bien passé
  console.log(result.user);
} else {
  // Afficher l'erreur à l'utilisateur
  alert(result.error);
}
```

## 📝 Notes importantes

1. **signUp crée 2 entrées :**
   - Un compte Auth Supabase
   - Un profil dans la table `users` avec le même ID

2. **L'ID est synchronisé :**
   - `auth.users.id` === `public.users.id`

3. **Utiliser getCurrentUser() pour Auth :**
   - Pour vérifier l'authentification
   - Pour récupérer le token JWT

4. **Utiliser getUserProfile() pour les données métier :**
   - Pour afficher le profil complet
   - Pour accéder aux champs personnalisés (profession, ville, etc.)

## 🔗 Liens utiles

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [Types Database](../types/database.types.ts)
- [Client Supabase](./supabase.ts)
