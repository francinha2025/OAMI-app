import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeReplace(valor: string | null | undefined, busca: string | RegExp, troca: string): string {
  return (valor || "").replace(busca, troca);
}
