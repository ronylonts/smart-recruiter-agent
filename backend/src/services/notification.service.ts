import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Configuration Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const twilioPhone = process.env.TWILIO_PHONE_NUMBER || '';

// Fonction pour créer le client Twilio (lazy loading)
const getTwilioClient = () => {
  // Vérifier que les credentials sont valides
  if (!accountSid || !accountSid.startsWith('AC')) {
    throw new Error('TWILIO_ACCOUNT_SID invalide ou manquant (doit commencer par AC)');
  }
  if (!authToken || authToken === 'your_auth_token_here') {
    throw new Error('TWILIO_AUTH_TOKEN invalide ou manquant');
  }
  if (!twilioPhone) {
    throw new Error('TWILIO_PHONE_NUMBER manquant');
  }
  
  return twilio(accountSid, authToken);
};

interface SMSParams {
  to: string; // Numéro de téléphone du destinataire
  jobTitle: string;
  company: string;
  status?: 'sent' | 'pending' | 'failed';
}

/**
 * Envoie un SMS de notification à l'utilisateur
 * @param params - Paramètres du SMS
 * @returns Promise<{ success: boolean, messageSid?: string, error?: string }>
 */
export const sendSMS = async (params: SMSParams): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> => {
  try {
    // Vérifier la configuration
    if (!accountSid || !accountSid.startsWith('AC') || !authToken || authToken === 'your_auth_token_here' || !twilioPhone) {
      console.warn('⚠️ Twilio non configuré correctement (SMS désactivé)');
      console.warn('   Pour activer les SMS, configurez TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_PHONE_NUMBER dans .env');
      return {
        success: false,
        error: 'Configuration Twilio manquante ou invalide'
      };
    }

    // Formatter le numéro de téléphone
    const formattedPhone = formatPhoneNumber(params.to);
    if (!formattedPhone) {
      return {
        success: false,
        error: 'Numéro de téléphone invalide'
      };
    }

    // Construire le message selon le statut
    let message = '';
    
    if (params.status === 'sent') {
      message = `✅ Candidature envoyée pour ${params.jobTitle} chez ${params.company} !`;
    } else if (params.status === 'failed') {
      message = `❌ Échec d'envoi pour ${params.jobTitle} chez ${params.company}. Consultez votre dashboard.`;
    } else {
      message = `📨 Nouvelle candidature pour ${params.jobTitle} chez ${params.company} vient d'être générée !`;
    }

    console.log('📱 Envoi SMS via Twilio...');
    console.log(`À: ${formattedPhone}`);
    console.log(`Message: ${message}`);

    // Créer le client et envoyer le SMS
    const client = getTwilioClient();
    const response = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: formattedPhone
    });

    console.log(`✅ SMS envoyé (SID: ${response.sid})`);

    return {
      success: true,
      messageSid: response.sid
    };
  } catch (error: any) {
    console.error('❌ Erreur envoi SMS:', error.message);
    
    return {
      success: false,
      error: error.message || 'Erreur inconnue lors de l\'envoi du SMS'
    };
  }
};

/**
 * Formate un numéro de téléphone au format international
 * @param phone - Numéro brut (ex: 0612345678 ou +33612345678)
 * @returns Numéro formaté au format E.164 (+33612345678) ou null si invalide
 */
const formatPhoneNumber = (phone: string): string | null => {
  if (!phone) return null;

  // Nettoyer le numéro (enlever espaces, tirets, points)
  let cleaned = phone.replace(/[\s\-\.]/g, '');

  // Si commence par +, c'est déjà au bon format
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Si commence par 0 (France), remplacer par +33
  if (cleaned.startsWith('0')) {
    cleaned = '+33' + cleaned.substring(1);
    return cleaned;
  }

  // Si commence par 33 (sans +), ajouter +
  if (cleaned.startsWith('33')) {
    return '+' + cleaned;
  }

  // Sinon, retourner null (format non reconnu)
  console.warn(`⚠️ Format de téléphone non reconnu: ${phone}`);
  return null;
};

/**
 * Envoie un SMS de confirmation de candidature envoyée
 */
export const notifyApplicationSent = async (
  userPhone: string,
  jobTitle: string,
  company: string
): Promise<{ success: boolean; error?: string }> => {
  return sendSMS({
    to: userPhone,
    jobTitle,
    company,
    status: 'sent'
  });
};

/**
 * Envoie un SMS d'échec de candidature
 */
export const notifyApplicationFailed = async (
  userPhone: string,
  jobTitle: string,
  company: string
): Promise<{ success: boolean; error?: string }> => {
  return sendSMS({
    to: userPhone,
    jobTitle,
    company,
    status: 'failed'
  });
};

/**
 * Envoie un SMS de candidature générée (mais pas encore envoyée)
 */
export const notifyApplicationGenerated = async (
  userPhone: string,
  jobTitle: string,
  company: string
): Promise<{ success: boolean; error?: string }> => {
  return sendSMS({
    to: userPhone,
    jobTitle,
    company,
    status: 'pending'
  });
};

/**
 * Vérifie la configuration Twilio
 */
export const checkTwilioConfig = (): boolean => {
  const isConfigured = !!(
    accountSid && 
    accountSid.startsWith('AC') && 
    authToken && 
    authToken !== 'your_auth_token_here' && 
    twilioPhone
  );
  
  if (!isConfigured) {
    console.warn('⚠️ Twilio non configuré (SMS désactivé). Variables manquantes ou invalides:');
    if (!accountSid || !accountSid.startsWith('AC')) {
      console.warn('  - TWILIO_ACCOUNT_SID (doit commencer par AC)');
    }
    if (!authToken || authToken === 'your_auth_token_here') {
      console.warn('  - TWILIO_AUTH_TOKEN (valeur placeholder détectée)');
    }
    if (!twilioPhone) {
      console.warn('  - TWILIO_PHONE_NUMBER');
    }
    console.warn('  → Le backend fonctionnera sans SMS. Pour activer, obtenez vos clés sur https://www.twilio.com/');
  } else {
    console.log('✅ Twilio configuré');
  }
  
  return isConfigured;
};
