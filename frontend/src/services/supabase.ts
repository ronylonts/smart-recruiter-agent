import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// Configuration Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Client Supabase typé avec notre schéma de base de données
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
