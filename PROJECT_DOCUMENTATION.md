# 📋 Prompt Complet - Smart Recruiter Agent

## Vue d'ensemble du projet

**Smart Recruiter Agent** est une application web full-stack d'envoi automatique de candidatures (CV + lettres de motivation) pour la recherche d'emploi. Le système utilise l'IA (Groq) pour générer des lettres de motivation personnalisées et Make.com pour l'automatisation.

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         Make.com                                │
│         (Scraping offres + Déclenchement automatique)          │
└────────────────────────┬────────────────────────────────────────┘
                         │ POST /api/webhook/process-job
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (Node.js + Express)                   │
│  Port: 3000                                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 1. Récupère utilisateur + CV (Supabase jointure)         │ │
│  │ 2. Récupère offre d'emploi (Supabase)                   │ │
│  │ 3. Génère lettre de motivation (Groq AI)                │ │
│  │ 4. Sauvegarde candidature (Supabase applications)       │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ↓                                 ↓
┌─────────────────────┐          ┌─────────────────────┐
│     Supabase        │          │     Groq API        │
│  (Base de données)  │          │  (IA - llama3-8b)   │
│  + Auth + Storage   │          │  Génération lettres │
└─────────────────────┘          └─────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│                Frontend (React + TypeScript + Vite)             │
│  Port: 5173                                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ - Inscription / Connexion (Supabase Auth)                │ │
│  │ - Upload CV (Supabase Storage)                           │ │
│  │ - Dashboard avec statistiques                            │ │
│  │ - Liste des candidatures                                 │ │
│  │ - Notifications SMS                                      │ │
│  │ - Toggle envoi automatique (auto_send_enabled)          │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend - React + TypeScript + Vite

### Stack Technique

```typescript
{
  "framework": "React 19",
  "language": "TypeScript",
  "bundler": "Vite",
  "routing": "React Router DOM",
  "styling": "Tailwind CSS",
  "forms": "React Hook Form",
  "backend": "Supabase",
  "auth": "@supabase/supabase-js"
}
```

### Structure des dossiers

```
frontend/
├── src/
│   ├── pages/                    # 8 Pages
│   │   ├── SignUp.tsx           # Inscription utilisateur
│   │   ├── Login.tsx            # Connexion
│   │   ├── Home.tsx             # Page d'accueil
│   │   ├── Dashboard.tsx        # Tableau de bord principal
│   │   ├── UploadCV.tsx         # Upload CV (PDF)
│   │   ├── Applications.tsx     # Liste des candidatures
│   │   ├── Notifications.tsx    # Timeline des SMS reçus
│   │   └── index.ts             # Exports centralisés
│   │
│   ├── components/              # 8 Composants réutilisables
│   │   ├── Button.tsx          # Bouton (variants, sizes, loading)
│   │   ├── Card.tsx            # Card stylisée
│   │   ├── Sidebar.tsx         # Navigation latérale (responsive)
│   │   ├── Layout.tsx          # Layout avec sidebar
│   │   ├── StatsCards.tsx      # 3 cartes de statistiques
│   │   ├── AutoSendToggle.tsx  # Toggle iOS pour envoi auto
│   │   ├── ApplicationModal.tsx # Modal détails candidature
│   │   └── index.ts
│   │
│   ├── services/                # 4 Services
│   │   ├── supabase.ts         # Client Supabase typé
│   │   ├── auth.service.ts     # signUp, signIn, signOut, getCurrentUser
│   │   ├── cv.service.ts       # uploadCV, getUserCV, updateCV, deleteCV
│   │   ├── application.service.ts # CRUD applications + stats
│   │   ├── api.ts              # Axios configuré
│   │   └── index.ts
│   │
│   ├── hooks/                   # 2 Hooks personnalisés
│   │   ├── useAuth.ts          # Gestion auth + user state
│   │   ├── useFormValidation.ts # Wrapper React Hook Form
│   │   └── index.ts
│   │
│   ├── types/                   # Types TypeScript
│   │   ├── database.types.ts   # Types Supabase (User, CV, JobOffer, etc.)
│   │   └── index.ts
│   │
│   ├── App.tsx                  # Router + ProtectedRoute
│   ├── main.tsx                 # Entry point
│   └── index.css                # Tailwind directives
│
├── .env                         # Variables d'environnement
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

### Pages et fonctionnalités

#### 1. **SignUp.tsx** - Inscription
```typescript
// Champs du formulaire (React Hook Form)
- Email (validation email)
- Mot de passe (min 8 caractères)
- Nom complet
- Téléphone (+33...)
- Profession (select: Développeur, Designer, Marketing, RH, Comptable, Autre)
- Ville
- Pays (select: France, Belgique, Suisse, Canada, Autre)

