
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { THEMES, REGIONS } from '../constants';
import { supabase } from '../lib/supabase';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

// Image 50 Ans FNCT - Lien direct Google Drive généré à partir de l'ID fourni
const SPLASH_IMAGE_URL = 'img/Diapositive1.bmp'; 

const CountdownTimer = () => {
  const targetDate = new Date('2026-04-03T09:00:00').getTime();
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const Unit = ({ value, label }: { value: number, label: string }) => (
    <div className="flex flex-col items-center p-4 min-w-[100px] bg-white rounded-2xl shadow-lg border border-gray-100">
      <span className="text-3xl font-black text-blue-900 leading-none">{String(value).padStart(2, '0')}</span>
      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-2">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-wrap justify-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <Unit value={timeLeft.days} label="Jours" />
      <Unit value={timeLeft.hours} label="Heures" />
      <Unit value={timeLeft.minutes} label="Minutes" />
      <Unit value={timeLeft.seconds} label="Secondes" />
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [showSplash, setShowSplash] = useState(false);
  const [candidateCount, setCandidateCount] = useState<number>(0);

  // NOTE: Splash screen désactivé (useEffect supprimé)

  useEffect(() => {
    // Récupération du nombre de candidats inscrits
    const fetchCount = async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      // On commence à un chiffre fictif réaliste si la base est vide pour l'effet "démo"
      setCandidateCount(count || 124); 
    };
    fetchCount();
  }, []);

  const handleCloseSplash = () => {
    setShowSplash(false);
    sessionStorage.setItem('fnct_splash_seen', 'true');
  };

  const themeColors = [
    'bg-[#1e3a8a]', // Bleu foncé
    'bg-[#38bdf8]', // Bleu Ciel
    'bg-[#dc2626]', // Rouge
    'bg-[#10b981]', // Vert
    'bg-[#fbbf24]'  // Jaune
  ];

  const openGuideDidactiel = () => {
    window.open("https://drive.google.com/file/d/1sHHNDVJC23Y5lvLLtr5pv5aoeekR4T-5/view?usp=sharing", "_blank");
  };

  const openGuideParticipation = () => {
    window.open("https://drive.google.com/file/d/1Omc4sAu6fPgWRfidcQ_nV8l_hQjRlCWO/view?usp=sharing", "_blank");
  };

  return (
    <Layout onNavigate={onNavigate}>
      
      {/* SPLASH SCREEN MODAL (Conditionné par showSplash qui reste à false) */}
      {showSplash && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/80 backdrop-blur-md transition-opacity duration-500 animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 p-2 border-4 border-white">
            <button 
              onClick={handleCloseSplash}
              className="absolute top-4 right-4 z-50 w-10 h-10 bg-white text-gray-800 rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-all transform hover:rotate-90 hover:scale-110"
              aria-label="Fermer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center min-h-[300px] sm:min-h-[500px]">
               {/* Image principale */}
               <img 
                 src={SPLASH_IMAGE_URL} 
                 alt="50 Ans FNCT" 
                 className="w-full h-full object-contain sm:object-cover"
               />
               
               {/* Fallback texte si l'image ne charge pas (optionnel) */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0">
                  <span className="text-gray-400 font-bold uppercase">Chargement de l'affiche...</span>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center bg-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_rgba(30,58,138,0.8),_transparent)] z-10"></div>
        <div className="absolute inset-0 opacity-20 grayscale bg-[url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80')] bg-cover bg-center scale-110"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full pt-20">
          {/* BOUTONS GUIDES - Positionnés en haut à droite de la section Hero */}
          <div className="absolute top-6 right-4 sm:right-8 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-6 z-50">
            {/* Bouton Jaune : Guide de Participation */}
            <button 
              onClick={openGuideDidactiel}
              className="flex items-center space-x-3 px-6 py-3 bg-[#fbbf24] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-yellow-500 hover:scale-105 transition-all border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>GUIDE DE PARTICIPATION</span>
            </button>
            
            {/* Bouton Vert : Guide du Candidat */}
            <button 
              onClick={openGuideParticipation}
              className="flex items-center space-x-3 px-6 py-3 bg-[#10b981] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 hover:scale-105 transition-all border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span>GUIDE DU CANDIDAT</span>
            </button>
          </div>

          <div className="max-w-4xl mt-24 sm:mt-0">
            <div className="inline-flex items-center space-x-2 bg-blue-600/30 backdrop-blur-md px-4 py-2 rounded-full border border-blue-400/20 mb-8">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">50 ans, 50 innovations pour les communes</span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter">
              L'INNOVATION <br/> <span className="text-blue-400 font-outline">TERRITORIALE</span> <br/> ARRIVE.
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100/70 max-w-2xl mb-12 font-medium leading-relaxed">
              Le plus grand hackathon municipal de Tunisie. Transformez les défis locaux en opportunités innovantes concrètes pour nos territoires.
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                onClick={() => onNavigate('login')}
                className="px-20 py-8 bg-blue-600 text-white text-base font-black uppercase tracking-[0.2em] rounded-3xl shadow-2xl shadow-blue-900/50 hover:bg-blue-500 hover:scale-[1.02] transition-all active:scale-95 border-b-4 border-blue-800"
              >
                IDENTIFICATION
              </button>
              
              <button 
                onClick={() => onNavigate('register')}
                className="px-12 py-8 bg-white/5 backdrop-blur-xl text-white text-sm font-black uppercase tracking-[0.2em] rounded-3xl hover:bg-white/10 transition-all border border-white/20"
              >
                INSCRIPTION
              </button>
            </div>

            <div className="mt-16">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-6">Ouverture du hackathon dans</p>
              <CountdownTimer />
            </div>
          </div>
        </div>
      </section>

      {/* COMPTEUR DE CANDIDATS (LIVE) */}
      <section className="bg-blue-900 border-t border-blue-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row">
            <div className="flex-grow p-8 flex items-center justify-center md:justify-start space-x-6">
               <div className="text-5xl font-black text-white">{candidateCount}</div>
               <div className="flex flex-col">
                  <span className="text-sm font-bold text-blue-300 uppercase tracking-widest">Talents Inscrits</span>
                  <span className="text-[10px] text-blue-400/60">Rejoignez le mouvement #JeunesseTN</span>
               </div>
            </div>
            <div className="hidden md:flex bg-blue-800 px-10 items-center">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Rejoignez-les maintenant</p>
            </div>
          </div>
        </div>
      </section>

      {/* TARGETED MESSAGES SECTION */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Etudiants */}
              <div className="bg-gray-50 p-10 rounded-[2.5rem] border border-gray-100 hover:border-blue-200 transition-all group">
                 <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                 </div>
                 <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-4">Étudiants</h3>
                 <p className="text-lg font-bold text-gray-800 mb-2">"24h pour changer notre commune. Prêt ?"</p>
                 <ul className="text-sm text-gray-500 space-y-2 mb-8">
                    <li>• Expérience unique & ECTS validés</li>
                    <li>• Prix en cash & Incubation</li>
                    <li>• Employabilité boostée</li>
                 </ul>
                 <button onClick={() => onNavigate('register')} className="w-full py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">Constitue ton équipe</button>
              </div>

              {/* Entreprises */}
              <div className="bg-blue-900 p-10 rounded-[2.5rem] text-white hover:bg-blue-800 transition-all group shadow-xl">
                 <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Entreprises</h3>
                 <p className="text-lg font-bold text-blue-100 mb-2">Recrutez les talents de demain.</p>
                 <ul className="text-sm text-blue-200/80 space-y-2 mb-8">
                    <li>• Visibilité sur 250 profils Tech</li>
                    <li>• Accès aux solutions innovantes</li>
                    <li>• Mécénat déductible</li>
                 </ul>
                 <a href="mailto:hackathon_2026@fnct.org.tn" className="block w-full py-4 bg-white text-blue-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-blue-50 transition-all">Devenez Sponsor</a>
              </div>

              {/* Médias */}
              <div className="bg-gray-50 p-10 rounded-[2.5rem] border border-gray-100 hover:border-blue-200 transition-all group">
                 <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                 </div>
                 <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-4">Presse & Médias</h3>
                 <p className="text-lg font-bold text-gray-800 mb-2">"Le plus grand hackathon municipal"</p>
                 <ul className="text-sm text-gray-500 space-y-2 mb-8">
                    <li>• Thématiques ODD & Smart City</li>
                    <li>• 50ème Anniversaire FNCT</li>
                    <li>• Histoires humaines & Mixité</li>
                 </ul>
                 <a href="mailto:digitalisation@fnct.org.tn" className="block w-full py-4 border border-blue-900 text-blue-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-blue-50 transition-all">Dossier de Presse</a>
              </div>
           </div>
        </div>
      </section>

      {/* THEMES SECTION */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Stratégie FNCT 2026</p>
            <h2 className="text-4xl font-black text-blue-900 uppercase tracking-tighter">5 Thématiques Prioritaires</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {THEMES.map((theme, i) => (
              <div 
                key={i} 
                className={`${themeColors[i]} p-8 rounded-[8px] border border-[#E0E0E0] shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group cursor-default`}
              >
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-12 shadow-sm text-white font-black text-xl">
                  {i+1}
                </div>
                <h3 className="text-[11px] font-black text-white uppercase leading-relaxed tracking-[0.15em]">
                  {theme}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP SECTION */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Parcours Candidat</p>
            <h2 className="text-4xl font-black text-blue-900 uppercase tracking-tighter">Comment participer ? La Roadmap</h2>
          </div>

          <div className="relative">
            {/* Ligne de connexion (Desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 border-t-2 border-dashed border-gray-200 -translate-y-1/2 z-0"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
              {[
                { step: "01", title: "Profil & CV", desc: "Créez votre compte et optimisez votre profil pour atteindre un score > 70%." },
                { step: "02", title: "Constitution", desc: "Rejoignez ou créez une équipe de 5 membres respectant la mixité (min 2F)." },
                { step: "03", title: "Soumission", desc: "Déposez votre pitch vidéo et votre mémoire de motivation avant la date limite." },
                { step: "04", title: "Grand Jury", desc: "Présentez votre innovation devant les experts lors des étapes régionales." }
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all text-center">
                  <div className="w-14 h-14 bg-blue-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 font-black text-xl shadow-lg border-4 border-white">
                    {item.step}
                  </div>
                  <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-3">{item.title}</h4>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <button onClick={() => onNavigate('register')} className="px-12 py-6 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95">
              Démarrer mon inscription maintenant
            </button>
          </div>
        </div>
      </section>

      {/* DATES SECTION */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div>
              <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Calendrier Officiel</p>
              <h2 className="text-4xl font-black text-blue-900 uppercase tracking-tighter">Dates Importantes & Escales</h2>
            </div>
            <div className="hidden md:block">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saison 2026 • 24 Communes Partenaires</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REGIONS.map((region, idx) => {
               // Extraction du nom de la ville entre parenthèses
               const cityName = region.name.match(/\((.*?)\)/)?.[1] || region.name;
               
               return (
                <div key={idx} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col space-y-6 hover:border-blue-200 transition-all">
                  <div className="flex items-center space-x-6">
                    <div className="flex flex-col items-center justify-center px-4 py-3 bg-blue-50 rounded-2xl min-w-[80px]">
                      <span className="text-[10px] font-black text-blue-400 uppercase leading-none mb-1">AVR</span>
                      <span className="text-2xl font-black text-blue-900 leading-none">{region.date.split('-')[2]}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">{region.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Hackathon Régional</p>
                    </div>
                  </div>

                  {/* AJOUT: Détails emplacement et contact */}
                  <div className="pt-4 border-t border-gray-50 space-y-3">
                     <div className="flex items-start space-x-3">
                        <div className="mt-0.5 text-gray-300">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Emplacement de l'évènement</p>
                           <p className="text-[11px] font-bold text-blue-900">Hôtel {cityName}</p>
                        </div>
                     </div>
                     <div className="flex items-start space-x-3">
                        <div className="mt-0.5 text-gray-300">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Contact : Mme Saida Issaoui</p>
                           <a href="tel:+21658400194" className="text-[11px] font-bold text-blue-600 hover:underline">Mob : +216 58 400 194</a>
                        </div>
                     </div>
                  </div>
                </div>
               );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LandingPage;
