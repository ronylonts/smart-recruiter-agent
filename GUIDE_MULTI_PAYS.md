# 🌍 GUIDE DE DÉPLOIEMENT MULTI-PAYS

## ⚠️ AVERTISSEMENT LÉGAL IMPORTANT

**Ce que vous NE POUVEZ PAS faire** :
- ❌ Scraper LinkedIn (INTERDIT par TOS, risque de poursuites)
- ❌ Scraper Indeed (INTERDIT par TOS, risque de ban IP)
- ❌ Scraper des sites d'entreprises sans autorisation

**Ce que vous POUVEZ faire** :
- ✅ Utiliser des APIs publiques légales (Adzuna, The Muse, Remotive, etc.)
- ✅ Intégrer des flux RSS/Atom officiels
- ✅ Partenariats avec plateformes d'emploi
- ✅ Agrégation manuelle avec consentement

---

## 📋 ÉTAPE 1 : PRÉREQUIS

### 1.1 APIs Nécessaires

#### Adzuna API (GRATUITE - 500 requêtes/mois)
1. Allez sur : https://developer.adzuna.com/
2. Créez un compte
3. Récupérez :
   - `ADZUNA_APP_ID`
   - `ADZUNA_API_KEY`

#### APIs Alternatives (Optionnel)

**The Muse API** (gratuite)
- https://www.themuse.com/developers/api/v2
- Offres en anglais (US, UK, remote)

**Remotive API** (freemium)
- https://remotive.io/api-documentation
- Spécialisé remote work

**JSearch (via RapidAPI)** (payant)
- https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- Agrégateur multi-sources légal

---

## 📋 ÉTAPE 2 : CONFIGURATION BASE DE DONNÉES

### 2.1 Exécuter le Script SQL

1. Ouvrez Supabase : https://supabase.com/dashboard
2. Allez dans **SQL Editor**
3. Copiez tout le contenu de `extend_for_europe.sql`
4. Exécutez le script
5. Vérifiez que toutes les tables sont créées :
   - `countries` (17 pays européens)
   - `job_search_logs`
   - `search_queue`

### 2.2 Vérifier les Données

```sql
-- Voir tous les pays
SELECT * FROM countries ORDER BY name;

-- Voir les stats par pays
SELECT * FROM stats_by_country;
```

---

## 📋 ÉTAPE 3 : CONFIGURATION BACKEND

### 3.1 Ajouter les Variables d'Environnement

Dans `backend/.env` :

```env
# APIs de Recherche d'Emploi
ADZUNA_APP_ID=votre_app_id_ici
ADZUNA_API_KEY=votre_api_key_ici

# The Muse (optionnel)
THE_MUSE_API_KEY=votre_key_ici

# Remotive (optionnel)
REMOTIVE_API_KEY=votre_key_ici
```

### 3.2 Installer les Dépendances

```bash
cd backend
npm install axios
npm install node-cron  # Pour les tâches planifiées
```

### 3.3 Créer une Route de Recherche

Dans `backend/src/routes/jobs.routes.ts` :

```typescript
import { Router } from 'express';
import { searchJobsMultiCountry } from '../services/jobSearch.service';

const router = Router();

/**
 * POST /api/jobs/search
 * Lance une recherche multi-pays pour un utilisateur
 */
router.post('/search', async (req, res) => {
  const { userId, profession } = req.body;

  if (!userId || !profession) {
    return res.status(400).json({
      error: 'userId et profession requis'
    });
  }

  // Lancer la recherche en arrière-plan
  searchJobsMultiCountry(userId, { userId, profession }).catch(err => {
    console.error('Erreur recherche:', err);
  });

  res.status(202).json({
    message: 'Recherche lancée',
    userId
  });
});

export default router;
```

### 3.4 Enregistrer la Route

Dans `backend/src/server/index.ts` :

```typescript
import jobsRoutes from './routes/jobs.routes';

// ...

app.use('/api/jobs', jobsRoutes);
```

---

## 📋 ÉTAPE 4 : CONFIGURATION MAKE.COM (Multi-Pays)

### 4.1 Scénario 1 : Recherche Quotidienne Multi-Pays

1. **Trigger** : Scheduled (1x/jour à 9h)
2. **HTTP Module** : GET vers Supabase
   ```
   https://doyqvufcofebzsiswddq.supabase.co/rest/v1/users?select=id,origin_country,target_countries,preferred_job_title&auto_send_enabled=eq.true
   ```
3. **Iterator** : Pour chaque utilisateur
4. **HTTP Module** : Recherche Adzuna par pays
   - Pour chaque pays dans `target_countries`
   - URL : `https://api.adzuna.com/v1/api/jobs/{{country}}/search/1`
   - Params :
     - `app_id`: Votre APP_ID
     - `app_key`: Votre API_KEY
     - `what`: `{{preferred_job_title}}`
     - `results_per_page`: 10