// Actions
- Validation côté client
- Création compte Supabase Auth
- Insertion dans table users
- Redirection vers dashboard
```

#### 2. **Login.tsx** - Connexion
```typescript
// Authentification Supabase
- Email + Mot de passe
- Vérification email confirmé
- Session persistante
- Redirection si déjà connecté
```

#### 3. **Dashboard.tsx** - Tableau de bord
```typescript
// Header
- Salutation utilisateur
- Bouton déconnexion

// Section 1: Statistiques (StatsCards component)
- Card 1: Total candidatures envoyées (📤)
- Card 2: Réponses positives (✅)
- Card 3: Taux de réponse % (📊)

// Section 2: Toggle envoi automatique (AutoSendToggle component)
- Switch iOS animé
- État sauvegardé dans users.auto_send_enabled
- Toast de confirmation

// Section 3: Candidatures récentes
- Tableau des 5 dernières candidatures
- Colonnes: Entreprise, Poste, Date, Statut
- Badges colorés (vert/rouge/orange)
- Bouton "Voir toutes les candidatures"
```

#### 4. **UploadCV.tsx** - Upload CV
```typescript
// Formulaire
- Input file (PDF uniquement, max 5MB)
- Prévisualisation nom fichier
- Années d'expérience (number)
- Compétences (textarea, séparées par virgules)
- Formation/diplôme (text)

