import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  const isQuotaError = 
    errorMessage.includes('Quota exceeded') || 
    errorMessage.includes('quota') || 
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorMessage.includes('ASSERTION FAILED') ||
    errorMessage.includes('Unexpected state');

  if (isQuotaError) {
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
    console.warn("ALERTA: Limite de cota do banco de dados atingido ou instabilidade no canal de escuta.");
  } else {
    window.dispatchEvent(new CustomEvent('firestore-error-toast', { detail: { message: `Erro ao acessar ${path || 'dados'}: ${errorMessage}` } }));
  }
  return errInfo;
}
