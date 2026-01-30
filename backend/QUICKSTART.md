# 🚀 Démarrage rapide - Backend

## Installation (1 minute)

```bash
cd backend
npm install
```

✅ **Déjà fait !** Les dépendances sont installées.

---

## Configuration (5 minutes)

### 1. Fichier `.env` déjà créé

Le fichier `.env` existe déjà avec vos clés Supabase. Complétez-le :

```env
# ✅ Déjà configuré
SUPABASE_URL=https://doyqvufcofebzsiswddq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI...

# ⚠️ À CONFIGURER :
GROQ_API_KEY=votre_clé_groq_ici
SMTP_USER=votre_email@gmail.com
SMTP_PASSWORD=votre_app_password_16_caracteres
```

### 2. Obtenir une clé Groq API (GRATUIT)

1. Allez sur https://console.groq.com
2. Créez un compte (gratuit)
3. Allez dans "API Keys"
4. Cliquez "Create API Key"
5. Copiez la clé (commence par `gsk_...`)
6. Collez dans `.env` → `GROQ_API_KEY=gsk_...`

### 3. Configurer Gmail SMTP

#### Option A : Générer un App Password (RECOMMANDÉ)

1. Allez sur https://myaccount.google.com/apppasswords
2. Sélectionnez "Mail" → "Autre"
3. Nommez "Smart Recruiter"
4. Cliquez "Générer"
5. Copiez le mot de passe de 16 caractères
6. Dans `.env` :
   ```env
   SMTP_USER=votre.email@gmail.com
   SMTP_PASSWORD=abcdefghijklmnop
   ```

#### Option B : Utiliser Mailtrap (pour tests)

Si vous voulez juste tester sans envoyer de vrais emails :

1. Créez un compte sur https://mailtrap.io (gratuit)
2. Copiez les identifiants SMTP
3. Modifiez `email.service.ts` :
   ```typescript
   const transporter = nodemailer.createTransport({
     host: 'smtp.mailtrap.io',
     port: 2525,
     auth: {
       user: 'votre_username_mailtrap',
       pass: 'votre_password_mailtrap'
     }
   });
   ```

---

## Démarrage (10 secondes)

```bash
npm run dev
```

**Vous devriez voir :**

```
🔧 Vérification de la configuration...

✅ Toutes les variables d'environnement sont définies

📧 Vérification de la configuration SMTP...
✅ Configuration SMTP valide

╔═══════════════════════════════════════════╗
║   🚀 Smart Recruiter API démarrée       ║
╚═══════════════════════════════════════════╝

🌐 Serveur en écoute sur le port 3000
📍 URL: http://localhost:3000
🌍 CORS activé pour: http://localhost:5173

📚 Endpoints disponibles:
   GET  / - Informations API
   GET  /health - Health check
   GET  /api/webhook/health - Health check webhook
   POST /api/webhook/new-job - Webhook pour nouvelles offres

✨ Prêt à recevoir des webhooks!
```

---

## Test rapide

### 1. Health check :

```bash
curl http://localhost:3000/health
```

**Réponse attendue :**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-29T...",
  "uptime": 5.123
}
```

### 2. Test webhook (avec vos vraies données) :

```bash
curl -X POST http://localhost:3000/api/webhook/new-job \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "VOTRE_USER_ID_ICI",
    "job_offer_id": "VOTRE_JOB_OFFER_ID_ICI"
  }'
```

**Pour obtenir vos IDs :**

1. **user_id** : Connectez-vous sur le frontend → Ouvrez la console (F12) → Tapez :
   ```javascript
   supabase.auth.getUser().then(d => console.log(d.data.user.id))
   ```

2. **job_offer_id** : Créez une offre manuelle dans Supabase → Table Editor → `job_offers` → Insert row

---

## Workflow complet

```
Make.com détecte nouvelle offre
        ↓
    [Filtre par profession]
        ↓
    Récupère users avec auto_send_enabled = true
        ↓
    Pour chaque user:
        ↓
    POST /api/webhook/new-job
        ↓
    ┌─────────────────────────────────┐
    │ 1. Récupère profil utilisateur  │
    │ 2. Récupère CV                  │
    │ 3. Récupère offre d'emploi      │
    │ 4. Génère lettre avec Groq      │
    │ 5. Envoie email + CV            │
    │ 6. Sauvegarde dans DB           │
    │ 7. Crée notification            │
    └─────────────────────────────────┘
        ↓
    Retourne success: true
        ↓
    Make.com log le résultat
```

---

## Prochaines étapes

1. ✅ **Installation** - `npm install` (déjà fait)
2. ⚠️ **Configuration** - Complétez le `.env` (Groq + SMTP)
3. 🚀 **Démarrage** - `npm run dev`
4. 🧪 **Test** - `curl http://localhost:3000/health`
5. 📧 **Test webhook** - Envoi d'une candidature test
6. 🌐 **Make.com** - Configurez votre scénario d'automatisation

---

## Commandes utiles

```bash
# Démarrer en mode dev (hot reload)
npm run dev

# Compiler TypeScript
npm run build

# Démarrer en production
npm start

# Voir les logs détaillés
npm run dev | tee backend.log
```

---

**Temps total de setup : ~5 minutes** ⏱️

Une fois configuré, le backend enverra automatiquement des candidatures personnalisées avec lettres de motivation générées par IA ! 🎉