// Actions
1. Upload PDF vers Supabase Storage (bucket "cvs")
2. Génération URL publique
3. Sauvegarde métadonnées dans table cvs
4. Redirection vers dashboard
```

#### 5. **Applications.tsx** - Liste des candidatures
```typescript
// Fonctionnalités
- Tableau complet avec pagination (20/page)
- Filtres par statut (tous, envoyé, accepté, refusé, interview)
- Search bar (entreprise ou poste)
- Tri par date (plus récent d'abord)

// Colonnes
- Entreprise
- Poste
- Ville / Pays
- Date d'envoi
- Statut (badge coloré)
- Actions (bouton "Voir détails")

// Modal ApplicationModal
- Détails offre (titre, entreprise, description, lien)
- Lettre de motivation complète
- Historique (date envoi, date réponse)
- Notifications SMS associées
- Bouton "Mettre à jour le statut"
- Bouton "Voir l'offre originale"
```

#### 6. **Notifications.tsx** - Timeline SMS
```typescript
// Affichage
- Timeline verticale avec ligne verte
- Icônes selon type:
  ✅ Acceptation
  ❌ Refus
  📩 Autre
- Message SMS complet
- Date relative ("Il y a X minutes")
- Lien vers candidature concernée

// Filtres
- Par type (acceptations, refus, autres)
- Par date (aujourd'hui, cette semaine, ce mois)
```

#### 7. **Sidebar.tsx** - Navigation
```typescript
// Menu Desktop (fixe à gauche, 250px)
🏠 Dashboard
📄 Mon CV
📨 Candidatures
🔔 Notifications
⚙️ Paramètres
🚪 Déconnexion

// Mobile (bottom navigation)
- 4 items principaux visibles
- Menu "Plus" pour Settings + Logout
- Responsive avec breakpoint md:
```

### Services Frontend

#### auth.service.ts
```typescript
// Fonctions principales
export const signUp = async (email, password, userData) => {
  // 1. Créer compte Supabase Auth
  // 2. Insérer profil dans table users (avec auto_send_enabled: false)
  // 3. Rollback si erreur
  // Retourne: { success, message, error, user }
}

export const signIn = async (email, password) => {
  // Connexion Supabase
  // Gère erreur "Email not confirmed"
}

export const signOut = async () => {
  // Déconnexion + clear session
}

export const getCurrentUser = async () => {
  // Récupère user courant
}
```

#### cv.service.ts
```typescript
export const uploadCV = async (userId, file, metadata) => {
  // 1. Validation fichier (PDF, max 5MB)
  // 2. Upload vers Supabase Storage (bucket "cvs")
  // 3. Génération URL publique
  // 4. Insert dans table cvs
  // 5. Rollback storage si erreur DB
}

export const getUserCV = async (userId) => {
  // Récupère CV le plus récent
}

export const updateCV = async (cvId, metadata) => {
  // Met à jour skills, experience_years, education
}

export const deleteCV = async (cvId) => {
  // 1. Supprime fichier du storage
  // 2. Supprime entrée DB
}
```

#### application.service.ts
```typescript
export const getUserApplications = async (userId, filters, pagination) => {
  // Récupère applications avec jointures:
  // - job_offers (titre, entreprise, ville)
  // - cvs (skills, expérience)
  // Supporte filtres (status, dates) et pagination
}

export const getApplicationStats = async (userId) => {
  // Calcule statistiques:
  // - Total candidatures
  // - Par statut (pending, sent, accepted, rejected, interview)
  // - Taux de réponse
  // - Temps moyen de réponse
}

export const updateApplicationStatus = async (applicationId, status) => {
  // Met à jour le statut d'une candidature
}
```

### Composants clés

#### StatsCards.tsx
```typescript
// Affiche 3 cards avec gradients
// Fetch data depuis applications table
// Calcule automatiquement les stats
// Skeleton loader pendant chargement

Stats calculées:
- totalApplications: count(*)
- positiveResponses: count(status IN ['accepted', 'interview'])
- responseRate: (positiveResponses / total) * 100
```

#### AutoSendToggle.tsx
```typescript
// Toggle iOS animé
// État: users.auto_send_enabled (BOOLEAN)
// Actions:
//   1. Fetch état actuel
//   2. Update Supabase au toggle
//   3. Affiche toast confirmation
//   4. Message détaillé si activé

Style:
- Vert si activé (bg-green-600)
- Gris si désactivé (bg-gray-300)
- Animation fluide (transition-all duration-300)
```

### Routes et Protection

```typescript
// App.tsx
<Router>
  {/* Routes publiques */}
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<SignUp />} />

  {/* Routes protégées (ProtectedRoute) */}
  <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/upload-cv" element={<ProtectedRoute><UploadCV /></ProtectedRoute>} />
  <Route path="/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

  {/* Fallback */}
  <Route path="*" element={<Navigate to="/" />} />
</Router>

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/login" />;
};
```

### Variables d'environnement Frontend

```env
# frontend/.env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://doyqvufcofebzsiswddq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ⚙️ Backend - Node.js + Express + TypeScript

### Stack Technique

```typescript
{
  "runtime": "Node.js",
  "framework": "Express",
  "language": "TypeScript",
  "database": "Supabase",
  "ai": "Groq SDK (llama3-8b-8192)",
  "email": "Nodemailer (Gmail SMTP)",
  "env": "dotenv",
  "cors": "cors"
}
```

### Structure des dossiers

