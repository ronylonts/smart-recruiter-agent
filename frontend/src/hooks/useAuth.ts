import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getCurrentUser, signIn, signOut } from '../services/auth.service';
import type { User } from '@supabase/supabase-js';

// Hook personnalisé pour gérer l'authentification
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'utilisateur actuel au chargement
    const checkUser = async () => {
      const result = await getCurrentUser();
      if (result.success && result.user) {
        setUser(result.user);
      }
      setLoading(false);
    };

    checkUser();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await signIn(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      return { data: { user: result.user }, error: null };
    }
    return { data: null, error: { message: result.error } };
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  return { user, loading, login, logout };
};
