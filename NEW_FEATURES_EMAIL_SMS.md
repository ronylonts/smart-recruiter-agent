# 📧📱 Nouvelles Fonctionnalités : Email + SMS + Bannière

## Résumé des implémentations (sans redondance)

Voici les 3 nouvelles fonctionnalités ajoutées au projet :

---

## 1. 📧 Service Email avec Envoi Automatique

### Fichiers modifiés :
- ✅ `backend/src/services/email.service.ts` (déjà existant, vérifié)
- ✅ `backend/src/routes/webhook.routes.ts` (modifié)
- ✅ `backend/.env` (SMTP_USER, SMTP_PASSWORD déjà configurés)

### Fonctionnement :

#### A. Vérification du champ `auto_send_enabled`

Lorsque le webhook `/api/webhook/process-job` reçoit un nouveau job :

1. **Génération de la lettre** (Groq)
2. **Vérification** : `userData.auto_send_enabled` est-il `true` ?

**Si OUI (auto_send_enabled = true)** :
```typescript
// Envoyer l'email immédiatement
const emailResult = await sendApplication(
  jobOffer,
  userData.cvs.file_url, // URL du CV
  coverLetter.body,       // Lettre générée
  { full_name, email },
  jobOffer.contact_email  // Email du recruteur
);

// Mise à jour du statut
await supabase
  .from('applications')
  .update({ 
    status: 'sent',        // ✅ Changé de 'pending' à 'sent'
    applied_at: new Date().toISOString()
  })
  .eq('id', applicationId);
```

**Si NON (auto_send_enabled = false)** :
```typescript
// Lettre générée mais pas envoyée
status: 'pending' // Reste en attente
console.log('ℹ️ Envoi automatique désactivé, lettre générée uniquement');
```

#### B. Structure de l'email envoyé

**Sujet** :
```
Candidature pour [Titre du poste] - [Nom du candidat]
```

**Corps** :
```
Bonjour,

[Lettre de motivation générée par l'IA]

Cordialement,
[Nom du candidat]
```

**Pièces jointes** :
- CV (téléchargé depuis Supabase Storage)

#### C. Logs détaillés

```bash
📧 Envoi automatique activé, envoi de l'email...
✅ Email envoyé avec succès
📊 Statut final: sent
```

Ou si échec :
```bash
⚠️ Échec envoi email: [raison]
📊 Statut final: pending (lettre générée mais pas envoyée)
```

---

## 2. 📱 Service SMS avec Twilio

### Fichiers créés :
- ✅ `backend/src/services/notification.service.ts` (nouveau)
- ✅ `backend/package.json` (ajout de `twilio`)
- ✅ `backend/.env` (ajout variables Twilio)

### Configuration Twilio

**Variables d'environnement requises** :
```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+33123456789
```

**Pour obtenir ces clés** :
1. Créer un compte sur [Twilio](https://www.twilio.com/try-twilio)
2. Vérifier votre numéro de téléphone
3. Obtenir un numéro Twilio gratuit (pour tests)
4. Copier `Account SID` et `Auth Token` depuis le Dashboard

### Fonctionnement :

#### A. Types de SMS envoyés

**1. Candidature envoyée (status: 'sent')** :
```
✅ Candidature envoyée pour Développeur Full Stack chez Google !
```

**2. Candidature générée (status: 'pending')** :
```
📨 Nouvelle candidature pour Développeur Full Stack chez Google vient d'être générée !
```

**3. Échec (status: 'failed')** :
```
❌ Échec d'envoi pour Développeur Full Stack chez Google. Consultez votre dashboard.
```

#### B. Format des numéros

Le service formate automatiquement les numéros au format international E.164 :

```typescript
// Formats acceptés :
"0612345678"      → "+33612345678"
"+33612345678"    → "+33612345678" (déjà bon)
"33612345678"     → "+33612345678"
"06 12 34 56 78"  → "+33612345678" (espaces nettoyés)
```

#### C. Intégration dans le webhook

Après l'envoi de l'email (ou la génération de la lettre) :

```typescript
// Étape 6 : Envoyer un SMS de notification à l'utilisateur
console.log('\n📱 Envoi SMS de notification...');

const smsResult = emailSent 
  ? await notifyApplicationSent(userData.phone, jobOffer.title, jobOffer.company)
  : await notifyApplicationGenerated(userData.phone, jobOffer.title, jobOffer.company);

if (smsResult.success) {
  console.log('✅ SMS envoyé avec succès');
} else {
  console.warn('⚠️ SMS non envoyé:', smsResult.error);
}
```

**Important** : L'échec du SMS n'est pas bloquant. Si Twilio n'est pas configuré ou le numéro invalide, le webhook continue normalement.

---

## 3. 🎨 Bannière de Statut sur le Dashboard

### Fichiers créés/modifiés :
- ✅ `frontend/src/components/StatusBanner.tsx` (nouveau)
- ✅ `frontend/src/pages/Dashboard.tsx` (modifié)

### Fonctionnalités :

#### A. Affichage dynamique

**Si `auto_send_enabled = true`** :

```
╔════════════════════════════════════════════════════╗
║ 🚀 Recherche Active                          ACTIF ║
║ Le système envoie automatiquement vos candidatures ║
║ ⚡ Prêt à envoyer vos prochaines candidatures...   ║
╚════════════════════════════════════════════════════╝
```

- **Couleur** : Vert (gradient green-500 to green-600)
- **Icône** : ⚡ (éclair animé)
- **Badge** : "ACTIF" (fond blanc, texte vert)
- **Barre de progression** : Animée

**Si `auto_send_enabled = false`** :

```
╔════════════════════════════════════════════════════╗
║ 💤 En Veille                              INACTIF  ║
║ Activez l'envoi automatique pour postuler...      ║
╚════════════════════════════════════════════════════╝
```

- **Couleur** : Gris (gradient gray-500 to gray-600)
- **Icône** : 🌙 (lune)
- **Badge** : "INACTIF" (fond transparent, texte blanc)
- **Pas de barre de progression**

#### B. Mise à jour en temps réel

La bannière utilise **Supabase Realtime** pour se mettre à jour instantanément :

```typescript
// Écoute les changements sur la table users
const channel = supabase
  .channel(`user-status:${user.id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    table: 'users',
    filter: `id=eq.${user.id}`
  }, (payload) => {
    // Mise à jour instantanée de l'état
    setAutoSendEnabled(payload.new.auto_send_enabled);
  })
  .subscribe();
