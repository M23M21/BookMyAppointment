import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkdKCrSAcGNNzM5-aPxMjM1YbBQ501vLA",
  authDomain: "bo0ka10.firebaseapp.com",
  projectId: "bo0ka10",
  storageBucket: "bo0ka10.appspot.com",
  messagingSenderId: "150096347522",
  appId: "1:150096347522:web:8b9b224a72af28a8b4cf9b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, createUserWithEmailAndPassword };