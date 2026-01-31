-- Table logs pour monitoring des événements
-- À exécuter dans l'éditeur SQL de Supabase

CREATE TABLE IF NOT EXISTS public.logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  job_offer_id UUID REFERENCES public.job_offers(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success')),
  event TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  source TEXT DEFAULT 'backend',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_application_id ON public.logs(application_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON public.logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_event ON public.logs(event);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);

-- Activer RLS (Row Level Security)
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Les utilisateurs peuvent voir leurs propres logs
CREATE POLICY "Users can view their own logs"
  ON public.logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique RLS : Le backend peut insérer des logs (via service role)
CREATE POLICY "Service role can insert logs"
  ON public.logs
  FOR INSERT
  WITH CHECK (true);

-- Fonction pour nettoyer les vieux logs (>30 jours)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Commentaires pour la documentation
COMMENT ON TABLE public.logs IS 'Table de logs pour monitoring des événements du système';
COMMENT ON COLUMN public.logs.level IS 'Niveau de log: info, warning, error, success';
COMMENT ON COLUMN public.logs.event IS 'Type d événement: job_received, ai_called, email_sent, etc.';
COMMENT ON COLUMN public.logs.metadata IS 'Données additionnelles au format JSON';
