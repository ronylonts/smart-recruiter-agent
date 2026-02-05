import { Router, Request, Response } from 'express';
import { supabase, getUserProfile, getUserCV, getJobOffer, createApplication, createNotification, createOrGetJobOffer } from '../services/supabase.service';
import { generateCoverLetter } from '../services/groq.service';
import { sendApplication } from '../services/email.service';
import { sendApplicationWithResend } from '../services/resend.service';
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
    console.log(`✅ Lettre générée (${coverLetter.body.split(' ').length} mots)`);

    // Étape 5 : Envoyer l'email avec CV et lettre
    console.log('\n📧 Étape 5/6 - Envoi de l\'email...');
    const emailResult = await sendApplication(
      jobOffer,
      cvData.file_url,
      coverLetter.body,
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
      cover_letter: coverLetter.body,
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
 * Route simplifiée - Insère job + application avec status 'Envoyé'
 * 
 * Body attendu (détails Adzuna depuis Make.com - Module 5):
 * {
 *   user_id: string (obligatoire),
 *   title: string (titre du job depuis Adzuna),
 *   company: string (nom entreprise depuis Adzuna),
 *   city: string (ville depuis Adzuna),
 *   url: string (lien offre depuis Adzuna)
 * }
 */
router.post('/process-job', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // 🔧 PARSING SÉCURISÉ DES DONNÉES JSON STRINGIFIÉES
  let { user_id, job_id, job_title, company, description, job_url, city, country, contact_email } = req.body;
  
  // Parser 'company' si c'est un JSON stringifié
  if (typeof company === 'string' && company.startsWith('{')) {
    try {
      const parsedCompany = JSON.parse(company);
      company = parsedCompany.display_name || company;
      console.log('✅ Company parsé:', company);
    } catch (e) {
      console.warn('⚠️ Impossible de parser company:', company);
    }
  }
  
  // Parser 'city' si c'est un JSON stringifié
  if (typeof city === 'string' && city.startsWith('{')) {
    try {
      const parsedCity = JSON.parse(city);
      city = parsedCity.display_name || city;
      console.log('✅ City parsé:', city);
    } catch (e) {
      console.warn('⚠️ Impossible de parser city:', city);
    }
  }
  
  let applicationId: string | null = null;
  let finalJobId: string | null = null;

  // Log initial ULTRA-DÉTAILLÉ
  console.log('\n🔔 Nouveau job reçu:', new Date().toISOString());
  console.log('📦 Raw Body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 Type de chaque champ:');
  console.log('   user_id:', typeof user_id, '→', user_id);
  console.log('   job_title:', typeof job_title, '→', `"${job_title}"`);
  console.log('   company:', typeof company, '→', `"${company}"`);
  console.log('   job_url:', typeof job_url, '→', `"${job_url}"`);
  console.log('   city:', typeof city, '→', `"${city}"`);
  console.log('   country:', typeof country, '→', `"${country}"`);
  console.log('📊 Données après parsing:', { user_id, job_title, company, city, job_url });

  // 🚀 PRIORITÉ 1 : Répondre IMMÉDIATEMENT à Make.com (200 OK)
  res.status(200).json({
    success: true,
    message: 'Webhook reçu, traitement en cours...',
    timestamp: new Date().toISOString()
  });

  // Le traitement continue en arrière-plan (async)
  (async () => {
    await logger.info('job_received', `Nouveau job reçu pour user ${user_id}`, {
      userId: user_id || null,
      jobOfferId: job_id || null,
      metadata: { 
        timestamp: new Date().toISOString(),
        has_job_id: !!job_id,
        has_details: !!(job_title && company && job_url)
      }
    }).catch(err => console.error('Log error (non-blocking):', err));

  try {
    // 🛡️ PRIORITÉ 2 : Valider les données reçues
    if (!user_id) {
      console.error('❌ user_id manquant');
      await logger.error('job_received', 'user_id manquant', {
        metadata: { provided: req.body }
      }).catch(err => console.error('Log error (non-blocking):', err));
      return; // Arrêter le traitement
    }

    // Vérifier si les champs sont vraiment remplis (pas vides, pas "0", pas "null", pas "undefined")
    const isValidString = (str: any) => {
      return str && typeof str === 'string' && str.trim().length > 0 && 
             str !== '0' && str !== 'null' && str !== 'undefined';
    };

    const validJobTitle = isValidString(job_title);
    const validCompany = isValidString(company);
    const validJobUrl = isValidString(job_url);

    // Vérifier si on a les données minimum
    const hasValidData = job_id || (validJobTitle && validCompany && validJobUrl);
    
    if (!hasValidData) {
      console.error('❌ Données insuffisantes ou invalides:', { 
        job_id, 
        job_title: job_title || '(empty)', 
        company: company || '(empty)', 
        job_url: job_url || '(empty)' 
      });
      console.warn('⚠️ Make.com n\'envoie pas les champs correctement - vérifiez le mapping Iterator');
      
      await logger.error('job_received', 'Paramètres manquants, vides ou Adzuna sans résultats', {
        userId: user_id,
        metadata: { 
          provided: req.body,
          error: 'Fournir soit job_id, soit (job_title + company + job_url) avec des valeurs non-vides',
          possible_causes: [
            'Adzuna returned empty results array',
            'Make.com Iterator mapping incorrect (use {{8.value.title}}, not {{8.title}})',
            'Make.com using Data structure instead of JSON string for body'
          ]
        }
      }).catch(err => console.error('Log error (non-blocking):', err));
      
      // Créer une notification pour l'utilisateur
      await createNotification({
        user_id: user_id,
        application_id: null,
        message: `⚠️ Aucune offre d'emploi valide reçue. Vérifiez la configuration Make.com.`
      }).catch(err => console.error('Notification error (non-blocking):', err));
      
      return; // Arrêter le traitement
    }

    // Note: La validation des champs est maintenant faite plus haut avec isValidString()

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
      }).catch(err => console.error('Notification error (non-blocking):', err));
      
      return; // Arrêter le traitement (pas de res.status car déjà envoyé)
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
        }).catch(err => console.error('Notification error (non-blocking):', err));
        
        return; // Arrêter le traitement
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
        }).catch(err => console.error('Notification error (non-blocking):', err));
        
        return; // Arrêter le traitement
      }

      jobOffer = jobResult.data;
      finalJobId = jobOffer.id;
      console.log(`✅ Offre: ${jobOffer.title} chez ${jobOffer.company} (ID: ${finalJobId})`);
    }

    // Étape 2.5 : Créer application avec status 'processing'
    await logger.info('application_created', 'Création application (status: processing)', {
      userId: user_id,
      jobOfferId: finalJobId || undefined
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
        jobOfferId: finalJobId || undefined,
        metadata: { error: draftError?.message }
      }).catch(err => console.error('Log error (non-blocking):', err));
      return; // Arrêter le traitement
    }

    applicationId = draftApp.id;
    
    await logger.success('application_created', `Application ${applicationId} créée`, {
      userId: user_id,
      applicationId: applicationId || undefined,
      jobOfferId: finalJobId || undefined
    });

    // Étape 3 : Générer la lettre avec Groq (avec retry)
    await logger.info('ai_called', 'Appel Groq pour génération lettre', {
      userId: user_id,
      applicationId: applicationId || undefined,
      jobOfferId: job_id || undefined,
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
            applicationId: applicationId || undefined,
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
            applicationId: applicationId || undefined,
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
          applicationId: applicationId || undefined,
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
        applicationId: applicationId || undefined,
        metadata: { error: lastError, retries: maxRetries }
      }).catch(err => console.error('Log error (non-blocking):', err));

      // Créer notification pour informer l'utilisateur
      await createNotification({
        user_id: user_id,
        application_id: applicationId,
        message: `❌ Échec de génération de lettre pour l'offre "${jobOffer.title}" après ${maxRetries} tentatives. Erreur: ${lastError}`
      }).catch(err => console.error('Notification error (non-blocking):', err));

      return; // Arrêter le traitement
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
        applicationId: applicationId || undefined,
        metadata: { error: updateError.message }
      }).catch(err => console.error('Log error (non-blocking):', err));
      
      // Notification utilisateur
      await createNotification({
        user_id: user_id,
        application_id: applicationId,
        message: `❌ Erreur de sauvegarde de la lettre pour "${jobOffer.title}". Erreur: ${updateError.message}`
      }).catch(err => console.error('Notification error (non-blocking):', err));
      
      return; // Arrêter le traitement
    }

    console.log(`✅ Lettre sauvegardée (Application ID: ${applicationId})`);

    // Étape 5 : Vérifier si l'envoi automatique est activé
    let finalStatus = 'pending';
    let emailSent = false;

    if (userData.auto_send_enabled) {
      console.log('\n📧 Envoi automatique activé, envoi de l\'email...');
      
      // 🛡️ PRIORITÉ 4 : Wrap email dans try/catch pour éviter crash
      try {
        // Envoyer l'email avec CV + lettre via Resend (plus fiable que Gmail SMTP)
        const emailResult = process.env.RESEND_API_KEY
          ? await sendApplicationWithResend(
              jobOffer,
              userData.cvs.file_url,
              coverLetter.body,
              {
                full_name: userData.full_name,
                email: userData.email
              },
              jobOffer.contact_email || undefined
            )
          : await sendApplication(
              jobOffer,
              userData.cvs.file_url,
              coverLetter.body,
              {
                full_name: userData.full_name,
                email: userData.email
              },
              jobOffer.contact_email || undefined
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
            applicationId: applicationId || undefined,
            metadata: { 
              messageId: emailResult.messageId,
              to: jobOffer.contact_email || 'email non fourni'
            }
          }).catch(err => console.error('Log error (non-blocking):', err));
        } else {
          console.warn('⚠️ Échec envoi email:', emailResult.error);
          
          await logger.warning('email_failed', 'Échec envoi email', {
            userId: user_id,
            applicationId: applicationId || undefined,
            metadata: { error: emailResult.error }
          }).catch(err => console.error('Log error (non-blocking):', err));

          // Notifier l'échec (non-bloquant)
          await createNotification({
            user_id: user_id,
            application_id: applicationId,
            message: `⚠️ La lettre a été générée mais l'email n'a pas pu être envoyé pour "${jobOffer.title}". Erreur: ${emailResult.error}`
          }).catch(err => console.error('Notification error (non-blocking):', err));
        }
      } catch (emailError: any) {
        console.error('❌ Erreur lors de l\'envoi email (CATCH):', emailError.message);
        console.warn('⚠️ Le traitement continue malgré l\'erreur email');
        
        await logger.error('email_failed', 'Erreur envoi email (exception)', {
          userId: user_id,
          applicationId: applicationId || undefined,
          metadata: { error: emailError.message },
          error: emailError
        }).catch(err => console.error('Log error (non-blocking):', err));
      }
    } else {
      console.log('ℹ️ Envoi automatique désactivé, lettre générée uniquement');
    }

    // Étape 6 : Envoyer un SMS de notification à l'utilisateur (non-bloquant)
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
      applicationId: applicationId || undefined,
      jobOfferId: job_id || undefined,
      metadata: { 
        status: finalStatus,
        email_sent: emailSent,
        execution_time_ms: executionTime
      }
    }).catch(err => console.error('Log error (non-blocking):', err));

    // NOTE : Pas de res.status() ici car déjà envoyé au début
  } catch (error: any) {
    console.error('\n❌ ❌ ❌ ERREUR GLOBALE DANS LE WEBHOOK ❌ ❌ ❌');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    await logger.error('job_received', 'Erreur globale dans le webhook', {
      userId: user_id,
      applicationId: applicationId || undefined,
      jobOfferId: job_id || undefined,
      metadata: { error: error.message, stack: error.stack },
      error
    }).catch(err => console.error('Log error (non-blocking):', err));

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
    }).catch(err => console.error('Notification error (non-blocking):', err));
    
    // NOTE : Pas de res.status() ici car déjà envoyé au début
  }
  })(); // Fin du traitement async en arrière-plan
});

