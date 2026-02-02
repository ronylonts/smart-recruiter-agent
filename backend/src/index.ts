import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import webhookRoutes from './routes/webhook.routes';
import { verifyEmailConfig } from './services/email.service';

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Autoriser toutes les origines (temporaire pour debug)
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/webhook', webhookRoutes);

// Route racine
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Smart Recruiter API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/webhook/health',
      webhookFull: 'POST /api/webhook/new-job',
      webhookSimple: 'POST /api/webhook/process-job'
    }
  });
});

// Route health check globale
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Gestion des erreurs 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    path: req.path
  });
});

// Gestion globale des erreurs
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Erreur globale:', err);
  
  res.status(500).json({
    success: false,
    error: err.message || 'Erreur interne du serveur',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Démarrage du serveur
const startServer = async () => {
  try {
    // Vérifier la configuration
    console.log('\n🔧 Vérification de la configuration...\n');

    // Vérifier les variables d'environnement
    const requiredEnvVars = [
      'GROQ_API_KEY',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Variables d\'environnement manquantes:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\n⚠️ Copiez .env.example vers .env et remplissez les valeurs\n');
    } else {
      console.log('✅ Toutes les variables d\'environnement sont définies');
    }

    // Vérifier la configuration SMTP
    console.log('\n📧 Vérification de la configuration SMTP...');
    const smtpValid = await verifyEmailConfig();
    
    if (!smtpValid) {
      console.warn('⚠️ Configuration SMTP invalide - Les emails ne pourront pas être envoyés');
    }

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log('\n╔═══════════════════════════════════════════╗');
      console.log('║   🚀 Smart Recruiter API démarrée       ║');
      console.log('╚═══════════════════════════════════════════╝\n');
      console.log(`🌐 Serveur en écoute sur le port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 CORS activé pour: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log('\n📚 Endpoints disponibles:');
      console.log('   GET  / - Informations API');
      console.log('   GET  /health - Health check');
      console.log('   GET  /api/webhook/health - Health check webhook');
      console.log('   POST /api/webhook/new-job - Webhook complet (avec envoi email)');
      console.log('   POST /api/webhook/process-job - Webhook simplifié (génération lettre seulement)');
      console.log('\n✨ Prêt à recevoir des webhooks!\n');
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Démarrer le serveur
startServer();

// Gestion des arrêts propres
process.on('SIGINT', () => {
  console.log('\n\n👋 Arrêt du serveur...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Arrêt du serveur...');
  process.exit(0);
});
