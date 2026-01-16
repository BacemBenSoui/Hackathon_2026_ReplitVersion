
import { createClient } from '@supabase/supabase-js';

// Fonction utilitaire pour accéder aux variables d'environnement de manière sécurisée
// Compatible Vite (import.meta.env), Node (process.env) et environnements mixtes
const getEnv = (key: string, fallback: string): string => {
  // 1. Essai avec import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  // 2. Essai avec process.env (Compatibilité Node/Webpack)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {}

  return fallback;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://qfvccstjrssjsgwysgkk.supabase.co');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNjc3RqcnNzanNnd3lzZ2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTg1MzUsImV4cCI6MjA4MzY5NDUzNX0.1rxrdWSWVg0eHqktL4GNVYK_XO3l0d8y3RCTGi6C464');

// Configuration optimisée pour éviter les erreurs de fetch et d'authentification
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  // Headers globaux pour identifier l'application et stabiliser les requêtes
  global: {
    headers: { 'x-application-name': 'fnct-hackathon-2026' }
  }
});
