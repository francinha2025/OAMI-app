import { Role, User } from './types';

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Presidente OAMI', role: 'PRESIDENTE', password: '123' },
  { id: '2', name: 'Coordenação OAMI', role: 'COORDENADORA', password: '123' },
  { id: '3', name: 'Assistente Social', role: 'ASSISTENTE_SOCIAL', password: '123' },
  { id: '4', name: 'Psicóloga', role: 'PSICOLOGA', password: '123' },
  { id: '5', name: 'Pedagoga', role: 'PEDAGOGA', password: '123' },
  { id: '6', name: 'Enfermeira', role: 'ENFERMEIRA', password: '123' },
  { id: '7', name: 'Fisioterapeuta', role: 'FISIOTERAPEUTA', password: '123' },
  { id: '8', name: 'Fabricante de Fraldas', role: 'FABRICANTE_FRALDAS', password: '123' },
  { id: '9', name: 'Projetista OAMI', role: 'PROJETISTA', password: '123' },
];

export const ROLE_LABELS: Record<Role, string> = {
  PRESIDENTE: 'Presidente',
  COORDENADORA: 'Coordenadora de Equipe',
  ASSISTENTE_SOCIAL: 'Assistente Social',
  PSICOLOGA: 'Psicóloga',
  PEDAGOGA: 'Pedagoga',
  ENFERMEIRA: 'Enfermeira',
  FISIOTERAPEUTA: 'Fisioterapeuta',
  FABRICANTE_FRALDAS: 'Fabricante de Fraldas',
  PROJETISTA: 'Projetista',
};

// Adicione aqui a URL ou Base64 do seu timbrado (Logo)
export const INSTITUTION_LOGO = 'https://picsum.photos/seed/oami-logo/200/200'; 
export const INSTITUTION_NAME = 'OAMI - Gestão ILPI';

export const MOCK_GALLERY: any[] = [
  {
    id: 'm1',
    url: 'https://picsum.photos/seed/physio1/800/600',
    patientId: '1',
    patientName: 'Maria Silva',
    professionalId: '7',
    professionalName: 'Fisioterapeuta',
    professionalRole: 'FISIOTERAPEUTA',
    date: new Date().toISOString(),
    activityType: 'Fisioterapia Motora',
    description: 'Exercícios de fortalecimento de membros inferiores.',
    category: 'MULTIDISCIPLINAR'
  },
  {
    id: 'm2',
    url: 'https://picsum.photos/seed/nursing1/800/600',
    patientId: '2',
    patientName: 'João Santos',
    professionalId: '6',
    professionalName: 'Enfermeira',
    professionalRole: 'ENFERMEIRA',
    date: new Date().toISOString(),
    activityType: 'Curativo',
    description: 'Troca de curativo em região sacral.',
    category: 'MULTIDISCIPLINAR'
  },
  {
    id: 'm3',
    url: 'https://picsum.photos/seed/psych1/800/600',
    patientId: '3',
    patientName: 'Ana Oliveira',
    professionalId: '4',
    professionalName: 'Psicóloga',
    professionalRole: 'PSICOLOGA',
    date: new Date().toISOString(),
    activityType: 'Atendimento Individual',
    description: 'Escuta qualificada e acolhimento emocional.',
    category: 'MULTIDISCIPLINAR'
  }
];