```
backend/
├── src/
│   ├── index.ts                    # Serveur Express principal
│   ├── services/
│   │   ├── supabase.service.ts     # Interactions Supabase
│   │   ├── groq.service.ts         # Génération lettres IA
│   │   └── email.service.ts        # Envoi emails + CV
│   └── routes/
│       └── webhook.routes.ts       # Routes webhook Make.com
│
├── .env                            # Variables d'environnement
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
├── QUICKSTART.md
└── STAGE_SETUP.md
```

### Serveur principal - index.ts

```typescript
// Configuration
- Port: 3000
- CORS activé pour frontend (http://localhost:5173)
- Express JSON + urlencoded
- Logger middleware

// Routes
- GET / - Informations API
- GET /health - Health check
- GET /api/webhook/health - Health check webhook
- POST /api/webhook/new-job - Webhook complet (avec email)
- POST /api/webhook/process-job - Webhook simplifié (stage)

// Startup checks
1. Vérification variables d'environnement
2. Validation configuration SMTP
3. Logs détaillés de démarrage
```

### Services Backend

#### supabase.service.ts
```typescript
// Client Supabase
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Fonctions
export const getUserProfile = async (userId: string) => {
  // SELECT * FROM users WHERE id = userId
}

export const getUserCV = async (userId: string) => {
  // SELECT * FROM cvs WHERE user_id = userId
  // ORDER BY created_at DESC LIMIT 1
}

export const getJobOffer = async (jobOfferId: string) => {
  // SELECT * FROM job_offers WHERE id = jobOfferId
}

export const createApplication = async (data) => {
  // INSERT INTO applications VALUES (...)
  // Retourne l'application créée
}

export const createNotification = async (data) => {
  // INSERT INTO notifications VALUES (...)
}

export const downloadFile = async (filePath: string) => {
  // Télécharge fichier depuis Supabase Storage
  // Retourne Buffer pour attachement email
}
```

#### groq.service.ts - Génération lettres IA
```typescript
// Configuration Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const generateCoverLetter = async (
  userProfile: UserProfile,
  jobOffer: JobOffer,
  cvData: CVData
) => {
  // Prompt optimisé
  const prompt = `
    Rédige une lettre de motivation courte et percutante en français

    CANDIDAT: ${userProfile.full_name}, ${userProfile.profession}
    EXPÉRIENCE: ${cvData.experience_years} ans
    COMPÉTENCES: ${cvData.skills.join(', ')}
    FORMATION: ${cvData.education}

    POSTE: ${jobOffer.title} chez ${jobOffer.company}
    DESCRIPTION: ${jobOffer.description?.substring(0, 300)}

    Consignes:
    - 150-200 mots maximum
    - Ton direct, professionnel et motivé
    - 2-3 compétences clés en lien avec le poste
    - Commence directement (pas de "Madame, Monsieur")
    - Pas de formule de politesse finale
  `;

  // Appel Groq API
  const completion = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [
      {
        role: 'system',
        content: 'Tu es un expert en rédaction de lettres de motivation. Tu génères des lettres courtes, percutantes et personnalisées en français.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.8,
    max_tokens: 500,
    top_p: 0.95
  });

  return {
    success: true,
    data: completion.choices[0]?.message?.content?.trim()
  };
};
```

#### email.service.ts - Envoi emails
```typescript
// Configuration Nodemailer (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD // App Password
  }
});

export const sendApplication = async (
  jobOffer: JobOffer,
  cvUrl: string,
  coverLetter: string,
  userProfile: UserProfile,
  recipientEmail?: string
) => {
  // 1. Télécharger CV depuis Supabase Storage
  const cvBuffer = await downloadFile(filePath);

  // 2. Construire email HTML
  const emailBody = `
    ${coverLetter}
    
    ---
    Cordialement,
    ${userProfile.full_name}
    ${userProfile.email}
    ${userProfile.phone}
  `;

  // 3. Configuration email
  const mailOptions = {
    from: `"${userProfile.full_name}" <${process.env.SMTP_USER}>`,
    to: recipientEmail || process.env.SMTP_USER,
    subject: `Candidature pour ${jobOffer.title} - ${userProfile.full_name}`,
    text: emailBody,
    html: emailBodyHTML,
    attachments: [
      {
        filename: `CV_${userProfile.full_name}.pdf`,
        content: cvBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  // 4. Envoyer
  const info = await transporter.sendMail(mailOptions);
  return { success: true, messageId: info.messageId };
};
```

