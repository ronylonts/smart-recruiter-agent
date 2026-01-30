import { supabase } from './supabase.service';
import dotenv from 'dotenv';

dotenv.config();

type LogLevel = 'info' | 'warning' | 'error' | 'success';
type LogEvent = 
  | 'job_received' 
  | 'user_fetched' 
  | 'cv_fetched' 
  | 'offer_fetched'
  | 'ai_called'
  | 'ai_success'
  | 'ai_failed'
  | 'email_sent'
  | 'email_failed'
  | 'application_created'
  | 'application_failed'
  | 'retry_attempted'
  | 'status_changed';

interface LogEntry {
  userId?: string;
  applicationId?: string;
  jobOfferId?: string;
  level: LogLevel;
  event: LogEvent;
  message: string;
  metadata?: Record<string, any>;
  source?: string;
}

/**
 * Service de logging centralisé
 * Enregistre tous les événements dans la table logs pour monitoring
 */
class LoggingService {
  /**
   * Enregistre un log dans la base de données
   */
  async log(entry: LogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('logs')
        .insert({
          user_id: entry.userId || null,
          application_id: entry.applicationId || null,
          job_offer_id: entry.jobOfferId || null,
          level: entry.level,
          event: entry.event,
          message: entry.message,
          metadata: entry.metadata || null,
          source: entry.source || 'backend'
        });

      if (error) {
        console.error('❌ Error logging to database:', error);
      }
    } catch (err) {
      console.error('❌ Fatal error in logging service:', err);
    }
  }

  /**
   * Log d'information (événement normal)
   */
  async info(
    event: LogEvent,
    message: string,
    context?: {
      userId?: string;
      applicationId?: string;
      jobOfferId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    console.log(`ℹ️  [${event}] ${message}`);
    await this.log({
      level: 'info',
      event,
      message,
      ...context
    });
  }

  /**
   * Log de succès
   */
  async success(
    event: LogEvent,
    message: string,
    context?: {
      userId?: string;
      applicationId?: string;
      jobOfferId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    console.log(`✅ [${event}] ${message}`);
    await this.log({
      level: 'success',
      event,
      message,
      ...context
    });
  }

  /**
   * Log d'avertissement
   */
  async warning(
    event: LogEvent,
    message: string,
    context?: {
      userId?: string;
      applicationId?: string;
      jobOfferId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    console.warn(`⚠️  [${event}] ${message}`);
    await this.log({
      level: 'warning',
      event,
      message,
      ...context
    });
  }

  /**
   * Log d'erreur
   */
  async error(
    event: LogEvent,
    message: string,
    context?: {
      userId?: string;
      applicationId?: string;
      jobOfferId?: string;
      metadata?: Record<string, any>;
      error?: Error;
    }
  ): Promise<void> {
    console.error(`❌ [${event}] ${message}`);
    
    const metadata = context?.metadata || {};
    if (context?.error) {
      metadata.error = {
        message: context.error.message,
        stack: context.error.stack
      };
    }

    await this.log({
      level: 'error',
      event,
      message,
      userId: context?.userId,
      applicationId: context?.applicationId,
      jobOfferId: context?.jobOfferId,
      metadata
    });
  }

  /**
   * Récupère les logs d'un utilisateur
   */
  async getUserLogs(
    userId: string,
    options?: {
      level?: LogLevel;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      let query = supabase
        .from('logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.level) {
        query = query.eq('level', options.level);
      }

      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: {
          logs: data || [],
          total: count || 0,
          limit,
          offset
        }
      };
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Récupère les logs d'une application spécifique
   */
  async getApplicationLogs(applicationId: string) {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (err: any) {
      console.error('Error fetching application logs:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Récupère les statistiques des logs
   */
  async getLogStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('level')
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        info: data?.filter(l => l.level === 'info').length || 0,
        success: data?.filter(l => l.level === 'success').length || 0,
        warning: data?.filter(l => l.level === 'warning').length || 0,
        error: data?.filter(l => l.level === 'error').length || 0
      };

      return {
        success: true,
        data: stats
      };
    } catch (err: any) {
      console.error('Error fetching log stats:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }
}

// Export singleton
export const logger = new LoggingService();
