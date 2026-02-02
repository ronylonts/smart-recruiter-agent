/**
 * SERVICE DE RECHERCHE MULTI-PAYS
 * Utilise des APIs LÉGALES (Adzuna, The Muse, etc.)
 * 
 * ⚠️ NE PAS UTILISER DE SCRAPING (LinkedIn/Indeed) - ILLÉGAL
 */

import axios from 'axios';
import { supabase } from './supabase.service';

// ====================================
// TYPES
// ====================================

interface Country {
  code: string;
  name: string;
  language: string;
  currency: string;
  adzuna_api_endpoint: string;
}

interface JobSearchParams {
  userId: string;
  profession: string;
  location?: string;
  salary_min?: number;
  remote_only?: boolean;
}

interface JobOffer {
  title: string;
  company: string;
  description: string;
  job_url: string;
  city: string;
  country: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  remote_work?: boolean;
  source: string;
  external_id: string;
  language: string;
}

// ====================================
// CONFIGURATION
// ====================================

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY || '';

/**
 * Recherche d'offres d'emploi dans un pays spécifique via Adzuna API
 */
export async function searchJobsInCountry(
  countryCode: string,
  searchParams: JobSearchParams
): Promise<JobOffer[]> {
  try {
    console.log(`🔍 [JobSearch] Recherche dans ${countryCode}...`);

    // 1. Récupérer les infos du pays depuis la DB
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('*')
      .eq('code', countryCode)
      .single();

    if (countryError || !country) {
      console.error(`❌ Pays ${countryCode} non trouvé`);
      return [];
    }

    if (!country.adzuna_api_endpoint) {
      console.log(`ℹ️ Adzuna API non disponible pour ${countryCode}`);
      return [];
    }

    // 2. Appeler l'API Adzuna
    const adzunaUrl = `${country.adzuna_api_endpoint}?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_API_KEY}&what=${encodeURIComponent(searchParams.profession)}&results_per_page=50`;

    console.log(`📡 Appel Adzuna: ${adzunaUrl}`);

    const response = await axios.get(adzunaUrl, {
      timeout: 10000
    });

    const results = response.data?.results || [];
    console.log(`✅ ${results.length} offres trouvées dans ${countryCode}`);

    // 3. Transformer les résultats en format uniforme
    const jobOffers: JobOffer[] = results.map((job: any) => ({
      title: job.title || 'Sans titre',
      company: job.company?.display_name || 'Entreprise non spécifiée',
      description: job.description || 'Pas de description',
      job_url: job.redirect_url || '',
      city: job.location?.display_name || 'Non spécifié',
      country: countryCode,
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      currency: country.currency,
      remote_work: false, // Adzuna ne fournit pas cette info
      source: 'Adzuna',
      external_id: `adzuna_${job.id}`,
      language: country.language
    }));

    return jobOffers;
  } catch (error: any) {
    console.error(`❌ Erreur recherche ${countryCode}:`, error.message);
    
    // Logger l'erreur dans la DB
    await supabase.from('job_search_logs').insert({
      user_id: searchParams.userId,
      country: countryCode,
      search_query: searchParams.profession,
      results_found: 0,
      errors_count: 1,
      status: 'failed'
    });

    return [];
  }
}

/**
 * Recherche séquentielle multi-pays
 * 1. D'abord le pays d'origine
 * 2. Puis tous les autres pays européens
 */