### Routes Webhook - webhook.routes.ts

#### Route 1: POST /api/webhook/process-job (SIMPLIFIÉE - STAGE)
```typescript
// Body attendu
{
  "user_id": "uuid",
  "job_id": "uuid"
}

// Processus (4 étapes)
async (req, res) => {
  // 1. Récupération utilisateur + CV (JOINTURE)
  const { data: userData } = await supabase
    .from('users')
    .select(`
      *,
      cvs!inner (id, file_url, skills, experience_years, education)
    `)
    .eq('id', user_id)
    .single();

  // 2. Récupération offre d'emploi
  const jobOffer = await getJobOffer(job_id);

  // 3. Génération lettre avec Groq (llama3-8b-8192)
  const coverLetterResult = await generateCoverLetter(
    userData,
    jobOffer,
    userData.cvs
  );

  // 4. Sauvegarde dans applications (status: 'pending')
  const application = await createApplication({
    user_id,
    cv_id: userData.cvs.id,
    job_offer_id: job_id,
    cover_letter: coverLetterResult.data,
    status: 'pending'
  });

  // Réponse
  return res.json({
    success: true,
    data: {
      application_id: application.id,
      cover_letter: coverLetterResult.data,
      status: 'pending'
    }
  });
}
```

#### Route 2: POST /api/webhook/new-job (COMPLÈTE - PRODUCTION)
```typescript
// Body attendu
{
  "user_id": "uuid",
  "job_offer_id": "uuid",
  "recipient_email": "recruteur@entreprise.com" // Optionnel
}

// Processus (6 étapes)
async (req, res) => {
  // 1. Récupération profil utilisateur
  const userProfile = await getUserProfile(user_id);

  // 2. Vérification auto_send_enabled
  if (!userProfile.auto_send_enabled) {
    return res.json({ success: true, skipped: true });
  }

  // 3. Récupération CV
  const cvData = await getUserCV(user_id);

  // 4. Récupération offre
  const jobOffer = await getJobOffer(job_offer_id);

  // 5. Génération lettre avec Groq
  const coverLetter = await generateCoverLetter(userProfile, jobOffer, cvData);

  // 6. Envoi email avec CV + lettre
  await sendApplication(jobOffer, cvData.file_url, coverLetter, userProfile);

  // 7. Sauvegarde application (status: 'sent')
  const application = await createApplication({
    user_id,
    cv_id: cvData.id,
    job_offer_id,
    cover_letter: coverLetter,
    status: 'sent'
  });

  // 8. Création notification
  await createNotification({
    user_id,
    application_id: application.id,
    message: `📤 Candidature envoyée pour ${jobOffer.title} chez ${jobOffer.company}`
  });

  return res.json({ success: true, data: { application_id: application.id } });
}
```

### Variables d'environnement Backend

```env
# backend/.env
PORT=3000

# Groq API (génération lettres IA)
GROQ_API_KEY=your_groq_api_key_here

# Gmail SMTP (envoi emails)
SMTP_USER=your_gmail@gmail.com
SMTP_PASSWORD=your_app_password_here

# Supabase
SUPABASE_URL=https://doyqvufcofebzsiswddq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend (CORS)
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development
```

---

## 🗄️ Base de données - Supabase

### Configuration
```
Project: doyqvufcofebzsiswddq
URL: https://doyqvufcofebzsiswddq.supabase.co
Region: us-east-1
```

### Schéma des tables

#### Table: users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  profession TEXT,
  city TEXT,
  country TEXT,
  auto_send_enabled BOOLEAN DEFAULT FALSE, -- Toggle envoi automatique
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

