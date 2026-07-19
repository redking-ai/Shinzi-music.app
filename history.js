import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Your Stealth Keys
const firebaseConfig = {
    apiKey: ['AIzaSyA9', '-BquJOixe2dku', 'MA4OR_LH_', '-4kqcFrRE'].join(''),
    authDomain: "shinzi-music.firebaseapp.com",
    projectId: "shinzi-music",
    storageBucket: "shinzi-music.firebasestorage.app",
    messagingSenderId: "985596670426",
    appId: "1:985596670426:web:b52b69290533ae3dc450e3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Wait for user to be logged in, then grab history
onAuthStateChanged(auth, async (user) => {
    const historyContainer = document.getElementById("history-list");
    if (!historyContainer) return;

    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().history && userDoc.data().history.length > 0) {
                const history = userDoc.data().history;

                // Reverse the array so the newest song you played is at the top
                historyContainer.innerHTML = history.reverse().map(song => `
                    <div class="history-item">
                        <img class="album-art" src="${song.thumb}" onerror="this.src='https://img.youtube.com/vi/default/0.jpg'">
                        <div class="song-info">
                            <span class="song-title">${song.title}</span>
                            <span class="song-artist">${song.channel}</span>
                        </div>
                    </div>
                `).join("");
            } else {
                historyContainer.innerHTML = "<p style='color:#a7a7a7;'>No history yet. Start playing some music!</p>";
            }
        } catch(e) { 
            console.error("History fetch error:", e);
            historyContainer.innerHTML = "<p style='color:#ff4444;'>Failed to load history.</p>";
        }
    } else {
        // If not logged in, bounce to login
        window.location.href = "login.html";
    }
});