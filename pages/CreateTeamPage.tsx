
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DashboardHeader from '../components/DashboardHeader';
import { REGIONS, THEMES } from '../constants';
import { supabase } from '../lib/supabase';
import { StudentProfile } from '../types';

interface CreateTeamPageProps {
  userProfile: StudentProfile | null;
  onNavigate: (page: string) => void;
  refreshData: () => Promise<void>;
}

const CreateTeamPage: React.FC<CreateTeamPageProps> = ({ userProfile, onNavigate, refreshData }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teamRequestProfile: '', // Nouveau champ
    region: REGIONS[0].name,
    theme: THEMES[0],
    secondaryTheme: THEMES[1]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInTeam = !!userProfile?.currentTeamId;
  const hasPendingApplications = (userProfile?.applications?.length || 0) > 0;

  useEffect(() => {
    if (isInTeam || hasPendingApplications) {
      onNavigate('dashboard');
    }
  }, [isInTeam, hasPendingApplications]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPendingApplications) {
      alert("Vous avez des candidatures en cours. Annulez-les ou attendez un refus avant de créer votre propre équipe.");
      return;
    }
    
    if (!formData.name || !formData.description) return alert("Veuillez remplir les champs obligatoires.");
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: formData.name,
          description: formData.description,
          // MAPPAGE BDD : Nouvelle colonne TeamRequestProfile
          TeamRequestProfile: formData.teamRequestProfile,
          leader_id: user.id,
          theme: formData.theme,
          secondary_theme: formData.secondaryTheme,
          preferred_region: formData.region,
          // MAPPAGE BDD : Colonne Statut (text) au lieu de status
          Statut: 'incomplete'
        })
        .select().single();

      if (teamError) throw teamError;

      const { error: memberError } = await supabase
        .from('team_members')
        .insert({ 
          team_id: team.id, 
          profile_id: user.id, 
          role: 'leader' 
        });

      if (memberError) {
        await supabase.from('teams').delete().eq('id', team.id);
        throw memberError;
      }

      await refreshData();
      alert("Équipe FNCT créée !");
      onNavigate('team-workspace');
    } catch (err: any) {
      console.error("Erreur création équipe:", err);
      alert("Erreur base de données : " + (err.message || "Action impossible."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInTeam || hasPendingApplications) return null;

  return (
    <Layout userType="student" onNavigate={onNavigate}>
      <DashboardHeader title="Nouveau Projet Municipal" subtitle="Lancez votre innovation pour les 50 ans de la FNCT." />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8 p-6 bg-blue-50 border-l-4 border-blue-600 rounded-r-2xl">
           <p className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">Règle FNCT 2026</p>
           <p className="text-[11px] text-blue-700/70 font-medium">En tant que Chef de Projet, vous ne pouvez créer qu'une seule équipe nationale. Le nom et les thèmes seront définitifs dès la création.</p>
        </div>

        <form onSubmit={handleCreate} className="bg-white rounded-[8px] shadow-lg overflow-hidden border border-[#E0E0E0] animate-in fade-in slide-in-from-bottom-4">
          <div className="p-12 space-y-10">
            <section className="space-y-6">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest border-b pb-4">Identité du Projet</h3>
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Nom de l'innovation *</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-5 bg-slate-900 text-white rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Smart Municipality Djerba" />
                
                <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Impact Territorial *</label>
                <textarea required rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-5 bg-slate-900 text-white rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Décrivez comment votre solution aide la commune..."></textarea>
                
                <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Profils & Compétences Recherchés (TeamRequestProfile)</label>
                <textarea 
                  rows={3} 
                  value={formData.teamRequestProfile} 
                  onChange={(e) => setFormData({...formData, teamRequestProfile: e.target.value})} 
                  className="w-full p-5 bg-gray-50 border border-gray-200 text-slate-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" 
                  placeholder="Décrivez les profils idéaux pour votre équipe (ex: Expert React, Urbaniste, Designer...)"
                ></textarea>
              </div>
            </section>
            
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Région Administrative</label>
                  <select value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-bold uppercase text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-600">
                    {REGIONS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Thématique Majeure</label>
                  <select value={formData.theme} onChange={(e) => setFormData({...formData, theme: e.target.value as any})} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-bold uppercase text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-600">
                    {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
            </section>
          </div>
          <div className="p-10 bg-gray-50 border-t flex justify-end">
            <button type="submit" disabled={isSubmitting} className="px-16 py-6 bg-blue-600 text-white font-black text-xs rounded-2xl uppercase tracking-widest hover:bg-blue-700 shadow-xl transition-all active:scale-95 disabled:opacity-50">
              {isSubmitting ? 'Initialisation...' : 'Valider & Recruter'}
            </button>
          </div>
        </form>
      </main>
    </Layout>
  );
};

export default CreateTeamPage;
