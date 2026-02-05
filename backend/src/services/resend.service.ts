import { Resend } from 'resend';
import dotenv from 'dotenv';
import { downloadFile } from './supabase.service';

dotenv.config();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

interface JobOffer {
  title: string;
  company: string;
  job_url?: string;
}

interface UserProfile {
  full_name: string;
  email: string;
  phone?: string;
}

/**
 * Envoie une candidature par email avec CV et lettre de motivation via Resend
 */
export const sendApplicationWithResend = async (
  jobOffer: JobOffer,
  cvUrl: string,
  coverLetter: string,
  userProfile: UserProfile,
  recipientEmail?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    console.log('📧 [RESEND] Envoi de candidature par email...');
    console.log(`De: ${userProfile.email}`);
    console.log(`Poste: ${jobOffer.title} chez ${jobOffer.company}`);

    // Télécharger le CV depuis Supabase Storage
    const urlParts = cvUrl.split('/cvs/');
    const filePath = urlParts[1];

    console.log('📎 Téléchargement du CV depuis Supabase Storage...');
    const cvBuffer = await downloadFile(filePath);

    if (!cvBuffer) {
      throw new Error('Impossible de télécharger le CV depuis Supabase Storage');
    }

    console.log(`✅ CV téléchargé (${Math.round(cvBuffer.length / 1024)} KB)`);

    // Email du destinataire (recruteur ou votre email pour test)
    const toEmail = recipientEmail || process.env.SMTP_USER || userProfile.email;

    // Corps HTML de l'email
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">
          ${coverLetter.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('\n')}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
          <p style="margin: 5px 0;"><strong>Cordialement,</strong></p>
          <p style="margin: 5px 0;"><strong>${userProfile.full_name}</strong></p>
          <p style="margin: 5px 0; color: #666;">${userProfile.email}</p>
          ${userProfile.phone ? `<p style="margin: 5px 0; color: #666;">Tel: ${userProfile.phone}</p>` : ''}
        </div>
        
        ${jobOffer.job_url ? `
        <div style="margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-left: 4px solid #4CAF50;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            Référence de l'offre: <a href="${jobOffer.job_url}" style="color: #4CAF50;">${jobOffer.job_url}</a>
          </p>
        </div>
        ` : ''}
      </div>
    `;

    // Envoyer l'email via Resend
    console.log('📤 [RESEND] Envoi de l\'email...');
    
    const { data, error } = await resend.emails.send({
      from: `${userProfile.full_name} <onboarding@resend.dev>`, // Adresse par défaut Resend (à changer plus tard)
      to: [toEmail],
      subject: `Candidature pour ${jobOffer.title} - ${userProfile.full_name}`,
      html: htmlBody,
      attachments: [
        {
          filename: `CV_${userProfile.full_name.replace(/\s+/g, '_')}.pdf`,
          content: cvBuffer,
        },
      ],
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    console.log('✅ [RESEND] Email envoyé avec succès');
    console.log(`Message ID: ${data?.id}`);

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error: any) {
    console.error('❌ [RESEND] Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'envoi de l\'email',
    };
  }
};

/**
 * Vérifie la configuration Resend
 */
export const verifyResendConfig = (): boolean => {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY manquante dans .env');
    return false;
  }
  
  console.log('✅ Configuration Resend valide');
  return true;
};
