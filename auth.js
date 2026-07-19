// Import official Firebase SDK tools
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9-BquJOixe2dkuMA4OR_LH_-4kqcFrRE", 
  authDomain: "shinzi-music.firebaseapp.com",
  projectId: "shinzi-music",
  storageBucket: "shinzi-music.firebasestorage.app",
  messagingSenderId: "985596670426",
  appId: "1:985596670426:web:b52b69290533ae3dc450e3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ─── CUSTOM NAME GENERATOR ALGORITHM ───
function generateNameFromEmail(email) {
    let namePart = email.split('@')[0]; 
    namePart = namePart.replace(/[0-9]/g, ''); 
    return namePart.charAt(0).toUpperCase() + namePart.slice(1); 
}

// ─── STRICT PASSWORD VALIDATION ───
function validatePassword(password) {
    let isTooShort = password.length < 12;
    let hasGaps = password.includes(" ");

    if (isTooShort && hasGaps) return "Password must be at least 12 letters and must have NO gaps.";
    if (isTooShort) return "Password must be at least 12 characters.";
    if (hasGaps) return "Password must not have gaps (No spaces allowed).";

    return "OK";
}

// ─── CUSTOM ERROR HANDLER (Server Down Feature) ───
function handleError(error, errorBox) {
    if (error.code === 'auth/network-request-failed') {
        errorBox.innerText = "Server not working. Please check your internet.";
    } else {
        errorBox.innerText = error.message.replace("Firebase: ", "");
    }
}

// ─── SIGN UP WITH EMAIL ───
const btnSignup = document.getElementById("btnSignup");
if (btnSignup) {
    btnSignup.addEventListener("click", async () => {
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;
        const termsCheck = document.getElementById("termsCheck").checked;
        const errorBox = document.getElementById("passwordError");

        if (!termsCheck) { errorBox.innerText = "You must accept the Terms and Policy."; return; }
        const passwordCheck = validatePassword(password);
        if (passwordCheck !== "OK") { errorBox.innerText = passwordCheck; return; }

        try {
            errorBox.innerText = "Connecting..."; // Visual feedback!
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const customName = generateNameFromEmail(email);
            await updateProfile(userCredential.user, { displayName: customName });
            window.location.href = "index.html"; // Teleports to homepage
        } catch (error) { 
            handleError(error, errorBox); 
        }
    });
}

// ─── SIGN UP WITH GOOGLE ───
const btnGoogleSignup = document.getElementById("btnGoogleSignup");
if (btnGoogleSignup) {
    btnGoogleSignup.addEventListener("click", async () => {
        const termsCheck = document.getElementById("termsCheck").checked;
        const errorBox = document.getElementById("passwordError");

        if (!termsCheck) { errorBox.innerText = "You must accept the Terms and Policy to use Google."; return; }

        try {
            errorBox.innerText = "Opening Google..."; // Visual feedback!
            await signInWithPopup(auth, googleProvider);
            window.location.href = "index.html"; // Teleports to homepage
        } catch (error) { 
            handleError(error, errorBox); 
        }
    });
}

// ─── LOG IN WITH EMAIL ───
const btnLogin = document.getElementById("btnLogin");
if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;
        const errorBox = document.getElementById("loginError");

        try {
            errorBox.innerText = "Logging in..."; // Visual feedback!
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "index.html"; // Teleports to homepage
        } catch (error) { 
            handleError(error, errorBox); 
        }
    });
}

// ─── LOG IN WITH GOOGLE ───
const btnGoogleLogin = document.getElementById("btnGoogleLogin");
if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener("click", async () => {
        const errorBox = document.getElementById("loginError");
        try {
            errorBox.innerText = "Opening Google..."; // Visual feedback!
            await signInWithPopup(auth, googleProvider);
            window.location.href = "index.html"; // Teleports to homepage
        } catch (error) { 
            handleError(error, errorBox); 
        }
    });
}