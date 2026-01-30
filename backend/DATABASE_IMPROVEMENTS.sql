-- ============================================
-- AMÉLIORATIONS BASE DE DONNÉES
-- Smart Recruiter Agent - M1 Stage
-- ============================================

-- 1. MODIFICATION TABLE APPLICATIONS
-- Ajout de nouveaux statuts pour tracking complet
ALTER TABLE applications 
DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications 
ADD CONSTRAINT applications_status_check 
CHECK (status IN (
  'draft',        -- Créée mais en attente
  'processing',   -- En cours de traitement (IA)
  'pending',      -- Lettre générée, en attente envoi
  'sent',         -- Envoyée
  'accepted',     -- Réponse positive
  'rejected',     -- Réponse négative
  'interview',    -- Entretien obtenu
  'failed'        -- Échec de traitement
));

-- Ajout colonne pour stocker les erreurs
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Ajout colonne pour le nombre de tentatives
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Ajout colonne pour la dernière tentative
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE;

-- Index pour les applications en échec (pour retry automatique)
CREATE INDEX IF NOT EXISTS idx_applications_failed 
ON applications(status, last_retry_at) 
WHERE status = 'failed';

-- ============================================
-- 2. CRÉATION TABLE LOGS
-- Pour monitoring et débogage complet
-- ============================================

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Contexte
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  job_offer_id UUID REFERENCES job_offers(id) ON DELETE SET NULL,
  
  -- Type de log
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success')),
  event TEXT NOT NULL, -- Ex: 'job_received', 'ai_called', 'email_sent'
  
  -- Message et données
  message TEXT NOT NULL,
  metadata JSONB, -- Données additionnelles (durée, params, etc.)
  
  -- Traçabilité
  source TEXT DEFAULT 'backend', -- 'backend', 'make.com', 'frontend'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_application_id ON logs(application_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_event ON logs(event);

-- Index composite pour filtrage avancé
CREATE INDEX IF NOT EXISTS idx_logs_user_level_date 
ON logs(user_id, level, created_at DESC);

-- RLS Policy pour logs
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Backend can insert logs" ON logs
  FOR INSERT WITH CHECK (true); -- Le backend peut tout logger

-- ============================================
-- 3. MODIFICATION TABLE APPLICATIONS
-- Ajout champ pour édition manuelle de la lettre
-- ============================================

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS cover_letter_edited TEXT;

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS is_manually_edited BOOLEAN DEFAULT FALSE;

-- ============================================
-- 4. VUE POUR STATISTIQUES AVANCÉES
-- Pour monitoring et dashboard
-- ============================================

CREATE OR REPLACE VIEW applications_stats AS
SELECT 
  user_id,
  COUNT(*) as total_applications,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE status = 'interview') as interview_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status IN ('accepted', 'interview')) / 
    NULLIF(COUNT(*), 0), 
    2
  ) as success_rate,
  AVG(retry_count) as avg_retry_count,
  MAX(applied_at) as last_application_date
FROM applications
GROUP BY user_id;

-- Permission sur la vue
GRANT SELECT ON applications_stats TO authenticated;

-- ============================================
-- 5. FONCTION POUR CLEANUP DES LOGS ANCIENS
-- Éviter que la table logs ne devienne trop grosse
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM logs 
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND level = 'info'; -- Garder les erreurs plus longtemps
  
  DELETE FROM logs 
  WHERE created_at < NOW() - INTERVAL '180 days'; -- Supprimer tout après 6 mois
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGER POUR LOGGER LES CHANGEMENTS D'ÉTAT
-- Traçabilité automatique
-- ============================================

CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO logs (
      user_id,
      application_id,
      level,
      event,
      message,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.id,
      CASE 
        WHEN NEW.status = 'failed' THEN 'error'
        WHEN NEW.status IN ('accepted', 'interview') THEN 'success'
        ELSE 'info'
      END,
      'status_changed',
      format('Status changed from %s to %s', OLD.status, NEW.status),
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'error_message', NEW.error_message
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_application_status_change
AFTER UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION log_application_status_change();

-- ============================================
-- 7. VÉRIFICATION
-- ============================================

-- Vérifier les colonnes ajoutées
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name IN ('error_message', 'retry_count', 'last_retry_at', 'cover_letter_edited', 'is_manually_edited');

-- Vérifier la table logs
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'logs';

-- Compter les logs existants
SELECT COUNT(*) as log_count FROM logs;

-- Afficher les stats des applications
SELECT * FROM applications_stats LIMIT 5;
