
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
  const [filterSkills, setFilterSkills] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // État pour la modale de profil membre
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<any | null>(null);

  const isInTeam = !!userProfile?.currentTeamId;
  const isLeader = userProfile?.teamRole === 'leader';

  useEffect(() => {
    setCurrentPage(1);
    fetchTeams();
  }, [filterRegion, filterTheme, filterSkills]);

  const fetchTeams = async () => {
    setIsLoading(true);
    let query = supabase
      .from('teams')
      .select(`*, team_members(role, profiles(id, first_name, last_name, university, level, email, phone, metier_skills, tech_skills, other_skills, cv_url))`)
      .eq('Statut', 'incomplete');

    if (filterRegion) query = query.eq('preferred_region', filterRegion);
    if (filterTheme) query = query.eq('theme', filterTheme);
    if (filterSkills) query = query.ilike('TeamRequestProfile', `%${filterSkills}%`);

    const { data } = await query;
    const mappedData = data?.map(t => ({...t, status: t.Statut})) || [];
    setTeams(mappedData);
    setIsLoading(false);
  };

  const totalPages = Math.ceil(teams.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTeams = teams.slice(startIndex, startIndex + itemsPerPage);

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
        <div className="mb-12">
          <div className="bg-white p-6 rounded-3xl border border-[#E0E0E0] shadow-sm flex flex-col md:flex-row items-end gap-6">
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1">Pôle Régional</label>
                <select 
                  value={filterRegion} 
                  onChange={(e) => setFilterRegion(e.target.value)} 
                  className="w-full p-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase outline-none border border-transparent focus:border-blue-200 transition-all"
                >
                  <option value="">Tous les pôles</option>
                  {REGIONS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1">Axe Stratégique</label>
                <select 
                  value={filterTheme} 
                  onChange={(e) => setFilterTheme(e.target.value as any)} 
                  className="w-full p-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase outline-none border border-transparent focus:border-blue-200 transition-all"
                >
                  <option value="">Toutes thématiques</option>
                  {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1">Compétences recherchées</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={filterSkills}
                    onChange={(e) => setFilterSkills(e.target.value)}
                    placeholder="EX: DESIGN, REACT, FINANCE..."
                    className="w-full p-4 pl-12 bg-gray-50 rounded-2xl text-[10px] font-black uppercase outline-none border border-transparent focus:border-blue-200 transition-all placeholder:text-gray-300"
                  />
                  <svg className="w-4 h-4 text-gray-300 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {(isInTeam || isLeader) && (
          <div className="mb-10 p-6 bg-orange-50 border-l-4 border-orange-500 rounded-r-2xl text-orange-700">
             <p className="text-[10px] font-black uppercase tracking-widest mb-1">Attention Candidat</p>
             <p className="text-xs font-bold leading-relaxed">Vous faites déjà partie d'une équipe active. Les fonctions de postulation sont verrouillées pour garantir la stabilité des effectifs FNCT.</p>
          </div>
        )}

        <div className="space-y-8">
          {isLoading ? (
            <div className="py-20 text-center animate-pulse text-gray-300 font-black uppercase text-xs">Synchronisation...</div>
          ) : teams.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[2rem] border border-dashed border-[#E0E0E0]">
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Aucun projet ne correspond à vos filtres.</p>
            </div>
          ) : (
            <>
              {currentTeams.map(team => {
                const members = team.team_members || [];
                const hasApplied = userProfile?.applications?.includes(team.id);
                const requestProfile = team.TeamRequestProfile || "";
                
                return (
                  <div key={team.id} className="bg-white border border-[#E0E0E0] rounded-[2rem] p-8 md:p-12 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[5rem] -mr-16 -mt-16 group-hover:bg-blue-600 group-hover:scale-150 transition-all duration-500 opacity-20 group-hover:opacity-10"></div>
                    
                    <div className="flex flex-col lg:flex-row gap-12 relative z-10">
                      <div className="lg:col-span-5 space-y-6 flex-grow">
                        <div className="flex flex-wrap items-center gap-3">
                           <span className="px-3 py-1 bg-blue-900 text-white text-[9px] font-black uppercase rounded-full shadow-lg shadow-blue-900/20">{team.preferred_region}</span>
                           <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase rounded-full border border-indigo-100">{team.theme}</span>
                           <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border transition-colors ${members.length === 5 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                             {members.length === 5 ? 'ÉQUIPE COMPLÈTE' : `${members.length}/5 MEMBRES`}
                           </span>
                        </div>
                        
                        <div>
                          <h3 className="text-4xl font-black text-blue-900 uppercase tracking-tighter leading-[0.9] mb-4 group-hover:text-blue-600 transition-colors">
                            {team.name}
                          </h3>
                          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <p className="text-gray-500 text-sm font-medium italic leading-relaxed">
                              "{team.description}"
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="lg:w-96 space-y-8">
                         <div>
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                              <span className="w-6 h-[1px] bg-blue-900"></span>
                              Profil recherché
                            </p>
                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 min-h-[100px] flex items-center">
                              <p className="text-xs text-blue-900 font-bold leading-relaxed">
                                {requestProfile ? requestProfile : <span className="text-blue-400 italic font-medium">Non spécifié par le chef d'équipe.</span>}
                              </p>
                            </div>
                         </div>
                         
                         <div>
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                              <span className="w-6 h-[1px] bg-blue-900"></span>
                              Équipage actuel
                            </p>
                            <div className="flex flex-wrap gap-2">
                               {members.map((m: any) => (
                                 <button 
                                   key={m.profiles?.id} 
                                   onClick={() => setSelectedMemberProfile(m.profiles)}
                                   className="px-4 py-2 bg-white hover:bg-blue-600 hover:text-white text-blue-900 rounded-xl text-[9px] font-black uppercase border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2 group/member"
                                 >
                                    <span>{m.profiles?.first_name}</span>
                                    <svg className="w-3 h-3 opacity-30 group-hover/member:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                 </button>
                               ))}
                               {[...Array(5 - members.length)].map((_, i) => (
                                 <div key={i} className="w-10 h-10 border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center text-gray-200">
                                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                                 </div>
                               ))}
                            </div>
                         </div>

                        <button 
                          onClick={() => handleApply(team.id)}
                          disabled={hasApplied || members.length >= 5 || isInTeam || isLeader}
                          className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-xl ${hasApplied ? 'bg-orange-500 text-white' : (members.length >= 5 || isInTeam || isLeader) ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-95 shadow-blue-600/20'}`}
                        >
                          {hasApplied ? 'Candidature envoyée' : (isInTeam || isLeader) ? 'Déjà engagé' : 'Embarquer'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-3 pt-12">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-4 bg-white border border-gray-100 rounded-2xl text-blue-900 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-50 shadow-sm transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  
                  <div className="flex items-center bg-white border border-gray-100 rounded-3xl px-2 shadow-sm py-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-12 h-12 text-[10px] font-black rounded-2xl transition-all duration-300 ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-400 hover:bg-gray-50 hover:text-blue-600'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-4 bg-white border border-gray-100 rounded-2xl text-blue-900 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-50 shadow-sm transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              )}
            </>
          )}
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
