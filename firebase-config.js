import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB-TTnjgdaZ5_k5ytuf_jV6Lw1iAJc84XY",
    authDomain: "habit-tracker-app-5c05f.firebaseapp.com",
    projectId: "habit-tracker-app-5c05f",
    storageBucket: "habit-tracker-app-5c05f.firebasestorage.app",
    messagingSenderId: "411095623514",
    appId: "1:411095623514:web:42eb31e2562f23f908f563",
    measurementId: "G-0837J1PJ8C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you need
export const auth = getAuth(app);
export const db = getFirestore(app);
