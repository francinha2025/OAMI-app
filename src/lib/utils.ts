import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInYears, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function getElderlyAgeByName(name: string): number | null {
  if (typeof window === 'undefined') return null;
  const registry = (window as any).__allPatientsAndElderly;
  if (!registry) return null;

  const normalizeStr = (str: string) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  };

  const targetName = normalizeStr(name);
  if (!targetName) return null;

  // 1. Try to find in the primary 'elderly' list
  if (registry.elderly) {
    const found = registry.elderly.find((e: any) => e.name && (normalizeStr(e.name) === targetName || normalizeStr(e.name).includes(targetName) || targetName.includes(normalizeStr(e.name))));
    if (found) {
      if (found.age !== undefined && typeof found.age === 'number') return found.age;
      if (found.birthDate) {
        try {
          const age = differenceInYears(new Date(), parseISO(found.birthDate));
          if (!isNaN(age)) return age;
        } catch (e) {
          // ignore
        }
      }
    }
  }

  // 2. Try the other clinical patient lists
  const lists = [
    registry.nursingPatientsList,
    registry.physioPatientsList,
    registry.psychPatientsList,
    registry.pedagogyPatientsList,
    registry.socialPatientsList,
    registry.nutritionPatientsList
  ];

  for (const list of lists) {
    if (list) {
      const found = list.find((p: any) => p.name && (normalizeStr(p.name) === targetName || normalizeStr(p.name).includes(targetName) || targetName.includes(normalizeStr(p.name))));
      if (found) {
        if (found.age !== undefined && typeof found.age === 'number') return found.age;
        if (found.birthDate) {
          try {
            const age = differenceInYears(new Date(), parseISO(found.birthDate));
            if (!isNaN(age)) return age;
          } catch (e) {}
        }
      }
    }
  }

  return null;
}

export function appendAgeToName(name: any): string {
  if (!name || typeof name !== 'string') return String(name || '');
  
  const upper = name.trim().toUpperCase();
  if (upper.includes('TOTAL') || upper.includes('CONSOLIDADO') || upper.includes('DEMANDA') || upper.includes('PACIENTE') || upper.includes('IDOSO')) {
    return name;
  }

  // Clean first in case there is already (X anos) in the string to avoid duplicating it
  if (/\(\d+\s*anos\)/i.test(name)) {
    return name;
  }
  
  const age = getElderlyAgeByName(name);
  if (age !== null && age > 0) {
    return `${name} (${age} anos)`;
  }
  return name;
}

export function formatTextWithAges(text: string): string {
  if (!text || typeof text !== 'string') return text;
  if (typeof window === 'undefined') return text;
  const registry = (window as any).__allPatientsAndElderly;
  if (!registry) return text;

  let formatted = text;

  // Let's gather all known names from all lists
  const allNames = new Set<string>();
  
  if (registry.elderly) {
    registry.elderly.forEach((e: any) => { if (e.name) allNames.add(e.name.trim()); });
  }
  const lists = [
    registry.nursingPatientsList,
    registry.physioPatientsList,
    registry.psychPatientsList,
    registry.pedagogyPatientsList,
    registry.socialPatientsList,
    registry.nutritionPatientsList
  ];
  for (const list of lists) {
    if (list) {
      list.forEach((p: any) => { if (p.name) allNames.add(p.name.trim()); });
    }
  }

  // Sort names from longest to shortest to avoid replacing substrings of names first
  const sortedNames = Array.from(allNames).sort((a, b) => b.length - a.length);

  for (const name of sortedNames) {
    if (name.length > 3 && formatted.includes(name)) {
      // Check if age is already next to it
      const index = formatted.indexOf(name);
      const afterName = formatted.slice(index + name.length);
      if (!/\s*\(\d+\s*anos\)/i.test(afterName.slice(0, 15))) {
        const age = getElderlyAgeByName(name);
        if (age !== null && age > 0) {
          formatted = formatted.replace(name, `${name} (${age} anos)`);
        }
      }
    }
  }

  return formatted;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Essa função é segura e você pode usá-la importando nos componentes
export function safeReplace(valor: string | null | undefined, busca: string | RegExp, troca: string): string {
  return (valor || "")?.replace(busca, troca);
}

export function cleanData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => {
      // Remove o campo 'id' se presente, para não salvar no Firestore
      if (key === 'id') return false;

      // Remove undefined e null
      if (value === undefined || value === null) return false;

      // Remove NaN (número inválido)
      if (typeof value === "number" && isNaN(value)) return false;

      // Remove string vazia
      if (typeof value === "string" && value.trim() === "") return false;

      return true;
    })
  );
}

export async function compressImage(base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.5): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}

export function safeFormat(dateStr: string | undefined | null, formatStr: string, fallback = '--/--'): string {
  if (!dateStr) return fallback;
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr, { locale: ptBR });
  } catch {
    return fallback;
  }
}

export function getProfessionalName(idOrUidOrEmail: string | undefined | null, list?: any[]): string {
  if (!idOrUidOrEmail) return '';
  const search = String(idOrUidOrEmail).trim().toLowerCase();
  if (!search) return '';

  // 1. Try passed list
  if (list && Array.isArray(list)) {
    const found = list.find((p: any) => 
      p && (
        (p.id && String(p.id).trim().toLowerCase() === search) ||
        (p.uid && String(p.uid).trim().toLowerCase() === search) ||
        (p.email && String(p.email).trim().toLowerCase() === search) ||
        (p.name && String(p.name).trim().toLowerCase() === search)
      )
    );
    if (found && found.name) return found.name;
  }

  // 2. Try global window.__allProfessionals registry
  if (typeof window !== 'undefined') {
    const globalList = (window as any).__allProfessionals;
    if (globalList && Array.isArray(globalList)) {
      const found = globalList.find((p: any) => 
        p && (
          (p.id && String(p.id).trim().toLowerCase() === search) ||
          (p.uid && String(p.uid).trim().toLowerCase() === search) ||
          (p.email && String(p.email).trim().toLowerCase() === search) ||
          (p.name && String(p.name).trim().toLowerCase() === search)
        )
      );
      if (found && found.name) return found.name;
    }
  }

  return String(idOrUidOrEmail);
}

export function getProfessionalRole(idOrUidOrEmail: string | undefined | null, list?: any[]): string {
  if (!idOrUidOrEmail) return '';
  const search = String(idOrUidOrEmail).trim().toLowerCase();
  if (!search) return '';

  // 1. Try passed list
  if (list && Array.isArray(list)) {
    const found = list.find((p: any) => 
      p && (
        (p.id && String(p.id).trim().toLowerCase() === search) ||
        (p.uid && String(p.uid).trim().toLowerCase() === search) ||
        (p.email && String(p.email).trim().toLowerCase() === search) ||
        (p.name && String(p.name).trim().toLowerCase() === search)
      )
    );
    if (found) return found.role || found.cargo || '';
  }

  // 2. Try global registry
  if (typeof window !== 'undefined') {
    const globalList = (window as any).__allProfessionals;
    if (globalList && Array.isArray(globalList)) {
      const found = globalList.find((p: any) => 
        p && (
          (p.id && String(p.id).trim().toLowerCase() === search) ||
          (p.uid && String(p.uid).trim().toLowerCase() === search) ||
          (p.email && String(p.email).trim().toLowerCase() === search) ||
          (p.name && String(p.name).trim().toLowerCase() === search)
        )
      );
      if (found) return found.role || found.cargo || '';
    }
  }

  return '';
}
