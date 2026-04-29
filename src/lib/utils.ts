import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeReplace(valor: string | null | undefined, busca: string | RegExp, troca: string): string {
  return (valor || "").replace(busca, troca);
}
(String.prototype as any)._replace = String.prototype.replace;

String.prototype.replace = function (busca, troca) {
  try {
    return (this || "")._replace(busca, troca);
  } catch {
    return "";
  }
};