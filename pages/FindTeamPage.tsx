
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DashboardHeader from '../components/DashboardHeader';
import { REGIONS, THEMES, ThemeType } from '../constants';
import { StudentProfile } from '../types';
import { supabase } from '../lib/supabase';

interface FindTeamPageProps {
  userProfile: StudentProfile | null;
  setUserProfile: (p: StudentProfile) => void;
  onNavigate: (page: string) => void;
  refreshData: () => Promise<void>;
}

const FindTeamPage: React.FC<FindTeamPageProps> = ({ userProfile, setUserProfile, onNavigate, refreshData }) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterTheme, setFilterTheme] = useState<ThemeType | ''>('');
  
  // État pour la modale de profil membre
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<any | null>(null);

  const isInTeam = !!userProfile?.currentTeamId;
  const isLeader = userProfile?.teamRole === 'leader';

  useEffect(() => {
    fetchTeams();
  }, [filterRegion, filterTheme]);

  const fetchTeams = async () => {
    setIsLoading(true);
    let query = supabase
      .from('teams')
      // MAPPAGE BDD : Ajout de email, phone, level dans la sélection des profils
      .select(`*, team_members(role, profiles(id, first_name, last_name, university, level, email, phone, metier_skills, tech_skills, other_skills, cv_url))`)
      // MAPPAGE BDD : Filtrer sur Statut (text) = 'incomplete'
      .eq('Statut', 'incomplete');

    if (filterRegion) query = query.eq('preferred_region', filterRegion);
    if (filterTheme) query = query.eq('theme', filterTheme);

    const { data } = await query;
    // On mappe Statut -> status pour le front si besoin
    const mappedData = data?.map(t => ({...t, status: t.Statut})) || [];
    setTeams(mappedData);
    setIsLoading(false);
  };

  const handleApply = async (teamId: string) => {
    if (isInTeam || isLeader) {
      alert("Accès refusé : Vous êtes déjà engagé dans une équipe.");
      return;
    }
    
    try {
      const { error } = await supabase.from('join_requests').insert({
        team_id: teamId,
        student_id: userProfile!.id,
        status: 'pending' // Ici on garde status car table join_requests utilise status text
      });

      if (error) {
        if (error.code === '23505') alert("Candidature déjà déposée pour ce projet.");
        else throw error;
      } else {
        alert("✅ Candidature transmise au Chef de Projet.");
        await refreshData();
      }
    } catch (err: any) {
      alert("Erreur technique : " + err.message);
    }
  };

  return (
    <Layout userType="student" onNavigate={onNavigate}>
      <DashboardHeader title="Bourse aux Équipes" subtitle="Trouvez le projet qui correspond à vos expertises." />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {(isInTeam || isLeader) && (
          <div className="mb-10 p-6 bg-orange-50 border-l-4 border-orange-500 rounded-r-2xl text-orange-700">
             <p className="text-[10px] font-black uppercase tracking-widest mb-1">Attention Candidat</p>
             <p className="text-xs font-bold leading-relaxed">Vous faites déjà partie d'une équipe active. Les fonctions de postulation sont verrouillées pour garantir la stabilité des effectifs FNCT.</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-10">
          <aside className="w-full lg:w-80">
            <div className="bg-white p-10 rounded-[8px] border border-[#E0E0E0] shadow-sm sticky top-32 space-y-8">
              <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b pb-4">Recherche</h3>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Pôle Régional</label>
                <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none">
                  <option value="">Tous les pôles</option>
                  {REGIONS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Axe Stratégique</label>
                <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value as any)} className="w-full p-4 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none">
                  <option value="">Toutes thématiques</option>
                  {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </aside>

          <div className="flex-grow space-y-8">
            {isLoading ? (
              <div className="py-20 text-center animate-pulse text-gray-300 font-black uppercase text-xs">Synchronisation...</div>
            ) : teams.length === 0 ? (
              <div className="py-24 text-center bg-white rounded-[8px] border border-dashed border-[#E0E0E0]">
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Aucun projet ne correspond à vos filtres.</p>
              </div>
            ) : (
              teams.map(team => {
                const members = team.team_members || [];
                const hasApplied = userProfile?.applications?.includes(team.id);
                // Utilisation de la nouvelle colonne TeamRequestProfile
                const requestProfile = team.TeamRequestProfile || "";
                
                return (
                  <div key={team.id} className="bg-white border border-[#E0E0E0] rounded-[8px] p-10 shadow-sm hover:shadow-lg transition-all group">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                      <div className="lg:col-span-5 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                           <span className="px-2 py-1 bg-blue-900 text-white text-[8px] font-black uppercase rounded">{team.preferred_region}</span>
                           <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase rounded border border-indigo-100">{team.theme}</span>
                           <span className={`px-2 py-1 text-[8px] font-black uppercase rounded ${members.length === 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{members.length}/5 Membres</span>
                        </div>
                        <h3 className="text-3xl font-black text-blue-900 uppercase tracking-tighter leading-none group-hover:text-blue-600 transition-colors">{team.name}</h3>
                        <p className="text-gray-500 text-sm font-medium italic leading-relaxed line-clamp-3">"{team.description}"</p>
                      </div>

                      <div className="lg:col-span-4 border-l border-gray-100 pl-10 flex flex-col justify-between">
                         <div className="mb-6">
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b pb-2 mb-3">Compétences Recherchées</p>
                            <p className="text-xs text-gray-600 font-medium leading-relaxed">
                              {requestProfile ? requestProfile : <span className="text-gray-400 italic">Non spécifié par le chef d'équipe.</span>}
                            </p>
                         </div>
                         
                         <div>
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b pb-2 mb-3">Membres Actuels</p>
                            <div className="flex flex-wrap gap-2">
                               {members.map((m: any) => (
                                 <button 
                                   key={m.profiles?.id} 
                                   onClick={() => setSelectedMemberProfile(m.profiles)}
                                   className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 text-blue-800 rounded-lg text-[9px] font-bold uppercase border border-gray-200 hover:border-blue-200 transition-all flex items-center space-x-1"
                                 >
                                    <span>{m.profiles?.first_name} {m.profiles?.last_name}</span>
                                    <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                 </button>
                               ))}
                            </div>
                         </div>
                      </div>

                      <div className="lg:col-span-3 bg-gray-50 rounded-[2rem] p-8 flex flex-col justify-center">
                        <button 
                          onClick={() => handleApply(team.id)}
                          disabled={hasApplied || members.length >= 5 || isInTeam || isLeader}
                          className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${hasApplied ? 'bg-orange-100 text-orange-600' : (members.length >= 5 || isInTeam || isLeader) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'}`}
                        >
                          {hasApplied ? 'PITCH EN ATTENTE' : (isInTeam || isLeader) ? 'DÉJÀ MEMBRE' : 'POSTULER'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* MODALE PROFIL MEMBRE */}
      {selectedMemberProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-sm">
             <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                <button 
                   onClick={() => setSelectedMemberProfile(null)}
                   className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/10 hover:bg-black/20 text-white rounded-full flex items-center justify-center transition-all"
                >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="p-10 bg-blue-900 text-white flex items-center space-x-6">
                   <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-black uppercase border border-white/20">
                      {selectedMemberProfile.first_name?.charAt(0)}
                   </div>
                   <div>
                      <h4 className="text-xl font-black uppercase tracking-tight leading-none">{selectedMemberProfile.first_name} {selectedMemberProfile.last_name}</h4>
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">{selectedMemberProfile.university}</p>
                        {selectedMemberProfile.level && (
                          <p className="text-[9px] font-medium text-blue-200 uppercase tracking-wide mt-0.5">{selectedMemberProfile.level}</p>
                        )}
                      </div>
                   </div>
                </div>
                <div className="p-10 space-y-6">
                   <section>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Coordonnées</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[8px] text-gray-400 uppercase font-bold mb-0.5">Email</p>
                          <a href={`mailto:${selectedMemberProfile.email}`} className="text-[10px] font-black text-blue-600 hover:underline truncate block" title={selectedMemberProfile.email}>
                            {selectedMemberProfile.email || 'Non renseigné'}
                          </a>
                        </div>
                        <div>
                          <p className="text-[8px] text-gray-400 uppercase font-bold mb-0.5">Téléphone</p>
                          <a href={`tel:${selectedMemberProfile.phone}`} className="text-[10px] font-black text-blue-600 hover:underline">
                            {selectedMemberProfile.phone || 'Non renseigné'}
                          </a>
                        </div>
                      </div>
                   </section>

                   <section>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Expertises Déclarées</p>
                      <div className="flex flex-wrap gap-1">
                         {selectedMemberProfile.metier_skills?.map((s: string) => <span key={s} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase rounded border border-emerald-100">{s}</span>)}
                         {selectedMemberProfile.tech_skills?.map((s: string) => <span key={s} className="px-2 py-1 bg-blue-50 text-blue-700 text-[8px] font-black uppercase rounded border border-blue-100">{s}</span>)}
                      </div>
                   </section>
                   <section>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Biographie / Atouts</p>
                      <p className="text-xs text-gray-500 italic">"{selectedMemberProfile.other_skills || 'Aucune description fournie.'}"</p>
                   </section>
                </div>
                <div className="bg-gray-50 p-6 flex justify-end border-t border-gray-100">
                   <button onClick={() => setSelectedMemberProfile(null)} className="px-6 py-3 bg-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase hover:bg-gray-300 transition-all">Fermer</button>
                </div>
             </div>
          </div>
        )}
    </Layout>
  );
};

export default FindTeamPage;
