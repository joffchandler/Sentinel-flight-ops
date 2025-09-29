import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB_Q9prvpfV_BbAiaUa3eY7t4vJ_uFBS10",
  authDomain: "sentinel-sky-ops.firebaseapp.com",
  projectId: "sentinel-sky-ops",
  storageBucket: "sentinel-sky-ops.firebasestorage.app",
  messagingSenderId: "352222144083",
  appId: "1:352222144083:web:77d315eeb50734c54348a6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
