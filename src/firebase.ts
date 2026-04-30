import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// 🔥 CONFIG DO SEU FIREBASE (OAMI OFICIAL)
const firebaseConfig = {
  apiKey: "AIzaSyD5V-sYEIhbUN7w_b8Hz6_kbRvU8GphDYY",
  authDomain: "oami-oficial.firebaseapp.com",
  projectId: "oami-oficial",
  storageBucket: "oami-oficial.firebasestorage.app",
  messagingSenderId: "264092482774",
  appId: "1:264092482774:web:fa69e36f256cb55cb91d77"
};

// ✅ Inicializa Firebase (evita duplicação)
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// ✅ Firestore (CORRETO)
export const db = getFirestore(app);

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