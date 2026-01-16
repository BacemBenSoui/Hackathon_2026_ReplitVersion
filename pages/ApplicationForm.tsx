
import React, { useState, useMemo, useEffect } from 'react';
import Layout from '../components/Layout';
import DashboardHeader from '../components/DashboardHeader';
import { Team } from '../types';
import { supabase } from '../lib/supabase';
import { THEMES } from '../constants';

interface ApplicationFormProps {
  team: Team | null;
  setTeam: (t: Team) => void;
  onNavigate: (p: string) => void;
  refreshData?: () => Promise<void>;
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({ team, setTeam, onNavigate, refreshData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // État pour la modale de confirmation
  
  const [formData, setFormData] = useState({
    motivationUrl: team?.motivationUrl || '',
    videoUrl: team?.videoUrl || '',
    pocUrl: team?.pocUrl || '',
    description: team?.description || '',
    secondaryTheme: team?.secondaryTheme || THEMES[1],
    secondaryThemeDescription: team?.secondaryThemeDescription || ''
  });

  useEffect(() => {
    if (team) {
      setFormData({
        motivationUrl: team.motivationUrl || '',
        videoUrl: team.videoUrl || '',
        pocUrl: team.pocUrl || '',
        description: team.description || '',
        secondaryTheme: team.secondaryTheme || THEMES[1],
        secondaryThemeDescription: team.secondaryThemeDescription || ''
      });
    }
  }, [team]);

  const isLocked = team?.status === 'submitted' || team?.status === 'selected' || team?.status === 'rejected';

  // Sécurisation de la vérification URL
  const isValidUrl = (url: any) => {
    try {
      if (!url || typeof url !== 'string' || url.length < 5) return false;
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const validation = useMemo(() => {
    if (!team) return { ok: false };
    const members = team.members || [];
    const hasFiveMembers = members.length === 5;
    const femaleCount = members.filter(m => m.gender === 'F').length;
    const hasMixity = femaleCount >= 2;
    
    const hasMotivation = isValidUrl(formData.motivationUrl);
    const hasVideo = isValidUrl(formData.videoUrl);
    const hasDescription = formData.description && formData.description.trim().length >= 20;
    
    return {
      hasFiveMembers,
      hasMixity,
      hasMotivation,
      hasVideo,
      hasDescription,
      ok: hasFiveMembers && hasMixity && hasMotivation && hasVideo && hasDescription
    };
  }, [team, formData]);

  // Étape 1 : Clic sur "Déposer" -> Ouvre la modale
  const handleDepositClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!team?.id) {
      console.error("ID équipe manquant");
      return;
    }
    if (isLocked) {
      return;
    }
    
    // Au lieu de window.confirm, on ouvre notre modale
    setShowConfirmModal(true);
  };

  // Étape 2 : Confirmation réelle dans la modale -> Exécute la requête
  const confirmDeposit = async () => {
    setIsSubmitting(true);
    const targetId = String(team!.id).trim();

    const updatePayload: any = {
      video_url: formData.videoUrl || null,
      poc_url: formData.pocUrl || null,
      motivation_url: formData.motivationUrl || null,
      description: formData.description || null,
      secondary_theme: formData.secondaryTheme || null,
      secondary_theme_description: formData.secondaryThemeDescription || null,
      updated_at: new Date().toISOString(),
      "Statut": 'submitted' 
    };

    try {
      const { error } = await supabase
        .from('teams')
        .update(updatePayload)
        .eq('id', targetId);

      if (error) throw error;
      
      if (refreshData) await refreshData();
      
      // Fermer la modale de confirmation et ouvrir celle de succès
      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Erreur critique:", err);
      alert(`Erreur technique lors du dépôt : ${err.message}`);
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintToNewTab = () => {
    const printContent = document.getElementById('printable-attestation');
    if (!printContent || !team) return;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Certificat de Dépôt - ${team.name}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
              body { background: white; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              #printable-attestation { padding: 40px !important; width: 100% !important; }
              @media print {
                @page { margin: 0; size: landscape; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div id="printable-attestation">
              ${printContent.innerHTML}
            </div>
            <script>
              window.onload = function() {
                setTimeout(() => { 
                    window.print(); 
                }, 800);
              };
            </script>
          </body>
        </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  if (!team) return null;

  return (
    <Layout userType="student" onNavigate={onNavigate} currentTeamId={team.id}>
      <DashboardHeader 
        title="Dépôt Officiel du Dossier" 
        subtitle={`Projet : ${team.name} | Réf : ${team.id.substring(0,8)}`}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-12 no-print grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-12 space-y-10">
              
              <section className="space-y-6">
                <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest border-b pb-4 flex justify-between">
                  <span>1. Pitch de l'Innovation</span>
                  <span className="text-[10px] text-gray-400 normal-case font-medium">{formData.description.length} caractères</span>
                </h3>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Résumé de l'Impact Territorial *</label>
                  <textarea 
                    disabled={isLocked}
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({...p, description: e.target.value}))}
                    className={`w-full p-6 bg-slate-900 text-white rounded-[2rem] outline-none focus:ring-4 focus:ring-blue-500/20 text-sm font-medium ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                    placeholder="Comment transformez-vous votre commune ?"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Thématique Secondaire</label>
                      <select 
                        disabled={isLocked}
                        value={formData.secondaryTheme} 
                        onChange={(e) => setFormData(p => ({...p, secondaryTheme: e.target.value}))} 
                        className={`w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Détails de l'axe</label>
                      <input 
                        disabled={isLocked}
                        type="text"
                        value={formData.secondaryThemeDescription}
                        onChange={(e) => setFormData(p => ({...p, secondaryThemeDescription: e.target.value}))}
                        className={`w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-bold outline-none ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                        placeholder="Précisions thématiques..."
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest border-b pb-4">2. Ressources Numériques (URLs)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mémoire / Lettre de Motivation (PDF) *</label>
                    <input 
                      disabled={isLocked} 
                      type="url" 
                      value={formData.motivationUrl} 
                      onChange={(e) => setFormData(p => ({...p, motivationUrl: e.target.value}))} 
                      className={`w-full p-5 bg-slate-900 text-white rounded-2xl text-xs outline-none border-2 transition-all ${isValidUrl(formData.motivationUrl) ? 'border-emerald-500/50' : 'border-transparent'} ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`} 
                      placeholder="Lien PDF public (Drive, Dropbox...)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pitch Vidéo (MP4/URL) *</label>
                    <input 
                      disabled={isLocked} 
                      type="url" 
                      value={formData.videoUrl} 
                      onChange={(e) => setFormData(p => ({...p, videoUrl: e.target.value}))} 
                      className={`w-full p-5 bg-slate-900 text-white rounded-2xl text-xs outline-none border-2 transition-all ${isValidUrl(formData.videoUrl) ? 'border-emerald-500/50' : 'border-transparent'} ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`} 
                      placeholder="Lien vers la vidéo..."
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">URL Prototype / POC (Optionnel)</label>
                    <input 
                      disabled={isLocked} 
                      type="url" 
                      value={formData.pocUrl} 
                      onChange={(e) => setFormData(p => ({...p, pocUrl: e.target.value}))} 
                      className={`w-full p-5 bg-slate-900 text-white rounded-2xl text-xs outline-none border-2 transition-all ${isValidUrl(formData.pocUrl) ? 'border-emerald-500/50' : 'border-transparent'} ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`} 
                      placeholder="Lien Github, Figma..."
                    />
                  </div>
                </div>
              </section>

              <div className="pt-8">
                <button 
                  type="button" 
                  onClick={handleDepositClick}
                  disabled={isLocked || isSubmitting}
                  className={`w-full py-7 rounded-3xl font-black text-[12px] uppercase tracking-[0.3em] transition-all flex items-center justify-center space-x-4 shadow-2xl ${isLocked ? 'bg-gray-100 text-gray-400 cursor-default border border-gray-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                  <span>{isLocked ? 'DOSSIER DÉPOSÉ & VERROUILLÉ' : 'DÉPOSER LE DOSSIER DÉFINITIF'}</span>
                </button>
                {!isLocked && (
                  <p className="text-center text-[9px] font-bold text-orange-500 mt-4 uppercase">
                    Attention : Une fois déposé, le dossier ne peut plus être modifié.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl sticky top-32 space-y-10">
             <div className="flex items-center space-x-3 border-b pb-6">
                <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Score de Conformité</h4>
             </div>

             <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Effectif (5)</span>
                   <span className={`text-[10px] font-black ${validation.hasFiveMembers ? 'text-emerald-600' : 'text-red-500'}`}>{validation.hasFiveMembers ? 'VALIDE' : 'INCOMPLET'}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mixité (2F)</span>
                   <span className={`text-[10px] font-black ${validation.hasMixity ? 'text-emerald-600' : 'text-red-500'}`}>{validation.hasMixity ? 'VALIDE' : 'REFUSÉ'}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Livrables Vidéo/PDF</span>
                   <span className={`text-[10px] font-black ${validation.hasMotivation && validation.hasVideo ? 'text-emerald-600' : 'text-orange-500'}`}>{validation.hasMotivation && validation.hasVideo ? 'OK' : 'MANQUANT'}</span>
                </div>
             </div>
             
             <div>
               <button 
                 type="button"
                 onClick={() => isLocked ? setIsPreviewOpen(true) : alert("Le certificat de dépôt ne peut être généré qu'une fois le dossier officiellement soumis.")} 
                 disabled={!isLocked}
                 className={`w-full py-5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center space-x-2 ${isLocked ? 'bg-blue-900 text-white hover:bg-blue-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
               >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  <span>{isLocked ? 'Aperçu Certificat' : 'Certificat (Après Dépôt)'}</span>
               </button>
               {!isLocked && <p className="text-[8px] text-center text-gray-400 font-medium mt-2 uppercase">Verrouillé jusqu'à soumission</p>}
             </div>
          </div>
        </div>
      </main>

      {/* MODALE DE CONFIRMATION (REMPLACE WINDOW.CONFIRM) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-blue-900/80 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl animate-in zoom-in-95">
             <div className="flex items-center space-x-4 mb-6 text-blue-900">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Confirmation de Dépôt</h3>
             </div>
             
             <div className="space-y-4 mb-8">
               {validation.ok ? (
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    Vous êtes sur le point de soumettre officiellement votre candidature au jury FNCT. <br/><br/>
                    <strong className="text-red-500">ATTENTION : Cette action est DÉFINITIVE.</strong><br/>
                    Vous ne pourrez plus modifier ni le texte, ni les liens une fois le dossier validé.
                  </p>
               ) : (
                  <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                    <p className="text-xs font-black text-orange-700 uppercase tracking-wide mb-2">Dossier Incomplet</p>
                    <p className="text-xs text-orange-800/80 leading-relaxed font-medium">
                       Certains indicateurs de conformité ne sont pas validés (voir colonne de droite). Voulez-vous tout de même forcer le dépôt ?
                       <br/><br/>
                       <strong>Note :</strong> Un dossier incomplet risque d'être pénalisé ou rejeté par le jury.
                    </p>
                  </div>
               )}
             </div>
             
             <div className="flex space-x-4">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-gray-100 text-gray-500 font-black text-xs uppercase rounded-xl hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDeposit}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-blue-900 text-white font-black text-xs uppercase rounded-xl shadow-lg hover:bg-blue-800 transition-all flex justify-center items-center"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span>Confirmer Dépôt</span>
                  )}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Reste du composant (Aperçu + Modale Succès) */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/90 backdrop-blur-md no-print">
           <div className="bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
                 <h2 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Certificat de Dépôt Officiel</h2>
                 <div className="flex space-x-4">
                    <button onClick={handlePrintToNewTab} className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all">Export PDF</button>
                    <button onClick={() => setIsPreviewOpen(false)} className="px-8 py-4 bg-gray-200 text-gray-600 rounded-2xl text-[10px] font-black uppercase">Fermer</button>
                 </div>
              </div>
              
              <div id="printable-attestation" className="p-20 flex-grow overflow-y-auto space-y-16 bg-white no-scrollbar">
                 <div className="flex justify-between items-end border-b-8 border-blue-900 pb-10">
                    <div>
                       <div className="w-24 h-24 bg-blue-900 rounded-3xl flex items-center justify-center text-white font-black mb-6 text-3xl shadow-xl">FNCT</div>
                       <p className="text-sm font-black text-blue-900 uppercase tracking-tight">Fédération Nationale des Communes Tunisiennes</p>
                       <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Hackathon 2026 - Innovation Municipale</p>
                    </div>
                    <div className="text-right">
                       <h1 className="text-5xl font-black text-blue-900 uppercase tracking-tighter mb-2">CERTIFICAT DE DÉPÔT</h1>
                       <p className="text-base font-bold text-gray-400 uppercase tracking-widest">ID SYSTÈME : {team.id.toUpperCase()}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="space-y-12">
                       <div className="space-y-3">
                          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Innovation Déposée</p>
                          <p className="text-4xl font-black text-blue-900 uppercase tracking-tight leading-none">{team.name}</p>
                       </div>

                       <div className="space-y-5">
                          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Liste Nominative de l'Équipe (5)</p>
                          <div className="grid grid-cols-1 gap-3">
                             {team.members.map((m, idx) => (
                               <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                  <div className="flex items-center space-x-3">
                                     <div className="w-3 h-3 bg-blue-600 rounded-full shadow-sm"></div>
                                     <span className="text-xs font-black text-blue-900 uppercase">{m.name}</span>
                                  </div>
                                  <span className="text-[9px] font-black text-gray-400 uppercase">{m.role === 'leader' ? 'Chef de Projet' : 'Expert'}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-10">
                       <div className="bg-blue-50/50 p-12 rounded-[3.5rem] border border-blue-100 space-y-8 shadow-inner">
                          <p className="text-[11px] font-black text-blue-900 uppercase border-b border-blue-200 pb-4 tracking-widest">Axe Stratégique</p>
                          <div className="space-y-6">
                             <div>
                                <p className="text-[9px] font-black text-blue-900/60 uppercase mb-2">Thème National</p>
                                <p className="text-xs font-black text-blue-900 uppercase">{team.theme}</p>
                             </div>
                             <div>
                                <p className="text-[9px] font-black text-blue-900/60 uppercase mb-2">Impact Territorial Déclaré</p>
                                <p className="text-xs text-blue-800 font-medium italic leading-relaxed bg-white p-6 rounded-2xl border border-blue-50 shadow-sm">
                                  "{formData.description || 'Information non fournie'}"
                                </p>
                             </div>
                             <div>
                                <p className="text-[9px] font-black text-blue-900/60 uppercase mb-2">Détails Secondaires</p>
                                <p className="text-[10px] text-blue-800 font-bold uppercase">{formData.secondaryTheme}</p>
                                <p className="text-[10px] text-blue-600 mt-1">{formData.secondaryThemeDescription}</p>
                             </div>
                          </div>
                       </div>

                       <div className="px-12 py-8 border-l-8 border-emerald-500 bg-emerald-50/50 rounded-r-[2.5rem] flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Pôle Régional</p>
                            <p className="text-2xl font-black text-emerald-800 uppercase leading-none">{team.preferredRegion}</p>
                          </div>
                          <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg">✓</div>
                       </div>
                    </div>
                 </div>

                 <div className="pt-24 border-t border-dashed border-gray-300 flex justify-between items-start">
                    <div className="max-w-md">
                       <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Certification Numérique</p>
                       <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic">
                         Ce document atteste de la réception complète du dossier technique sur l'infrastructure sécurisée FNCT 2026.
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="text-[12px] font-black text-blue-900 uppercase mb-2">Dépôt du {new Date().toLocaleDateString('fr-FR')}</p>
                       <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Comité National d'Innovation FNCT</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-blue-900/95 backdrop-blur-2xl">
           <div className="bg-white p-16 rounded-[4rem] max-w-lg text-center shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-xl">
                 <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-4xl font-black text-blue-900 uppercase tracking-tighter mb-4">Dépôt Réussi</h2>
              <p className="text-xs text-gray-500 font-medium leading-relaxed mb-10 italic">
                Votre dossier FNCT 2026 est officiellement enregistré.
              </p>
              <button 
                onClick={() => onNavigate('dashboard')} 
                className="w-full py-6 bg-blue-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-800 transition-all"
              >
                Retour au Tableau de Bord
              </button>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default ApplicationForm;