5. **Iterator** : Pour chaque offre trouvée
6. **HTTP Module** : POST vers votre webhook
   ```
   https://smart-recruiter-backend.onrender.com/api/webhook/process-job
   ```
   Body :
   ```json
   {
     "user_id": "{{user_id}}",
     "job_title": "{{title}}",
     "company": "{{company.display_name}}",
     "description": "{{description}}",
     "job_url": "{{redirect_url}}",
     "city": "{{location.display_name}}",
     "country": "{{country_code}}",
     "salary_min": "{{salary_min}}",
     "salary_max": "{{salary_max}}"
   }
   ```

### 4.2 Scénario 2 : Recherche à la Demande

1. **Trigger** : Webhook (appelé depuis votre frontend)
2. Suite identique au scénario 1

---

## 📋 ÉTAPE 5 : CONFIGURATION FRONTEND

### 5.1 Page de Sélection des Pays

Créer `frontend/src/pages/CountrySelection.tsx` :

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export const CountrySelection = () => {
  const { user } = useAuth();
  const [countries, setCountries] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);

  useEffect(() => {
    loadCountries();
    loadUserCountries();
  }, []);

  const loadCountries = async () => {
    const { data } = await supabase
      .from('countries')
      .select('*')
      .eq('active', true)
      .order('name');
    setCountries(data || []);
  };

  const loadUserCountries = async () => {
    const { data } = await supabase
      .from('users')
      .select('target_countries')
      .eq('id', user.id)
      .single();
    setSelectedCountries(data?.target_countries || []);
  };

  const toggleCountry = async (countryCode) => {
    const newSelection = selectedCountries.includes(countryCode)
      ? selectedCountries.filter(c => c !== countryCode)
      : [...selectedCountries, countryCode];

    setSelectedCountries(newSelection);

    await supabase
      .from('users')
      .update({ target_countries: newSelection })
      .eq('id', user.id);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">
        Sélectionnez vos pays cibles 🌍
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {countries.map(country => (
          <button
            key={country.code}
            onClick={() => toggleCountry(country.code)}
            className={`p-4 rounded-lg border-2 ${
              selectedCountries.includes(country.code)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300'
            }`}
          >
            <div className="text-3xl mb-2">{getFlagEmoji(country.code)}</div>
            <div className="font-semibold">{country.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

function getFlagEmoji(countryCode) {
  const flagMap = {
    'FR': '🇫🇷', 'DE': '🇩🇪', 'ES': '🇪🇸', 'IT': '🇮🇹',
    'GB': '🇬🇧', 'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭',
    'AT': '🇦🇹', 'PT': '🇵🇹', 'SE': '🇸🇪', 'DK': '🇩🇰',
    'NO': '🇳🇴', 'FI': '🇫🇮', 'PL': '🇵🇱', 'IE': '🇮🇪'
  };
  return flagMap[countryCode] || '🌍';
}
```

### 5.2 Ajouter la Route

Dans `frontend/src/App.tsx` :

```typescript
import { CountrySelection } from './pages/CountrySelection';

// ...

<Route path="/countries" element={<CountrySelection />} />
```

---

## 📋 ÉTAPE 6 : DÉPLOIEMENT

### 6.1 Backend (Render)

1. Push votre code sur GitHub
2. Render va automatiquement redéployer
3. Ajoutez les variables d'environnement dans Render :
   - `ADZUNA_APP_ID`
   - `ADZUNA_API_KEY`

### 6.2 Frontend (Vercel)

Le frontend est déjà déployé, il se mettra à jour automatiquement.

### 6.3 Base de Données (Supabase)

Exécutez le script SQL `extend_for_europe.sql` dans l'éditeur SQL de Supabase.

---

## 📊 MONITORING

### Tableau de Bord Supabase

```sql
-- Offres par pays
SELECT country, COUNT(*) as total
FROM job_offers
GROUP BY country
ORDER BY total DESC;

-- Candidatures par pays
SELECT target_country, COUNT(*) as total
FROM applications
GROUP BY target_country
ORDER BY total DESC;

-- Statistiques complètes
SELECT * FROM stats_by_country;
```

---

## ⚡ PROCHAINES ÉTAPES

1. **Tester avec 2-3 pays** (FR, DE, ES)
2. **Monitorer les résultats** (nombre d'offres, taux de matching)
3. **Ajuster les paramètres** (score de matching, fréquence)
4. **Étendre progressivement** aux autres pays

---

## ❓ FAQ

**Q: Pourquoi pas LinkedIn/Indeed ?**
R: Scraping = illégal. APIs officielles non accessibles aux petits projets.

**Q: Adzuna couvre-t-il tous les pays ?**
R: Non, mais il couvre les principaux (FR, DE, ES, IT, GB, etc.)

**Q: Comment ajouter d'autres sources ?**
R: Créez un service similaire à `jobSearch.service.ts` pour chaque API.

**Q: Comment gérer la traduction ?**
R: Utilisez DeepL API ou Google Translate API (payant).

---

## 📞 SUPPORT

Si vous avez des questions, consultez :
- Adzuna Docs : https://developer.adzuna.com/docs
- Supabase Docs : https://supabase.com/docs
- Make.com Academy : https://www.make.com/en/academy
