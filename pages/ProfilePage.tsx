
import React, { useState, useMemo, useEffect } from 'react';
import Layout from '../components/Layout';
import DashboardHeader from '../components/DashboardHeader';
import { TECH_SKILLS, METIER_SKILLS } from '../constants';
import { StudentProfile } from '../types';
import { supabase } from '../lib/supabase';

interface ProfilePageProps {
  userProfile: StudentProfile | null;
  setUserProfile: (p: StudentProfile) => void;
  onNavigate: (page: string) => void;
  refreshData: () => Promise<void>;
}

const LEVELS = [
  'Licence (L1/L2/L3)', 'Master (M1/M2)', 'Cycle Ingénieur (1/2/3)', 'Doctorat', 'Expert'
];

const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile, setUserProfile, onNavigate, refreshData }) => {
  const [formData, setFormData] = useState<Partial<StudentProfile>>(userProfile || {});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) setFormData(userProfile);
  }, [userProfile]);

  const isInTeam = !!userProfile?.currentTeamId;

  const scoreBreakdown = useMemo(() => {
    let identity = 0; 
    if (formData.firstName && formData.lastName) identity += 5;
    if (formData.gender && formData.gender !== 'O' && formData.phone) identity += 5;

    let academic = 0; 
    if (formData.university) academic += 5;
    if (formData.level) academic += 5;
    if (formData.major) academic += 5;

    let tech = 0; 
    const tCount = formData.techSkills?.length || 0;
    tech = Math.min(tCount * 5, 20);

    let metier = 0; 
    const mCount = formData.metierSkills?.length || 0;
    metier = Math.min(mCount * 10, 30);

    let docs = 0; 
    if (formData.cvUrl && formData.cvUrl.length > 10) docs += 25;

    return { identity, academic, tech, metier, docs, total: identity + academic + tech + metier + docs };
  }, [formData]);

  const handleSave = async () => {
    if (!userProfile?.id || isInTeam) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          university: formData.university,
          phone: formData.phone,
          major: formData.major,
          gender: formData.gender,
          level: formData.level,
          tech_skills: formData.techSkills,
          metier_skills: formData.metierSkills,
          other_skills: formData.otherSkills,
          cv_url: formData.cvUrl,
          is_complete: scoreBreakdown.total >= 70,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id);

      if (error) throw error;
      await refreshData();
      alert("Profil synchronisé. Votre score d'éligibilité est de " + scoreBreakdown.total + "%");
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTechSkill = (skill: string) => {
    if (isInTeam) return;
    const current = formData.techSkills || [];
    setFormData({ ...formData, techSkills: current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill] });
  };

  const toggleMetierSkill = (skill: string) => {
    if (isInTeam) return;
    const current = formData.metierSkills || [];
    setFormData({ ...formData, metierSkills: current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill] });
  };

  const allMetierSkills = useMemo(() => Object.values(METIER_SKILLS).flat(), []);

  return (
    <Layout userType="student" onNavigate={onNavigate} currentTeamId={userProfile?.currentTeamId}>
      <DashboardHeader title="Mon Profil Candidat" subtitle="Optimisez votre dossier pour attirer les meilleurs projets." />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-blue-900 rounded-3xl p-6 text-white text-center shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Score Éligibilité</p>
              <p className="text-4xl font-black">{scoreBreakdown.total}%</p>
              <div className="mt-4 h-1.5 bg-blue-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${scoreBreakdown.total}%` }}></div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Détails du score</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-gray-500 uppercase">Identité</span>
                  <span className="text-blue-600">{scoreBreakdown.identity}/10</span>
                </div>
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-gray-500 uppercase">Académique</span>
                  <span className="text-blue-600">{scoreBreakdown.academic}/15</span>
                </div>
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-gray-500 uppercase">Tech</span>
                  <span className="text-blue-600">{scoreBreakdown.tech}/20</span>
                </div>
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-gray-500 uppercase">Métier</span>
                  <span className="text-blue-600">{scoreBreakdown.metier}/30</span>
                </div>
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-gray-500 uppercase">CV (PDF)</span>
                  <span className="text-blue-600">{scoreBreakdown.docs}/25</span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-10 space-y-12">
                <section>
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-tighter border-b pb-3 mb-8">Informations Personnelles</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Prénom & Nom</label>
                      <input type="text" disabled value={`${userProfile?.firstName} ${userProfile?.lastName}`} className="w-full px-5 py-4 bg-gray-100 rounded-2xl text-gray-500 font-black uppercase text-[10px]" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Genre *</label>
                      <select disabled={isInTeam} value={formData.gender || 'O'} onChange={(e) => setFormData({...formData, gender: e.target.value as any})} className="w-full px-5 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] outline-none focus:ring-4 focus:ring-blue-100 transition-all">
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                        <option value="O">Non-binaire</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Contact Téléphonique *</label>
                      <input type="tel" disabled={isInTeam} value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] outline-none focus:ring-4 focus:ring-blue-100 transition-all" placeholder="+216 ..." />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-tighter border-b pb-3 mb-8">Cursus Universitaire</h3>
                  <div className="space-y-4">
                    <input type="text" placeholder="Institution Universitaire" disabled={isInTeam} value={formData.university || ''} onChange={(e) => setFormData({...formData, university: e.target.value})} className="w-full px-5 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    <div className="grid grid-cols-2 gap-4">
                      <select disabled={isInTeam} value={formData.level || ''} onChange={(e) => setFormData({...formData, level: e.target.value})} className="w-full px-5 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] outline-none focus:ring-4 focus:ring-blue-100 transition-all">
                        <option value="">Niveau d'études</option>
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <input type="text" placeholder="Filière / Spécialité" disabled={isInTeam} value={formData.major || ''} onChange={(e) => setFormData({...formData, major: e.target.value})} className="w-full px-5 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-tighter border-b pb-3 mb-8">Expertises Métier</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allMetierSkills.map(skill => (
                      <button key={skill} disabled={isInTeam} onClick={() => toggleMetierSkill(skill)} className={`p-3 rounded-xl text-[8px] font-black border uppercase transition-all ${formData.metierSkills?.includes(skill) ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-[1.02]' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-blue-200'}`}>
                        {skill}
                      </button>
                    ))}
                  </div>
                </section>
                
                <section>
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-tighter border-b pb-3 mb-8">Curriculum Vitae (PDF)</h3>
                  <div className="space-y-3">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Lien vers votre CV hébergé (Drive, LinkedIn, Dropbox...)</p>
                    <input type="url" placeholder="https://..." disabled={isInTeam} value={formData.cvUrl || ''} onChange={(e) => setFormData({...formData, cvUrl: e.target.value})} className="w-full px-5 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-[9px] font-black text-blue-700 uppercase leading-relaxed">Assurez-vous que le lien est accessible en mode public pour le jury.</p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-10 bg-gray-50 border-t flex justify-end">
                <button onClick={handleSave} disabled={isSaving || isInTeam} className="px-12 py-5 bg-blue-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">
                  {isSaving ? 'Mise à jour...' : isInTeam ? 'Profil Verrouillé' : 'Synchroniser mon profil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default ProfilePage;
