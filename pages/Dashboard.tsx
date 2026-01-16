
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DashboardHeader from '../components/DashboardHeader';
import { StudentProfile, Team, JoinRequest } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  userProfile: StudentProfile | null;
  userTeam: Team | null;
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userProfile, userTeam, onNavigate }) => {
  const [myApplications, setMyApplications] = useState<JoinRequest[]>([]);
  const isInTeam = !!userProfile?.currentTeamId;
  const isLeader = userProfile?.teamRole === 'leader';
  const hasPendingApplications = (userProfile?.applications?.length || 0) > 0;

  useEffect(() => {
    if (userProfile && !isInTeam) {
      fetchMyApplications();
    }
  }, [userProfile, isInTeam]);

  const fetchMyApplications = async () => {
    const { data } = await supabase
      .from('join_requests')
      .select('id, status, created_at, teams(name)')
      .eq('student_id', userProfile!.id);

    if (data) {
      setMyApplications(data.map((d: any) => ({
        id: d.id,
        teamId: '',
        teamName: d.teams.name,
        status: d.status,
        createdAt: d.created_at
      })));
    }
  };

  const fnctColors = [
    'bg-[#1e3a8a]', // Bleu foncé
    'bg-[#38bdf8]', // Bleu Ciel
    'bg-[#dc2626]', // Rouge
    'bg-[#10b981]', // Vert
    'bg-[#fbbf24]'  // Jaune
  ];

  const teamProgress = useMemo(() => {
    if (!userTeam) return null;
    const members = userTeam.members || [];
    const femaleCount = members.filter(m => m.gender === 'F').length;
    
    return [
      { 
        label: "Effectif Complet", 
        desc: "L'équipe doit être composée de 5 membres.", 
        done: members.length === 5,
        status: `${members.length}/5`,
        color: fnctColors[0]
      },
      { 
        label: "Mixité de Genre", 
        desc: "Minimum de 2 femmes par équipe (Règle FNCT).", 
        done: femaleCount >= 2,
        status: `${femaleCount}/2`,
        color: fnctColors[1]
      },
      { 
        label: "Dossier & Vidéo", 
        desc: "PDF de motivation et pitch vidéo requis.", 
        done: !!(userTeam.motivationUrl && userTeam.videoUrl),
        status: (userTeam.motivationUrl && userTeam.videoUrl) ? "OK" : "Manquant",
        color: fnctColors[2]
      },
      { 
        label: "Soumission Finale", 
        desc: "Validation par le Chef de Projet.", 
        done: ['submitted', 'selected', 'waitlist'].includes(userTeam.status),
        status: userTeam.status === 'submitted' ? "Déposé" : userTeam.status === 'selected' ? "Validé" : "En attente",
        color: fnctColors[3]
      }
    ];
  }, [userTeam]);

  const getOfficialStatusMessage = () => {
    if (!userTeam) return null;
    switch(userTeam.status) {
      case 'submitted': return "Dossier déposé - En cours d'analyse par le jury national.";
      case 'selected': return "Félicitations ! Votre projet a été validé pour la finale régionale.";
      case 'waitlist': return "Votre dossier est sur liste d'attente.";
      case 'rejected': return "Votre dossier n'a pas été retenu pour cette édition.";
      default: return "Dossier en cours de constitution par votre équipe.";
    }
  };

  const cardBaseStyle = "p-8 border border-[#E0E0E0] rounded-[8px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-lg transition-all active:scale-[0.98] flex flex-col justify-between group";

  return (
    <Layout userType="student" onNavigate={onNavigate} currentTeamId={userProfile?.currentTeamId}>
      <DashboardHeader 
        title={`Tableau de bord - ${userProfile?.firstName}`} 
        subtitle={isInTeam ? `Membre actif de : ${userTeam?.name}` : "Prêt à rejoindre une innovation ?"}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {isInTeam && userTeam && (
          <div className={`mb-10 p-6 rounded-[8px] border flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 duration-500 ${STATUS_COLORS[userTeam.status]}`}>
            <div className="flex items-center space-x-6">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Statut officiel du dossier</p>
                <p className="text-xl font-black uppercase tracking-tighter">{STATUS_LABELS[userTeam.status]}</p>
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest hidden md:block">{getOfficialStatusMessage()}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className={`${fnctColors[0]} ${cardBaseStyle}`}>
            <div className="text-white">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-[10px] font-black text-white/50 uppercase tracking-widest">Mon Profil</h3>
                <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${userProfile?.isComplete ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>
                  {userProfile?.isComplete ? 'Complet' : 'À finaliser'}
                </span>
              </div>
              <p className="text-2xl font-black mb-6 uppercase tracking-tight">Candidat</p>
            </div>
            <button onClick={() => onNavigate('profile')} className="w-full py-4 bg-white text-[#1e3a8a] text-[10px] font-black uppercase rounded-lg hover:bg-blue-50 transition-all">Gérer mon profil</button>
          </div>

          <div className={`${fnctColors[1]} ${cardBaseStyle}`}>
             <div className="text-white">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-[10px] font-black text-white/70 uppercase tracking-widest">Équipe</h3>
                {userTeam && <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded bg-white/20 text-white border border-white/30`}>{STATUS_LABELS[userTeam.status]}</span>}
              </div>
              <p className="text-2xl font-black mb-6 uppercase tracking-tight truncate">{isInTeam ? userTeam?.name : 'Aucune'}</p>
            </div>
            {isInTeam ? (
              <button onClick={() => onNavigate('team-workspace')} className="w-full py-4 bg-white text-[#38bdf8] text-[10px] font-black uppercase rounded-lg shadow-lg">Espace de travail</button>
            ) : (
              <div className="flex flex-col space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => onNavigate('create-team')} 
                    disabled={hasPendingApplications}
                    className={`py-4 text-[10px] font-black uppercase rounded-lg transition-all ${hasPendingApplications ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-white text-[#38bdf8] shadow-lg'}`}
                    title={hasPendingApplications ? "Vous ne pouvez pas créer d'équipe car vous avez postulé ailleurs." : ""}
                  >
                    Créer
                  </button>
                  <button 
                    onClick={() => onNavigate('find-team')} 
                    className="py-4 border border-white text-white text-[10px] font-black uppercase rounded-lg hover:bg-white/10"
                  >
                    Postuler
                  </button>
                </div>
                {hasPendingApplications && <p className="text-[8px] text-white font-bold uppercase text-center mt-2">⚠️ Candidature(s) active(s) : Création bloquée</p>}
              </div>
            )}
          </div>

          <div className={`${fnctColors[2]} ${cardBaseStyle}`}>
            <div className="text-white">
              <h3 className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-6">Dossier Final</h3>
              <p className="text-sm font-black text-white/80 uppercase mb-6 leading-tight">
                {userTeam?.status === 'submitted' ? 'Transmis au jury' : isInTeam ? 'Évolution : En cours' : 'Inaccessible'}
              </p>
            </div>
            {isInTeam && (
              <button 
                onClick={() => onNavigate('application-form')} 
                className={`w-full py-4 text-[10px] font-black uppercase rounded-lg transition-all ${userTeam.status === 'submitted' ? 'bg-white/20 text-white cursor-default' : 'bg-white text-[#dc2626] shadow-lg hover:bg-red-50'}`}
              >
                {userTeam.status === 'submitted' ? 'Dépôt effectif' : isLeader ? 'Soumettre maintenant' : 'Dépôt du dossier'}
              </button>
            )}
          </div>
        </div>

        {isInTeam && teamProgress && (
          <div className="bg-white border border-[#E0E0E0] rounded-[8px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.1)] mb-10">
            <div className="px-10 py-6 border-b bg-blue-900 flex justify-between items-center">
               <h3 className="text-xs font-black text-white uppercase tracking-widest">Suivi de l'équipe : {userTeam?.name}</h3>
               <span className="text-[9px] font-black text-blue-300 uppercase">Indicateurs de Conformité</span>
            </div>
            <div className="p-10">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {teamProgress.map((step, i) => (
                    <div key={i} className={`relative p-6 rounded-[8px] border border-[#E0E0E0] transition-all hover:shadow-md ${step.color} text-white`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 bg-white/20 border border-white/30`}>
                        {step.done ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span className="text-xs font-black">{i+1}</span>
                        )}
                      </div>
                      <p className={`text-[11px] font-black uppercase tracking-tight`}>{step.label}</p>
                      <p className="text-[9px] font-medium text-white/70 mt-1 leading-tight">{step.desc}</p>
                      <div className="absolute top-6 right-6">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full bg-white/20`}>
                          {step.status}
                        </span>
                      </div>
                    </div>
                  ))}
               </div>
               
               <div className="mt-10 p-6 bg-blue-50 rounded-lg border border-blue-100 flex items-start space-x-4">
                 <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">Comment conclure votre démarche ?</p>
                    <p className="text-xs text-blue-700/70 font-medium leading-relaxed">
                      Assurez-vous que tous les indicateurs ci-dessus sont au vert. Seul le <strong>Chef de Projet</strong> peut accéder au formulaire de soumission finale. Une fois déposé, votre dossier sera verrouillé pour l'évaluation par le jury national.
                    </p>
                 </div>
               </div>
            </div>
          </div>
        )}

        {!isInTeam && (
          <div className="bg-white border border-[#E0E0E0] rounded-[8px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
            <div className="px-8 py-5 border-b bg-gray-50">
              <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Historique de mes candidatures</h3>
            </div>
            {myApplications.length === 0 ? (
              <div className="p-10 text-center text-gray-400 font-bold uppercase text-[10px]">Aucune demande effectuée.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {myApplications.map((app) => (
                  <div key={app.id} className="px-8 py-4 flex items-center justify-between hover:bg-blue-50/20 transition-colors">
                    <div>
                      <p className="text-xs font-black text-gray-900 uppercase">{app.teamName}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Candidature du {new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-full ${app.status === 'pending' ? 'bg-orange-50 text-orange-600' : app.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {app.status === 'pending' ? 'En attente' : app.status === 'accepted' ? 'Accepté' : 'Refusé'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </Layout>
  );
};

export default Dashboard;
