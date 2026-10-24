import { ROLE_LABELS } from '../constants';
import { Role } from '../types';

export interface ResolvedCollaborator {
  name: string;
  role: string;
  institution: string;
}

export interface ResolvedParticipant {
  name: string;
  profile: string;
}

const MOCK_MAP: Record<string, { name: string; role: string }> = {
  'p1': { name: 'Franciara Coelho', role: 'Coordenadora de Equipe' },
  // Equipe Oficial OAMI
  'prof_jardeline': { name: 'Jardeline Amorim', role: 'Assistente Social' },
  'jardeline amorim': { name: 'Jardeline Amorim', role: 'Assistente Social' },
  'prof_tenaelen': { name: 'Tenaelen Marinho', role: 'Psicóloga' },
  'tenaelen marinho': { name: 'Tenaelen Marinho', role: 'Psicóloga' },
  'prof_amanda': { name: 'Amanda Velez', role: 'Pedagoga' },
  'amanda velez': { name: 'Amanda Velez', role: 'Pedagoga' },
  'prof_jordana': { name: 'Jordana Viero', role: 'Enfermeira' },
  'jordana viero': { name: 'Jordana Viero', role: 'Enfermeira' },
  'prof_lysllie': { name: 'Lysllie Vieira', role: 'Fisioterapeuta' },
  'lysllie vieira': { name: 'Lysllie Vieira', role: 'Fisioterapeuta' },
  'prof_franciara': { name: 'Franciara Coelho', role: 'Coordenadora de Equipe' },
  'franciara coelho': { name: 'Franciara Coelho', role: 'Coordenadora de Equipe' },
  'franciara de abreu coelho': { name: 'Franciara Coelho', role: 'Coordenadora de Equipe' },
  'franciara e abreu coelho': { name: 'Franciara Coelho', role: 'Coordenadora de Equipe' },
  'prof_rodrigo': { name: 'Rodrigo', role: 'Projetista' },
  'rodrigo': { name: 'Rodrigo', role: 'Projetista' },
  'prof_lucas': { name: 'Lucas Emanuel Barbosa', role: 'Fabricante de Fraldas' },
  'lucas emanuel': { name: 'Lucas Emanuel Barbosa', role: 'Fabricante de Fraldas' },
  'lucas emanuel barbosa': { name: 'Lucas Emanuel Barbosa', role: 'Fabricante de Fraldas' },
  'lucas emanoel barbosa': { name: 'Lucas Emanuel Barbosa', role: 'Fabricante de Fraldas' },
  'prof_maria_enilde': { name: 'Maria Enilde', role: 'Presidente' },
  'maria enilde': { name: 'Maria Enilde', role: 'Presidente' },
  'prof_fernanda': { name: 'Fernanda Kellen', role: 'Auxiliar Administrativo' },
  'fernanda kellen': { name: 'Fernanda Kellen', role: 'Auxiliar Administrativo' },
  'prof_vania': { name: 'Vania Vieira Lima', role: 'Cuidadora' },
  'vania vieira lima': { name: 'Vania Vieira Lima', role: 'Cuidadora' }
};

/**
 * Resolves raw collaborator IDs (including "p1 0", "p1", uuid, email) to human-readable names and roles.
 */