```

**Comportement** :
1. Utilisateur clique sur le toggle "Envoi automatique"
2. **Realtime détecte** le changement dans la DB
3. **Bannière se met à jour** : Gris → Vert (ou inversement)
4. **Animation fluide** (500ms transition)

#### C. Animations

- **Fond** : Cercles animés en arrière-plan (uniquement en mode actif)
- **Icône** : Pulse (battement)
- **Badge** : Shadow + transition
- **Barre de progression** : Pulse (uniquement en mode actif)

---

## 📊 Flux Complet

### Scénario 1 : Envoi Automatique ACTIVÉ

```
1. Make.com détecte nouvelle offre
   ↓
2. POST /api/webhook/process-job
   ↓
3. Backend récupère user + CV + offre
   ↓
4. Groq génère lettre de motivation
   ↓
5. Vérification : auto_send_enabled = true ✅
   ↓
6. 📧 Envoi email (CV + lettre) → Recruteur
   ↓
7. Update DB : status = 'sent'
   ↓
8. 📱 SMS → Utilisateur : "✅ Candidature envoyée pour [Poste] chez [Entreprise] !"
   ↓
9. Frontend Realtime : Applications.tsx se met à jour
   ↓
10. Dashboard affiche : 🚀 Recherche Active (vert)
```

### Scénario 2 : Envoi Automatique DÉSACTIVÉ

```
1. Make.com détecte nouvelle offre
   ↓
2. POST /api/webhook/process-job
   ↓
3. Backend récupère user + CV + offre
   ↓
4. Groq génère lettre de motivation
   ↓
5. Vérification : auto_send_enabled = false ❌
   ↓
6. 📝 Sauvegarde lettre : status = 'pending'
   ↓
7. 📱 SMS → Utilisateur : "📨 Nouvelle candidature pour [Poste] générée !"
   ↓
8. Frontend Realtime : Applications.tsx se met à jour
   ↓
9. Dashboard affiche : 💤 En Veille (gris)
   ↓
10. Utilisateur peut modifier/envoyer manuellement depuis /applications
```

---

## 🛠️ Installation

### 1. Installer la dépendance Twilio

```bash
cd backend
npm install twilio
```

### 2. Configurer les variables d'environnement

**Fichier `backend/.env`** :
```env
# SMTP (déjà configuré)
SMTP_USER=rolandlontsie604@gmail.com
SMTP_PASSWORD=Genielogiciel1997.@

