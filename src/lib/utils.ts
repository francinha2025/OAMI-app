import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Essa função é segura e você pode usá-la importando nos componentes
export function safeReplace(valor: string | null | undefined, busca: string | RegExp, troca: string): string {
  return (valor || "")?.replace(busca, troca);
}