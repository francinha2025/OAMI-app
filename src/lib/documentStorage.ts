import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AttachedDocument } from '../types';

// Novo limite expandido para anexar PDF e documentos (25 Megabytes)
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_DOCUMENT_FILE_SIZE_LABEL = '25MB';
export const INLINE_BASE64_THRESHOLD_BYTES = 400 * 1024; // 400 KB
export const CHUNK_SIZE_CHARS = 450 * 1000; // ~450 KB por chunk no Firestore

// Cache em memória durante a sessão para evitar re-downloads e garantir acesso instantâneo
const documentCache = new Map<string, string>();

/**
 * Converte base64 Data URI em Blob URL seguro para visualização e download
 */
export function base64ToBlobUrl(dataUrl: string, fallbackMime = 'application/pdf'): string {
  try {
    if (!dataUrl.startsWith('data:')) {
      return dataUrl;
    }
    const [header, base64Data] = dataUrl.split(';base64,');
    if (!base64Data) return dataUrl;
    
    const mimeType = header.replace('data:', '') || fallbackMime;
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Erro ao converter base64 em Blob:', err);
    return dataUrl;
  }
}

/**
 * Lê o arquivo, valida o limite ampliado de 25MB e o fragmenta (chunking) no Firestore se for maior que 400KB
 */
export async function processAndStoreFile(
  file: File,
  onProgress?: (status: string) => void
): Promise<AttachedDocument> {
  if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    throw new Error(`O arquivo "${file.name}" excede o limite ampliado de ${MAX_DOCUMENT_FILE_SIZE_LABEL} (${(file.size / (1024 * 1024)).toFixed(1)}MB). Limite máximo permitido: 25MB.`);
  }

  onProgress?.(`Lendo ${file.name}...`);

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao ler arquivo.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Erro na leitura do arquivo.'));
    reader.readAsDataURL(file);
  });

  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const formattedSize = file.size > 1024 * 1024
    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : `${(file.size / 1024).toFixed(0)} KB`;

  const detectedType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

  // Armazena no cache local em memória
  documentCache.set(docId, base64);

  // Se o arquivo for menor que o limite de inline, mantém o base64 direto no registro pai
  if (file.size <= INLINE_BASE64_THRESHOLD_BYTES) {
    return {
      id: docId,
      name: file.name,
      type: detectedType,
      size: formattedSize,
      sizeBytes: file.size,
      base64,
      isChunked: false,
      uploadedAt: new Date().toISOString()
    };
  }

  // Arquivos maiores que 400KB (até 25MB): fragmenta em pedaços no Firestore
  onProgress?.(`Gravando partes do documento no banco (${formattedSize})...`);

  const totalChunks = Math.ceil(base64.length / CHUNK_SIZE_CHARS);
  const writePromises: Promise<any>[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE_CHARS;
    const end = Math.min(base64.length, start + CHUNK_SIZE_CHARS);
    const chunkSlice = base64.slice(start, end);
    const chunkDocRef = doc(db, 'document_chunks', `${docId}_chunk_${i}`);

    writePromises.push(
      setDoc(chunkDocRef, {
        documentId: docId,
        chunkIndex: i,
        totalChunks,
        data: chunkSlice,
        fileName: file.name,
        fileType: detectedType,
        createdAt: new Date().toISOString()
      })
    );
  }

  await Promise.all(writePromises);

  return {
    id: docId,
    name: file.name,
    type: detectedType,
    size: formattedSize,
    sizeBytes: file.size,
    base64: '', // não grava base64 gigante no documento pai para nunca exceder 1MB no doc principal
    isChunked: true,
    chunkCount: totalChunks,
    uploadedAt: new Date().toISOString()
  };
}

/**
 * Recupera o Base64 completo do documento (do objeto, do cache ou montando os chunks do Firestore)
 */
export async function getDocumentDataUrl(
  docItem: AttachedDocument | { id?: string; name?: string; base64?: string; url?: string; isChunked?: boolean; chunkCount?: number }
): Promise<string> {
  // 1. Se já tem base64 completo e válido
  if (docItem.base64 && docItem.base64.length > 200) {
    return docItem.base64;
  }

  // 2. Se está no cache em memória
  if (docItem.id && documentCache.has(docItem.id)) {
    return documentCache.get(docItem.id)!;
  }

  // 3. Se é chunked e tem ID, busca as partes no Firestore
  if (docItem.isChunked && docItem.id) {
    const total = docItem.chunkCount || 1;
    const chunkPromises: Promise<any>[] = [];
    for (let i = 0; i < total; i++) {
      chunkPromises.push(getDoc(doc(db, 'document_chunks', `${docItem.id}_chunk_${i}`)));
    }
    const snapshots = await Promise.all(chunkPromises);
    const parts: string[] = [];
    for (const snap of snapshots) {
      if (snap.exists()) {
        parts.push((snap.data() as any).data || '');
      }
    }
    const fullBase64 = parts.join('');
    if (fullBase64) {
      documentCache.set(docItem.id, fullBase64);
      return fullBase64;
    }
  }

  // 4. Fallback se tiver URL externa
  return (docItem as any).url || docItem.base64 || '';
}

/**
 * Realiza o download de um documento anexado no navegador com suporte a arquivos grandes
 */
export async function downloadAttachedDocument(
  docItem: AttachedDocument | { id?: string; name: string; base64?: string; url?: string; isChunked?: boolean; chunkCount?: number }
): Promise<void> {
  const dataUrl = await getDocumentDataUrl(docItem);
  if (!dataUrl) {
    throw new Error('Conteúdo do documento não encontrado para download.');
  }

  const isBase64 = dataUrl.startsWith('data:');
  const downloadUrl = isBase64 ? base64ToBlobUrl(dataUrl, (docItem as any).type || 'application/pdf') : dataUrl;

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = docItem.name || 'documento_anexo.pdf';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (isBase64 && downloadUrl.startsWith('blob:')) {
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 30000);
  }
}

/**
 * Abre o documento em uma nova aba para visualização direta (PDF viewer nativo)
 */
export async function openAttachedDocument(
  docItem: AttachedDocument | { id?: string; name: string; base64?: string; url?: string; isChunked?: boolean; chunkCount?: number }
): Promise<void> {
  const dataUrl = await getDocumentDataUrl(docItem);
  if (!dataUrl) {
    throw new Error('Documento não disponível para visualização.');
  }

  const blobUrl = base64ToBlobUrl(dataUrl, (docItem as any).type || 'application/pdf');
  window.open(blobUrl, '_blank');
}

/**
 * Exclui partes do documento fragmentado do Firestore
 */
export async function deleteDocumentChunks(docId: string, chunkCount?: number): Promise<void> {
  try {
    documentCache.delete(docId);
    const count = chunkCount || 50;
    const deletes: Promise<any>[] = [];
    for (let i = 0; i < count; i++) {
      deletes.push(deleteDoc(doc(db, 'document_chunks', `${docId}_chunk_${i}`)).catch(() => {}));
    }
    await Promise.all(deletes);
  } catch (err) {
    console.warn('Erro ao limpar chunks do documento:', err);
  }
}
