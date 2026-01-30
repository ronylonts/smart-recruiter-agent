# 🔗 Guide d'Intégration Make.com + Adzuna

## ✅ Ce qui a été fait (Backend)

### 1. Fonction Helper `createOrGetJobOffer`

**Fichier** : `backend/src/services/supabase.service.ts`

**Fonctionnalité** :
- Vérifie si l'offre existe déjà (par `job_url` unique)
- Si elle existe → Retourne son ID
- Si elle n'existe pas → La crée et retourne son ID
- **Évite les doublons** automatiquement

```typescript
const jobResult = await createOrGetJobOffer({
  title: "Développeur Full Stack",
  company: "Google",
  job_url: "https://www.adzuna.fr/jobs/12345",
  description: "Nous recherchons...",
  city: "Paris",
  country: "France"
});
// → Retourne { success: true, data: { id: "uuid", ... } }
```

---

### 2. Route Flexible `/api/webhook/process-job`

**Fichier** : `backend/src/routes/webhook.routes.ts`

**La route accepte maintenant 2 formats** :

#### Format 1 : job_id existant (ancien format, toujours compatible)
```json
{
  "user_id": "uuid-user",
  "job_id": "uuid-job"
}
```

#### Format 2 : Détails Adzuna (NOUVEAU - pour Make.com)
```json
{
  "user_id": "uuid-user",
  "job_title": "Développeur Full Stack",
  "company": "Google",
  "description": "Nous recherchons un développeur...",
  "job_url": "https://www.adzuna.fr/jobs/12345",
  "city": "Paris",
  "country": "France",
  "contact_email": "recrutement@google.com"
}
```

**Champs requis** :
- `user_id` (obligatoire)
- Soit `job_id`, soit (`job_title` + `company` + `job_url`)

**Champs optionnels** :
- `description`
- `city`
- `country`
- `contact_email`

---

## 🛠️ Configuration Make.com

### Architecture du Scénario

```
[Module 1] Trigger (Scheduler)
    ↓
[Module 2] Supabase - Search users (auto_send_enabled = true)
    ↓
[Module 3] Iterator (pour chaque utilisateur)
    ↓
[Module 4] Recherche Adzuna (API Adzuna)
    ↓
[Module 5] Iterator (pour chaque offre trouvée)
    ↓
[Module 6] HTTP - Make a request (NOUVEAU)
    ↓
Webhook vers votre backend
```

---

### Module 6 : HTTP Request (vers votre backend)

#### Configuration :

**1. URL** :
```
http://votre-backend.com/api/webhook/process-job
```

**Pour développement local** :
- Option A : Utiliser **ngrok** : `https://abc123.ngrok.io/api/webhook/process-job`
- Option B : Utiliser **LocalCan** : `https://abc123.loclx.io/api/webhook/process-job`
- Option C : Déployer sur **Render/Railway** (recommandé pour production)

**2. Method** :
```
POST
```

**3. Headers** :
```
Content-Type: application/json
```

**4. Body Type** :
```
Raw
```

**5. Content Type** :
```
JSON (application/json)
```

**6. Request Content (Body)** :

```json
{
  "user_id": "{{2.id}}",
  "job_title": "{{5.title}}",
  "company": "{{5.company.display_name}}",
  "description": "{{5.description}}",
  "job_url": "{{5.redirect_url}}",
  "city": "{{5.location.display_name}}",
  "country": "{{5.location.area[0]}}",
  "contact_email": ""
}
```

**Explication des variables Make.com** :

| Variable Make.com | Description | Exemple |
|-------------------|-------------|---------|
| `{{2.id}}` | ID de l'utilisateur (Module 2) | `"abc-123-def"` |
| `{{5.title}}` | Titre du poste (Module 5 - Adzuna) | `"Développeur Full Stack"` |
| `{{5.company.display_name}}` | Nom de l'entreprise | `"Google"` |
| `{{5.description}}` | Description de l'offre | `"Nous recherchons..."` |
| `{{5.redirect_url}}` | URL de l'offre | `"https://www.adzuna.fr/..."` |
| `{{5.location.display_name}}` | Ville | `"Paris"` |
| `{{5.location.area[0]}}` | Pays | `"France"` |

