import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// ✅ Inicializa Firebase (evita duplicação)
const app = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApps()[0];

// 🔥 Conectando no banco CERTO com Long Polling para evitar erros de Fetch (importante para o preview)
export const db = initializeFirestore(app, 
  {
    experimentalForceLongPolling: true,
  }, 
  firebaseConfig.firestoreDatabaseId || "ai-studio-d61425e7-16e9-4907-adf3-94e647ca9031"
);

// ✅ Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 🔎 Teste de conexão com Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("🔥 Firestore conectado com sucesso!");
  } catch (error) {
    console.error("❌ Erro no Firestore:", error);
  }
}

testConnection();
