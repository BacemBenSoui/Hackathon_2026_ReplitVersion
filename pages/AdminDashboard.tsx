
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DashboardHeader from '../components/DashboardHeader';
import { STATUS_COLORS, STATUS_LABELS, REGIONS, THEMES } from '../constants';
import { supabase } from '../lib/supabase';

type AdminTab = 'stats' | 'teams' | 'jury' | 'final-selection';

interface EmailDraft {
  status: string;
  to: string;
  subject: string;
  body: string;
  teamId: string;
}

const AdminDashboard: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [teams, setTeams] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtres
  const [filterText, setFilterText] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // Nouveau filtre statut

  // États pour la modale d'évaluation/consultation
  const [evaluatingTeam, setEvaluatingTeam] = useState<any | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false); 
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [evaluationScores, setEvaluationScores] = useState<Record<string, number>>({});
  
  // États pour la modale d'email
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const { data: teamsData } = await supabase
        .from('teams')
        .select(`
          *,
          leader:profiles!leader_id(first_name, last_name, email, phone),
          members:team_members(
            profile_id,
            role,
            profiles(*)
          )
        `);
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*');

      const mappedTeams = teamsData?.map((t: any) => ({
         ...t,
         status: t.Statut || t.statut || 'incomplete'
      })) || [];

      setTeams(mappedTeams);
      setProfiles(profilesData || []);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateScore = (team: any) => {
    const baseScore = (team.members?.length / 5) * 40; 
    const bonusSkill = (team.requested_skills?.length || 0) * 5;
    const evalScore = evaluationScores[team.id] || 0;
    return Math.min(Math.round(baseScore + bonusSkill + evalScore), 100);
  };

  const stats = useMemo(() => {
    return {
      totalCandidates: profiles.length,
      totalTeams: teams.length,
      incomplete: teams.filter(t => t.status === 'incomplete').length,
      submitted: teams.filter(t => t.status === 'submitted').length,
      waitlist: teams.filter(t => t.status === 'waitlist').length,
      accepted: teams.filter(t => t.status === 'selected').length,
      rejected: teams.filter(t => t.status === 'rejected').length,
      finalAccepted: teams.filter(t => t.status === 'final_accepted').length,
    };
  }, [teams, profiles]);

  const distributionMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    REGIONS.forEach(r => {
      matrix[r.name] = {};
      THEMES.forEach(t => {
        matrix[r.name][t] = 0;
      });
    });

    teams.forEach(team => {
      if (matrix[team.preferred_region] && matrix[team.preferred_region][team.theme] !== undefined) {
        matrix[team.preferred_region][team.theme]++;
      }
    });
    return matrix;
  }, [teams]);

  // Calcul des stats régionales pour le volet latéral (Inclut la sélection finale)
  const regionalStats = useMemo(() => {
    return REGIONS.map(r => {
      const regionTeams = teams.filter(t => t.preferred_region === r.name);
      
      // Validés par le Jury (selected) OU Acceptés définitivement OU Liste d'attente finale
      const juryValidatedCount = regionTeams.filter(t => ['selected', 'final_accepted', 'final_waitlist'].includes(t.status)).length;
      
      // Acceptés définitivement (Final)
      const finalAcceptedCount = regionTeams.filter(t => t.status === 'final_accepted').length;

      const totalRegionTeams = regionTeams.length;
      const validationRate = totalRegionTeams > 0 ? Math.round((juryValidatedCount / totalRegionTeams) * 100) : 0;
      const candidateCount = regionTeams.reduce((acc, t) => acc + (t.members?.length || 0), 0);

      return {
        name: r.name,
        juryValidated: juryValidatedCount,
        finalAccepted: finalAcceptedCount, // Pour le baromètre / 10
        total: totalRegionTeams,
        rate: validationRate,
        candidates: candidateCount
      };
    });
  }, [teams]);

  const getRowColorClass = (status: string) => {
    switch(status) {
      case 'incomplete': return 'bg-red-50/70 hover:bg-red-100/80 border-l-4 border-red-500';
      case 'submitted': return 'bg-orange-50/70 hover:bg-orange-100/80 border-l-4 border-orange-500';
      case 'waitlist': return 'bg-yellow-50/70 hover:bg-yellow-100/80 border-l-4 border-yellow-500';
      case 'selected': return 'bg-emerald-50/70 hover:bg-emerald-100/80 border-l-4 border-emerald-500'; // Validé Jury
      case 'final_accepted': return 'bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-900'; // Accepté Hackathon
      case 'final_waitlist': return 'bg-yellow-100 hover:bg-yellow-200 border-l-4 border-yellow-600'; // Liste attente Hackathon
      default: return 'bg-white hover:bg-gray-50 border-l-4 border-gray-200';
    }
  };

  // Filtrage global des équipes
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      const matchesText = t.name.toLowerCase().includes(filterText.toLowerCase()) || 
                          t.leader?.last_name?.toLowerCase().includes(filterText.toLowerCase());
      const matchesRegion = filterRegion ? t.preferred_region === filterRegion : true;
      const matchesStatus = filterStatus ? t.status === filterStatus : true;
      
      return matchesText && matchesRegion && matchesStatus;
    });
  }, [teams, filterText, filterRegion, filterStatus]);


  // Préparation de l'email avant ouverture modale
  const handleDecisionClick = (team: any, status: string) => {
    const recipients = [
      team.leader?.email,
      ...team.members.map((m: any) => m.profiles?.email)
    ].filter(Boolean).join(', ');

    const leaderName = `${team.leader?.first_name || 'Chef'} ${team.leader?.last_name || 'de Projet'}`;
    let subject = "";
    let body = "";

    // Logique pour l'email de SÉLECTION DÉFINITIVE (Goal 2)
    if (status === 'final_accepted') {
        const regionData = REGIONS.find(r => r.name === team.preferred_region);
        const regionName = regionData ? regionData.name : team.preferred_region;
        // On récupère la date depuis constants (ex: 2026-04-15) et on la formate
        const dateHackathon = regionData ? new Date(regionData.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : "Date à confirmer";

        subject = `Félicitation vous êtes invités à participer au Hackathon 2006 oragnisé par la FNCT à ${regionName}`;
        
        body = `La FNCT a l'honneur de vous conviez à participer au Hackathon 'Innovation Communale 2026' à ${regionName}.
Nous seront ravie de vous avoir parmi nous le ${dateHackathon}.
Nous vous prions de bien vouloir confirmer votre pésence 10 jours à l'avance.

Cordialement 
Equipe FNCT
Fédération Nationale des Communes Tunisiennes 

Tel : 71 848 393 –| Fax : 71 844 847
Mobile : (+216) 58 400 194
Site Web : www.fnct.tn
Adresse : 76 rue de Syrie - 1002 Lafayette Tunis`;
    } 
    // Logique pour l'email de validation JURY (Goal 3 updated)
    else if (status === 'selected') {
        subject = `Félicitations ! Acceptation de votre dossier FNCT - ${team.name}`;
        body = `Bonjour ${leaderName} et l'équipe,\n\nSuite à la soumission de votre dossier de candidature au hackathon FNCT 2026, les membres du jury ont décidé d'ACCEPTER votre dossier.\n\nNous vous confirmerons en cas de sélection définitive , votre participation au Hackathon 2026.\n\nCordialement,\nLe Jury FNCT 2026`;
    }
    // Autres statuts
    else {
        let decisionText = "TRAITER";
        if (status === 'rejected') decisionText = "REFUSER";
        if (status === 'waitlist' || status === 'final_waitlist') decisionText = "METTRE EN ATTENTE";

        subject = `Mise à jour concernant votre candidature FNCT - ${team.name}`;
        body = `Bonjour ${leaderName} et l'équipe,\n\nSuite à l'évaluation de votre dossier, nous avons décidé de ${decisionText} votre candidature pour le moment.\n\nCordialement,\nLe Jury FNCT 2026`;
    }

    setEmailDraft({
      teamId: team.id,
      status: status,
      to: recipients,
      subject: subject,
      body: body
    });
  };

  const handleSendEmailAndSave = async () => {
    if (!emailDraft) return;

    // Règle des 10 équipes pour la sélection définitive
    if (emailDraft.status === 'final_accepted') {
       const teamToUpdate = teams.find(t => t.id === emailDraft.teamId);
       if (teamToUpdate) {
          const regionStats = regionalStats.find(r => r.name === teamToUpdate.preferred_region);
          if (regionStats && regionStats.finalAccepted >= 10) {
             alert(`Quota atteint pour ${teamToUpdate.preferred_region} ! (10 équipes maximum). Impossible d'accepter cette équipe.`);
             return;
          }
       }
    }

    const { error } = await supabase.from('teams').update({ Statut: emailDraft.status }).eq('id', emailDraft.teamId);
    
    if (error) {
       console.error("Erreur update statut:", error);
       alert("Erreur lors de la mise à jour BDD : " + error.message);
       return;
    }

    const mailtoLink = `mailto:?bcc=${encodeURIComponent(emailDraft.to)}&subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`;
    window.location.href = mailtoLink;

    setEmailDraft(null);
    setEvaluatingTeam(null);
    await fetchAdminData();
    alert("Statut mis à jour et client mail ouvert.");
  };

  const generateCSV = (data: any[], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + data.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportGlobal = () => {
    const headers = [
      "ID Candidat", "Prénom", "Nom", "Email", "Téléphone", "Université", "Niveau", "Genre",
      "Compétences Techniques", "Compétences Métier",
      "Nom Équipe", "ID Équipe", "Région", "Thème", "Statut Dossier", "Rôle dans l'équipe"
    ];
    
    const rows = [headers, ...profiles.map(profile => {
      const associatedTeam = teams.find(t => 
        t.members.some((m: any) => m.profile_id === profile.id)
      );

      let teamInfo = { name: "Sans équipe", id: "", region: "", theme: "", status: "", role: "Aucun" };
      if (associatedTeam) {
        const memberRecord = associatedTeam.members.find((m: any) => m.profile_id === profile.id);
        teamInfo = {
          name: associatedTeam.name || "N/A",
          id: associatedTeam.id || "",
          region: associatedTeam.preferred_region || "",
          theme: associatedTeam.theme || "",
          status: STATUS_LABELS[associatedTeam.status] || associatedTeam.status,
          role: memberRecord?.role === 'leader' ? "Chef de Projet" : "Membre Expert"
        };
      }
      const clean = (text: string) => `"${(text || '').toString().replace(/"/g, '""')}"`;
      return [
        clean(profile.id), clean(profile.first_name), clean(profile.last_name), clean(profile.email), clean(profile.phone),
        clean(profile.university), clean(profile.level), clean(profile.gender),
        clean((profile.tech_skills || []).join(', ')), clean((profile.metier_skills || []).join(', ')),
        clean(teamInfo.name), clean(teamInfo.id), clean(teamInfo.region), clean(teamInfo.theme), clean(teamInfo.status), clean(teamInfo.role)
      ];
    })];

    generateCSV(rows, `FNCT2026_Export_Global_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportFinalSelection = () => {
    // Filtre uniquement les équipes acceptées définitivement
    const selectedTeams = teams.filter(t => t.status === 'final_accepted');
    
    if (selectedTeams.length === 0) {
        alert("Aucune équipe n'est encore sélectionnée définitivement.");
        return;
    }

    const headers = [
        "ID Équipe", "Nom Équipe", "Région", "Thème", "Score", 
        "Chef Projet Nom", "Chef Projet Email", "Chef Projet Tel",
        "Membre 2", "Membre 2 Email", "Membre 2 Tel",
        "Membre 3", "Membre 3 Email", "Membre 3 Tel",
        "Membre 4", "Membre 4 Email", "Membre 4 Tel",
        "Membre 5", "Membre 5 Email", "Membre 5 Tel"
    ];

    const rows = [headers, ...selectedTeams.map(t => {
        const clean = (text: string) => `"${(text || '').toString().replace(/"/g, '""')}"`;
        const members = t.members || [];
        
        // On assure que le leader est en premier ou on le traite à part, ici on prend juste les 5 membres
        const membersData = [];
        for (let i = 0; i < 5; i++) {
            if (members[i]) {
                membersData.push(clean(`${members[i].profiles?.first_name} ${members[i].profiles?.last_name}`));
                membersData.push(clean(members[i].profiles?.email));
                membersData.push(clean(members[i].profiles?.phone));
            } else {
                membersData.push("", "", "");
            }
        }

        return [
            clean(t.id), clean(t.name), clean(t.preferred_region), clean(t.theme), clean(calculateScore(t).toString()),
            ...membersData
        ];
    })];

    generateCSV(rows, `FNCT2026_Selection_Definitive_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
       <div className="text-center animate-pulse">
          <div className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Initialisation du Pilotage...</p>
       </div>
    </div>
  );

  return (
    <Layout userType="admin" onNavigate={onNavigate}>
      <DashboardHeader 
        title="Centre de Pilotage FNCT 2026" 
        subtitle="Saison Innovation Territoriale - 50 ans de la Fédération."
        actions={
          <div className="flex gap-2">
            <button 
              onClick={handleExportFinalSelection}
              className="flex items-center space-x-2 px-5 py-3 bg-blue-900 text-white rounded-xl shadow-lg hover:bg-blue-800 transition-all active:scale-95"
              title="Télécharger la liste des équipes acceptées au hackathon"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Export Sélection Finale</span>
            </button>
            <button 
              onClick={handleExportGlobal}
              className="flex items-center space-x-2 px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
              title="Télécharger la base de données complète"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Export Global</span>
            </button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <div className="flex space-x-2 bg-gray-100 p-2 rounded-[2rem] w-fit flex-wrap">
          {[
            { id: 'stats', label: "Vue d'Ensemble" },
            { id: 'teams', label: "Gestion des Équipes" },
            { id: 'jury', label: "Jury & Évaluation" },
            { id: 'final-selection', label: "Sélection Définitive" } // Nouvel Onglet
          ].map((tab) => (
             <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as AdminTab); setFilterText(''); setFilterRegion(''); setFilterStatus(''); }}
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-blue-900 shadow-xl' : 'text-gray-400 hover:text-blue-900'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'stats' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {[
                { label: "Candidats", val: stats.totalCandidates, color: "text-blue-600" },
                { label: "Équipes", val: stats.totalTeams, color: "text-blue-900" },
                { label: "Soumis", val: stats.submitted, color: "text-emerald-600" },
                { label: "En Attente", val: stats.waitlist, color: "text-orange-500" },
                { label: "Acceptés (Jury)", val: stats.accepted, color: "text-blue-900" }
              ].map((s, i) => (
                <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[9px] font-black uppercase text-gray-400 mb-2 tracking-widest">{s.label}</p>
                  <p className={`text-4xl font-black ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>

            <section className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
               <div className="p-8 bg-gray-50 border-b flex justify-between items-center">
                  <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">Distribution Régionale par Thème</h3>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Nombre d'équipes par segment</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white border-b">
                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase">Région / Pôle</th>
                        {THEMES.map(t => (
                          <th key={t} className="px-4 py-5 text-[8px] font-black text-blue-900 uppercase text-center max-w-[100px] leading-tight">{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {REGIONS.map(region => (
                        <tr key={region.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="px-8 py-5 text-[10px] font-black text-blue-900 uppercase">{region.name}</td>
                          {THEMES.map(theme => (
                            <td key={theme} className="px-4 py-5 text-center">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${distributionMatrix[region.name][theme] > 0 ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-300'}`}>
                                {distributionMatrix[region.name][theme]}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </section>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-6">
             <div className="flex flex-col sm:flex-row gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <input 
                  type="text" 
                  placeholder="Rechercher par nom d'équipe ou chef de projet..." 
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="flex-grow p-4 bg-gray-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <select 
                  value={filterRegion} 
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className="p-4 bg-gray-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-200 uppercase"
                >
                   <option value="">Toutes Régions</option>
                   {REGIONS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
             </div>

             <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-10 py-6">Équipe & Pôle</th>
                      <th className="px-10 py-6">Effectif</th>
                      <th className="px-10 py-6">Thématiques (P | S)</th>
                      <th className="px-10 py-6">État Dossier</th>
                      <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                      {filteredTeams.map(team => (
                        <tr key={team.id} className={`transition-all ${getRowColorClass(team.status)}`}>
                          <td className="px-10 py-6">
                            <p className="text-xs font-black text-blue-900 uppercase leading-none">{team.name}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase mt-1 tracking-tighter">{team.preferred_region}</p>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center space-x-2">
                                <span className={`text-xs font-black ${team.members?.length === 5 ? 'text-emerald-600' : 'text-blue-900'}`}>{team.members?.length}/5</span>
                                <div className="w-20 h-1.5 bg-gray-100/50 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-600" style={{ width: `${(team.members?.length / 5) * 100}%` }}></div>
                                </div>
                            </div>
                          </td>
                          <td className="px-10 py-6 max-w-xs">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-blue-900 uppercase truncate">P: {team.theme}</p>
                                <p className="text-[9px] font-bold text-gray-500 uppercase truncate">S: {team.secondary_theme || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <span className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-full border bg-white/50 border-gray-200`}>
                                {STATUS_LABELS[team.status] || team.status}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <button 
                              onClick={() => { setEvaluatingTeam(team); setIsViewOnly(true); }} 
                              className="px-4 py-2 bg-white text-blue-900 border border-blue-900 text-[9px] font-black uppercase rounded-xl hover:bg-blue-900 hover:text-white transition-all shadow-sm"
                            >
                              Consulter
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'jury' && (
          <div className="animate-in fade-in duration-500">
             
             {/* JURY : STATS HEADER */}
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
               <div className="bg-blue-900 p-6 rounded-2xl text-white shadow-lg">
                  <p className="text-[8px] font-black uppercase opacity-60 mb-1">Candidats Total</p>
                  <p className="text-2xl font-black">{stats.totalCandidates}</p>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[8px] font-black uppercase text-gray-400 mb-1">Équipes Constituées</p>
                  <p className="text-2xl font-black text-blue-900">{stats.totalTeams}</p>
               </div>
               <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
                  <p className="text-[8px] font-black uppercase text-red-400 mb-1">Brouillons</p>
                  <p className="text-2xl font-black text-red-600">{stats.incomplete}</p>
               </div>
               <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 shadow-sm">
                  <p className="text-[8px] font-black uppercase text-orange-400 mb-1">Soumis (À Traiter)</p>
                  <p className="text-2xl font-black text-orange-600">{stats.submitted}</p>
               </div>
               <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
                  <p className="text-[8px] font-black uppercase text-emerald-400 mb-1">Validés (Finale)</p>
                  <p className="text-2xl font-black text-emerald-600">{stats.accepted}</p>
               </div>
             </div>

             <div className="flex flex-col lg:flex-row gap-8">
                {/* TABLEAU CENTRAL */}
                <div className="flex-grow space-y-6">
                   {/* Filtres Jury */}
                   <div className="flex gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <input 
                        type="text" 
                        placeholder="Filtrer les dossiers..." 
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="flex-grow p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none"
                      />
                      <select 
                        value={filterRegion} 
                        onChange={(e) => setFilterRegion(e.target.value)}
                        className="p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none uppercase"
                      >
                         <option value="">Toutes Régions</option>
                         {REGIONS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>
                      {/* AJOUT FILTRE STATUT (Goal 1) */}
                      <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none uppercase"
                      >
                         <option value="">Tous Statuts</option>
                         {Object.entries(STATUS_LABELS).map(([key, label]) => (
                             <option key={key} value={key}>{label}</option>
                         ))}
                      </select>
                   </div>

                   <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
                      <table className="w-full text-left">
                         <thead className="bg-blue-900 text-white">
                            <tr className="text-[9px] font-black uppercase tracking-widest">
                               <th className="px-8 py-5">Innovation Projet</th>
                               <th className="px-8 py-5">Pôle</th>
                               <th className="px-8 py-5 text-center">Score</th>
                               <th className="px-8 py-5">Statut</th>
                               <th className="px-8 py-5 text-right">Évaluation</th>
                            </tr>
                         </thead>
                         <tbody>
                            {filteredTeams.map(team => (
                              <tr key={team.id} className={`transition-all ${getRowColorClass(team.status)}`}>
                                 <td className="px-8 py-5">
                                    <p className="text-xs font-black text-blue-900 uppercase tracking-tighter leading-none">{team.name}</p>
                                    <p className="text-[8px] font-bold text-gray-500 uppercase mt-1">{team.theme}</p>
                                 </td>
                                 <td className="px-8 py-5 text-[9px] font-black text-gray-500 uppercase">{team.preferred_region}</td>
                                 <td className="px-8 py-5 text-center">
                                    <p className="text-lg font-black text-blue-600 leading-none">{calculateScore(team)}</p>
                                 </td>
                                 <td className="px-8 py-5">
                                    <span className="px-3 py-1 text-[8px] font-black uppercase rounded-full bg-white/80 border border-black/5">
                                      {STATUS_LABELS[team.status] || team.status}
                                    </span>
                                 </td>
                                 <td className="px-8 py-5 text-right">
                                    <button 
                                      onClick={() => { setEvaluatingTeam(team); setIsViewOnly(false); }}
                                      className="px-6 py-2 bg-blue-600 text-white text-[9px] font-black uppercase rounded-xl hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
                                    >
                                      Noter
                                    </button>
                                 </td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* SIDEBAR REGIONALE */}
                <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
                   <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-lg sticky top-6">
                      <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b pb-4 mb-4">Performance Régionale</h4>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                         {regionalStats.map((stat, i) => (
                           <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all">
                              <div className="flex justify-between items-center mb-2">
                                 <span className="text-[9px] font-black text-blue-900 uppercase">{stat.name}</span>
                                 <span className="text-[8px] font-bold text-gray-400 uppercase">{stat.total} Équipes</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                 <div className="bg-emerald-100 rounded-lg p-2">
                                    <p className="text-[10px] font-black text-emerald-700">{stat.juryValidated}</p>
                                    <p className="text-[6px] font-bold text-emerald-500 uppercase">Validés</p>
                                 </div>
                                 <div className="bg-blue-100 rounded-lg p-2">
                                    <p className="text-[10px] font-black text-blue-700">{stat.rate}%</p>
                                    <p className="text-[6px] font-bold text-blue-500 uppercase">Taux</p>
                                 </div>
                                 <div className="bg-indigo-100 rounded-lg p-2">
                                    <p className="text-[10px] font-black text-indigo-700">{stat.candidates}</p>
                                    <p className="text-[6px] font-bold text-indigo-500 uppercase">Talents</p>
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* NOUVEL ONGLET : SÉLECTION DÉFINITIVE (Goal 2) */}
        {activeTab === 'final-selection' && (
            <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in">
               <div className="flex-grow space-y-12">
                  <div className="bg-blue-50 border-l-4 border-blue-900 p-6 rounded-r-2xl">
                     <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">Phase Finale : Confirmation Hackathon</h3>
                     <p className="text-[10px] text-blue-700/80">
                        Sélectionnez jusqu'à <strong>10 équipes par région</strong>. Les équipes non retenues passeront automatiquement en liste d'attente.
                        Un email d'invitation officiel sera envoyé lors de la confirmation.
                     </p>
                  </div>

                  {REGIONS.map(region => {
                      const regionTeams = teams.filter(t => 
                          t.preferred_region === region.name && 
                          ['selected', 'final_accepted', 'final_waitlist'].includes(t.status)
                      ).sort((a, b) => calculateScore(b) - calculateScore(a)); // Tri par score décroissant

                      if (regionTeams.length === 0) return null;

                      const acceptedCount = regionTeams.filter(t => t.status === 'final_accepted').length;

                      return (
                          <div key={region.id} className="space-y-4">
                              <div className="flex justify-between items-center px-4">
                                  <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest">{region.name}</h4>
                                  <span className={`text-[10px] font-black px-3 py-1 rounded-full ${acceptedCount >= 10 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                      {acceptedCount} / 10 Qualifiés
                                  </span>
                              </div>
                              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-md overflow-hidden">
                                  <table className="w-full text-left">
                                      <thead className="bg-gray-50 border-b">
                                          <tr className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                              <th className="px-6 py-4">Rang</th>
                                              <th className="px-6 py-4">Projet</th>
                                              <th className="px-6 py-4 text-center">Score</th>
                                              <th className="px-6 py-4">Statut Actuel</th>
                                              <th className="px-6 py-4 text-right">Décision Finale</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {regionTeams.map((team, index) => (
                                              <tr key={team.id} className={`hover:bg-gray-50 transition-colors border-b last:border-0 ${team.status === 'final_accepted' ? 'bg-blue-50/30' : ''}`}>
                                                  <td className="px-6 py-4">
                                                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500">#{index + 1}</span>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      <p className="text-[11px] font-black text-blue-900 uppercase">{team.name}</p>
                                                      <p className="text-[8px] text-gray-400 font-bold uppercase">{team.theme}</p>
                                                  </td>
                                                  <td className="px-6 py-4 text-center">
                                                      <span className="text-sm font-black text-blue-600">{calculateScore(team)}</span>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      <span className={`px-2 py-1 text-[8px] font-black uppercase rounded border ${
                                                          team.status === 'final_accepted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                          team.status === 'final_waitlist' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                      }`}>
                                                          {team.status === 'selected' ? 'Pré-sélectionné' : STATUS_LABELS[team.status]}
                                                      </span>
                                                  </td>
                                                  <td className="px-6 py-4 text-right space-x-2">
                                                      {team.status !== 'final_accepted' && (
                                                          <button 
                                                              onClick={() => handleDecisionClick(team, 'final_accepted')}
                                                              className="px-3 py-1.5 bg-blue-900 text-white text-[8px] font-black uppercase rounded-lg hover:bg-blue-800 shadow-md transition-all"
                                                          >
                                                              Confirmer
                                                          </button>
                                                      )}
                                                      {team.status !== 'final_waitlist' && (
                                                          <button 
                                                              onClick={() => handleDecisionClick(team, 'final_waitlist')}
                                                              className="px-3 py-1.5 bg-white border border-yellow-300 text-yellow-600 text-[8px] font-black uppercase rounded-lg hover:bg-yellow-50 transition-all"
                                                          >
                                                              Attente
                                                          </button>
                                                      )}
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      );
                  })}
               </div>

               {/* SIDEBAR BAROMETRE (Goal 2 - Droite) */}
               <div className="w-full lg:w-72 flex-shrink-0">
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-lg sticky top-6 space-y-6">
                      <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b pb-4">Baromètre Sélection</h4>
                      {regionalStats.map((stat, i) => (
                          <div key={i} className="space-y-2">
                              <div className="flex justify-between items-end">
                                  <span className="text-[9px] font-black text-gray-500 uppercase">{stat.name}</span>
                                  <span className={`text-[10px] font-black ${stat.finalAccepted >= 10 ? 'text-red-500' : 'text-blue-600'}`}>
                                      {stat.finalAccepted}/10
                                  </span>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                      className={`h-full transition-all duration-1000 ${stat.finalAccepted >= 10 ? 'bg-red-500' : 'bg-blue-600'}`} 
                                      style={{ width: `${(stat.finalAccepted / 10) * 100}%` }}
                                  ></div>
                              </div>
                          </div>
                      ))}
                      <div className="p-4 bg-gray-50 rounded-xl text-[9px] text-gray-400 font-medium leading-relaxed italic">
                          Le quota est fixé à 10 équipes par région. Les équipes acceptées reçoivent automatiquement l'email d'invitation officiel.
                      </div>
                  </div>
               </div>
            </div>
        )}

        {/* MODALE D'ÉVALUATION / CONSULTATION DU DOSSIER */}
        {evaluatingTeam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/90 backdrop-blur-md overflow-y-auto">
             <div className="bg-white w-full max-w-6xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in-95 duration-300">
                <div className="p-10 border-b bg-gray-50 flex justify-between items-center shrink-0">
                   <div>
                      <h2 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">
                        {isViewOnly ? 'Consultation Administrative' : 'Évaluation Jury'}
                      </h2>
                      <h3 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">{evaluatingTeam.name}</h3>
                   </div>
                   <button onClick={() => setEvaluatingTeam(null)} className="p-4 bg-gray-200 text-gray-600 rounded-[2rem] hover:bg-red-50 hover:text-red-500 transition-all">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </div>

                <div className="flex-grow overflow-y-auto p-12 space-y-16">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                      <div className="space-y-10">
                         <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b pb-2">Ressources Déposées</h4>
                            <div className="space-y-3">
                               {evaluatingTeam.motivation_url && (
                                 <a href={evaluatingTeam.motivation_url} target="_blank" className="flex items-center justify-between p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 hover:bg-emerald-100 transition-all group">
                                    <span className="text-[10px] font-black uppercase">Mémoire Motivation (PDF)</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                 </a>
                               )}
                               {evaluatingTeam.video_url && (
                                 <a href={evaluatingTeam.video_url} target="_blank" className="flex items-center justify-between p-5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 hover:bg-blue-100 transition-all group">
                                    <span className="text-[10px] font-black uppercase">Pitch Vidéo (MP4/URL)</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                 </a>
                               )}
                               {evaluatingTeam.poc_url && (
                                 <a href={evaluatingTeam.poc_url} target="_blank" className="flex items-center justify-between p-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all group">
                                    <span className="text-[10px] font-black uppercase">Source / POC Prototype</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                 </a>
                               )}
                            </div>
                         </section>

                         {/* ZONE DE NOTATION JURY (Masquée si mode consultation) */}
                         {!isViewOnly && (
                           <section className="bg-gray-50 p-8 rounded-[3rem] border border-gray-100 space-y-6 animate-in slide-in-from-left-4">
                              <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b pb-2">Notation Jury</h4>
                              <div className="space-y-4">
                                 <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Score Qualitatif (/40)</label>
                                 <input 
                                   type="range" 
                                   min="0" max="40" 
                                   value={evaluationScores[evaluatingTeam.id] || 0} 
                                   onChange={(e) => setEvaluationScores({...evaluationScores, [evaluatingTeam.id]: parseInt(e.target.value)})} 
                                   className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                                 />
                                 <div className="flex justify-between text-lg font-black text-blue-900">
                                    <span>0</span>
                                    <span>{evaluationScores[evaluatingTeam.id] || 0}</span>
                                    <span>40</span>
                                 </div>
                              </div>
                              <div className="pt-4 flex flex-col gap-3">
                                 <button onClick={() => handleDecisionClick(evaluatingTeam, 'selected')} className="w-full py-5 bg-emerald-600 text-white text-[11px] font-black uppercase rounded-2xl shadow-xl hover:bg-emerald-700 transition-all">SÉLECTIONNER (Pré-Valider)</button>
                                 <button onClick={() => handleDecisionClick(evaluatingTeam, 'rejected')} className="w-full py-5 bg-red-600 text-white text-[11px] font-black uppercase rounded-2xl hover:bg-red-700 transition-all">REJETER</button>
                                 <button onClick={() => handleDecisionClick(evaluatingTeam, 'waitlist')} className="w-full py-5 border-2 border-orange-200 text-orange-500 text-[11px] font-black uppercase rounded-2xl hover:bg-orange-50 transition-all">LISTE D'ATTENTE</button>
                              </div>
                           </section>
                         )}
                      </div>

                      <div className="lg:col-span-2 space-y-12">
                         <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b pb-2">Résumé de l'Impact</h4>
                            <div className="p-10 bg-blue-50/50 rounded-[3rem] border border-blue-100 italic text-blue-900/70 text-base leading-relaxed">
                               "{evaluatingTeam.description || "Aucun pitch écrit fourni."}"
                            </div>
                         </section>

                         <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b pb-2">Composition Nominative (Cliquez pour les détails)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {evaluatingTeam.members?.map((m: any, idx: number) => (
                                 <button 
                                   key={idx} 
                                   onClick={() => setSelectedCandidate(m.profiles)}
                                   className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-blue-200 transition-all text-left group"
                                 >
                                    <div className="flex items-center space-x-4">
                                       <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                          {m.profiles?.first_name?.charAt(0)}
                                       </div>
                                       <div>
                                          <p className="text-xs font-black text-blue-900 uppercase leading-none">{m.profiles?.first_name} {m.profiles?.last_name}</p>
                                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">{m.role === 'leader' ? 'Chef de Projet' : 'Expert'}</p>
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Fiche Profil →</span>
                                    </div>
                                 </button>
                               ))}
                            </div>
                         </section>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* MODALE D'ENVOI D'EMAIL (NEW) */}
        {emailDraft && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
             <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
                <div className="bg-blue-900 px-8 py-6 flex justify-between items-center">
                   <h3 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      Communication Jury
                   </h3>
                   <button onClick={() => setEmailDraft(null)} className="text-white/50 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                
                <div className="p-8 space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Destinataires (Cachés)</label>
                      <input 
                         type="text" 
                         readOnly 
                         value={emailDraft.to} 
                         className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600" 
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Sujet</label>
                      <input 
                         type="text" 
                         value={emailDraft.subject} 
                         onChange={(e) => setEmailDraft({...emailDraft, subject: e.target.value})} 
                         className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 outline-none" 
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Corps du message</label>
                      <textarea 
                         rows={12}
                         value={emailDraft.body}
                         onChange={(e) => setEmailDraft({...emailDraft, body: e.target.value})} 
                         className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm leading-relaxed text-gray-700 focus:ring-2 focus:ring-blue-600 outline-none" 
                      ></textarea>
                   </div>
                </div>

                <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                   <button onClick={() => setEmailDraft(null)} className="px-6 py-3 text-gray-500 font-bold text-xs uppercase hover:bg-gray-200 rounded-xl transition-all">Annuler</button>
                   <button 
                      onClick={handleSendEmailAndSave} 
                      className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                   >
                      <span>Confirmer & Envoyer</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* MODALE CANDIDAT (EXISTANTE) */}
        {selectedCandidate && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-blue-900/80 backdrop-blur-lg" onClick={() => setSelectedCandidate(null)}></div>
             <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
                <div className="p-10 bg-blue-900 text-white flex items-center space-x-6">
                   <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-4xl font-black uppercase border border-white/20">
                      {selectedCandidate.first_name?.charAt(0)}
                   </div>
                   <div>
                      <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">{selectedCandidate.first_name} {selectedCandidate.last_name}</h4>
                      <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-2">{selectedCandidate.major}</p>
                   </div>
                   <button onClick={() => setSelectedCandidate(null)} className="absolute top-8 right-8 text-white/50 hover:text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </div>
                
                <div className="p-10 space-y-8">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl">
                         <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Université</p>
                         <p className="text-[10px] font-black text-blue-900 uppercase">{selectedCandidate.university}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl">
                         <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Niveau</p>
                         <p className="text-[10px] font-black text-blue-900 uppercase">{selectedCandidate.level}</p>
                      </div>
                   </div>

                   <section className="space-y-4">
                      <p className="text-[9px] font-black text-blue-900 uppercase border-b pb-2">Expertises Déclarées</p>
                      <div className="flex flex-wrap gap-2">
                         {selectedCandidate.metier_skills?.map((s: string) => (
                           <span key={s} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase rounded-lg border border-emerald-100">{s}</span>
                         ))}
                         {selectedCandidate.tech_skills?.map((s: string) => (
                           <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 text-[8px] font-black uppercase rounded-lg border border-blue-100">{s}</span>
                         ))}
                      </div>
                   </section>

                   <section className="space-y-2">
                      <p className="text-[9px] font-black text-blue-900 uppercase border-b pb-2">Bio & Motivations</p>
                      <p className="text-xs text-gray-500 leading-relaxed italic">"{selectedCandidate.other_skills || "Aucun résumé fourni."}"</p>
                   </section>

                   {selectedCandidate.cv_url && (
                     <a href={selectedCandidate.cv_url} target="_blank" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center space-x-3 shadow-xl hover:bg-blue-700 transition-all active:scale-95">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest">Voir le Curriculum Vitae</span>
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

export default AdminDashboard;