---

## 🔑 Configuration Adzuna (Module 4)

### 1. Créer un compte Adzuna API

1. Aller sur [https://developer.adzuna.com/](https://developer.adzuna.com/)
2. S'inscrire (gratuit)
3. Obtenir : **App ID** et **App Key**

### 2. Configuration du module "HTTP - Make a request"

**URL** :
```
https://api.adzuna.com/v1/api/jobs/fr/search/1
```

**Method** : `GET`

**Query String** :

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `app_id` | `YOUR_APP_ID` | Votre App ID Adzuna |
| `app_key` | `YOUR_APP_KEY` | Votre App Key Adzuna |
| `results_per_page` | `10` | Nombre de résultats |
| `what` | `{{3.profession}}` | Profession de l'utilisateur (ex: "Développeur") |
| `where` | `{{3.city}}` | Ville de l'utilisateur (ex: "Paris") |
| `max_days_old` | `7` | Offres des 7 derniers jours |
| `sort_by` | `date` | Trier par date |

**Exemple d'URL complète** :
```
https://api.adzuna.com/v1/api/jobs/fr/search/1?app_id=abc123&app_key=xyz789&results_per_page=10&what=Développeur&where=Paris&max_days_old=7&sort_by=date
```

---

## 🧪 Test du Scénario

### Test 1 : Backend seul (avec cURL)

```bash
curl -X POST http://localhost:3000/api/webhook/process-job \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "VOTRE_USER_ID",
    "job_title": "Développeur Full Stack",
    "company": "Test Company",
    "description": "Poste intéressant",
    "job_url": "https://example.com/job/12345",
    "city": "Paris",
    "country": "France"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Candidature envoyée avec succès",
  "data": {
    "application_id": "uuid-app",
    "subject": "Candidature Développeur Full Stack - John Doe",
    "cover_letter": "...",
    "status": "sent",
    "email_sent": true,
    "execution_time_ms": 2345
  }
}
```

**Logs backend attendus** :
```
🔔 Nouveau job reçu: 2026-01-30T...
Body: { user_id: "...", job_title: "...", ... }
📋 Récupération utilisateur + CV (jointure)...
✅ Utilisateur: John Doe
✅ CV trouvé: 5 ans d'expérience
💼 Création/récupération de l'offre (détails Adzuna fournis)...
   Titre: Développeur Full Stack
   Entreprise: Test Company
   URL: https://example.com/job/12345
🔍 Vérification si l'offre existe déjà...
📝 Création de la nouvelle offre...
✅ Nouvelle offre créée (ID: uuid-job)
✅ Offre: Développeur Full Stack chez Test Company (ID: uuid-job)
🤖 Génération de la lettre avec Groq (tentative 1)...
✅ Lettre générée avec succès
📧 Envoi automatique activé, envoi de l'email...
✅ Email envoyé avec succès
📱 Envoi SMS de notification...
✅ SMS envoyé avec succès
⏱️ Temps total: 2345ms
📊 Statut final: sent
🎉 Processus terminé!
```

---

### Test 2 : Scénario Make.com complet

#### Étape 1 : Préparer les données

1. **Créer un utilisateur dans Supabase** :
```sql
INSERT INTO users (id, email, full_name, phone, profession, city, country, auto_send_enabled)
VALUES (
  'abc-123-def',
  'test@example.com',
  'John Doe',
  '+33612345678',
  'Développeur',
  'Paris',
  'France',
  true
);
```

2. **Créer un CV pour cet utilisateur** :
```sql
INSERT INTO cvs (id, user_id, file_url, skills, experience_years, education)
VALUES (
  'cv-123',
  'abc-123-def',
  'https://storage.supabase.co/cvs/john-cv.pdf',
  ARRAY['React', 'Node.js', 'TypeScript'],
  5,
  'Master Informatique'
);
```

#### Étape 2 : Lancer le scénario Make.com

1. Cliquer sur "Run once" dans Make.com
2. Observer les modules s'exécuter
3. Vérifier le module HTTP (Module 6) :
   - Status : `200 OK`
   - Response : `{ "success": true, ... }`

#### Étape 3 : Vérifier les résultats

**Dans Supabase** :
```sql
-- Vérifier la création de l'offre
SELECT * FROM job_offers ORDER BY scraped_at DESC LIMIT 1;

-- Vérifier la création de l'application
SELECT * FROM applications ORDER BY applied_at DESC LIMIT 1;

-- Vérifier le statut
SELECT status FROM applications WHERE id = 'application_id';
-- Résultat attendu: 'sent' (si auto_send_enabled = true)
```

**Dans le Dashboard frontend** :
1. Ouvrir `http://localhost:5173/dashboard`
2. Voir la bannière : 🚀 Recherche Active (vert)
3. Voir la nouvelle candidature dans le tableau
4. Status : "Envoyé" (badge vert)

**SMS reçu sur le téléphone** :
```
✅ Candidature envoyée pour Développeur Full Stack chez Test Company !
```

---

## 📊 Flux Complet

```
1. Make.com (Scheduler) → Toutes les heures
   ↓
2. Supabase → Récupère users avec auto_send_enabled = true
   ↓
3. Iterator → Pour chaque utilisateur
   ↓
4. Adzuna API → Recherche offres (profession + ville)
   ↓
5. Iterator → Pour chaque offre trouvée
   ↓
6. HTTP POST → Webhook backend
   {
     "user_id": "uuid",
     "job_title": "...",
     "company": "...",
     "job_url": "...",
     ...
   }
   ↓
7. Backend → createOrGetJobOffer()
   ↓ (Vérifie si job_url existe)
   ↓
8. Backend → Groq génère lettre
   ↓
9. Backend → Envoie email (si auto_send_enabled)
   ↓
10. Backend → Envoie SMS
   ↓
11. Supabase → Sauvegarde application (status: 'sent')
   ↓
12. Frontend Realtime → Applications.tsx se met à jour
   ↓
13. Utilisateur voit la candidature dans /applications
```

---

## 🚀 Déploiement Backend (Production)

Pour que Make.com puisse atteindre votre backend, vous devez le déployer en ligne.

### Option 1 : Render (Gratuit, Recommandé)

1. Créer un compte sur [https://render.com/](https://render.com/)
2. Cliquer sur "New +" → "Web Service"
3. Connecter votre repo GitHub
4. Configuration :
   - **Name** : `smart-recruiter-backend`
   - **Environment** : `Node`
   - **Build Command** : `cd backend && npm install && npm run build`
   - **Start Command** : `cd backend && npm start`
   - **Instance Type** : `Free`
5. Ajouter les variables d'environnement (voir `.env`)
6. Déployer
7. Render vous donne une URL : `https://smart-recruiter-backend.onrender.com`
8. URL du webhook : `https://smart-recruiter-backend.onrender.com/api/webhook/process-job`

### Option 2 : Railway (Gratuit, Simple)

1. Créer un compte sur [https://railway.app/](https://railway.app/)
2. "New Project" → "Deploy from GitHub repo"
3. Sélectionner votre repo
4. Railway détecte automatiquement Node.js
5. Ajouter les variables d'environnement
6. Déployer
7. URL : `https://abc123.up.railway.app/api/webhook/process-job`

### Option 3 : ngrok (Dev/Test uniquement)

1. Télécharger [ngrok](https://ngrok.com/)
2. Lancer votre backend : `npm run dev`
3. Dans un autre terminal : `ngrok http 3000`
4. Copier l'URL : `https://abc123.ngrok.io`
5. URL du webhook : `https://abc123.ngrok.io/api/webhook/process-job`

⚠️ **Attention** : ngrok génère une nouvelle URL à chaque redémarrage (version gratuite)

---

## 🐛 Troubleshooting

### Erreur : "user_id et job_id sont requis"

**Cause** : Ancien format détecté  
**Solution** : Vérifier que le body contient bien `job_title`, `company`, `job_url`

### Erreur : "Utilisateur ou CV introuvable"

**Cause** : user_id invalide ou pas de CV  
**Solution** : Vérifier que l'utilisateur existe et a un CV dans Supabase

### Erreur : "Erreur création/récupération offre"

**Cause** : Problème de connexion Supabase ou données manquantes  
**Solution** : Vérifier les logs backend pour plus de détails

### Make.com : HTTP 404

**Cause** : URL incorrecte  
**Solution** : Vérifier que l'URL est bien `/api/webhook/process-job` (avec `/api`)

### Make.com : HTTP 500

**Cause** : Erreur backend  
**Solution** : Vérifier les logs du backend pour identifier l'erreur

### Email non envoyé

**Cause** : `auto_send_enabled = false` ou erreur SMTP  
**Solution** : Vérifier `auto_send_enabled` et les credentials SMTP

### SMS non reçu

**Cause** : Twilio non configuré ou numéro invalide  
**Solution** : Vérifier les variables Twilio dans `.env`

---

## 📋 Checklist Finale

### Backend

- [ ] `createOrGetJobOffer` créé dans `supabase.service.ts`
- [ ] Route `/process-job` modifiée pour accepter les deux formats
- [ ] Variables d'environnement configurées (`.env`)
- [ ] Backend démarré : `cd backend && npm run dev`
- [ ] Test cURL réussi

### Make.com

- [ ] Compte Adzuna API créé (App ID + App Key)
- [ ] Module 1 : Scheduler configuré
- [ ] Module 2 : Supabase search users configuré
- [ ] Module 3 : Iterator users configuré
- [ ] Module 4 : HTTP Adzuna configuré
- [ ] Module 5 : Iterator offres configuré
- [ ] Module 6 : HTTP webhook configuré
- [ ] URL du webhook correcte (ngrok/Render/Railway)
- [ ] Body JSON correct avec variables `{{...}}`
- [ ] Test "Run once" réussi

### Supabase

- [ ] Table `users` contient un utilisateur avec `auto_send_enabled = true`
- [ ] Table `cvs` contient un CV pour cet utilisateur
- [ ] Realtime activé pour `users` et `applications`

### Frontend

- [ ] Bannière `StatusBanner` affichée sur Dashboard
- [ ] Applications.tsx avec Realtime activé
- [ ] Test : Toggle auto_send → Bannière change de couleur

---

## 🎉 Résultat Final

Quand tout fonctionne :

1. **Make.com** s'exécute toutes les heures
2. **Adzuna** trouve 10 nouvelles offres
3. **Backend** traite chaque offre :
   - Crée l'offre dans `job_offers` (si nouvelle)
   - Génère une lettre avec Groq
   - Envoie l'email (si `auto_send_enabled`)
   - Envoie un SMS
   - Sauvegarde dans `applications`
4. **Frontend** se met à jour en temps réel
5. **Utilisateur** reçoit un SMS et voit la candidature dans son dashboard

**Temps total par offre** : ~2-3 secondes  
**Automatisation** : 100% autonome  
**Intervention manuelle** : Aucune

---

**✅ Vous êtes prêt pour votre soutenance M1 !**

**Documents à présenter** :
- `MAKE_INTEGRATION_GUIDE.md` (ce fichier)
- `PROJECT_DOCUMENTATION.md` (architecture complète)
- `IMPROVEMENTS_M1.md` (améliorations niveau Master)
- `NEW_FEATURES_EMAIL_SMS.md` (email + SMS)