# Twilio (nouveau)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+33123456789
```

### 3. Créer un compte Twilio (gratuit)

1. Aller sur [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. S'inscrire (email + numéro de téléphone)
3. Vérifier le numéro
4. Dashboard → Obtenir un numéro Twilio gratuit
5. Copier les identifiants :
   - **Account SID** : `ACxxxxxxxxx...`
   - **Auth Token** : `xxxxxxxxxxxxxxx...`
   - **Phone Number** : `+15551234567` (exemple US)

**Limites du compte gratuit** :
- ✅ 15,50$ de crédit offert
- ✅ Peut envoyer SMS à des numéros vérifiés
- ❌ Ne peut PAS envoyer à n'importe quel numéro (seulement ceux vérifiés dans le Dashboard)

**Pour débloquer** : Passer au compte payant (~10€/mois)

---

## 🧪 Tests

### Test 1 : Envoi automatique activé

```bash
# 1. Activer l'envoi automatique pour l'utilisateur dans Supabase
UPDATE users SET auto_send_enabled = true WHERE id = 'YOUR_USER_ID';

# 2. Déclencher le webhook
curl -X POST http://localhost:3000/api/webhook/process-job \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "job_id": "YOUR_JOB_ID"
  }'

# 3. Vérifier les logs backend
# Attendu :
# 📧 Envoi automatique activé, envoi de l'email...
# ✅ Email envoyé avec succès
# 📱 Envoi SMS de notification...
# ✅ SMS envoyé avec succès
# 📊 Statut final: sent
```

### Test 2 : Envoi automatique désactivé

```bash
# 1. Désactiver l'envoi automatique
UPDATE users SET auto_send_enabled = false WHERE id = 'YOUR_USER_ID';

# 2. Déclencher le webhook (même commande)

# 3. Vérifier les logs backend
# Attendu :
# ℹ️ Envoi automatique désactivé, lettre générée uniquement
# 📱 Envoi SMS de notification...
# ✅ SMS envoyé avec succès
# 📊 Statut final: pending
```

### Test 3 : Bannière de statut

```bash
# 1. Ouvrir le Dashboard
http://localhost:5173/dashboard

# 2. Observer la bannière
# Si auto_send_enabled = true : 🚀 Recherche Active (vert)
# Si auto_send_enabled = false : 💤 En Veille (gris)

# 3. Cliquer sur le toggle "Envoi automatique"

# 4. Observer la bannière se mettre à jour instantanément
# (grâce à Realtime Supabase)
```

---

## 📋 Checklist de déploiement

### Backend

- [ ] `npm install twilio` dans `backend/`
- [ ] Configurer `TWILIO_ACCOUNT_SID` dans `.env`
- [ ] Configurer `TWILIO_AUTH_TOKEN` dans `.env`
- [ ] Configurer `TWILIO_PHONE_NUMBER` dans `.env`
- [ ] Vérifier que `SMTP_USER` et `SMTP_PASSWORD` sont configurés
- [ ] Redémarrer le serveur : `npm run dev`
- [ ] Tester le webhook avec un cURL

### Frontend

- [ ] Vérifier que `StatusBanner.tsx` existe
- [ ] Vérifier que `Dashboard.tsx` importe `StatusBanner`
- [ ] Redémarrer le serveur : `npm run dev`
- [ ] Ouvrir `/dashboard` et vérifier la bannière

### Supabase

- [ ] Vérifier que le champ `auto_send_enabled` existe dans la table `users`
- [ ] Vérifier que le champ `phone` existe dans la table `users`
- [ ] Vérifier que Realtime est activé pour la table `users`
- [ ] Vérifier que Realtime est activé pour la table `applications`

---

## 🎯 Résumé des avantages

| Fonctionnalité | Avant | Après |
|---------------|-------|-------|
| **Envoi email** | ❌ Pas d'envoi automatique | ✅ Envoi si `auto_send_enabled = true` |
| **Notification user** | ❌ Aucune | ✅ SMS instantané via Twilio |
| **Feedback visuel** | ❌ Pas de bannière | ✅ Bannière animée (vert/gris) |
| **Statut application** | ❌ Toujours 'pending' | ✅ 'sent' si envoyé, 'pending' sinon |
| **UX** | ❌ Utilisateur doit vérifier manuellement | ✅ Notification SMS + Dashboard temps réel |

---

## 🚀 Prochaines évolutions possibles

1. **Email de confirmation** : Envoyer un email de confirmation à l'utilisateur après l'envoi
2. **Webhook de réponse** : Intégrer un webhook pour recevoir les réponses des recruteurs
3. **SMS personnalisés** : Permettre à l'utilisateur de personnaliser le message SMS
4. **Dashboard Analytics** : Graphiques de taux d'envoi, heures d'envoi, etc.
5. **Notifications push** : Ajouter des notifications push via Firebase (en plus des SMS)

---

**✅ Toutes les fonctionnalités sont maintenant implémentées et testables !**

**Commandes pour démarrer** :
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```
