# 🎓 Configuration Backend - Projet Stage Master 1

## Installation des dépendances

```bash
cd backend
npm install
```

**Dépendances déjà installées :**
- ✅ `express` - Serveur web
- ✅ `@supabase/supabase-js` - Client Supabase
- ✅ `groq-sdk` - IA pour lettres de motivation
- ✅ `cors` - Cross-Origin Resource Sharing
- ✅ `dotenv` - Variables d'environnement
- ✅ `typescript` - TypeScript
- ✅ `nodemailer` - Envoi d'emails (optionnel)

---

## Fichier .env (Configuration)

Créez ou vérifiez le fichier `backend/.env` avec ce contenu :

```env
# Port du serveur
PORT=3000

# Groq API (pour génération de lettres avec IA)
# 🔑 Obtenez votre clé sur https://console.groq.com (gratuit)
GROQ_API_KEY=your_groq_api_key_here

# Supabase (votre base de données)
SUPABASE_URL=https://doyqvufcofebzsiswddq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveXF2dWZjb2ZlYnpzaXN3ZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTkwMjMsImV4cCI6MjA4NTI3NTAyM30.zmONt-q0IrFjo_jrXG82N2QPUzyGEQ8hNA8l2YXfvU0

# Frontend (pour CORS)
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development

# SMTP Gmail (optionnel - pour envoi emails automatique)
SMTP_USER=rolandlontsie604@gmail.com
SMTP_PASSWORD=Genielogiciel1997.@
```

**✅ Votre `.env` est déjà configuré avec les bonnes valeurs !**

---

## Structure du Backend

```
backend/
├── src/
│   ├── index.ts                    # 🚀 Serveur Express principal
│   ├── services/
│   │   ├── supabase.service.ts     # 📊 supabaseClient.js (interactions DB)
│   │   ├── groq.service.ts         # 🤖 aiService.js (génération lettres IA)
│   │   └── email.service.ts        # 📧 Service emails (optionnel)
│   └── routes/
│       └── webhook.routes.ts       # 🔗 Routes webhook Make.com
├── .env                            # 🔐 Variables d'environnement
├── package.json                    # 📦 Dépendances
└── tsconfig.json                   # ⚙️ Configuration TypeScript
```

**Organisation propre ✅** :
- ✅ `server.js` → `src/index.ts`
- ✅ `supabaseClient.js` → `src/services/supabase.service.ts`
- ✅ `aiService.js` → `src/services/groq.service.ts`

---

## Démarrage du serveur

```bash
npm run dev
```

**Vous devriez voir :**

```
🔧 Vérification de la configuration...
✅ Toutes les variables d'environnement sont définies

╔═══════════════════════════════════════════╗
║   🚀 Smart Recruiter API démarrée       ║
╚═══════════════════════════════════════════╝

🌐 Serveur en écoute sur le port 3000
📍 URL: http://localhost:3000

📚 Endpoints disponibles:
   POST /api/webhook/process-job - Webhook simplifié
```

---

## Route principale : POST /api/webhook/process-job

### Utilisation avec Make.com

**URL du webhook :** `http://localhost:3000/api/webhook/process-job`

**Body JSON attendu :**

```json
{
  "user_id": "uuid-de-l-utilisateur",
  "job_id": "uuid-de-l-offre"
}
```

### Processus automatique (4 étapes)

```
1️⃣ Jointure users + cvs (récupère utilisateur avec son premier CV)
    ↓
2️⃣ Récupère l'offre d'emploi dans job_offers
    ↓
3️⃣ Appelle Groq (llama3-8b-8192) pour générer la lettre
    ↓
4️⃣ Insert dans applications avec status: 'pending'
```

### Réponse de l'API

**Succès (200) :**

```json
{
  "success": true,
  "message": "Lettre générée et application créée",
  "data": {
    "application_id": "uuid-application",
    "cover_letter": "Contenu de la lettre générée...",
    "status": "pending",
    "execution_time_ms": 1234
  }
}
```

**Erreur (400/404/500) :**

```json
{
  "success": false,
  "error": "Message d'erreur détaillé"
}
```

---

## Test manuel de l'API

### 1. Health check

```bash
curl http://localhost:3000/health
```

### 2. Test de génération de lettre

```bash
curl -X POST http://localhost:3000/api/webhook/process-job \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "VOTRE_USER_ID",
    "job_id": "VOTRE_JOB_ID"
  }'
```

**Pour obtenir vos IDs de test :**

1. **user_id** : Allez dans Supabase → Table Editor → `users` → Copiez un `id`
2. **job_id** : Allez dans Supabase → Table Editor → `job_offers` → Copiez un `id`

---

## Service Groq (IA)

### Modèle utilisé

**`llama3-8b-8192`** - Modèle rapide et efficace pour génération de texte

### Prompt optimisé

Le prompt utilise :
- ✅ Nom de l'utilisateur
- ✅ Profession et expérience
- ✅ Compétences du CV
- ✅ Description du poste
- ✅ Entreprise cible

