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
