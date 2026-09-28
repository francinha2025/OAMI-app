/**
 * Utilitários e formatadores em Português do Brasil para a área das cuidadoras.
 */

export const formatShiftName = (shift?: string): string => {
  if (!shift) return 'Não informado';
  switch (shift) {
    case 'MANHA':
      return 'Manhã';
    case 'TARDE':
      return 'Tarde';
    case 'NOITE':
      return 'Noite';
    case '24_HORAS':
      return '24 Horas';
    default:
      return shift;
  }
};

export const formatShiftStatus = (status?: string): string => {
  if (!status) return 'Não informado';
  switch (status) {
    case 'TRANQUILO':
      return 'Tranquilo';
    case 'COM_OCORRENCIAS':
      return 'Com Ocorrências';
    case 'INTERCORRENCIA':
      return 'Com Intercorrência';
    default:
      return status;
  }
};

export const formatDiaperCount = (count: number): string => {
  return `${count} ${count === 1 ? 'fralda' : 'fraldas'}`;
};