#### Table: cvs
```sql
CREATE TABLE cvs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL, -- URL publique Supabase Storage
  skills TEXT[] NOT NULL, -- Array de compétences
  experience_years INTEGER NOT NULL,
  education TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_cvs_user_id ON cvs(user_id);

-- RLS Policy
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own CVs" ON cvs
  FOR ALL USING (auth.uid() = user_id);
```

#### Table: job_offers
```sql
CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  city TEXT,
  country TEXT,
  job_url TEXT,
  description TEXT,
  profession TEXT, -- Pour filtrage
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_job_offers_profession ON job_offers(profession);
CREATE INDEX idx_job_offers_scraped_at ON job_offers(scraped_at DESC);
```

#### Table: applications
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cv_id UUID REFERENCES cvs(id) ON DELETE SET NULL,
  job_offer_id UUID REFERENCES job_offers(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'interview')),
  cover_letter TEXT NOT NULL, -- Lettre générée par IA
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_received_at TIMESTAMP WITH TIME ZONE
);

-- Index
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_applied_at ON applications(applied_at DESC);

-- RLS Policy
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);
```

#### Table: notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  message TEXT NOT NULL, -- Contenu du SMS
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at DESC);

-- RLS Policy
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
```

### Supabase Storage

#### Bucket: cvs
```typescript
// Configuration
{
  name: 'cvs',
  public: true, // URLs publiques
  fileSizeLimit: 5242880, // 5 MB
  allowedMimeTypes: ['application/pdf']
}

// Structure des fichiers
cvs/
└── {user_id}/
    └── {timestamp}_{filename}.pdf

// Exemple
cvs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/1738253840123_CV_John_Doe.pdf

// URL publique générée
https://doyqvufcofebzsiswddq.supabase.co/storage/v1/object/public/cvs/{user_id}/{timestamp}_{filename}.pdf
```

### Types TypeScript générés

```typescript
// frontend/src/types/database.types.ts
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  profession: string | null;
  city: string | null;
  country: string | null;
  auto_send_enabled: boolean;
  created_at: string;
}

export interface CV {
  id: string;
  user_id: string;
  file_url: string;
  skills: string[];
  experience_years: number;
  education: string;
  created_at: string;
  updated_at: string;
}

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  city: string;
  country: string;
  job_url: string | null;
  description: string | null;
  profession: string | null;
  scraped_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  cv_id: string;
  job_offer_id: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'interview';
  cover_letter: string;
  applied_at: string;
  response_received_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  application_id: string;
  message: string;
  sent_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, 'id' | 'created_at' | 'auto_send_enabled'> & { auto_send_enabled?: boolean }; Update: Partial<Omit<User, 'id' | 'created_at'>> };
      cvs: { Row: CV; Insert: Omit<CV, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<CV, 'id' | 'user_id' | 'created_at' | 'updated_at'>> };
      job_offers: { Row: JobOffer; Insert: Omit<JobOffer, 'id' | 'scraped_at'>; Update: Partial<Omit<JobOffer, 'id' | 'scraped_at'>> };
      applications: { Row: Application; Insert: Omit<Application, 'id' | 'applied_at'>; Update: Partial<Omit<Application, 'id' | 'user_id' | 'applied_at'>> };
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'sent_at'>; Update: Partial<Omit<Notification, 'id' | 'sent_at'>> };
    };
  };
}
```

---

## 🔄 Flux de données complets

### Flux 1: Inscription utilisateur

```
┌─────────────────────────────────────────────────────────┐
│ 1. Utilisateur remplit formulaire SignUp               │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Frontend valide les données (React Hook Form)       │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Appel auth.service.signUp()                         │
│    - Crée compte Supabase Auth                         │
│    - Insert dans table users (avec auto_send=false)    │
│    - Rollback si erreur                                │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Email de confirmation envoyé par Supabase           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Utilisateur clique lien confirmation                │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Redirection vers Dashboard                          │
└─────────────────────────────────────────────────────────┘
```