export function resolveCollaborator(
  rawIdOrName: any,
  professionals: any[] = [],
  users: any[] = []
): ResolvedCollaborator {
  if (!rawIdOrName) {
    return { name: 'Não informado', role: 'Colaborador', institution: 'Casa OAMI' };
  }

  const str = String(rawIdOrName).trim();
  // Remove trailing index patterns like "p1 0", "p2 1", "p1_0", etc.
  const cleaned = str.replace(/[\s_]+[0-9]+$/, '').trim();
  const lowerClean = cleaned.toLowerCase();
  const lowerOriginal = str.toLowerCase();

  // 1. Check known mock ID table
  if (MOCK_MAP[lowerClean]) {
    return {
      name: MOCK_MAP[lowerClean].name,
      role: MOCK_MAP[lowerClean].role,
      institution: 'Casa OAMI'
    };
  }
  if (MOCK_MAP[lowerOriginal]) {
    return {
      name: MOCK_MAP[lowerOriginal].name,
      role: MOCK_MAP[lowerOriginal].role,
      institution: 'Casa OAMI'
    };
  }

  // 2. Check in professionals list
  const allProfs = [
    ...(professionals || []),
    ...(typeof window !== 'undefined' ? (window as any).__allProfessionals || [] : [])
  ];

  const foundProf = allProfs.find((p: any) => {
    if (!p) return false;
    const pId = String(p.id || '').trim().toLowerCase();
    const pUid = String(p.uid || '').trim().toLowerCase();
    const pEmail = String(p.email || '').trim().toLowerCase();
    const pName = String(p.name || '').trim().toLowerCase();

    return (
      (pId && (pId === lowerClean || pId === lowerOriginal)) ||
      (pUid && (pUid === lowerClean || pUid === lowerOriginal)) ||
      (pEmail && (pEmail === lowerClean || pEmail === lowerOriginal)) ||
      (pName && (pName === lowerClean || pName === lowerOriginal))
    );
  });

  if (foundProf && foundProf.name) {
    const rawRole = foundProf.role || foundProf.cargo || '';
    const roleName = ROLE_LABELS[rawRole as Role] || rawRole || 'Profissional OAMI';
    return {
      name: foundProf.name,
      role: roleName,
      institution: 'Casa OAMI'
    };
  }

  // 3. Check in users list
  const foundUser = (users || []).find((u: any) => {
    if (!u) return false;
    const uId = String(u.id || '').trim().toLowerCase();
    const uUid = String(u.uid || '').trim().toLowerCase();
    const uEmail = String(u.email || '').trim().toLowerCase();
    const uName = String(u.name || '').trim().toLowerCase();

    return (
      (uId && (uId === lowerClean || uId === lowerOriginal)) ||
      (uUid && (uUid === lowerClean || uUid === lowerOriginal)) ||
      (uEmail && (uEmail === lowerClean || uEmail === lowerOriginal)) ||
      (uName && (uName === lowerClean || uName === lowerOriginal))
    );
  });

  if (foundUser && foundUser.name) {
    const rawRole = foundUser.role || '';
    const roleName = ROLE_LABELS[rawRole as Role] || rawRole || 'Equipe OAMI';
    return {
      name: foundUser.name,
      role: roleName,
      institution: 'Casa OAMI'
    };
  }

  // 4. Fallback for human-readable strings (e.g. "Projeto Conviver", "Maria da Silva")
  // If it does NOT look like an internal short id ("p1", "id123", etc.)
  if (cleaned.length > 3 && !/^[a-z0-9_-]{1,6}$/i.test(cleaned)) {
    return {
      name: cleaned,
      role: 'Equipe / Colaborador',
      institution: 'Casa OAMI'
    };
  }

  // 5. Final fallback
  return {
    name: cleaned || str,
    role: 'Colaborador da Ação',
    institution: 'Casa OAMI'
  };
}

/**
 * Resolves participant IDs to human-readable names and their profile category (Residente, Comunidade, Cuidador).
 */
export function resolveParticipant(
  rawIdOrName: any,
  elderly: any[] = [],
  communityElderly: any[] = [],
  caregivers: any[] = []
): ResolvedParticipant {
  if (!rawIdOrName) {
    return { name: 'Participante', profile: 'Geral' };
  }

  const str = String(rawIdOrName).trim();
  const lower = str.toLowerCase();

  // 1. Resident Elderly
  const resident = (elderly || []).find(e => 
    e && ((e.id && String(e.id).toLowerCase() === lower) || (e.name && e.name.toLowerCase() === lower))
  );
  if (resident && resident.name) {
    return { name: resident.name, profile: 'Residente' };
  }

  // 2. Community Elderly
  const comm = (communityElderly || []).find(e =>
    e && ((e.id && String(e.id).toLowerCase() === lower) || (e.name && e.name.toLowerCase() === lower))
  );
  if (comm && comm.name) {
    return { name: comm.name, profile: 'Idoso Comunidade' };
  }

  // 3. Caregiver
  const cg = (caregivers || []).find(c =>
    c && ((c.id && String(c.id).toLowerCase() === lower) || (c.name && c.name.toLowerCase() === lower))
  );
  if (cg && cg.name) {
    return { name: cg.name, profile: 'Cuidador' };
  }

  // 4. Fallback as plain name
  return { name: str, profile: 'Participante' };
}