export async function searchJobsMultiCountry(
  userId: string,
  searchParams: JobSearchParams
): Promise<void> {
  try {
    console.log(`\n🚀 [Multi-Country Search] Démarrage pour user ${userId}`);

    // 1. Récupérer le profil utilisateur
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('origin_country, target_countries, preferred_job_title')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Utilisateur non trouvé');
      return;
    }

    const originCountry = user.origin_country || 'FR';
    const targetCountries = user.target_countries || ['FR'];
    const profession = user.preferred_job_title || searchParams.profession;

    console.log(`👤 User: ${userId}`);
    console.log(`🏠 Pays d'origine: ${originCountry}`);
    console.log(`🌍 Pays ciblés: ${targetCountries.join(', ')}`);

    // 2. PHASE 1 : Recherche dans le pays d'origine (PRIORITÉ)
    console.log(`\n📍 PHASE 1: Recherche dans ${originCountry} (PRIORITÉ)`);
    
    const originJobs = await searchJobsInCountry(originCountry, {
      ...searchParams,
      userId,
      profession
    });

    if (originJobs.length > 0) {
      await saveAndProcessJobs(userId, originJobs);
    }

    // 3. PHASE 2 : Recherche dans les autres pays ciblés
    console.log(`\n🌍 PHASE 2: Recherche dans les autres pays`);
    
    for (const country of targetCountries) {
      if (country === originCountry) continue; // Déjà fait

      console.log(`\n📍 Recherche dans ${country}...`);
      
      const jobs = await searchJobsInCountry(country, {
        ...searchParams,
        userId,
        profession
      });

      if (jobs.length > 0) {
        await saveAndProcessJobs(userId, jobs);
      }

      // Délai entre pays (éviter rate limiting)
      await sleep(2000);
    }

    console.log(`\n✅ [Multi-Country Search] Terminé pour user ${userId}`);
  } catch (error: any) {
    console.error('❌ Erreur Multi-Country Search:', error.message);
  }
}

/**
 * Sauvegarde les offres et déclenche le matching/candidature
 */
async function saveAndProcessJobs(
  userId: string,
  jobs: JobOffer[]
): Promise<void> {
  console.log(`💾 Sauvegarde de ${jobs.length} offres...`);

  for (const job of jobs) {
    try {
      // 1. Vérifier si l'offre existe déjà (éviter doublons)
      const { data: existing } = await supabase
        .from('job_offers')
        .select('id')
        .eq('external_id', job.external_id)
        .single();

      if (existing) {
        console.log(`⏭️ Offre ${job.external_id} déjà existante, skip`);
        continue;
      }

      // 2. Insérer l'offre dans la DB
      const { data: jobOffer, error: insertError } = await supabase
        .from('job_offers')
        .insert({
          title: job.title,
          company: job.company,
          description: job.description,
          job_url: job.job_url,
          city: job.city,
          country: job.country,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          currency: job.currency,
          remote_work: job.remote_work,
          source: job.source,
          external_id: job.external_id,
          language: job.language,
          profession: job.title
        })
        .select()
        .single();

      if (insertError) {
        console.error(`❌ Erreur insertion offre:`, insertError);
        continue;
      }

      console.log(`✅ Offre sauvegardée: ${job.title} @ ${job.company} (${job.country})`);

      // 3. Déclencher le matching et candidature automatique
      // (À implémenter selon votre logique métier)
      // await matchAndApply(userId, jobOffer.id);

    } catch (error: any) {
      console.error(`❌ Erreur traitement offre:`, error.message);
    }
  }
}

/**
 * Utilitaire: Sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Récupérer tous les pays actifs
 */
export async function getActiveCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .eq('active', true);

  if (error) {
    console.error('❌ Erreur récupération pays:', error);
    return [];
  }

  return data || [];
}

/**
 * Ajouter un pays à la liste des pays ciblés d'un utilisateur
 */
export async function addTargetCountry(
  userId: string,
  countryCode: string
): Promise<boolean> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('target_countries')
      .eq('id', userId)
      .single();

    if (!user) return false;

    const currentCountries = user.target_countries || [];
    if (currentCountries.includes(countryCode)) {
      console.log(`ℹ️ Pays ${countryCode} déjà dans la liste`);
      return true;
    }

    const { error } = await supabase
      .from('users')
      .update({
        target_countries: [...currentCountries, countryCode]
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Erreur ajout pays:', error);
      return false;
    }

    console.log(`✅ Pays ${countryCode} ajouté à la liste`);
    return true;
  } catch (error) {
    console.error('❌ Erreur:', error);
    return false;
  }
}