### Caractéristiques de la lettre générée

- 📝 **Longueur** : 150-200 mots (courte et percutante)
- 🎯 **Ton** : Direct, professionnel et motivé
- 🚀 **Contenu** : 2-3 compétences clés en lien avec le poste
- 🇫🇷 **Langue** : Français uniquement

---

## Base de données Supabase

### Tables utilisées

1. **`users`** - Profil utilisateur
   - `id`, `full_name`, `profession`, `city`, `country`, etc.

2. **`cvs`** - CV des utilisateurs
   - `id`, `user_id`, `skills`, `experience_years`, `education`, etc.

3. **`job_offers`** - Offres d'emploi
   - `id`, `title`, `company`, `description`, etc.

4. **`applications`** - Candidatures
   - `id`, `user_id`, `cv_id`, `job_offer_id`, `cover_letter`, `status`

### Jointure utilisée

```typescript
const { data } = await supabase
  .from('users')
  .select(`
    *,
    cvs!inner (
      id, file_url, skills, experience_years, education
    )
  `)
  .eq('id', user_id)
  .single();
```

Cette requête récupère l'utilisateur **avec son premier CV** en une seule requête.

---

## Intégration Make.com

### Scénario type pour votre stage

```
[Trigger Manual ou Webhook]
    ↓
[Get Job Offers from Supabase]
    ↓
[Get Users from Supabase]
    ↓
[For each user]
    ↓
[HTTP POST to /api/webhook/process-job]
    {
      "user_id": "{{user.id}}",
      "job_id": "{{job.id}}"
    }
    ↓
[Log Response]
```

### Configuration du module HTTP dans Make.com

- **URL** : `http://localhost:3000/api/webhook/process-job`
- **Method** : POST
- **Headers** : `Content-Type: application/json`
- **Body** :
  ```json
  {
    "user_id": "{{user_id}}",
    "job_id": "{{job_id}}"
  }
  ```

---

## Logs détaillés

Le serveur affiche des logs clairs pour le débogage :

```
🔔 Nouveau job reçu: 2026-01-30T...
Body: {
  "user_id": "...",
  "job_id": "..."
}

📋 Récupération utilisateur + CV (jointure)...
✅ Utilisateur: John Doe
✅ CV trouvé: 5 ans d'expérience

💼 Récupération de l'offre...
✅ Offre: Développeur Full Stack chez Google

🤖 Génération de la lettre avec Groq (llama3-8b-8192)...
✅ Lettre générée (180 mots)

💾 Sauvegarde dans applications...
✅ Application sauvegardée (ID: uuid)

⏱️ Temps total: 1234ms
🎉 Processus terminé!
```

---

## Différence entre les 2 routes

### POST /api/webhook/process-job (RECOMMANDÉ POUR VOTRE STAGE)

✅ Route simplifiée et optimisée  
✅ Génère la lettre avec Groq  
✅ Sauvegarde dans DB avec `status: 'pending'`  
✅ Pas d'envoi d'email automatique  
✅ Idéal pour démonstration de stage  

**Body :** `{ user_id, job_id }`

---

### POST /api/webhook/new-job (Version complète)

⚡ Version avancée  
⚡ Génère la lettre + Envoie par email  
⚡ Sauvegarde avec `status: 'sent'`  
⚡ Crée une notification  
⚡ Pour production réelle  

**Body :** `{ user_id, job_offer_id, recipient_email? }`

---

## Commandes utiles

```bash
# Démarrer en mode développement (hot reload)
npm run dev

# Compiler TypeScript
npm run build

# Démarrer en production
npm start

# Voir les logs en temps réel
npm run dev | tee logs.txt
```

---

## Troubleshooting

### ❌ Erreur "supabaseUrl is required"
→ Les variables d'environnement ne sont pas chargées  
→ **Solution :** Vérifiez que le fichier `.env` existe dans `backend/`

### ❌ Erreur "Utilisateur ou CV introuvable"
→ Le user_id n'existe pas ou l'utilisateur n'a pas de CV  
→ **Solution :** Créez un CV via le frontend ou la table `cvs` dans Supabase

### ❌ Erreur "Offre d'emploi introuvable"
→ Le job_id n'existe pas  
→ **Solution :** Créez une offre dans la table `job_offers`

### ❌ Erreur Groq API
→ Clé API invalide ou quota dépassé  
→ **Solution :** Vérifiez `GROQ_API_KEY` dans `.env`

---

## Prochaines étapes pour votre stage

1. ✅ **Backend opérationnel** (déjà fait !)
2. 📊 **Tester avec Postman/cURL** (voir exemples ci-dessus)
3. 🔗 **Connecter Make.com** à votre webhook
4. 📈 **Créer un scénario** d'automatisation
5. 🎓 **Documenter** pour votre rapport de stage

---

**Temps de setup : 2 minutes ⏱️**  
**Prêt pour votre démonstration de stage ! 🎉**
