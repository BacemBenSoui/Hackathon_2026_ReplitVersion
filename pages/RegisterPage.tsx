
import React, { useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    university: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États pour la gestion du règlement
  const [showRules, setShowRules] = useState(false);
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasAcceptedRules) {
      setError("Vous devez lire et accepter le règlement du Hackathon pour continuer.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            university: formData.university,
            phone: formData.phone
          }
        }
      });

      if (authError) throw authError;

      alert('Inscription réussie ! Veuillez vérifier vos e-mails pour la confirmation.');
      onNavigate('login');
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRules = () => {
    setHasAcceptedRules(true);
    setShowRules(false);
  };

  return (
    <Layout onNavigate={onNavigate}>
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-xl w-full space-y-8 bg-white p-10 rounded-3xl shadow-2xl border border-gray-100">
          <div>
            <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-200">
              <span className="text-white font-black text-xl">FNCT</span>
            </div>
            <h2 className="text-center text-3xl font-black text-gray-900 tracking-tighter">Créer mon profil</h2>
            <p className="mt-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Rejoignez le hackathon municipal 2026
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold uppercase tracking-tight">
              {error}
            </div>
          )}
          
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Prénom</label>
                <input required type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border-none rounded-xl text-white text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Nom</label>
                <input required type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border-none rounded-xl text-white text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Email</label>
              <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border-none rounded-xl text-white text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Téléphone</label>
                <input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border-none rounded-xl text-white text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none" placeholder="+216 ..." />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Université</label>
                <input required type="text" value={formData.university} onChange={(e) => setFormData({...formData, university: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border-none rounded-xl text-white text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none" placeholder="INSAT, FST, ESC..." />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Mot de passe</label>
              <input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border-none rounded-xl text-white text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none" />
            </div>

            {/* Section Règlement */}
            <div className="flex items-start space-x-3 pt-4">
              <div className="flex items-center h-5">
                <input
                  id="rules"
                  name="rules"
                  type="checkbox"
                  checked={hasAcceptedRules}
                  onChange={(e) => setHasAcceptedRules(e.target.checked)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded cursor-pointer"
                />
              </div>
              <div className="ml-1 text-xs">
                <label htmlFor="rules" className="font-medium text-gray-700">
                  Je confirme avoir lu et accepté le{' '}
                </label>
                <button
                  type="button"
                  onClick={() => setShowRules(true)}
                  className="text-blue-600 font-bold underline hover:text-blue-800"
                >
                  Règlement du Hackathon FNCT 2026
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !hasAcceptedRules} 
              className="w-full py-4 bg-blue-600 text-white font-black text-xs rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Création...' : 'S\'inscrire'}
            </button>
          </form>
        </div>
      </div>

      {/* MODALE RÈGLEMENT */}
      {showRules && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center rounded-t-3xl">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Règlement Officiel</h3>
              <button onClick={() => setShowRules(false)} className="p-2 text-gray-400 hover:text-red-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-6 text-sm text-gray-700 leading-relaxed font-medium">
              <div className="text-center mb-6">
                <h2 className="text-xl font-black text-blue-900 uppercase">REGLEMENT DU HACKATHON FNCT 2026</h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">"50 Ans, 50 Innovations pour les Communes"</p>
              </div>

              <section>
                <h4 className="font-black text-blue-800 uppercase text-xs tracking-wide mb-2">ARTICLE 1 – Association organisatrice</h4>
                <p>La Fédération Nationale des Communes Tunisiennes (FNCT) a été créée en 1976 dans l’objectif de renforcer les capacités des municipalités, le renforcement de leur mission et leur ouverture sur leur environnement social et académique.</p>
              </section>

              <section>
                <h4 className="font-black text-blue-800 uppercase text-xs tracking-wide mb-2">ARTICLE 2 – Objet du Hackathon</h4>
                <p>Dans le cadre de la célébration du cinquantenaire de la FNCT, cette dernière a pris l’initiative d’organiser un Hackathon dont le but est de renforcer la synergie entre les communes et le monde académique, en mettant l’accent sur l’innovation technologique et la création de solutions locales adaptées aux besoins des collectivités. Ainsi, l’Hackathon “Innovation technologique au service des communes”, est un événement collaboratif et créatif qui vise à favoriser la participation active des personnes étudiantes, expertes et représentants et représentantes des communes.</p>
              </section>

              <section>
                <h4 className="font-black text-blue-800 uppercase text-xs tracking-wide mb-2">ARTICLE 3 – Cadre général et thématiques</h4>
                <p>Le Hackathon vise à encourager la collaboration entre les universités et les communes pour le développement de solutions adaptées aux contextes locaux. Les projets doivent toucher au moins l’une des thématiques suivantes :</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>La gestion urbaine et territoriale (mobilité, aménagement...)</li>
                  <li>La gestion intégrée des déchets et économie circulaire</li>
                  <li>L’adaptation au changement climatique (eau, espaces verts, énergie...)</li>
                  <li>La gestion administrative et financière (digitalisation, finances...)</li>
                  <li>Le patrimoine, la culture et la jeunesse</li>
                </ul>
              </section>

              <section>
                <h4 className="font-black text-blue-800 uppercase text-xs tracking-wide mb-2">ARTICLE 4 – Déroulement et modalités</h4>
                <p className="mb-2"><strong>4.1 Déroulement :</strong> Le Hackathon se déroulera sous forme de compétitions régionales de 24 heures. Chaque équipe doit être composée de 5 étudiants.</p>
                <p className="mb-2"><strong>4.2 Conditions d’inscription :</strong> Ouvert aux étudiants majeurs (18+). Inscription gratuite sur hackathon.fnct.org.tn entre le 1er et le 28 février 2026.</p>
                <p className="mb-2"><strong>4.3 Critères de présélection :</strong></p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
                  <li>Diversité disciplinaire (30 pts)</li>
                  <li>Mixité genre (min 2 femmes) (25 pts)</li>
                  <li>Adéquation défi (25 pts)</li>
                  <li>Faisabilité et motivation (20 pts)</li>
                </ul>
                <p className="mt-2">Seuil minimal : 70/100.</p>
              </section>

              <section>
                <h4 className="font-black text-blue-800 uppercase text-xs tracking-wide mb-2">ARTICLE 5 – Garanties et responsabilités</h4>
                <p>Les participants sont responsables de leur matériel. La FNCT ne saurait être tenue responsable des dommages causés aux biens ou personnes. Les participants garantissent disposer des droits de propriété intellectuelle sur leurs créations.</p>
              </section>

              <section>
                <h4 className="font-black text-blue-800 uppercase text-xs tracking-wide mb-2">ARTICLE 6 – Régime juridique des idées</h4>
                <p>Tous les droits de propriété intellectuelle sur les idées et applications restent acquis aux participants.</p>
              </section>

              <section>
                <h4 className="font-black text-blue-800 uppercase text-xs tracking-wide mb-2">ARTICLE 7 – Droit à l'image</h4>
                <p>Les participants autorisent la FNCT à utiliser leur image et enregistrements à des fins non commerciales pour la promotion de l'événement.</p>
              </section>

              <section>
                <h4 className="font-black text-blue-800 uppercase text-xs tracking-wide mb-2">ARTICLE 8 – Données personnelles</h4>
                <p>Les données collectées servent uniquement à la gestion du Hackathon, conformément à la loi organique n° 2004-63 du 27 juillet 2004.</p>
              </section>
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-end rounded-b-3xl">
              <button 
                onClick={handleAcceptRules}
                className="px-8 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-lg transition-all active:scale-95"
              >
                Lu & Accepter
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default RegisterPage;
