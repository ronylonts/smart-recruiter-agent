-- =====================================================
-- AJOUT DU SUPPORT DES VILLES PAR PAYS
-- =====================================================

-- Ajouter une colonne JSON pour stocker les villes choisies par pays
ALTER TABLE users
ADD COLUMN IF NOT EXISTS target_cities JSONB DEFAULT '{}'::jsonb;

-- Exemple de structure :
-- {
--   "FR": ["Paris", "Lyon", "Marseille"],
--   "DE": ["Berlin", "Munich"],
--   "ES": ["Madrid", "Barcelona"]
-- }

-- Ajouter une colonne pour stocker les villes dans job_offers
ALTER TABLE job_offers
ADD COLUMN IF NOT EXISTS cities TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Commentaires pour documentation
COMMENT ON COLUMN users.target_cities IS 'Villes ciblées par pays au format JSON: {"FR": ["Paris", "Lyon"], "DE": ["Berlin"]}';
COMMENT ON COLUMN job_offers.cities IS 'Liste des villes pour cette offre d emploi';

-- Fonction pour vérifier si une ville correspond aux préférences utilisateur
CREATE OR REPLACE FUNCTION match_user_city_preferences(
  user_target_cities JSONB,
  job_country VARCHAR(2),
  job_city VARCHAR(255)
) RETURNS BOOLEAN AS $$
BEGIN
  -- Si l'utilisateur n'a pas de préférence de villes pour ce pays, accepter toutes les villes
  IF user_target_cities IS NULL OR user_target_cities = '{}'::jsonb THEN
    RETURN true;
  END IF;
  
  -- Si le pays n'est pas dans les préférences, refuser
  IF NOT (user_target_cities ? job_country) THEN
    RETURN false;
  END IF;
  
  -- Vérifier si la ville de l'offre est dans les villes ciblées
  RETURN user_target_cities->job_country @> to_jsonb(ARRAY[job_city]);
END;
$$ LANGUAGE plpgsql;

-- Vue pour voir les préférences des utilisateurs
CREATE OR REPLACE VIEW user_search_preferences AS
SELECT 
  u.id,
  u.email,
  u.origin_country,
  u.target_countries,
  u.target_cities,
  u.preferred_job_title,
  u.salary_min,
  u.salary_max,
  u.remote_work_only,
  u.auto_send_enabled
FROM users u;

-- Index pour performance sur les recherches JSON
CREATE INDEX IF NOT EXISTS idx_users_target_cities ON users USING gin (target_cities);
