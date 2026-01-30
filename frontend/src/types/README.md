# Types de Base de Données

Ce fichier explique comment utiliser les types TypeScript pour les tables Supabase.

## Structure des types

Chaque table possède 3 types :
- **Row** : Type complet pour les lectures (SELECT)
- **Insert** : Type pour les insertions (INSERT) - sans id et timestamps auto-générés
- **Update** : Type pour les mises à jour (UPDATE) - tous les champs optionnels

## Utilisation

### 1. Import des types

```typescript
import { User, CV, JobOffer, Application, Notification } from '../types';
// ou
import { Tables, Inserts, Updates } from '../types/database.types';
```

### 2. Requêtes SELECT

```typescript
// Récupérer tous les utilisateurs
const { data: users, error } = await supabase
  .from('users')
  .select('*');
// users est typé comme User[]

// Récupérer un CV spécifique
const { data: cv, error } = await supabase
  .from('cvs')
  .select('*')
  .eq('id', cvId)
  .single();
// cv est typé comme CV
```

### 3. Requêtes INSERT

```typescript
// Créer un nouveau CV
const newCV: Inserts<'cvs'> = {
  user_id: userId,
  file_url: 'https://...',
  skills: ['React', 'TypeScript', 'Node.js'],
  experience_years: 5,
  education: 'Master en Informatique'
};

const { data, error } = await supabase
  .from('cvs')
  .insert(newCV)
  .select()
  .single();
```

### 4. Requêtes UPDATE

```typescript
// Mettre à jour une candidature
const updates: Updates<'applications'> = {
  status: 'interview',
  response_received_at: new Date().toISOString()
};

const { data, error } = await supabase
  .from('applications')
  .update(updates)
  .eq('id', applicationId);
```

### 5. Types helpers

```typescript
// Utiliser les types helpers pour plus de flexibilité
type UserRow = Tables<'users'>;
type CVInsert = Inserts<'cvs'>;
type ApplicationUpdate = Updates<'applications'>;
```

## Tables disponibles

### users
- `id` (string)
- `email` (string)
- `full_name` (string)
- `phone` (string | null)
- `profession` (string | null)
- `city` (string | null)
- `country` (string | null)
- `created_at` (string)

### cvs
- `id` (string)
- `user_id` (string)
- `file_url` (string)
- `skills` (string[] | null)
- `experience_years` (number | null)
- `education` (string | null)
- `created_at` (string)
- `updated_at` (string)

### job_offers
- `id` (string)
- `title` (string)
- `company` (string)
- `city` (string | null)
- `country` (string | null)
- `job_url` (string)
- `description` (string | null)
- `profession` (string | null)
- `scraped_at` (string)

### applications
- `id` (string)
- `user_id` (string)
- `cv_id` (string)
- `job_offer_id` (string)
- `status` (ApplicationStatus: 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview')
- `cover_letter` (string | null)
- `applied_at` (string)
- `response_received_at` (string | null)

### notifications
- `id` (string)
- `user_id` (string)
- `application_id` (string | null)
- `message` (string)
- `sent_at` (string)

## Exemples complets

### Créer un utilisateur et son CV

```typescript
import { supabase } from '../services/supabase';
import type { Inserts } from '../types/database.types';

async function createUserWithCV(
  email: string,
  password: string,
  fullName: string,
  cvData: Omit<Inserts<'cvs'>, 'user_id'>
) {
  // 1. Créer l'utilisateur avec authentification
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    throw new Error('Erreur lors de la création du compte');
  }

  // 2. Créer le profil utilisateur
  const newUser: Inserts<'users'> = {
    email,
    full_name: fullName,
    phone: null,
    profession: null,
    city: null,
    country: null,
  };

  const { error: userError } = await supabase
    .from('users')
    .insert(newUser);

  if (userError) {
    throw new Error('Erreur lors de la création du profil');
  }

  // 3. Créer le CV
  const newCV: Inserts<'cvs'> = {
    user_id: authData.user.id,
    ...cvData,
  };

  const { data: cv, error: cvError } = await supabase
    .from('cvs')
    .insert(newCV)
    .select()
    .single();

  if (cvError) {
    throw new Error('Erreur lors de la création du CV');
  }

  return { user: authData.user, cv };
}
```

### Postuler à une offre

```typescript
import { supabase } from '../services/supabase';
import type { Inserts } from '../types/database.types';

async function applyToJob(
  userId: string,
  cvId: string,
  jobOfferId: string,
  coverLetter: string
) {
  const application: Inserts<'applications'> = {
    user_id: userId,
    cv_id: cvId,
    job_offer_id: jobOfferId,
    status: 'pending',
    cover_letter: coverLetter,
  };

  const { data, error } = await supabase
    .from('applications')
    .insert(application)
    .select(`
      *,
      cvs (*),
      job_offers (*)
    `)
    .single();

  if (error) {
    throw new Error('Erreur lors de la candidature');
  }

  // Créer une notification
  const notification: Inserts<'notifications'> = {
    user_id: userId,
    application_id: data.id,
    message: `Candidature envoyée pour ${data.job_offers.title} chez ${data.job_offers.company}`,
  };

  await supabase.from('notifications').insert(notification);

  return data;
}
```

### Récupérer les candidatures d'un utilisateur avec relations

```typescript
import { supabase } from '../services/supabase';

async function getUserApplications(userId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      cvs (*),
      job_offers (*)
    `)
    .eq('user_id', userId)
    .order('applied_at', { ascending: false });

  if (error) {
    throw new Error('Erreur lors de la récupération des candidatures');
  }

  return data;
}
```

## Notes importantes

- Les timestamps (`created_at`, `updated_at`, `applied_at`, etc.) sont des **strings** au format ISO 8601
- Utilisez `new Date().toISOString()` pour créer des timestamps
- Les champs marqués `| null` peuvent être vides
- Le type `ApplicationStatus` est une union de strings pour garantir la cohérence des statuts