### Flux 2: Upload CV

```
┌─────────────────────────────────────────────────────────┐
│ 1. Utilisateur sélectionne PDF + remplit formulaire    │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Validation frontend                                 │
│    - Type: PDF                                         │
│    - Taille: max 5MB                                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Appel cv.service.uploadCV()                         │
│    a) Upload fichier vers Supabase Storage (bucket cvs)│
│    b) Génération URL publique                          │
│    c) Insert métadonnées dans table cvs                │
│    d) Rollback storage si erreur DB                    │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Redirection vers Dashboard                          │
└─────────────────────────────────────────────────────────┘
```

### Flux 3: Envoi automatique de candidature (Make.com → Backend)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Make.com scrape nouvelle offre d'emploi             │
│    Source: Indeed, LinkedIn, etc.                      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Make.com filtre par profession                      │
│    Exemple: profession = "Développeur"                 │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Make.com récupère users avec auto_send_enabled=true │
│    Query: GET /rest/v1/users?auto_send_enabled=eq.true │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Pour chaque utilisateur, Make.com appelle webhook   │
│    POST /api/webhook/process-job                       │
│    Body: { user_id, job_id }                           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Backend: Récupération utilisateur + CV (jointure)   │
│    SELECT users.*, cvs.*                               │
│    FROM users                                          │
│    INNER JOIN cvs ON cvs.user_id = users.id           │
│    WHERE users.id = $1                                 │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Backend: Récupération offre d'emploi                │
│    SELECT * FROM job_offers WHERE id = $1              │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Backend: Génération lettre avec Groq                │
│    Modèle: llama3-8b-8192                              │
│    Prompt: Nom, profession, compétences, description   │
│    Output: Lettre 150-200 mots en français             │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 8. Backend: Sauvegarde dans applications               │
│    INSERT INTO applications (user_id, cv_id,           │
│      job_offer_id, cover_letter, status)              │
│    VALUES ($1, $2, $3, $4, 'pending')                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 9. Backend retourne réponse à Make.com                 │
│    { success: true, application_id, cover_letter }     │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 10. Make.com log le résultat                           │
└─────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 11. Utilisateur voit la candidature dans Dashboard     │
│     et page Applications                               │
└─────────────────────────────────────────────────────────┘
```

### Flux 4: Consultation des candidatures

```
┌─────────────────────────────────────────────────────────┐
│ 1. Utilisateur ouvre /applications                     │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Frontend appelle application.service                │
│    getUserApplications(userId, filters, pagination)    │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Supabase query avec jointures                       │
│    SELECT applications.*,                              │
│           job_offers.title, job_offers.company,        │
│           cvs.skills, cvs.experience_years             │
│    FROM applications                                   │
│    INNER JOIN job_offers ON job_offers.id = ...       │
│    LEFT JOIN cvs ON cvs.id = ...                      │
│    WHERE applications.user_id = $1                     │
│    ORDER BY applied_at DESC                            │
│    LIMIT 20 OFFSET 0                                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Affichage tableau avec filtres et pagination        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Utilisateur clique "Voir détails"                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Modal ApplicationModal s'ouvre                      │
│    - Détails offre                                     │
│    - Lettre de motivation complète                     │
│    - Historique                                        │
│    - Notifications associées                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔗 Intégration Make.com

### Scénario d'automatisation

