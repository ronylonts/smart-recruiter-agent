# Application Service

Service centralisé pour gérer toutes les opérations liées aux candidatures.

## Fonctions disponibles

### 1. `getUserApplications(userId, filters?, pagination?)`

Récupère toutes les candidatures d'un utilisateur avec support de pagination et filtres.

**Paramètres :**
- `userId` (string) : ID de l'utilisateur
- `filters` (optionnel) : Objet de filtres
  - `status` : 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview'
  - `searchQuery` : Recherche par entreprise ou poste
  - `startDate` : Date de début (ISO string)
  - `endDate` : Date de fin (ISO string)
- `pagination` (optionnel) : Options de pagination
  - `page` : Numéro de page (défaut: 1)
  - `limit` : Nombre de résultats par page (défaut: 20)

**Retour :**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    applications: Application[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

**Jointures incluses :**
- `job_offers` : Informations complètes de l'offre d'emploi
- `cvs` : Informations du CV utilisé

**Exemple d'utilisation :**
```typescript
import { getUserApplications } from '../services/application.service';

// Sans filtres ni pagination
const result = await getUserApplications(userId);

// Avec filtres
const result = await getUserApplications(userId, {
  status: 'accepted',
  searchQuery: 'Google'
});

// Avec pagination
const result = await getUserApplications(userId, undefined, {
  page: 2,
  limit: 10
});

// Avec filtres et pagination
const result = await getUserApplications(
  userId,
  { status: 'sent', searchQuery: 'développeur' },
  { page: 1, limit: 20 }
);

if (result.success) {
  console.log('Applications:', result.data.applications);
  console.log('Total:', result.data.total);
  console.log('Pages:', result.data.totalPages);
}
```

---

### 2. `getApplicationById(applicationId)`

Récupère les détails complets d'une candidature spécifique.

**Paramètres :**
- `applicationId` (string) : ID de la candidature

**Retour :**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  data?: Application; // Avec jointures job_offers et cvs
}
```

**Exemple d'utilisation :**
```typescript
import { getApplicationById } from '../services/application.service';

const result = await getApplicationById('app-id-123');

if (result.success) {
  console.log('Application:', result.data);
  console.log('Offre:', result.data.job_offers);
  console.log('CV:', result.data.cvs);
}
```

---

### 3. `updateApplicationStatus(applicationId, status)`

Met à jour le statut d'une candidature.

**Paramètres :**
- `applicationId` (string) : ID de la candidature
- `status` (string) : Nouveau statut ('pending' | 'sent' | 'accepted' | 'rejected' | 'interview')

**Comportement automatique :**
- Si le statut change vers 'accepted', 'rejected' ou 'interview', le champ `response_received_at` est automatiquement mis à jour avec la date actuelle

**Retour :**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  data?: Application; // Candidature mise à jour
}
```

**Exemple d'utilisation :**
```typescript
import { updateApplicationStatus } from '../services/application.service';

const result = await updateApplicationStatus('app-id-123', 'accepted');

if (result.success) {
  console.log('Statut mis à jour:', result.data.status);
  console.log('Date de réponse:', result.data.response_received_at);
} else {
  console.error('Erreur:', result.error);
}
```

---

### 4. `getApplicationStats(userId)`

Calcule les statistiques complètes des candidatures d'un utilisateur.

**Paramètres :**
- `userId` (string) : ID de l'utilisateur

**Retour :**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    total: number;                // Total de candidatures
    pending: number;              // En attente
    sent: number;                 // Envoyées
    accepted: number;             // Acceptées
    rejected: number;             // Refusées
    interview: number;            // Entretiens
    positiveResponses: number;    // Acceptées + Entretiens
    responsesReceived: number;    // Avec réponse reçue
    responseRate: number;         // Taux de réponse (%)
    averageResponseTime: number;  // Temps moyen de réponse (jours)
  };
}
```

**Exemple d'utilisation :**
```typescript
import { getApplicationStats } from '../services/application.service';

const result = await getApplicationStats(userId);

if (result.success) {
  console.log('Total candidatures:', result.data.total);
  console.log('Taux de réponse:', result.data.responseRate + '%');
  console.log('Temps moyen:', result.data.averageResponseTime, 'jours');
  console.log('Réponses positives:', result.data.positiveResponses);
}
```

---

### 5. `getRecentApplications(userId, limit?)`

Récupère les dernières candidatures d'un utilisateur.

**Paramètres :**
- `userId` (string) : ID de l'utilisateur
- `limit` (number, optionnel) : Nombre de candidatures à récupérer (défaut: 5)

**Retour :**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  data?: Application[]; // Avec jointure job_offers
}
```

