
import React, { useState } from 'react';
import Layout from '../components/Layout';
import { UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onLogin: (role: UserRole) => void;
  onNavigate: (page: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      
      // onLogin est passé par App.tsx et appelle navigate('dashboard')
      // App.tsx s'occupera ensuite de rediriger vers Admin ou Student selon le profil récupéré.
      onLogin('student'); 
    } catch (err: any) {
      setError(err.message || "Erreur de connexion. Vérifiez vos identifiants.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout onNavigate={onNavigate}>
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-2xl border border-gray-100">
          <div>
            <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-200 rotate-3 transition-transform hover:rotate-0 cursor-pointer" onClick={() => onNavigate('landing')}>
              <span className="text-white font-black text-xl">FNCT</span>
            </div>
            <h2 className="text-center text-3xl font-black text-gray-900 tracking-tighter">Connexion</h2>
            <p className="mt-2 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
              Accédez à votre espace hackathon
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-tight text-center">
              {error}
            </div>
          )}

          <form className="mt-10 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Email universitaire / professionnel</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-5 py-4 bg-slate-800 border-none placeholder-slate-400 text-white font-medium rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all sm:text-sm"
                  placeholder="nom@exemple.tn"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-5 py-4 bg-slate-800 border-none placeholder-slate-400 text-white font-medium rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-xs font-black rounded-2xl text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-50"
            >
              {isLoading ? 'Identification en cours...' : 'Se connecter'}
            </button>
          </form>
          
          <div className="text-center pt-4">
            <button 
              onClick={() => onNavigate('register')}
              className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
            >
              Pas de compte ? <span className="text-blue-600 underline">Créer un profil candidat</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;
