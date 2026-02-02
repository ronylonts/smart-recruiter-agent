-- =====================================================
-- EXTENSION BASE DE DONNÉES POUR SUPPORT MULTI-PAYS
-- =====================================================

-- 1. Table de configuration des pays européens
CREATE TABLE IF NOT EXISTS countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(2) NOT NULL UNIQUE, -- FR, DE, ES, IT, etc.
  name VARCHAR(100) NOT NULL,
  language VARCHAR(5) NOT NULL, -- fr, de, es, it
  currency VARCHAR(3) DEFAULT 'EUR',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  phone_format VARCHAR(50),
  adzuna_api_endpoint VARCHAR(255), -- https://api.adzuna.com/v1/api/jobs/de/search/1
  indeed_country_code VARCHAR(10), -- fr, de, uk, es
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Insérer les pays européens (ordre alphabétique)
INSERT INTO countries (code, name, language, currency, adzuna_api_endpoint, indeed_country_code) VALUES
('DE', 'Allemagne', 'de', 'EUR', 'https://api.adzuna.com/v1/api/jobs/de/search/1', 'de'),
('AT', 'Autriche', 'de', 'EUR', 'https://api.adzuna.com/v1/api/jobs/at/search/1', 'at'),
('BE', 'Belgique', 'fr', 'EUR', 'https://api.adzuna.com/v1/api/jobs/be/search/1', 'be'),
('DK', 'Danemark', 'da', 'DKK', NULL, 'dk'),
('ES', 'Espagne', 'es', 'EUR', 'https://api.adzuna.com/v1/api/jobs/es/search/1', 'es'),
('FI', 'Finlande', 'fi', 'EUR', NULL, 'fi'),
('FR', 'France', 'fr', 'EUR', 'https://api.adzuna.com/v1/api/jobs/fr/search/1', 'fr'),
('IE', 'Irlande', 'en', 'EUR', NULL, 'ie'),
('IT', 'Italie', 'it', 'EUR', 'https://api.adzuna.com/v1/api/jobs/it/search/1', 'it'),
('LU', 'Luxembourg', 'fr', 'EUR', NULL, 'lu'),
('NO', 'Norvège', 'no', 'NOK', NULL, 'no'),
('NL', 'Pays-Bas', 'nl', 'EUR', 'https://api.adzuna.com/v1/api/jobs/nl/search/1', 'nl'),
('PL', 'Pologne', 'pl', 'PLN', 'https://api.adzuna.com/v1/api/jobs/pl/search/1', 'pl'),
('PT', 'Portugal', 'pt', 'EUR', 'https://api.adzuna.com/v1/api/jobs/pt/search/1', 'pt'),
('GB', 'Royaume-Uni', 'en', 'GBP', 'https://api.adzuna.com/v1/api/jobs/gb/search/1', 'uk'),
('SE', 'Suède', 'sv', 'SEK', NULL, 'se'),
('CH', 'Suisse', 'de', 'CHF', 'https://api.adzuna.com/v1/api/jobs/ch/search/1', 'ch');

-- 3. Modifier la table users pour ajouter préférences géographiques
ALTER TABLE users
ADD COLUMN IF NOT EXISTS origin_country VARCHAR(2) DEFAULT 'FR' REFERENCES countries(code),
ADD COLUMN IF NOT EXISTS target_countries TEXT[] DEFAULT ARRAY['FR'], -- Liste des pays ciblés
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[] DEFAULT ARRAY['fr'],
ADD COLUMN IF NOT EXISTS geographic_mobility BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS remote_work_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS salary_min INTEGER,
ADD COLUMN IF NOT EXISTS salary_max INTEGER,
ADD COLUMN IF NOT EXISTS preferred_job_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. Modifier la table job_offers pour ajouter infos pays
ALTER TABLE job_offers
ADD COLUMN IF NOT EXISTS country VARCHAR(2) REFERENCES countries(code),
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'fr',
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS salary_min DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS salary_max DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS remote_work BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50), -- CDI, CDD, Freelance, Stage
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Adzuna', -- Adzuna, The Muse, etc.
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) UNIQUE; -- ID de l'API externe

-- 5. Modifier la table applications pour tracking multi-pays
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS target_country VARCHAR(2) REFERENCES countries(code),
ADD COLUMN IF NOT EXISTS application_language VARCHAR(5) DEFAULT 'fr',
ADD COLUMN IF NOT EXISTS cv_version_sent TEXT, -- Version du CV envoyée (si adaptation)
ADD COLUMN IF NOT EXISTS cover_letter_language VARCHAR(5) DEFAULT 'fr',
ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 0, -- Score de matching (0-100)
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Manual'; -- Manual, Auto, Make.com

-- 6. Table pour logs de scraping/recherche par pays
CREATE TABLE IF NOT EXISTS job_search_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  country VARCHAR(2) REFERENCES countries(code),
  search_query TEXT,
  results_found INTEGER DEFAULT 0,
  applications_sent INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Table pour gérer la queue de recherche multi-pays
CREATE TABLE IF NOT EXISTS search_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  country VARCHAR(2) REFERENCES countries(code),
  priority INTEGER DEFAULT 5, -- 1 = pays d'origine (priorité max), 5 = autres pays
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  scheduled_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Index pour performance
CREATE INDEX IF NOT EXISTS idx_job_offers_country ON job_offers(country);
CREATE INDEX IF NOT EXISTS idx_applications_target_country ON applications(target_country);
CREATE INDEX IF NOT EXISTS idx_search_queue_status ON search_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_search_queue_user_country ON search_queue(user_id, country);

-- 9. Fonction pour calculer le score de matching (exemple simple)
CREATE OR REPLACE FUNCTION calculate_match_score(
  user_skills TEXT[],
  job_description TEXT
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  skill TEXT;
BEGIN
  -- Logique simple : +10 points par compétence trouvée dans la description
  FOREACH skill IN ARRAY user_skills
  LOOP
    IF position(lower(skill) in lower(job_description)) > 0 THEN
      score := score + 10;
    END IF;
  END LOOP;
  
  -- Limiter le score à 100
  IF score > 100 THEN
    score := 100;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- 10. Vue pour statistiques par pays
CREATE OR REPLACE VIEW stats_by_country AS
SELECT 
  c.code as country_code,
  c.name as country_name,
  COUNT(DISTINCT jo.id) as total_jobs,
  COUNT(DISTINCT a.id) as total_applications,
  COUNT(DISTINCT CASE WHEN a.status = 'sent' THEN a.id END) as applications_sent,
  COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as applications_accepted,
  ROUND(AVG(a.match_score), 2) as avg_match_score
FROM countries c
LEFT JOIN job_offers jo ON c.code = jo.country
LEFT JOIN applications a ON jo.id = a.job_offer_id
GROUP BY c.code, c.name
ORDER BY total_applications DESC;

-- 11. Politique RLS pour les nouvelles tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queue ENABLE ROW LEVEL SECURITY;

-- Policies pour countries (lecture publique)
CREATE POLICY "Countries are viewable by everyone" ON countries
  FOR SELECT USING (true);

-- Policies pour job_search_logs (utilisateur voit seulement ses logs)
CREATE POLICY "Users can view their own search logs" ON job_search_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policies pour search_queue (utilisateur voit seulement sa queue)
CREATE POLICY "Users can view their own search queue" ON search_queue
  FOR SELECT USING (auth.uid() = user_id);
