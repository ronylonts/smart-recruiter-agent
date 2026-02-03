import Groq from 'groq-sdk';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

interface UserProfile {
  full_name: string;
  email: string;
  phone?: string;
  profession?: string;
  city?: string;
  country?: string;
}

interface JobOffer {
  title: string;
  company: string;
  city: string;
  country: string;
  description?: string;
  profession?: string;
}

interface CVData {
  skills: string[];
  experience_years: number;
  education: string;
}

interface CoverLetterResponse {
  subject: string;
  body: string;
}

/**
 * Génère une lettre de motivation personnalisée avec Groq
 * Retourne un JSON structuré pour meilleur formatage
 * @param userProfile - Profil de l'utilisateur
 * @param jobOffer - Détails de l'offre d'emploi
 * @param cvData - Données du CV
 * @returns Promise avec subject et body séparés
 */
export const generateCoverLetter = async (
  userProfile: UserProfile,
  jobOffer: JobOffer,
  cvData: CVData
): Promise<{ success: boolean; data?: CoverLetterResponse; error?: string; rawText?: string }> => {
  try {
    console.log('🤖 Génération de lettre de motivation avec Groq...');
    console.log(`Poste: ${jobOffer.title} chez ${jobOffer.company}`);
    console.log(`Candidat: ${userProfile.full_name} - ${userProfile.profession}`);

    // Prompt structuré pour obtenir un JSON
    const prompt = `Tu dois générer une lettre de motivation et un sujet d'email pour une candidature.

CANDIDAT : ${userProfile.full_name}, ${userProfile.profession || 'Professionnel'} avec ${cvData.experience_years || 0} ans d'expérience
COMPÉTENCES : ${cvData.skills && cvData.skills.length > 0 ? cvData.skills.slice(0, 5).join(', ') : 'Compétences diversifiées'}
FORMATION : ${cvData.education || 'Formation professionnelle'}

POSTE VISÉ : ${jobOffer.title} chez ${jobOffer.company}
${jobOffer.description ? `DESCRIPTION : ${jobOffer.description.substring(0, 300)}` : ''}

CONSIGNES :
1. Génère un SUJET d'email professionnel et accrocheur
2. Rédige une lettre de motivation de 150-200 mots
3. Ton direct, professionnel et motivé
4. Mets en avant 2-3 compétences clés en lien avec le poste
5. Commence directement sans "Madame, Monsieur"
6. Pas de formule de politesse à la fin

IMPORTANT : Réponds UNIQUEMENT avec un JSON valide au format suivant (sans markdown, sans backticks) :
{
  "subject": "Le sujet de l'email ici",
  "body": "Le corps de la lettre de motivation ici"
}`;


    // Appel à l'API Groq avec le modèle llama3-8b-8192
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en recrutement et rédaction professionnelle. Tu génères des lettres de motivation courtes, percutantes et personnalisées en français. Tu réponds TOUJOURS au format JSON valide sans markdown ni backticks.'
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

    const rawResponse = completion.choices[0]?.message?.content?.trim();

    if (!rawResponse) {
      throw new Error('Aucune réponse générée par Groq');
    }

    // Parser le JSON (avec fallback si pas de JSON valide)
    let parsedResponse: CoverLetterResponse;
    
    try {
      // Nettoyer la réponse (enlever les backticks markdown si présents)
      const cleanedResponse = rawResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsedResponse = JSON.parse(cleanedResponse);
      
      // Validation
      if (!parsedResponse.subject || !parsedResponse.body) {
        throw new Error('JSON incomplet');
      }

      console.log('✅ Lettre générée avec succès (format JSON)');
      console.log(`📧 Sujet: ${parsedResponse.subject.substring(0, 50)}...`);
      console.log(`📝 Longueur lettre: ${parsedResponse.body.split(' ').length} mots`);

      return {
        success: true,
        data: parsedResponse,
        rawText: parsedResponse.body // Pour compatibilité
      };
    } catch (parseError) {
      console.warn('⚠️ Groq n\'a pas retourné de JSON valide, utilisation du texte brut');
      
      // Fallback: utiliser le texte brut
      const lines = rawResponse.split('\n').filter(l => l.trim());
      const subject = `Candidature ${userProfile.profession} - ${jobOffer.title}`;
      const body = lines.join('\n\n');

      console.log('✅ Lettre générée (format texte)');
      console.log(`📝 Longueur: ${body.split(' ').length} mots`);

      return {
        success: true,
        data: {
          subject,
          body
        },
        rawText: body
      };
    }
  } catch (error: any) {
    console.error('❌ Error generating cover letter:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la génération de la lettre'
    };
  }
};

/**
 * Génère une lettre de motivation simple (fallback sans Groq)
 */
export const generateSimpleCoverLetter = (
  userProfile: UserProfile,
  jobOffer: JobOffer,
  cvData: CVData
): string => {
  const skills = cvData.skills && cvData.skills.length > 0 
    ? cvData.skills.slice(0, 3).join(', ') 
    : 'diverses compétences techniques';
    
  return `Madame, Monsieur,

Je me permets de vous adresser ma candidature pour le poste de ${jobOffer.title} au sein de ${jobOffer.company}.

Fort(e) de ${cvData.experience_years || 0} années d'expérience en tant que ${userProfile.profession || 'professionnel'}, je maîtrise ${skills}. Ma formation en ${cvData.education || 'mon domaine'} m'a permis d'acquérir les compétences techniques nécessaires pour exceller dans ce domaine.

Votre entreprise, reconnue pour ${jobOffer.city}, ${jobOffer.country}, représente pour moi une opportunité idéale de mettre à profit mes compétences et mon expérience.

Je suis disponible pour un entretien afin de discuter de ma candidature et de la manière dont je pourrais contribuer au succès de votre équipe.

Cordialement,
${userProfile.full_name}`;
};
