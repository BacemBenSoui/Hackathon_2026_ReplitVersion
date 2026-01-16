
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DashboardHeader from '../components/DashboardHeader';
import { Team, StudentProfile } from '../types';
import { GoogleGenAI } from "@google/genai";
import { THEMES } from '../constants';
import { supabase } from '../lib/supabase';

type WorkspaceTab = 'overview' | 'recruitment' | 'communication' | 'ai';

interface TeamWorkspaceProps {
  userProfile: StudentProfile | null;
  team: Team | null;
  setTeam: (t: Team) => void;
  setUserProfile: (p: StudentProfile) => void;
  onNavigate: (page: string) => void;
  refreshData?: () => Promise<void>;
}

const TeamWorkspace: React.FC<TeamWorkspaceProps> = ({ userProfile, team, setTeam, setUserProfile, onNavigate, refreshData }) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiHistory, setAiHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  
  const [requests, setRequests] = useState<any[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<any | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    description: team?.description || '',
    teamRequestProfile: team?.teamRequestProfile || ''
  });

  useEffect(() => {
    if (team && !isEditing) {
      setEditData({
        description: team.description || '',
        teamRequestProfile: team.teamRequestProfile || ''
      });
    }
  }, [team, isEditing]);

  const isLeader = userProfile?.teamRole === 'leader';
  const membersCount = team?.members.length || 0;
  const isFull = membersCount >= 5;
  const isSubmitted = ['submitted', 'selected', 'rejected'].includes(team?.status || '');

  const compliance = useMemo(() => {
    if (!team) return null;
    const femaleCount = team.members.filter(m => m.gender === 'F').length;
    const skills = new Set(team.members.flatMap(m => m.techSkills || []));
    const isTechPresent = team.members.some(m => m.techSkills?.some(s => ['Développement logiciel', 'Data / Intelligence Artificielle'].includes(s)));
    
    return {
      fiveMembers: team.members.length === 5,
      twoWomen: femaleCount >= 2,
      diversity: skills.size >= 3,
      techProfile: isTechPresent,
      totalOk: team.members.length === 5 && femaleCount >= 2 && skills.size >= 3 && isTechPresent
    };
  }, [team]);

  useEffect(() => {
    if (team?.id && isLeader) {
      fetchJoinRequests();
    }
  }, [team?.id, isLeader]);

  const fetchJoinRequests = async () => {
    const { data, error } = await supabase
      .from('join_requests')
      .select('*, profiles(*)')
      .eq('team_id', team!.id)
      .eq('status', 'pending');
    
    if (error) console.error("Error requests:", error);
    setRequests(data || []);
  };

  const fetchMemberProfile = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      if (error) throw error;
      setSelectedMemberProfile(data);
    } catch (err) {
      console.error("Profile error:", err);
      alert("Erreur lors de la récupération du profil.");
    }
  };

  const handleUpdateTeamInfo = async () => {
    if (!team?.id || !isLeader || isSubmitted) return;
    try {
      // MAPPAGE BDD : Mise à jour de 'description' et 'TeamRequestProfile' (text)
      const { error } = await supabase
        .from('teams')
        .update({
          description: editData.description,
          "TeamRequestProfile": editData.teamRequestProfile
        })
        .eq('id', team.id);
      
      if (error) throw error;
      if (refreshData) await refreshData();
      setIsEditing(false);
      alert("Informations mises à jour.");
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleAcceptRequest = async (request: any) => {
    if (!team) return;
    setProcessingRequestId(request.id);

    try {
      const { data: alreadyJoined } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', request.student_id)
        .maybeSingle();

      if (alreadyJoined) {
        alert("Action Impossible : Ce candidat a déjà intégré une autre équipe.");
        await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', request.id);
        await fetchJoinRequests();
        return;
      }

      const { error: insError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          profile_id: request.student_id,
          role: 'member'
        });
      
      if (insError) throw insError;

      const { error: updError } = await supabase
        .from('join_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);
      
      if (updError) throw updError;

      await supabase
        .from('join_requests')
        .update({ status: 'rejected' })
        .eq('student_id', request.student_id)
        .neq('team_id', team.id);

      if (refreshData) await refreshData();
      await fetchJoinRequests();
      alert(`Félicitations ! ${request.profiles?.first_name || 'Le candidat'} a rejoint l'équipe.`);
      
    } catch (err: any) {
      console.error("Approve error:", err);
      alert("Erreur technique lors de l'approbation.");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const askAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim() || !team) return;
    const userText = aiMessage;
    setAiHistory(prev => [...prev, { role: 'user', text: userText }]);
    setAiMessage('');
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...aiHistory, { role: 'user', text: userText }].map(m => ({
          parts: [{ text: m.text }],
          role: m.role === 'user' ? 'user' : 'model'
        })),
        config: { systemInstruction: `Tu es le Coach IA FNCT. Thème: ${team.theme}.` }
      });
      setAiHistory(prev => [...prev, { role: 'model', text: response.text || "Service IA indisponible." }]);
    } catch (error) {
      setAiHistory(prev => [...prev, { role: 'model', text: "Erreur IA." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!team) return null;

  return (
    <Layout userType="student" onNavigate={onNavigate} currentTeamId={team.id}>
      <DashboardHeader 
        title={`Espace Pilotage : ${team.name}`} 
        subtitle={`${team.theme} | Région : ${team.preferredRegion}`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        
        <div className="flex space-x-2 bg-[#fbbf24] p-2 rounded-[2rem] w-fit shadow-md">
          <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'overview' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-900/60 hover:text-blue-900'}`}>Équipe & Projet</button>
          {isLeader && !isFull && <button onClick={() => setActiveTab('recruitment')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'recruitment' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-900/60 hover:text-blue-900'}`}>Recrutement ({requests.length})</button>}
          {isLeader && <button onClick={() => setActiveTab('communication')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'communication' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-900/60 hover:text-blue-900'}`}>Communication</button>}
          <button onClick={() => setActiveTab('ai')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'ai' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-900/60 hover:text-blue-900'}`}>Coach IA</button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className={`p-8 rounded-[8px] border border-[#E0E0E0] shadow-sm ${compliance?.fiveMembers ? 'bg-emerald-50' : 'bg-white'}`}>
                  <p className="text-[9px] font-black uppercase text-gray-400 mb-2 tracking-widest">Effectif (5)</p>
                  <p className="text-2xl font-black text-blue-900">{team.members.length}/5</p>
               </div>
               <div className={`p-8 rounded-[8px] border border-[#E0E0E0] shadow-sm ${compliance?.twoWomen ? 'bg-emerald-50' : 'bg-white'}`}>
                  <p className="text-[9px] font-black uppercase text-gray-400 mb-2 tracking-widest">Mixité (2F)</p>
                  <p className="text-2xl font-black text-blue-900">{team.members.filter(m => m.gender === 'F').length}/2</p>
               </div>
               <div className="p-8 rounded-[8px] border border-[#E0E0E0] shadow-sm bg-white md:col-span-2 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Thème FNCT</p>
                    <p className="text-xs font-black text-blue-900 uppercase">{team.theme}</p>
                  </div>
                  {isLeader && !isSubmitted && (
                    <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">
                      {isEditing ? 'Annuler' : 'Modifier les infos'}
                    </button>
                  )}
               </div>
            </div>

            {isLeader && isEditing ? (
              <section className="bg-white p-10 rounded-[8px] border border-[#E0E0E0] shadow-sm animate-in fade-in">
                 <h3 className="text-[11px] font-black text-blue-900 uppercase tracking-widest border-b pb-4 mb-8">Édition du Projet (Restreinte)</h3>
                 <div className="space-y-6">
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Description / Pitch Impact</label>
                       <textarea value={editData.description} onChange={(e) => setEditData({...editData, description: e.target.value})} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600 font-medium" rows={4} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-4">Profils recherchés & Compétences</label>
                       <textarea 
                          value={editData.teamRequestProfile} 
                          onChange={(e) => setEditData({...editData, teamRequestProfile: e.target.value})}
                          className="w-full p-5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600 font-medium" 
                          rows={3} 
                          placeholder="Décrivez les profils idéaux (ex: Dev Fullstack, Urbaniste, Vidéaste...)"
                       />
                    </div>
                    <div className="pt-6 flex justify-end">
                       <button onClick={handleUpdateTeamInfo} className="px-10 py-4 bg-blue-900 text-white text-[10px] font-black uppercase rounded-xl shadow-lg hover:bg-blue-800 transition-all active:scale-95">Sauvegarder les modifications</button>
                    </div>
                 </div>
              </section>
            ) : (
              <section className="bg-white rounded-[8px] border border-[#E0E0E0] shadow-sm overflow-hidden">
                <div className="p-8 bg-gray-50 border-b flex justify-between items-center">
                   <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Composition Nominative</h3>
                   {team.teamRequestProfile && <span className="text-[9px] text-blue-600 font-bold uppercase truncate max-w-xs" title={team.teamRequestProfile}>Recherche : {team.teamRequestProfile}</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 divide-x divide-gray-100">
                   {team.members.map((m, i) => (
                     <div key={i} className="p-8 text-center flex flex-col items-center group">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl mb-4 ${m.role === 'leader' ? 'bg-blue-900 text-white' : 'bg-blue-100 text-blue-600'}`}>
                           {m.name.charAt(0)}
                        </div>
                        <button onClick={() => fetchMemberProfile(m.id)} className="text-[10px] font-black text-blue-900 uppercase hover:underline">{m.name}</button>
                        <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{m.role === 'leader' ? 'Chef de Projet' : 'Expert'}</p>
                     </div>
                   ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'recruitment' && (
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] shadow-sm overflow-hidden">
            <div className="p-8 bg-blue-900 text-white">
               <h3 className="text-[10px] font-black uppercase tracking-widest">Demandes d'adhésion en attente</h3>
               <p className="text-[9px] font-bold uppercase text-blue-300 mt-1">Accepter un candidat est irréversible (Règle FNCT).</p>
            </div>
            <table className="w-full text-left">
               <tbody className="divide-y divide-gray-50">
                  {requests.length === 0 ? (
                    <tr><td className="p-20 text-center text-[10px] font-black text-gray-300 uppercase">Aucun nouveau postulant.</td></tr>
                  ) : (
                    requests.map(req => (
                      <tr key={req.id} className="hover:bg-blue-50/10 transition-colors">
                         <td className="p-8">
                            <button onClick={() => fetchMemberProfile(req.student_id)} className="text-[10px] font-black text-blue-900 uppercase hover:underline text-left">
                               {req.profiles?.first_name} {req.profiles?.last_name}
                            </button>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">{req.profiles?.university}</p>
                         </td>
                         <td className="p-8">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                               {req.profiles?.metier_skills?.slice(0, 3).map((s: string) => <span key={s} className="px-2 py-0.5 bg-gray-50 border border-gray-100 text-[7px] font-black uppercase rounded">{s}</span>)}
                            </div>
                         </td>
                         <td className="p-8 text-right">
                            <button 
                               onClick={() => handleAcceptRequest(req)} 
                               disabled={!!processingRequestId} 
                               className="px-6 py-2 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg shadow hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                               {processingRequestId === req.id ? '...' : 'APPROUVER'}
                            </button>
                         </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
          </div>
        )}

        {activeTab === 'communication' && isLeader && (
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] shadow-sm overflow-hidden animate-in fade-in">
             <div className="p-8 bg-gray-50 border-b">
                <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Canal de Communication Interne</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Coordonnées directes de vos collaborateurs.</p>
             </div>
             <div className="divide-y divide-gray-100">
                {team.members.map((m, idx) => (
                  <div key={idx} className="p-8 flex items-center justify-between hover:bg-blue-50/20 transition-colors">
                     <div className="flex items-center space-x-6">
                        <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center font-black text-blue-900">{idx+1}</div>
                        <div>
                           <p className="text-[11px] font-black text-blue-900 uppercase">{m.name}</p>
                           <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Rôle : {m.role === 'leader' ? 'Chef de Projet' : 'Expert'}</p>
                        </div>
                     </div>
                     <div className="flex items-center space-x-12">
                        <div>
                           <p className="text-[8px] font-black text-gray-300 uppercase mb-1">Email Officiel</p>
                           <p className="text-[10px] font-black text-blue-600 lowercase border-b border-blue-100 pb-0.5">{m.email}</p>
                        </div>
                        <div>
                           <p className="text-[8px] font-black text-gray-300 uppercase mb-1">Contact Mobile</p>
                           <p className="text-[10px] font-black text-blue-900">{m.phone || '+216 -- --- ---'}</p>
                        </div>
                        <a href={`mailto:${m.email}`} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </a>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] shadow-sm flex flex-col h-[600px] animate-in zoom-in-95">
             <div className="p-8 bg-blue-900 text-white flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                   <h3 className="text-xs font-black uppercase tracking-widest">Assistant Stratégique FNCT</h3>
                   <p className="text-[9px] font-bold text-blue-300 uppercase">Coach de projet en temps réel</p>
                </div>
             </div>
             <div className="flex-grow p-10 overflow-y-auto space-y-6 bg-gray-50/50">
                {aiHistory.length === 0 && (
                   <div className="text-center py-20">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Comment puis-je aider votre équipe aujourd'hui ?</p>
                   </div>
                )}
                {aiHistory.map((m, i) => (
                   <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-6 rounded-2xl text-[10px] font-medium leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-100 shadow-sm'}`}>
                         {m.text}
                      </div>
                   </div>
                ))}
                {isAiLoading && <div className="flex justify-start"><div className="w-12 h-6 bg-gray-200 rounded-full animate-pulse"></div></div>}
             </div>
             <form onSubmit={askAi} className="p-6 border-t bg-white flex items-center space-x-3">
                <input type="text" value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} placeholder="Posez une question sur votre innovation..." className="flex-grow p-4 bg-gray-50 border-none rounded-xl text-[10px] outline-none font-bold" />
                <button type="submit" className="p-4 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-all">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
             </form>
          </div>
        )}

        {selectedMemberProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm" onClick={() => setSelectedMemberProfile(null)}></div>
             <div className="relative bg-white w-full max-w-lg rounded-[8px] shadow-2xl overflow-hidden animate-in zoom-in-95">
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
                      </div>
                   </section>
                   <section>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Biographie / Atouts</p>
                      <p className="text-xs text-gray-500 italic">"{selectedMemberProfile.other_skills || 'Aucune description fournie.'}"</p>
                   </section>
                   {selectedMemberProfile.cv_url && (
                     <a href={selectedMemberProfile.cv_url} target="_blank" className="w-full py-4 bg-gray-50 text-blue-600 rounded-xl border border-gray-100 flex items-center justify-center space-x-2 text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all">
                        <span>Voir le CV complet (PDF)</span>
                     </a>
                   )}
                </div>
             </div>
          </div>
        )}
      </main>
    </Layout> 
  );
};

export default TeamWorkspace;
