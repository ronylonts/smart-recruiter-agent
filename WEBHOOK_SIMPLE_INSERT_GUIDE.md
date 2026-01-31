# 🚀 Guide : Route Simplifiée `/api/webhook/simple-insert`

## 📌 Objectif

Cette route **ultra-simplifiée** permet de tester rapidement l'insertion de jobs et d'applications dans votre dashboard **SANS** :
- ❌ Génération de lettre par IA (Groq)
- ❌ Envoi d'email
- ❌ Système de retry complexe
- ❌ Validation des profils utilisateurs

Elle fait **uniquement** :
1. ✅ Extraire les données Adzuna
2. ✅ Insérer dans `job_offers`
3. ✅ Insérer dans `applications` avec status `'sent'` (= "Envoyé")

---

## 📡 URL du Webhook

### Production (Render)
```
https://smart-recruiter-agent.onrender.com/api/webhook/simple-insert
```

### Développement (LocalTunnel)
```
https://your-tunnel-url.loca.lt/api/webhook/simple-insert
```

---

## 📦 Body Attendu (Make.com - Module 6 HTTP)

```json
{
  "user_id": "29e5e5fe-23df-4069-9350-36742dfa4d2a",
  "title": "{{5.data.results[0].title}}",
  "company": "{{5.data.results[0].company.display_name}}",
  "city": "{{5.data.results[0].location.display_name}}",
  "url": "{{5.data.results[0].redirect_url}}"
}
```

**Note** : Le `user_id` est **optionnel**. Si vous ne le fournissez pas, il utilisera automatiquement `'29e5e5fe-23df-4069-9350-36742dfa4d2a'` (votre compte actuel).

---

## 🔧 Configuration Make.com (Module 6 - HTTP Request)

### 1. **URL**
```
https://smart-recruiter-agent.onrender.com/api/webhook/simple-insert
```

### 2. **Method**
```
POST
```

### 3. **Body type**
```
application/json
```

### 4. **Request content (Body)**
```json
{
  "user_id": "29e5e5fe-23df-4069-9350-36742dfa4d2a",
  "title": "{{5.data.results[0].title}}",
  "company": "{{5.data.results[0].company.display_name}}",
  "city": "{{5.data.results[0].location.display_name}}",
  "url": "{{5.data.results[0].redirect_url}}"
}
```

### 5. **Timeout**
```
40 secondes (ou moins, car la réponse est immédiate)
```

---

## ✅ Comportement de la Route

### 🚀 Réponse Immédiate
La route **répond immédiatement** `200 OK` pour éviter le timeout de Make.com :
```
OK
```

### 🔄 Traitement en Arrière-Plan
Ensuite, elle **continue en arrière-plan** :

```
📥 EXTRACTION
   ↓
🏢 INSERTION dans job_offers (récupération de l'ID)
   ↓
📝 RÉCUPÉRATION du CV de l'utilisateur
   ↓
📨 INSERTION dans applications (avec job_offer_id + status 'sent')
   ↓
🎉 SUCCÈS
```

---

## 📊 Vérification des Résultats

### 1. **Supabase - Table `job_offers`**
Allez dans **Supabase** > **Table Editor** > **job_offers**

Vous devriez voir une **nouvelle ligne** avec :
- `title` : Le titre du job (ex: "Développeur React")
- `company` : Le nom de l'entreprise (ex: "Google")
- `city` : La ville (ex: "Paris")
- `job_url` : Le lien Adzuna

### 2. **Supabase - Table `applications`**
Allez dans **Supabase** > **Table Editor** > **applications**

Vous devriez voir une **nouvelle ligne** avec :
- `user_id` : `29e5e5fe-23df-4069-9350-36742dfa4d2a`
- `job_offer_id` : L'ID du job que vous venez de créer
- `status` : `sent` (= "Envoyé")
- `cover_letter` : Une lettre générée automatiquement (texte simple)
- `applied_at` : Date/heure actuelle

### 3. **Frontend - Dashboard**
Allez sur **http://localhost:5173/dashboard**

Vous devriez voir :
- **"Candidatures envoyées"** : **1** (ou plus)
- La barre de progression **"Recherche Active"** devrait se remplir

### 4. **Frontend - Applications**
Allez sur **http://localhost:5173/applications**

Filtre sur **"Envoyé"** → Vous devriez voir la candidature !

---

## 🐛 Debugging

### Logs Render
Pour voir les logs détaillés, allez sur **Render** > **Votre service** > **Logs**

Vous verrez :
```
🔔 [SIMPLE-INSERT] Webhook reçu: 2026-01-29T...
📦 Body reçu: { ... }

--- DÉBUT TRAITEMENT EN ARRIÈRE-PLAN ---
✅ user_id: 29e5e5fe-23df-4069-9350-36742dfa4d2a
✅ title: Développeur React
✅ company: Google
✅ city: Paris
✅ url: https://...

📌 ÉTAPE 2 : Insertion dans job_offers...
✅ Job inséré avec succès !
   ID: abc-123...

📌 ÉTAPE 3 : Récupération du CV...
✅ CV trouvé ! ID: def-456...

📌 ÉTAPE 4 : Insertion dans applications...
✅ Application insérée avec succès !
   ID: ghi-789...
   Status: sent

🎉 🎉 🎉 TRAITEMENT TERMINÉ AVEC SUCCÈS ! 🎉 🎉 🎉
```

### Erreurs Possibles

#### ❌ "CV introuvable pour user_id"
**Cause** : Vous n'avez pas de CV uploadé dans Supabase.

**Solution** : 
1. Allez sur **http://localhost:5173/upload-cv**
2. Uploadez un CV PDF
3. Retestez Make.com

#### ❌ "Données manquantes - title, company ou url absents"
**Cause** : Make.com envoie des valeurs vides (`"0"`, `null`, etc.)

**Solution** :
1. Vérifiez que le Module 5 (Adzuna) renvoie bien des résultats
2. Vérifiez les mappings dans le Module 6 (HTTP)
3. Testez avec un autre mot-clé de recherche

---

## 🔄 Migration vers la Route Complète

Une fois que cette route fonctionne, vous pourrez utiliser la route complète `/api/webhook/process-job` qui :
- ✅ Génère une **vraie lettre** avec Groq
- ✅ Envoie un **email** au recruteur
- ✅ Envoie un **SMS** de notification
- ✅ Gère les **retries** en cas d'erreur IA

---

## 📞 Support

Si vous avez des erreurs, partagez :
1. **Capture d'écran** des logs Render
2. **Capture d'écran** de l'erreur Make.com
3. **Capture d'écran** des tables Supabase (job_offers, applications)
