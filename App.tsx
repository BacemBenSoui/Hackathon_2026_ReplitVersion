
import React, { useState, useEffect, useRef } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import FindTeamPage from './pages/FindTeamPage';
import CreateTeamPage from './pages/CreateTeamPage';
import TeamWorkspace from './pages/TeamWorkspace';
import ApplicationForm from './pages/ApplicationForm';
import AdminDashboard from './pages/AdminDashboard';
import { UserRole, StudentProfile, Team } from './types';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<StudentProfile | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref pour suivre l'ID utilisateur actuel et éviter les re-fetch inutiles
  const currentUserIdRef = useRef<string | null>(null);

  // Fonction centrale de chargement des données
  const fetchUserData = async (userId: string) => {
    try {
      // 1. Récupération du profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        // Mise à jour de la ref pour dire "on a chargé cet user"
        currentUserIdRef.current = userId;

        // 2. Récupération des candidatures
        const { data: requests } = await supabase
          .from('join_requests')
          .select('team_id')
          .eq('student_id', userId)
          .eq('status', 'pending');

        const formattedProfile: StudentProfile = {
          id: profile.id,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || '',
          phone: profile.phone || '', 
          university: profile.university || '',
          gender: profile.gender || 'O',
          level: profile.level || '',
          major: profile.major || '',
          techSkills: profile.tech_skills || [],
          metierSkills: profile.metier_skills || [],
          otherSkills: profile.other_skills || '',
          cvUrl: profile.cv_url || '',
          isComplete: profile.is_complete || false,
          teamRole: null,
          currentTeamId: null,
          applications: requests?.map(r => r.team_id) || [],
        };

        // 3. Récupération de l'équipe
        const { data: membership } = await supabase
          .from('team_members')
          .select('team_id, role, teams(*)')
          .eq('profile_id', userId)
          .maybeSingle();

        if (membership && membership.teams) {
          const teamData = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams;
          
          formattedProfile.currentTeamId = membership.team_id;
          formattedProfile.teamRole = membership.role as any;
          
          const { data: allMembers } = await supabase
             .from('team_members')
             .select('profile_id, profiles(first_name, last_name, email, phone, tech_skills, metier_skills, gender), role')
             .eq('team_id', membership.team_id);

          const teamStatus = teamData.Statut || teamData.statut || 'incomplete';

          setUserTeam({
            id: teamData.id,
            name: teamData.name,
            description: teamData.description,
            leaderId: teamData.leader_id,
            theme: teamData.theme,
            secondaryTheme: teamData.secondary_theme,
            secondaryThemeDescription: teamData.secondary_theme_description,
            status: teamStatus, 
            preferredRegion: teamData.preferred_region,
            videoUrl: teamData.video_url,
            pocUrl: teamData.poc_url,
            motivationUrl: teamData.motivation_url,
            lettreMotivationUrl: '', 
            requestedSkills: [], 
            // Mappage de la colonne TeamRequestProfile du schéma fourni
            teamRequestProfile: teamData.TeamRequestProfile || teamData.teamrequestprofile || '',
            joinRequests: [],
            members: allMembers?.map((m: any) => ({
              id: m.profile_id,
              name: m.profiles ? `${m.profiles.first_name} ${m.profiles.last_name}` : 'Utilisateur',
              email: m.profiles?.email || '',
              phone: m.profiles?.phone || '',
              techSkills: m.profiles?.tech_skills || [],
              metierSkills: m.profiles?.metier_skills || [],
              gender: m.profiles?.gender || 'O',
              role: m.role
            })) || []
          });
        } else {
          setUserTeam(null);
        }

        setUserProfile(formattedProfile);
        setUserRole(profile.role);
      } else {
         clearUserState();
      }
    } catch (e) {
      console.error("Error fetching user data:", e);
      // En cas d'erreur critique, on ne vide pas forcément l'état pour éviter de déconnecter l'utilisateur sur une erreur réseau temporaire
      // Mais on s'assure que le loading s'arrête via le finally du useEffect
    }
  };

  const clearUserState = () => {
    currentUserIdRef.current = null;
    setUserProfile(null);
    setUserRole(null);
    setUserTeam(null);
  };

  useEffect(() => {
    let isMounted = true;

    // Fonction d'initialisation distincte
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && isMounted) {
          await fetchUserData(session.user.id);
        }
      } catch (error) {
        console.error("Session init error", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeSession();

    // Écouteur d'événements
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // console.log("Auth Event:", event); // Debug

      // CAS 1: Déconnexion explicite
      if (event === 'SIGNED_OUT') {
        clearUserState();
        // Si on est déconnecté, on arrête de charger
        setIsLoading(false); 
        return;
      }

      // CAS 2: Rafraîchissement du token (Changement d'onglet, focus, etc.)
      // IMPORTANT : On ne déclenche PAS de chargement si on a déjà les données de cet utilisateur.
      if (event === 'TOKEN_REFRESHED') {
        if (session && currentUserIdRef.current === session.user.id) {
          return; // Données déjà là, on ne touche à rien
        }
      }

      // CAS 3: Connexion ou changement d'utilisateur
      if (session) {
        // On ne recharge que si c'est un nouvel utilisateur ou qu'on n'a pas de données
        if (currentUserIdRef.current !== session.user.id) {
           setIsLoading(true);
           await fetchUserData(session.user.id);
           if (isMounted) setIsLoading(false);
        }
      } else {
        // Cas rare où session est null mais event n'est pas SIGNED_OUT
        // On laisse isLoading à false pour afficher la landing page
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchUserData(session.user.id);
    }
  };

  const navigate = (page: string) => {
    window.scrollTo(0, 0);
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
           <div className="relative">
             <div className="w-16 h-16 border-4 border-blue-400/30 border-t-white rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
               <span className="w-2 h-2 bg-white rounded-full"></span>
             </div>
           </div>
           <div className="text-center">
             <p className="text-white font-black text-sm uppercase tracking-[0.3em] mb-1">FNCT 2026</p>
             <p className="text-blue-300 font-bold text-[10px] uppercase tracking-widest animate-pulse">Chargement...</p>
           </div>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    let effectivePage = currentPage;
    if (currentPage === 'dashboard' && userRole === 'admin') {
      effectivePage = 'admin-dashboard';
    }

    switch (effectivePage) {
      case 'landing': return <LandingPage onNavigate={navigate} />;
      case 'login': return <LoginPage onLogin={() => navigate('dashboard')} onNavigate={navigate} />;
      case 'register': return <RegisterPage onNavigate={navigate} />;
      case 'dashboard': return <Dashboard userProfile={userProfile} userTeam={userTeam} onNavigate={navigate} />;
      case 'profile': return <ProfilePage userProfile={userProfile} setUserProfile={setUserProfile} onNavigate={navigate} refreshData={refreshData} />;
      case 'find-team': return <FindTeamPage userProfile={userProfile} setUserProfile={setUserProfile} onNavigate={navigate} refreshData={refreshData} />;
      case 'create-team': return <CreateTeamPage userProfile={userProfile} onNavigate={navigate} refreshData={refreshData} />;
      case 'team-workspace': return <TeamWorkspace userProfile={userProfile} team={userTeam} setTeam={setUserTeam} setUserProfile={setUserProfile} onNavigate={navigate} refreshData={refreshData} />;
      case 'application-form': return <ApplicationForm team={userTeam} setTeam={setUserTeam} onNavigate={navigate} refreshData={refreshData} />;
      case 'admin-dashboard': return <AdminDashboard onNavigate={navigate} />;
      default: return <LandingPage onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {renderPage()}
    </div>
  );
};

export default App;
