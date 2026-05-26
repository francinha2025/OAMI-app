import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeAuth, 
  browserLocalPersistence, 
  browserPopupRedirectResolver, 
  getAuth, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// ✅ Inicializa Firebase (evita duplicação)
const app = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApps()[0];

// 🔥 Conectando no banco CERTO com Long Polling para evitar erros de Fetch (importante para o preview)
const targetDatabaseId = (firebaseConfig as any).firestoreDatabaseId || "ai-studio-d61425e7-16e9-4907-adf3-94e647ca9031";
export const db = initializeFirestore(app, 
  {
    experimentalForceLongPolling: true,
  }, 
  targetDatabaseId
);

console.log(`📡 Firebase Inicializado. Projeto: ${firebaseConfig.projectId} | Banco: ${targetDatabaseId}`);

// ✅ Auth (safely handle already-initialized cases, common during HMR or multiple imports)
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: browserLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch (error: any) {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();

// 🔎 Teste de conexão com Firestore
export async function testConnection() {
  const user = auth.currentUser;
  if (!user) {
    console.log("ℹ️ Firestore: Aguardando login para teste completo...");
    return;
  }

  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log("✅ Firestore: Conexão bem-sucedida para o usuário:", user.email);
  } catch (error: any) {
    if (error.message.includes('permission-denied')) {
      console.warn("🛡️ Firestore: Permissão negada para teste. Verifique se o documento 'test/connection' existe e se as regras permitem seu acesso.");
    } else {
      console.error("❌ Firestore: Erro na conexão:", error.message);
    }
  }
}

// O teste agora será chamado pelo App.tsx após o login para evitar erro prematuro
// testConnection(); 
