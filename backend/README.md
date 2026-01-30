# Smart Recruiter Backend API 🚀

Backend Node.js + Express + TypeScript pour l'envoi automatique de candidatures.

## Stack technique

- **Node.js** + **TypeScript**
- **Express** - Framework web
- **Groq SDK** - Génération de lettres de motivation IA
- **Nodemailer** - Envoi d'emails avec pièces jointes
- **Supabase** - Base de données et stockage
- **CORS** - Sécurité cross-origin

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copiez `.env.example` vers `.env`
2. Remplissez les variables d'environnement :

### Variables requises :

#### GROQ_API_KEY
- Obtenez votre clé sur https://console.groq.com
- Gratuit avec quota généreux
- Utilisé pour générer les lettres de motivation

#### SMTP_USER et SMTP_PASSWORD
- Utilisez un compte Gmail
- Activez l'authentification à 2 facteurs
- Générez un "App Password" : https://myaccount.google.com/apppasswords
- Utilisez ce mot de passe d'application (16 caractères sans espaces)

#### SUPABASE_URL et SUPABASE_ANON_KEY
- Déjà configurés dans le `.env`
- Copiés depuis votre frontend

## Démarrage

### Mode développement (avec hot reload) :

```bash
npm run dev
```

### Mode production :

```bash
npm run build
npm start
```

Le serveur démarre sur **http://localhost:3000**

## Endpoints

### 1. `GET /`
Informations sur l'API

**Réponse :**
```json
{
  "success": true,
  "message": "Smart Recruiter API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /api/webhook/health",
    "webhook": "POST /api/webhook/new-job"
  }
}
```

### 2. `GET /health`
Health check global

**Réponse :**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-29T...",
  "uptime": 123.45
}
```

### 3. `GET /api/webhook/health`
Health check du webhook

**Réponse :**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-01-29T...",
  "environment": "development"
}
```

### 4. `POST /api/webhook/new-job` ⭐
**Endpoint principal** - Webhook pour Make.com

**Body :**
```json
{
  "user_id": "uuid-de-l-utilisateur",
  "job_offer_id": "uuid-de-l-offre",
  "recipient_email": "recruteur@entreprise.com" // Optionnel
}
```

**Processus automatique :**
1. ✅ Récupère le profil utilisateur
2. ✅ Vérifie si `auto_send_enabled = true`
3. ✅ Récupère le CV de l'utilisateur
4. ✅ Récupère les détails de l'offre d'emploi
5. ✅ Génère une lettre de motivation avec Groq AI
6. ✅ Envoie un email avec CV + lettre
7. ✅ Sauvegarde dans la table `applications`
8. ✅ Crée une notification pour l'utilisateur

**Réponse succès :**
```json
{
  "success": true,
  "message": "Candidature envoyée avec succès",
  "data": {
    "application_id": "uuid-application",
    "email_sent": true,
    "cover_letter_generated": true,
    "execution_time_ms": 3456
  }
}
```

**Réponse erreur :**
```json
{
  "success": false,
  "error": "Message d'erreur détaillé"
}
```

## Services

### 1. `supabase.service.ts`

Fonctions pour interagir avec Supabase :

- `getUserProfile(userId)` - Récupère le profil utilisateur
- `getUserCV(userId)` - Récupère le CV le plus récent
- `getJobOffer(jobOfferId)` - Récupère une offre d'emploi
- `createApplication(data)` - Crée une candidature
- `createNotification(data)` - Crée une notification
- `downloadFile(filePath)` - Télécharge un fichier depuis Storage

### 2. `groq.service.ts`

Génération de lettres de motivation avec IA :

- `generateCoverLetter(userProfile, jobOffer, cvData)` - Génère une lettre personnalisée
- `generateSimpleCoverLetter(...)` - Fallback sans IA

**Modèle utilisé :** `llama-3.3-70b-versatile`

**Caractéristiques :**
- Lettre de 200-250 mots
- Ton professionnel mais pas trop formel
- Personnalisée selon le profil et l'offre
- En français

### 3. `email.service.ts`

Envoi d'emails avec Nodemailer :

- `sendApplication(jobOffer, cvUrl, coverLetter, userProfile, recipientEmail)` - Envoie une candidature
- `verifyEmailConfig()` - Vérifie la configuration SMTP

**Configuration :**
- Service : Gmail SMTP
- Authentification : App Password
- Pièce jointe : CV en PDF
- Format : HTML + texte brut

## Configuration Gmail SMTP

### Étape 1 : Activer l'authentification à 2 facteurs

1. Allez sur https://myaccount.google.com/security
2. Activez "Validation en deux étapes"

### Étape 2 : Générer un mot de passe d'application

1. Allez sur https://myaccount.google.com/apppasswords
2. Sélectionnez "Mail" et "Autre (nom personnalisé)"
3. Nommez-le "Smart Recruiter"
4. Copiez le mot de passe de 16 caractères
5. Collez-le dans `.env` → `SMTP_PASSWORD`

### Étape 3 : Configurer .env

```env
SMTP_USER=votre.email@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop  # 16 caractères (peut avoir des espaces)
```

## Configuration Groq API

### Obtenir une clé API :

1. Allez sur https://console.groq.com
2. Créez un compte (gratuit)
3. Allez dans "API Keys"
4. Créez une nouvelle clé
5. Copiez la clé dans `.env` → `GROQ_API_KEY`