**Exemple d'utilisation :**
```typescript
import { getRecentApplications } from '../services/application.service';

// 5 dernières candidatures (par défaut)
const result = await getRecentApplications(userId);

// 10 dernières candidatures
const result = await getRecentApplications(userId, 10);

if (result.success) {
  result.data.forEach(app => {
    console.log(`${app.job_offers.company} - ${app.job_offers.title}`);
  });
}
```

---

### 6. `deleteApplication(applicationId)`

Supprime une candidature.

**Paramètres :**
- `applicationId` (string) : ID de la candidature

**Retour :**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Exemple d'utilisation :**
```typescript
import { deleteApplication } from '../services/application.service';

const result = await deleteApplication('app-id-123');

if (result.success) {
  console.log('Candidature supprimée');
} else {
  console.error('Erreur:', result.error);
}
```

---

### 7. `createApplication(applicationData)`

Crée une nouvelle candidature.

**Paramètres :**
- `applicationData` (object) :
  - `user_id` (string) : ID de l'utilisateur
  - `cv_id` (string) : ID du CV
  - `job_offer_id` (string) : ID de l'offre d'emploi
  - `cover_letter` (string, optionnel) : Lettre de motivation
  - `status` (string, optionnel) : Statut initial (défaut: 'pending')

**Retour :**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  data?: Application; // Candidature créée
}
```

**Exemple d'utilisation :**
```typescript
import { createApplication } from '../services/application.service';

const result = await createApplication({
  user_id: 'user-id-123',
  cv_id: 'cv-id-456',
  job_offer_id: 'job-id-789',
  cover_letter: 'Votre lettre de motivation...',
  status: 'sent'
});

if (result.success) {
  console.log('Candidature créée:', result.data);
} else {
  console.error('Erreur:', result.error);
}
```

---

## Intégration dans les composants React

### Exemple avec Dashboard

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getApplicationStats, getRecentApplications } from '../services/application.service';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentApps, setRecentApps] = useState([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    // Charger les statistiques
    const statsResult = await getApplicationStats(user.id);
    if (statsResult.success) {
      setStats(statsResult.data);
    }

    // Charger les candidatures récentes
    const appsResult = await getRecentApplications(user.id, 5);
    if (appsResult.success) {
      setRecentApps(appsResult.data);
    }
  };

  return (
    <div>
      {stats && (
        <div>
          <p>Total: {stats.total}</p>
          <p>Taux de réponse: {stats.responseRate}%</p>
        </div>
      )}
      {/* ... */}
    </div>
  );
};
```

### Exemple avec page Applications

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserApplications } from '../services/application.service';

export const Applications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState({
    status: 'all',
    searchQuery: ''
  });

  useEffect(() => {
    if (user) {
      loadApplications();
    }
  }, [user, currentPage, filters]);

  const loadApplications = async () => {
    const result = await getUserApplications(
      user.id,
      filters.status !== 'all' ? { status: filters.status } : undefined,
      { page: currentPage, limit: 20 }
    );

    if (result.success) {
      setApplications(result.data.applications);
      setTotalPages(result.data.totalPages);
    }
  };

  return (
    <div>
      {/* Filtres et tableau */}
    </div>
  );
};
```

---

## Structure des données retournées

### Application complète (avec jointures)

```typescript
{
  id: string;
  user_id: string;
  cv_id: string;
  job_offer_id: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview';
  cover_letter: string | null;
  applied_at: string;
  response_received_at: string | null;
  job_offers: {
    id: string;
    title: string;
    company: string;
    city: string;
    country: string;
    job_url: string | null;
    description: string | null;
    profession: string | null;
    scraped_at: string;
  };
  cvs: {
    id: string;
    file_url: string;
    skills: string[];
    experience_years: number;
    education: string;
    created_at: string;
  };
}
```

---

## Gestion des erreurs

Toutes les fonctions retournent un objet avec `success: boolean`. Toujours vérifier cette valeur :

```typescript
const result = await getUserApplications(userId);

if (result.success) {
  // Traiter result.data
  console.log(result.data);
} else {
  // Afficher l'erreur
  console.error(result.error);
  alert('Erreur : ' + result.error);
}
```

---

## Notes importantes

1. **Pagination** : Par défaut, 20 résultats par page
2. **Tri** : Toujours par date décroissante (`applied_at DESC`)
3. **Filtres** : Peuvent être combinés (statut + recherche + dates)
4. **Jointures** : Automatiques avec `job_offers` et `cvs`
5. **Dates** : Format ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
6. **Statuts automatiques** : `response_received_at` mis à jour automatiquement

---

## Performance

- **Pagination** : Utilise `range()` de Supabase pour limiter les résultats
- **Jointures** : Optimisées avec `select()` au niveau de la requête
- **Filtres** : Appliqués côté serveur quand possible
- **Cache** : Aucun cache implémenté, toujours des données fraîches
