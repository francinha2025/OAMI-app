import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