**Quota gratuit :** 
- ~14,400 requêtes/jour
- Largement suffisant pour l'envoi automatique

## Test du webhook

### Avec cURL :

```bash
curl -X POST http://localhost:3000/api/webhook/new-job \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "votre-user-id",
    "job_offer_id": "votre-job-offer-id"
  }'
```

### Avec Postman :

1. Méthode : `POST`
2. URL : `http://localhost:3000/api/webhook/new-job`
3. Headers : `Content-Type: application/json`
4. Body (raw JSON) :
```json
{
  "user_id": "uuid-utilisateur",
  "job_offer_id": "uuid-offre"
}
```

### Avec Make.com :

1. Créez un scénario Make.com
2. Ajoutez un module "HTTP Request"
3. Configurez :
   - URL : `http://localhost:3000/api/webhook/new-job` (ou votre URL de production)
   - Method : POST
   - Headers : `Content-Type: application/json`
   - Body :
     ```json
     {
       "user_id": "{{user_id}}",
       "job_offer_id": "{{job_offer_id}}"
     }
     ```

## Logs et débogage

Le serveur affiche des logs détaillés :

```
🔔 Nouveau webhook reçu: 2026-01-29T...
Body: {
  "user_id": "...",
  "job_offer_id": "..."
}

📋 Étape 1/6 - Récupération du profil utilisateur...
✅ Utilisateur: John Doe (john@example.com)

📄 Étape 2/6 - Récupération du CV...
✅ CV trouvé (5 ans d'expérience)

💼 Étape 3/6 - Récupération de l'offre d'emploi...
✅ Offre: Développeur Full Stack chez Google

🤖 Étape 4/6 - Génération de la lettre de motivation...
✅ Lettre générée (230 mots)

📧 Étape 5/6 - Envoi de l'email...
✅ Email envoyé (ID: <message-id>)

💾 Étape 6/6 - Sauvegarde de la candidature...
✅ Candidature sauvegardée (ID: uuid)

🔔 Création de la notification...
✅ Notification créée

⏱️ Temps total: 3456ms
🎉 Processus terminé avec succès!
```

## Structure du projet

```
backend/
├── src/
│   ├── index.ts                    # Serveur Express principal
│   ├── services/
│   │   ├── supabase.service.ts     # Interactions Supabase
│   │   ├── groq.service.ts         # Génération lettres IA
│   │   └── email.service.ts        # Envoi emails
│   └── routes/
│       └── webhook.routes.ts       # Routes webhook
├── .env                            # Variables d'environnement (à créer)
├── .env.example                    # Template des variables
├── .gitignore                      # Fichiers à ignorer
├── package.json                    # Dépendances
├── tsconfig.json                   # Configuration TypeScript
└── README.md                       # Ce fichier
```

## Dépendances

### Production :
- `express` - Framework web
- `cors` - Cross-Origin Resource Sharing
- `dotenv` - Variables d'environnement
- `@supabase/supabase-js` - Client Supabase
- `groq-sdk` - SDK Groq pour IA
- `nodemailer` - Envoi d'emails
- `axios` - Requêtes HTTP

### Développement :
- `typescript` - TypeScript
- `ts-node-dev` - Hot reload pour dev
- `@types/*` - Définitions de types

## Gestion des erreurs

Toutes les fonctions retournent un objet avec `success: boolean` :

```typescript
const result = await getUserProfile(userId);

if (result.success) {
  console.log('Profil:', result.data);
} else {
  console.error('Erreur:', result.error);
}
```

## Sécurité

- ✅ **CORS** activé seulement pour le frontend
- ✅ **Validation** des paramètres
- ✅ **Try/catch** sur toutes les opérations
- ✅ **Logs détaillés** pour le débogage
- ✅ **Variables d'environnement** pour les secrets
- ✅ **.gitignore** configuré (pas de secrets commitées)

## Intégration Make.com

### Scénario type :

1. **Trigger** : Nouvelle offre d'emploi détectée (scraping, RSS, etc.)
2. **Filter** : Correspondance avec profils utilisateurs
3. **HTTP Request** : Appel à votre webhook
4. **Response** : Confirmation d'envoi

### Exemple de scénario :

```
[RSS Feed Indeed]
    ↓
[Filter: profession = "Développeur"]
    ↓
[Get Users from Supabase where auto_send_enabled = true]
    ↓
[For each user]
    ↓
[HTTP POST to /api/webhook/new-job]
    ↓
[Log response]
```

## Troubleshooting

### Erreur "GROQ_API_KEY missing"
→ Ajoutez votre clé Groq dans `.env`

### Erreur "Invalid login" SMTP
→ Utilisez un App Password, pas votre mot de passe Gmail

### Erreur "User not found"
→ Vérifiez que `user_id` existe dans la table `users`

### Erreur "CV not found"
→ L'utilisateur doit d'abord upload un CV

### Erreur "auto_send_enabled is null"
→ Exécutez la migration SQL pour ajouter la colonne

## Support

Pour toute question, consultez :
- `src/services/*.ts` - Code source des services
- Logs du serveur - Informations détaillées
- Documentation Groq : https://console.groq.com/docs
- Documentation Nodemailer : https://nodemailer.com

---

**Version :** 1.0.0  
**Port par défaut :** 3000  
**Auteur :** Smart Recruiter Team