/**
 * POST /api/webhook/simple-insert
 * Route ULTRA-SIMPLIFIÉE pour tests - Insère directement job + application
 * 
 * Body attendu (détails Adzuna depuis Make.com - Module 5):
 * {
 *   user_id: string (obligatoire) - par défaut '29e5e5fe-23df-4069-9350-36742dfa4d2a',
 *   title: string (titre du job depuis Adzuna),
 *   company: string (nom entreprise depuis Adzuna),
 *   city: string (ville depuis Adzuna),
 *   url: string (lien offre depuis Adzuna)
 * }
 */
router.post('/simple-insert', async (req: Request, res: Response) => {
  console.log('\n🔔 [SIMPLE-INSERT] Webhook reçu:', new Date().toISOString());
  console.log('📦 Body reçu:', JSON.stringify(req.body, null, 2));

  // 🚀 ÉTAPE 1 : RÉPONDRE IMMÉDIATEMENT (éviter timeout Make.com)
  res.status(200).send('OK');

  // 🔄 TRAITEMENT EN ARRIÈRE-PLAN
  (async () => {
    try {
      console.log('\n--- DÉBUT TRAITEMENT EN ARRIÈRE-PLAN ---');

      // 📥 EXTRACTION DES DONNÉES
      const { 
        user_id = '29e5e5fe-23df-4069-9350-36742dfa4d2a', // Votre user_id par défaut
        title,
        job_title, // Make.com envoie "job_title"
        company, 
        city, 
        url,
        job_url // Make.com envoie "job_url"
      } = req.body;

      // Utiliser job_title/job_url si title/url ne sont pas définis
      const finalTitle = title || job_title;
      const finalUrl = url || job_url;

      // Extraire le nom de l'entreprise si c'est un objet
      let finalCompany = company;
      if (typeof company === 'object' && company.display_name) {
        finalCompany = company.display_name;
      } else if (typeof company === 'string') {
        try {
          const parsed = JSON.parse(company);
          finalCompany = parsed.display_name || company;
        } catch (e) {
          finalCompany = company;
        }
      }

      // Extraire le nom de la ville si c'est un objet
      let finalCity = city;
      if (typeof city === 'object' && city.display_name) {
        finalCity = city.display_name;
      } else if (typeof city === 'string') {
        try {
          const parsed = JSON.parse(city);
          finalCity = parsed.display_name || city;
        } catch (e) {
          finalCity = city;
        }
      }

      console.log('✅ user_id:', user_id);
      console.log('✅ title:', finalTitle);
      console.log('✅ company:', finalCompany);
      console.log('✅ city:', finalCity);
      console.log('✅ url:', finalUrl);

      // 🛡️ VALIDATION BASIQUE
      if (!finalTitle || !finalCompany || !finalUrl) {
        console.error('❌ Données manquantes - title, company ou url absents');
        console.error('   title:', finalTitle);
        console.error('   company:', finalCompany);
        console.error('   url:', finalUrl);
        return;
      }

      // 🏢 ÉTAPE 2 : INSERTION JOB_OFFERS
      console.log('\n📌 ÉTAPE 2 : Insertion dans job_offers...');
      
      const jobData = {
        title: finalTitle,
        company: finalCompany,
        city: finalCity || 'Non spécifié',
        job_url: finalUrl,
        description: `Offre d'emploi pour ${finalTitle} chez ${finalCompany}`,
        profession: finalTitle,
        country: 'France'
      };

      console.log('📦 Données job à insérer:', JSON.stringify(jobData, null, 2));

      const { data: newJob, error: jobError } = await supabase
        .from('job_offers')
        .insert(jobData)
        .select()
        .single();

      if (jobError) {
        console.error('❌ ERREUR insertion job_offers:', jobError.message);
        console.error('   Détails:', JSON.stringify(jobError, null, 2));
        return;
      }

      console.log('✅ Job inséré avec succès !');
      console.log('   ID:', newJob.id);
      console.log('   Title:', newJob.title);
      console.log('   Company:', newJob.company);

      // 📝 ÉTAPE 3 : RÉCUPÉRER LE CV DE L'UTILISATEUR
      console.log('\n📌 ÉTAPE 3 : Récupération du CV...');
      
      const { data: cvData, error: cvError } = await supabase
        .from('cvs')
        .select('id')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cvError || !cvData) {
        console.error('❌ ERREUR : CV introuvable pour user_id:', user_id);
        console.error('   Erreur:', cvError?.message);
        console.error('⚠️  L\'utilisateur doit uploader un CV avant de recevoir des offres !');
        return;
      }

      console.log('✅ CV trouvé ! ID:', cvData.id);

      // 📨 ÉTAPE 4 : INSERTION APPLICATION avec status 'Envoyé'
      console.log('\n📌 ÉTAPE 4 : Insertion dans applications...');
      
      const applicationData = {
        user_id: user_id,
        cv_id: cvData.id,
        job_offer_id: newJob.id,
        cover_letter: `Lettre de motivation générée automatiquement pour ${title} chez ${company}`,
        status: 'sent', // ⚠️ IMPORTANT : 'sent' dans la DB (équivaut à 'Envoyé')
        applied_at: new Date().toISOString()
      };

      console.log('📦 Données application à insérer:', JSON.stringify(applicationData, null, 2));

      const { data: newApplication, error: appError } = await supabase
        .from('applications')
        .insert(applicationData)
        .select()
        .single();

      if (appError) {
        console.error('❌ ERREUR insertion applications:', appError.message);
        console.error('   Détails:', JSON.stringify(appError, null, 2));
        return;
      }

      console.log('✅ Application insérée avec succès !');
      console.log('   ID:', newApplication.id);
      console.log('   Status:', newApplication.status);
      console.log('   Job ID:', newApplication.job_offer_id);

      // 🎉 SUCCÈS FINAL
      console.log('\n🎉 🎉 🎉 TRAITEMENT TERMINÉ AVEC SUCCÈS ! 🎉 🎉 🎉');
      console.log('📊 Résumé:');
      console.log('   - Job créé:', newJob.id);
      console.log('   - Application créée:', newApplication.id);
      console.log('   - Status:', newApplication.status);
      console.log('--- FIN TRAITEMENT EN ARRIÈRE-PLAN ---\n');

    } catch (globalError: any) {
      console.error('\n❌ ❌ ❌ ERREUR GLOBALE ❌ ❌ ❌');
      console.error('Message:', globalError.message);
      console.error('Stack:', globalError.stack);
      console.error('--- FIN TRAITEMENT (AVEC ERREUR) ---\n');
    }
  })();
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
