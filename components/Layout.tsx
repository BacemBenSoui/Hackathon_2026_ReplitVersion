
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  userType?: 'student' | 'admin' | 'public';
  onNavigate?: (page: string) => void;
  currentTeamId?: string | null;
}

const Layout: React.FC<LayoutProps> = ({ children, userType = 'public', onNavigate, currentTeamId }) => {
  const isInTeam = !!currentTeamId;
  const [showRules, setShowRules] = useState(false);

  const handleLogout = async () => {
    try {
      // On attend la déconnexion Supabase (nettoyage local storage + appel API)
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erreur déconnexion:", err);
    } finally {
      // Ensuite on navigue, assurant que l'état App.tsx aura reçu l'événement SIGNED_OUT
      if (onNavigate) onNavigate('landing');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center space-x-8">
              <button 
                onClick={() => onNavigate?.('landing')}
                className="flex items-center space-x-3 focus:outline-none group"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                  <span className="text-white font-black text-xs">FNCT</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-lg font-black text-blue-900 leading-none tracking-tighter">Hackathon 2026</span>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Plateforme Officielle</span>
                </div>
              </button>

              <div className="hidden lg:flex items-center space-x-4 border-l border-gray-100 pl-8">
                <button 
                  onClick={() => onNavigate?.('landing')}
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                >
                  Accueil
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {userType === 'public' ? (
                <>
                  <button 
                    onClick={() => onNavigate?.('login')}
                    className="p-3 text-gray-300 hover:text-blue-600 transition-colors"
                    title="Accès Administration"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => onNavigate?.('login')}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl active:scale-95"
                  >
                    CANDIDAT
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Session</p>
                    <p className="text-xs font-black text-blue-900 uppercase tracking-tight">{userType === 'admin' ? 'Pilotage' : 'Candidat'}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm group"
                    title="Se déconnecter"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {userType === 'student' && (
        <div className="bg-blue-900 text-white border-b border-blue-800 sticky top-20 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center overflow-x-auto no-scrollbar py-3 space-x-8">
              <button onClick={() => onNavigate?.('dashboard')} className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest hover:text-blue-300 transition-colors">Tableau de bord</button>
              <button onClick={() => onNavigate?.('profile')} className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest hover:text-blue-300 transition-colors">Mon Profil</button>
              {!isInTeam ? (
                <>
                  <button onClick={() => onNavigate?.('find-team')} className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest hover:text-blue-300 transition-colors">Bourse aux équipes</button>
                  <button onClick={() => onNavigate?.('create-team')} className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest hover:text-blue-300 transition-colors">Créer une équipe</button>
                </>
              ) : (
                <button onClick={() => onNavigate?.('team-workspace')} className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span>Pilotage Équipe</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow flex flex-col">
        {children}
      </div>

      <footer className="bg-blue-900 text-white border-t border-blue-800 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            {/* Branding */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <span className="text-blue-900 font-black text-xs">FNCT</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-tighter leading-none">50 ANS,</span>
                  <span className="text-sm font-bold text-blue-300 uppercase tracking-widest">50 Innovations</span>
                </div>
              </div>
              <p className="text-xs text-blue-200 leading-relaxed max-w-xs">
                Fédération Nationale des Communes Tunisiennes. Ensemble pour une gouvernance locale moderne, connectée et durable.
              </p>
              <div className="flex space-x-4">
                 <a href="https://www.facebook.com/FNCT02" target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-800 rounded-lg hover:bg-white hover:text-blue-900 transition-all">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                 </a>
                 <a href="mailto:hackathon_2026@fnct.org.tn" className="p-2 bg-blue-800 rounded-lg hover:bg-white hover:text-blue-900 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                 </a>
                 <a href="http://www.fnct.tn" target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-800 rounded-lg hover:bg-white hover:text-blue-900 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                 </a>
              </div>
            </div>

            {/* Coordonnées */}
            <div className="lg:col-span-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6">Contact & Siège</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-blue-100">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <span>76 rue de Syrie<br/>1002 Lafayette, Tunis</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    <span>Fixe : 71 848 393<br/>Fax : 71 844 847</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    <span className="text-white font-bold">(+216) 58 400 190</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    <div className="flex flex-col">
                        <a href="mailto:hackathon_2026@fnct.org.tn" className="hover:text-white transition-colors">hackathon_2026@fnct.org.tn</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div>
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6">Navigation</h4>
               <ul className="space-y-3 text-xs text-blue-200">
                  <li><button onClick={() => onNavigate?.('landing')} className="hover:text-white hover:translate-x-1 transition-all">Accueil</button></li>
                  <li><button onClick={() => onNavigate?.('register')} className="hover:text-white hover:translate-x-1 transition-all">Inscription Candidat</button></li>
                  <li><button onClick={() => onNavigate?.('login')} className="hover:text-white hover:translate-x-1 transition-all">Espace Connexion</button></li>
                  <li>
                    <button 
                      onClick={() => setShowRules(true)} 
                      className="hover:text-white hover:translate-x-1 transition-all text-left"
                    >
                      Règlement Intérieur
                    </button>
                  </li>
               </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-blue-800 text-center">
             <div className="flex flex-wrap justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-blue-400/60 mb-4">
                <span>#HackathonFNCT2026</span>
                <span className="w-1 h-1 bg-blue-800 rounded-full my-auto"></span>
                <span>#InnovationLocale</span>
                <span className="w-1 h-1 bg-blue-800 rounded-full my-auto"></span>
                <span>#CommuneDigitale</span>
                <span className="w-1 h-1 bg-blue-800 rounded-full my-auto"></span>
                <span>#ODDTN</span>
                <span className="w-1 h-1 bg-blue-800 rounded-full my-auto"></span>
                <span>#JeunesseTN</span>
             </div>
             <p className="text-[10px] text-blue-500">© 2026 Fédération Nationale des Communes Tunisiennes. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      {/* MODALE RÈGLEMENT */}
      {showRules && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/90 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 relative">
            
            {/* Bouton de fermeture en haut à droite */}
            <button 
              onClick={() => setShowRules(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 bg-white text-gray-800 rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-all transform hover:rotate-90 hover:scale-110 border border-gray-100"
              aria-label="Fermer"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>

            <div className="p-6 border-b bg-gray-50 flex justify-between items-center rounded-t-3xl">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Règlement Officiel</h3>
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
                onClick={() => setShowRules(false)}
                className="px-8 py-4 bg-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-300 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
