
import { createClient } from '@supabase/supabase-js';

// Fonction utilitaire pour accéder aux variables d'environnement de manière sécurisée
// Compatible Vite (import.meta.env) et environnements sans build step
const getEnv = (key: string, fallback: string): string => {
  try {
    // @ts-ignore : import.meta.env est spécifique à Vite
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignorer les erreurs si import.meta n'est pas supporté
  }
  return fallback;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://qfvccstjrssjsgwysgkk.supabase.co');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNjc3RqcnNzanNnd3lzZ2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTg1MzUsImV4cCI6MjA4MzY5NDUzNX0.1rxrdWSWVg0eHqktL4GNVYK_XO3l0d8y3RCTGi6C464');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
