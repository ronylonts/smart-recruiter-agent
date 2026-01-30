import { Router, Request, Response } from 'express';
import { supabase, getUserProfile, getUserCV, getJobOffer, createApplication, createNotification, createOrGetJobOffer } from '../services/supabase.service';
import { generateCoverLetter } from '../services/groq.service';
import { sendApplication } from '../services/email.service';
import { logger } from '../services/logging.service';
import { notifyApplicationSent, notifyApplicationFailed, notifyApplicationGenerated } from '../services/notification.service';

const router = Router();

/**
 * POST /api/webhook/new-job
 * Route webhook appelée par Make.com quand une nouvelle offre correspond au profil
 * 
 * Body attendu:
 * {
 *   user_id: string,
 *   job_offer_id: string,
 *   recipient_email?: string (email du recruteur, optionnel)
 * }
 */
router.post('/new-job', async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log('\n🔔 Nouveau webhook reçu:', new Date().toISOString());
  console.log('Body:', JSON.stringify(req.body, null, 2));

  try {
    const { user_id, job_offer_id, recipient_email } = req.body;

    // Validation des paramètres
    if (!user_id || !job_offer_id) {
      console.error('❌ Paramètres manquants');
      return res.status(400).json({
        success: false,
        error: 'user_id et job_offer_id sont requis'
      });
    }

    // Étape 1 : Récupérer le profil utilisateur
    console.log('\n📋 Étape 1/6 - Récupération du profil utilisateur...');
    const userResult = await getUserProfile(user_id);
    if (!userResult.success || !userResult.data) {
      console.error('❌ Utilisateur introuvable');
      return res.status(404).json({
        success: false,
        error: 'Utilisateur introuvable'
      });
    }
    const userProfile = userResult.data;
    console.log(`✅ Utilisateur: ${userProfile.full_name} (${userProfile.email})`);

    // Vérifier si l'envoi automatique est activé
    if (!userProfile.auto_send_enabled) {
      console.log('⏸️ Envoi automatique désactivé pour cet utilisateur');
      return res.status(200).json({
        success: true,
        message: 'Envoi automatique désactivé pour cet utilisateur',
        skipped: true
      });
    }

    // Étape 2 : Récupérer le CV de l'utilisateur
    console.log('\n📄 Étape 2/6 - Récupération du CV...');
    const cvResult = await getUserCV(user_id);
    if (!cvResult.success || !cvResult.data) {
      console.error('❌ CV introuvable');
      return res.status(404).json({
        success: false,
        error: 'CV introuvable pour cet utilisateur'
      });
    }
    const cvData = cvResult.data;
    console.log(`✅ CV trouvé (${cvData.experience_years} ans d'expérience)`);

    // Étape 3 : Récupérer les détails de l'offre d'emploi
    console.log('\n💼 Étape 3/6 - Récupération de l\'offre d\'emploi...');
    const jobResult = await getJobOffer(job_offer_id);
    if (!jobResult.success || !jobResult.data) {
      console.error('❌ Offre d\'emploi introuvable');
      return res.status(404).json({
        success: false,
        error: 'Offre d\'emploi introuvable'
      });
    }
    const jobOffer = jobResult.data;
    console.log(`✅ Offre: ${jobOffer.title} chez ${jobOffer.company}`);

    // Étape 4 : Générer la lettre de motivation avec Groq
    console.log('\n🤖 Étape 4/6 - Génération de la lettre de motivation...');
    const coverLetterResult = await generateCoverLetter(userProfile, jobOffer, cvData);
    if (!coverLetterResult.success || !coverLetterResult.data) {
      console.error('❌ Erreur génération lettre');
      return res.status(500).json({
        success: false,
        error: coverLetterResult.error || 'Erreur lors de la génération de la lettre'
      });
    }
    const coverLetter = coverLetterResult.data;
    console.log(`✅ Lettre générée (${coverLetter.split(' ').length} mots)`);

    // Étape 5 : Envoyer l'email avec CV et lettre
    console.log('\n📧 Étape 5/6 - Envoi de l\'email...');
    const emailResult = await sendApplication(
      jobOffer,
      cvData.file_url,
      coverLetter,
      userProfile,
      recipient_email
    );

    if (!emailResult.success) {
      console.error('❌ Erreur envoi email');
      return res.status(500).json({
        success: false,
        error: emailResult.error || 'Erreur lors de l\'envoi de l\'email'
      });
    }
    console.log(`✅ Email envoyé (ID: ${emailResult.messageId})`);

    // Étape 6 : Sauvegarder dans la table applications
    console.log('\n💾 Étape 6/6 - Sauvegarde de la candidature...');
    const applicationResult = await createApplication({
      user_id: user_id,
      cv_id: cvData.id,
      job_offer_id: job_offer_id,
      cover_letter: coverLetter,
      status: 'sent'
    });

    if (!applicationResult.success || !applicationResult.data) {
      console.error('❌ Erreur sauvegarde candidature');
      return res.status(500).json({
        success: false,
        error: applicationResult.error || 'Erreur lors de la sauvegarde de la candidature'
      });
    }
    const application = applicationResult.data;
    console.log(`✅ Candidature sauvegardée (ID: ${application.id})`);

    // Créer une notification
    console.log('\n🔔 Création de la notification...');
    await createNotification({
      user_id: user_id,
      application_id: application.id,
      message: `📤 Candidature envoyée pour ${jobOffer.title} chez ${jobOffer.company}`
    });
    console.log('✅ Notification créée');

    // Calcul du temps d'exécution
    const executionTime = Date.now() - startTime;
    console.log(`\n⏱️ Temps total: ${executionTime}ms`);
    console.log('🎉 Processus terminé avec succès!\n');

    // Retour succès
    return res.status(200).json({
      success: true,
      message: 'Candidature envoyée avec succès',
      data: {
        application_id: application.id,
        email_sent: true,
        cover_letter_generated: true,
        execution_time_ms: executionTime
      }
    });
  } catch (error: any) {
    console.error('\n❌ Erreur globale dans le webhook:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Une erreur inattendue est survenue',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/webhook/process-job
 * Route flexible - Génère une lettre et sauvegarde
 * 
 * Body attendu (2 formats possibles):
 * 
 * Format 1 (job_id existant):
 * {
 *   user_id: string,
 *   job_id: string
 * }
 * 
 * Format 2 (détails Adzuna depuis Make.com):
 * {
 *   user_id: string,
 *   job_title: string,
 *   company: string,
 *   description: string,
 *   job_url: string,
 *   city?: string,
 *   country?: string,
 *   contact_email?: string
 * }
 */
router.post('/process-job', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { user_id, job_id, job_title, company, description, job_url, city, country, contact_email } = req.body;
  let applicationId: string | null = null;
  let finalJobId: string | null = null;

  // Log initial
  console.log('\n🔔 Nouveau job reçu:', new Date().toISOString());
  console.log('Body:', JSON.stringify(req.body, null, 2));

  await logger.info('job_received', `Nouveau job reçu pour user ${user_id}`, {
    userId: user_id,
    jobOfferId: job_id || 'création depuis détails',
    metadata: { 
      timestamp: new Date().toISOString(),
      has_job_id: !!job_id,
      has_details: !!(job_title && company && job_url)
    }
  });

  try {
    // Validation : user_id requis + soit job_id soit détails
    if (!user_id) {
      await logger.error('job_received', 'user_id manquant', {
        metadata: { provided: req.body }
      });
      return res.status(400).json({
        success: false,
        error: 'user_id est requis'
      });
    }

    if (!job_id && (!job_title || !company || !job_url)) {
      await logger.error('job_received', 'Paramètres manquants', {
        userId: user_id,
        metadata: { 
          provided: req.body,
          error: 'Fournir soit job_id, soit (job_title + company + job_url)'
        }
      });
      return res.status(400).json({
        success: false,
        error: 'Fournir soit job_id, soit (job_title + company + job_url)'
      });
    }

    // Étape 1 : Récupérer l'utilisateur avec son premier CV (jointure)
    console.log('\n📋 Récupération utilisateur + CV (jointure)...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        cvs!inner (
          id,
          file_url,
          skills,
          experience_years,
          education
        )
      `)
      .eq('id', user_id)
      .limit(1)
      .single();

    if (userError || !userData) {
      console.error('❌ Utilisateur ou CV introuvable');
      
      // Créer notification pour l'utilisateur
      await createNotification({
        user_id: user_id,
        application_id: null,
        message: `❌ Erreur: Utilisateur ou CV introuvable pour le job ${job_id}`
      });
      
      // Retourner 200 à Make.com pour ne pas bloquer le scénario
      return res.status(200).json({
        success: false,
        error: 'Utilisateur ou CV introuvable',
        notified: true
      });
    }

    console.log(`✅ Utilisateur: ${userData.full_name}`);
    console.log(`✅ CV trouvé: ${userData.cvs.experience_years} ans d'expérience`);

    // Étape 2 : Récupérer OU créer l'offre d'emploi
    let jobOffer;
    
    if (job_id) {
      // Format 1 : job_id fourni → Récupérer l'offre existante
      console.log('\n💼 Récupération de l\'offre existante (job_id fourni)...');
      const jobResult = await getJobOffer(job_id);
      if (!jobResult.success || !jobResult.data) {
        console.error('❌ Offre introuvable');
        
        // Créer notification pour l'utilisateur
        await createNotification({
          user_id: user_id,
          application_id: null,
          message: `❌ Erreur: Offre d'emploi ${job_id} introuvable`
        });
        
        // Retourner 200 à Make.com
        return res.status(200).json({
          success: false,
          error: 'Offre d\'emploi introuvable',
          notified: true
        });
      }
      jobOffer = jobResult.data;
      finalJobId = jobOffer.id;
      console.log(`✅ Offre: ${jobOffer.title} chez ${jobOffer.company}`);
    } else {
      // Format 2 : Détails fournis → Créer ou récupérer l'offre
      console.log('\n💼 Création/récupération de l\'offre (détails Adzuna fournis)...');
      console.log(`   Titre: ${job_title}`);
      console.log(`   Entreprise: ${company}`);
      console.log(`   URL: ${job_url}`);
      
      const jobResult = await createOrGetJobOffer({
        title: job_title,
        company: company,
        city: city,
        country: country,
        job_url: job_url,
        description: description,
        profession: job_title,
        contact_email: contact_email
      });

      if (!jobResult.success || !jobResult.data) {
        console.error('❌ Erreur création/récupération offre');
        
        await createNotification({
          user_id: user_id,
          application_id: null,
          message: `❌ Erreur: Impossible de créer l'offre "${job_title}" chez ${company}`
        });
        
        return res.status(200).json({
          success: false,
          error: 'Erreur création/récupération offre',
          notified: true
        });
      }

      jobOffer = jobResult.data;
      finalJobId = jobOffer.id;
      console.log(`✅ Offre: ${jobOffer.title} chez ${jobOffer.company} (ID: ${finalJobId})`);
    }

    // Étape 2.5 : Créer application avec status 'processing'
    await logger.info('application_created', 'Création application (status: processing)', {
      userId: user_id,
      jobOfferId: finalJobId
    });

    const { data: draftApp, error: draftError } = await supabase
      .from('applications')
      .insert({
        user_id: user_id,
        cv_id: userData.cvs.id,
        job_offer_id: finalJobId,
        cover_letter: 'En cours de génération...',
        status: 'processing'
      })
      .select()
      .single();

    if (draftError || !draftApp) {
      await logger.error('application_created', 'Erreur création application draft', {
        userId: user_id,
        jobOfferId: finalJobId,
        metadata: { error: draftError?.message }
      });
      return res.status(500).json({
        success: false,
        error: 'Erreur création application'
      });
    }

    applicationId = draftApp.id;
    
    await logger.success('application_created', `Application ${applicationId} créée`, {
      userId: user_id,
      applicationId,
      jobOfferId: finalJobId
    });

    // Étape 3 : Générer la lettre avec Groq (avec retry)
    await logger.info('ai_called', 'Appel Groq pour génération lettre', {
      userId: user_id,
      applicationId,
      jobOfferId: job_id,
      metadata: { model: 'llama3-8b-8192' }
    });

    const maxRetries = 3;
    let coverLetterResult;
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          await logger.warning('retry_attempted', `Tentative ${attempt}/${maxRetries}`, {
            userId: user_id,
            applicationId,
            metadata: { attempt }
          });
          
          // Update retry count
          await supabase
            .from('applications')
            .update({ 
              retry_count: attempt - 1,
              last_retry_at: new Date().toISOString()
            })
            .eq('id', applicationId);
        }

        coverLetterResult = await generateCoverLetter(userData, jobOffer, userData.cvs);
        
        if (coverLetterResult.success && coverLetterResult.data) {
          await logger.success('ai_success', `Lettre générée (tentative ${attempt})`, {
            userId: user_id,
            applicationId,
            metadata: { 
              attempt,
              subject: coverLetterResult.data.subject,
              word_count: coverLetterResult.data.body.split(' ').length
            }
          });
          break; // Succès, sortir de la boucle
        }

        lastError = coverLetterResult.error || 'Erreur inconnue';
      } catch (err: any) {
        lastError = err.message;
        await logger.error('ai_failed', `Erreur Groq (tentative ${attempt})`, {
          userId: user_id,
          applicationId,
          metadata: { attempt, error: err.message },
          error: err
        });

        if (attempt === maxRetries) break;
        
        // Attendre avant retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    if (!coverLetterResult?.success || !coverLetterResult?.data) {
      // Échec après tous les retries
      await supabase
        .from('applications')
        .update({ 
          status: 'failed',
          error_message: `Échec génération IA: ${lastError}`,
          retry_count: maxRetries
        })
        .eq('id', applicationId);

      await logger.error('ai_failed', `Échec génération après ${maxRetries} tentatives`, {
        userId: user_id,
        applicationId,
        metadata: { error: lastError, retries: maxRetries }
      });

      // Créer notification pour informer l'utilisateur
      await createNotification({
        user_id: user_id,
        application_id: applicationId,
        message: `❌ Échec de génération de lettre pour l'offre "${jobOffer.title}" après ${maxRetries} tentatives. Erreur: ${lastError}`
      });

      // Retourner 200 à Make.com pour ne pas bloquer le scénario
      return res.status(200).json({
        success: false,
        error: `Erreur génération lettre après ${maxRetries} tentatives: ${lastError}`,
        application_id: applicationId,
        status: 'failed',
        notified: true
      });
    }

    const coverLetter = coverLetterResult.data;

    // Étape 4 : Mise à jour de l'application avec la lettre générée
    console.log('\n💾 Sauvegarde de la lettre générée...');
    
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        cover_letter: coverLetter.body,
        status: 'pending', // Statut par défaut
        error_message: null
      })
      .eq('id', applicationId);

    if (updateError) {
      await logger.error('application_failed', 'Erreur mise à jour application', {
        userId: user_id,
        applicationId,
        metadata: { error: updateError.message }
      });
      
      // Notification utilisateur
      await createNotification({
        user_id: user_id,
        application_id: applicationId,
        message: `❌ Erreur de sauvegarde de la lettre pour "${jobOffer.title}". Erreur: ${updateError.message}`
      });
      
      // Retourner 200 à Make.com
      return res.status(200).json({
        success: false,
        error: 'Erreur sauvegarde de la lettre',
        application_id: applicationId,
        notified: true
      });
    }

    console.log(`✅ Lettre sauvegardée (Application ID: ${applicationId})`);

    // Étape 5 : Vérifier si l'envoi automatique est activé
    let finalStatus = 'pending';
    let emailSent = false;

    if (userData.auto_send_enabled) {
      console.log('\n📧 Envoi automatique activé, envoi de l\'email...');
      
      try {
        // Envoyer l'email avec CV + lettre
        const emailResult = await sendApplication(
          jobOffer,
          userData.cvs.file_url,
          coverLetter.body,
          {
            full_name: userData.full_name,
            email: userData.email
          },
          jobOffer.contact_email || undefined // Email du recruteur si disponible
        );

        if (emailResult.success) {
          console.log('✅ Email envoyé avec succès');
          finalStatus = 'sent';
          emailSent = true;

          // Mettre à jour le statut à 'sent'
          await supabase
            .from('applications')
            .update({ 
              status: 'sent',
              applied_at: new Date().toISOString()
            })
            .eq('id', applicationId);

          await logger.success('email_sent', 'Email envoyé avec succès', {
            userId: user_id,
            applicationId,
            metadata: { 
              messageId: emailResult.messageId,
              to: jobOffer.contact_email || 'email non fourni'
            }
          });
        } else {
          console.warn('⚠️ Échec envoi email:', emailResult.error);
          
          await logger.warning('email_failed', 'Échec envoi email', {
            userId: user_id,
            applicationId,
            metadata: { error: emailResult.error }
          });

          // Notifier l'échec
          await createNotification({
            user_id: user_id,
            application_id: applicationId,
            message: `⚠️ La lettre a été générée mais l'email n'a pas pu être envoyé pour "${jobOffer.title}". Erreur: ${emailResult.error}`
          });
        }
      } catch (emailError: any) {
        console.error('❌ Erreur lors de l\'envoi email:', emailError.message);
        
        await logger.error('email_failed', 'Erreur envoi email', {
          userId: user_id,
          applicationId,
          metadata: { error: emailError.message },
          error: emailError
        });
      }
    } else {
      console.log('ℹ️ Envoi automatique désactivé, lettre générée uniquement');
    }

    // Étape 6 : Envoyer un SMS de notification à l'utilisateur
    console.log('\n📱 Envoi SMS de notification...');
    
    try {
      const smsResult = emailSent 
        ? await notifyApplicationSent(userData.phone, jobOffer.title, jobOffer.company)
        : await notifyApplicationGenerated(userData.phone, jobOffer.title, jobOffer.company);

      if (smsResult.success) {
        console.log('✅ SMS envoyé avec succès');
      } else {
        console.warn('⚠️ SMS non envoyé:', smsResult.error);
      }
    } catch (smsError: any) {
      console.warn('⚠️ Erreur SMS (non bloquante):', smsError.message);
    }

    // Temps d'exécution
    const executionTime = Date.now() - startTime;
    console.log(`\n⏱️ Temps total: ${executionTime}ms`);
    console.log(`📊 Statut final: ${finalStatus}`);
    console.log('🎉 Processus terminé!\n');

    await logger.success('job_processed', 'Job traité avec succès', {
      userId: user_id,
      applicationId,
      jobOfferId: job_id,
      metadata: { 
        status: finalStatus,
        email_sent: emailSent,
        execution_time_ms: executionTime
      }
    });

    // Retour succès
    return res.status(200).json({
      success: true,
      message: emailSent ? 'Candidature envoyée avec succès' : 'Lettre générée avec succès',
      data: {
        application_id: applicationId,
        subject: coverLetter.subject,
        cover_letter: coverLetter.body,
        status: finalStatus,
        email_sent: emailSent,
        execution_time_ms: executionTime
      }
    });
  } catch (error: any) {
    console.error('\n❌ ❌ ❌ ERREUR GLOBALE DANS LE WEBHOOK ❌ ❌ ❌');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    await logger.error('job_received', 'Erreur globale dans le webhook', {
      userId: user_id,
      applicationId: applicationId || undefined,
      jobOfferId: job_id,
      metadata: { error: error.message, stack: error.stack },
      error
    });

    // Marquer l'application comme failed si elle existe
    if (applicationId) {
      await supabase
        .from('applications')
        .update({ 
          status: 'failed',
          error_message: error.message
        })
        .eq('id', applicationId);
    }
    
    // Notification utilisateur
    await createNotification({
      user_id: user_id,
      application_id: applicationId || null,
      message: `❌ Erreur inattendue lors du traitement du job ${job_id}. Erreur: ${error.message}`
    });
    
    // IMPORTANT: Retourner 200 à Make.com pour ne PAS bloquer le scénario
    return res.status(200).json({
      success: false,
      error: error.message || 'Erreur inattendue',
      application_id: applicationId || null,
      status: 'failed',
      notified: true,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/webhook/health
 * Health check pour vérifier que l'API fonctionne
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
