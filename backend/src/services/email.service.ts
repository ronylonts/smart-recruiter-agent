import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { downloadFile } from './supabase.service';

// Charger les variables d'environnement
dotenv.config();

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
 * Configure le transporteur SMTP Gmail
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

/**
 * Envoie une candidature par email avec CV et lettre de motivation
 * @param jobOffer - Détails de l'offre d'emploi
 * @param cvUrl - URL du CV dans Supabase Storage
 * @param coverLetter - Lettre de motivation générée
 * @param userProfile - Profil de l'utilisateur
 * @param recipientEmail - Email du recruteur (optionnel)
 * @returns Promise<{ success: boolean, error?: string }>
 */
export const sendApplication = async (
  jobOffer: JobOffer,
  cvUrl: string,
  coverLetter: string,
  userProfile: UserProfile,
  recipientEmail?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    console.log('📧 Envoi de candidature par email...');
    console.log(`De: ${userProfile.email}`);
    console.log(`Poste: ${jobOffer.title} chez ${jobOffer.company}`);

    // Créer le transporteur
    const transporter = createTransporter();

    // Extraire le chemin du fichier depuis l'URL Supabase
    // Format: https://xxx.supabase.co/storage/v1/object/public/cvs/user_id/timestamp_filename.pdf
    const urlParts = cvUrl.split('/cvs/');
    const filePath = urlParts[1];

    console.log('📎 Téléchargement du CV depuis Supabase Storage...');
    console.log(`Chemin: ${filePath}`);

    // Télécharger le CV depuis Supabase Storage
    const cvBuffer = await downloadFile(filePath);

    if (!cvBuffer) {
      throw new Error('Impossible de télécharger le CV depuis Supabase Storage');
    }

    console.log(`✅ CV téléchargé (${Math.round(cvBuffer.length / 1024)} KB)`);

    // Déterminer l'email du destinataire
    // Si pas fourni, utiliser l'email de l'utilisateur (pour test)
    const toEmail = recipientEmail || process.env.SMTP_USER || userProfile.email;

    // Construire le corps de l'email
    const emailBody = `${coverLetter}

---

Cordialement,
${userProfile.full_name}
${userProfile.email}
${userProfile.phone ? `Tel: ${userProfile.phone}` : ''}

${jobOffer.job_url ? `\n\nRéférence de l'offre: ${jobOffer.job_url}` : ''}
`;

    // Configuration de l'email
    const mailOptions = {
      from: `"${userProfile.full_name}" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Candidature pour ${jobOffer.title} - ${userProfile.full_name}`,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">
${coverLetter.split('\n').map(line => `            <p style="margin: 10px 0;">${line}</p>`).join('\n')}
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
      `,
      attachments: [
        {
          filename: `CV_${userProfile.full_name.replace(/\s+/g, '_')}.pdf`,
          content: cvBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // Envoyer l'email
    console.log('📤 Envoi de l\'email...');
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email envoyé avec succès');
    console.log(`Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'envoi de l\'email'
    };
  }
};

/**
 * Vérifie la configuration SMTP (avec timeout)
 */
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    // 🛡️ PRIORITÉ 4 : Timeout de 5 secondes pour ne pas bloquer le démarrage
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SMTP verification timeout')), 5000)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    
    console.log('✅ Configuration SMTP valide');
    return true;
  } catch (error: any) {
    console.error('❌ Configuration SMTP invalide:', error.message);
    console.warn('⚠️ Les emails ne pourront pas être envoyés, mais le serveur continuera');
    return false;
  }
};