```
┌────────────────────────────────────────────────────────┐
│ Module 1: RSS Feed (Indeed/LinkedIn)                  │
│ Trigger: Nouvelle offre détectée                      │
└─────────────────────┬──────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────────┐
│ Module 2: Filter                                       │
│ Condition: profession contains "Développeur"           │
└─────────────────────┬──────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────────┐
│ Module 3: Supabase - Insert job_offer                 │
│ INSERT INTO job_offers (title, company, description)  │
│ Retourne: job_id                                      │
└─────────────────────┬──────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────────┐
│ Module 4: Supabase - Get users                        │
│ SELECT * FROM users                                    │
│ WHERE auto_send_enabled = true                        │
│ AND profession = 'Développeur'                        │
└─────────────────────┬──────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────────┐
│ Module 5: Iterator                                     │
│ Pour chaque utilisateur                               │
└─────────────────────┬──────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────────┐
│ Module 6: HTTP Request                                │
│ URL: http://localhost:3000/api/webhook/process-job    │
│ Method: POST                                          │
│ Headers: Content-Type: application/json              │
│ Body: {                                               │
│   "user_id": "{{user.id}}",                          │
│   "job_id": "{{job_id}}"                             │
│ }                                                     │
└─────────────────────┬──────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────────┐
│ Module 7: Parse JSON Response                         │
│ Récupère application_id et cover_letter               │
└─────────────────────┬──────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────────┐
│ Module 8: Data Store - Log result                     │
│ Sauvegarde pour statistiques                          │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Démarrage du projet

### Installation

```bash
# Frontend
cd frontend
npm install
npm run dev
# Démarré sur http://localhost:5173

# Backend (nouveau terminal)
cd backend
npm install
npm run dev
# Démarré sur http://localhost:3000
```

### URLs de l'application

```
Frontend: http://localhost:5173
Backend API: http://localhost:3000
Supabase: https://doyqvufcofebzsiswddq.supabase.co
Groq Console: https://console.groq.com
```

---

## 📊 Statistiques du projet

### Frontend
- **Lignes de code**: ~3,500
- **Fichiers**: 35
- **Pages**: 8
- **Composants**: 8
- **Services**: 4
- **Hooks**: 2

### Backend
- **Lignes de code**: ~1,500
- **Fichiers**: 12
- **Services**: 3
- **Routes**: 4

### Base de données
- **Tables**: 5
- **Storage buckets**: 1
- **RLS policies**: 12

---

## 🎯 Cas d'usage principaux

1. **Utilisateur s'inscrit et upload son CV**
2. **Utilisateur active l'envoi automatique**
3. **Make.com détecte nouvelle offre correspondant au profil**
4. **Backend génère lettre personnalisée avec IA**
5. **Application sauvegardée avec status 'pending'**
6. **Utilisateur consulte ses candidatures dans Dashboard**
7. **Utilisateur peut mettre à jour statut manuellement**
8. **Utilisateur reçoit notifications (si intégration SMS)**

---

## 🔐 Sécurité

- ✅ **Authentication**: Supabase Auth avec JWT
- ✅ **RLS (Row Level Security)**: Politique par table
- ✅ **CORS**: Activé uniquement pour frontend
- ✅ **Variables d'environnement**: Clés API protégées
- ✅ **Validation**: Frontend + Backend
- ✅ **File upload**: Type et taille limités
- ✅ **Protected routes**: Redirection si non authentifié

---

## 🎓 Technologies et concepts utilisés

### Frontend
- React Hooks (useState, useEffect, custom hooks)
- React Router DOM (routing, protected routes)
- React Hook Form (validation, gestion formulaires)
- Tailwind CSS (utility-first styling)
- TypeScript (typage strict)
- Supabase Client (auth, database, storage)

### Backend
- Express (framework web)
- TypeScript (typage strict)
- Groq SDK (génération IA)
- Nodemailer (envoi emails)
- Supabase Client (database queries)
- CORS (cross-origin)
- dotenv (environnement)

### Base de données
- PostgreSQL (via Supabase)
- Row Level Security (RLS)
- Foreign Keys
- Indexes
- Jointures (INNER JOIN, LEFT JOIN)

### DevOps
- Vite (bundler rapide)
- ts-node-dev (hot reload backend)
- Git (contrôle de version)
- npm (gestionnaire de paquets)

---

**Ce prompt décrit l'intégralité du fonctionnement de Smart Recruiter Agent - Projet de stage Master 1 en développement d'applications**
