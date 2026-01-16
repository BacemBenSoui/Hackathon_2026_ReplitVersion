
export type UserRole = 'student' | 'admin';
export type TeamRole = 'leader' | 'member' | null;

export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  university: string;
  gender: 'M' | 'F' | 'O';
  level: string;
  major: string;
  techSkills: string[];
  metierSkills: string[];
  otherSkills?: string;
  region?: string;
  cvUrl?: string;
  isComplete: boolean;
  teamRole: TeamRole;
  currentTeamId: string | null;
  applications: string[]; 
}

export interface TeamMemberSummary {
  id: string;
  name: string;
  email: string; // Ajouté pour l'onglet communication
  phone?: string; // Ajouté pour l'onglet communication
  techSkills: string[];
  metierSkills: string[];
  gender: 'M' | 'F' | 'O';
  role: TeamRole;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  members: TeamMemberSummary[];
  joinRequests: any[];
  requestedSkills: string[];
  preferredRegion: string;
  status: 'incomplete' | 'complete' | 'submitted' | 'selected' | 'waitlist' | 'rejected';
  theme: string;
  secondaryTheme: string;
  secondaryThemeDescription?: string;
  videoUrl?: string;
  pocUrl?: string;
  motivationUrl?: string;
  lettreMotivationUrl?: string; // Ajouté pour la règle de gestion 5
  teamRequestProfile?: string; // Nouvelle colonne TeamRequestProfile
}

export interface JoinRequest {
  id: string;
  teamId: string;
  teamName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}
