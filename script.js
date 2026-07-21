const BACKEND_SEARCH_URL = "https://shinzi-proxy.vercel.app/music/search";

// ─── SHINZI MUSIC NATIVE AUDIO ENGINE ─────────
const audioPlayer = new Audio();
// Your actual Render backend URL!
const RENDER_BACKEND_URL = "https://shinzi-music-backend.onrender.com";

let currentQueue = [];
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;

// --- Native Audio Event Listeners ---
audioPlayer.addEventListener('play', () => {
    isPlaying = true;
    updatePlayPauseBtn();
});

audioPlayer.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayPauseBtn();
});

audioPlayer.addEventListener('ended', () => {
    if (isRepeat) {
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    } else {
        playNext();
    }
});

// Replaces the old setInterval method, much smoother!
audioPlayer.addEventListener('timeupdate', () => {
    const current = audioPlayer.currentTime || 0;
    const total = audioPlayer.duration || 0;
    const pct = total > 0 ? (current / total) * 100 : 0;

    if (document.getElementById("progressFill")) document.getElementById("progressFill").style.width = pct + "%";
    if (document.getElementById("currentTime")) document.getElementById("currentTime").textContent = formatTime(current);
    
    // Only update total time if it's a valid number
    if (document.getElementById("totalTime") && total > 0 && !isNaN(total) && total !== Infinity) {
        document.getElementById("totalTime").textContent = formatTime(total);
    }

    if (document.getElementById("innerProgressFill")) document.getElementById("innerProgressFill").style.width = pct + "%";
    if (document.getElementById("innerCurrentTime")) document.getElementById("innerCurrentTime").textContent = formatTime(current);
    if (document.getElementById("innerTotalTime") && total > 0 && !isNaN(total) && total !== Infinity) {
        document.getElementById("innerTotalTime").textContent = formatTime(total);
    }
});

// ─── FALLBACK DATA ───
const fallbackTracks = [
  { id: "UxxajLWwzqY", title: "Jujutsu Kaisen - SPECIALZ", channel: "TOHO animation", thumb: "https://img.youtube.com/vi/UxxajLWwzqY/0.jpg" },
  { id: "lz157kuOMC8", title: "Live Another Day", channel: "KORDHELL", thumb: "https://img.youtube.com/vi/lz157kuOMC8/0.jpg" },
  { id: "w-sQRS-Lc9k", title: "Murder In My Mind", channel: "KORDHELL", thumb: "https://img.youtube.com/vi/w-sQRS-Lc9k/0.jpg" },
  { id: "60ItHLz5WEA", title: "Faded", channel: "Alan Walker", thumb: "https://img.youtube.com/vi/60ItHLz5WEA/0.jpg" }
];

// ─── FAVORITES DATABASE ───────────────────────────────────
let userFavorites = JSON.parse(localStorage.getItem('shinzi_favorites')) || [];

window.loadCloudFavorites = function(cloudData) {
  userFavorites = cloudData;
  localStorage.setItem('shinzi_favorites', JSON.stringify(userFavorites));
  renderFavoritesList();
};

function saveFavorites() {
  localStorage.setItem('shinzi_favorites', JSON.stringify(userFavorites));
  if (window.syncFavoritesToCloud) { window.syncFavoritesToCloud(userFavorites); }
  renderFavoritesList();
}

function renderFavoritesList() {
  const container = document.getElementById("favoritesList");
  if (!container) return;
  if (userFavorites.length === 0) {
    container.innerHTML = `<div class="status-msg-box" style="padding: 20px; color: #a7a7a7;">No favorites yet. Tap the heart to save songs!</div>`;
    return;
  }
  container.innerHTML = userFavorites.map((track, i) => `
    <div class="search-item" onclick="playFromFavorites(${i})">
      <img class="search-thumb" src="${track.thumb}" alt="">
      <div class="search-info">
        <div class="search-title">${escHtml(track.title)}</div>
        <div class="search-channel">${escHtml(track.channel)}</div>
      </div>
    </div>
  `).join("");
}

// ─── PLAY LOGIC (NOW USING RENDER BACKEND) ───────────────────────
function playVideo(videoId, title, channel, thumb) {
  document.getElementById('mainPlayerBar')?.classList.remove('hidden-player');
  localStorage.setItem('shinzi_last_played', JSON.stringify({id: videoId, title, channel, thumb}));

  updateNowPlaying(title, channel, thumb);
  if (window.syncHistoryToCloud) window.syncHistoryToCloud({ id: videoId, title, channel, thumb });
  checkIfFavorite();

  // 🚀 Tell the native Audio player to stream from your Render API
  audioPlayer.src = `${RENDER_BACKEND_URL}/stream?id=${videoId}`;
  audioPlayer.play().catch(err => {
      console.error("Playback error (Render might be waking up):", err);
  });
}

function updateNowPlaying(title, channel, thumb) {
  const safeTitle = title || "Unknown";
  const safeChannel = channel || "Shinzi Music";
  const highResThumb = thumb || "https://img.youtube.com/vi/default/0.jpg";

  if (document.getElementById("npTitle")) document.getElementById("npTitle").textContent = safeTitle;
  if (document.getElementById("npArtist")) document.getElementById("npArtist").textContent = safeChannel;
  if (document.getElementById("npThumb")) document.getElementById("npThumb").innerHTML = `<img src="${highResThumb}" alt="thumb" style="width:100%;height:100%;object-fit:cover;">`;

  if (document.getElementById("innerTitle")) document.getElementById("innerTitle").textContent = safeTitle;
  if (document.getElementById("innerArtist")) document.getElementById("innerArtist").textContent = safeChannel;
  if (document.getElementById("innerThumbImg")) document.getElementById("innerThumbImg").src = highResThumb;

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: safeTitle, artist: safeChannel, artwork: [{ src: highResThumb, sizes: '512x512', type: 'image/jpeg' }]
    });
    navigator.mediaSession.setActionHandler('play', togglePlayPause);
    navigator.mediaSession.setActionHandler('pause', togglePlayPause);
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
  }
}

function togglePlayPause() {
  if (!audioPlayer.src) return;
  if (audioPlayer.paused) {
    audioPlayer.play();
  } else {
    audioPlayer.pause();
  }
}

function updatePlayPauseBtn() {
  document.getElementById("playIcon")?.classList.toggle("hidden", isPlaying);
  document.getElementById("pauseIcon")?.classList.toggle("hidden", !isPlaying);
  document.getElementById("innerPlayIcon")?.classList.toggle("hidden", isPlaying);
  document.getElementById("innerPauseIcon")?.classList.toggle("hidden", !isPlaying);

  const mobilePlay = document.getElementById("mobilePlayBtn");
  if(mobilePlay) {
    mobilePlay.innerHTML = isPlaying 
      ? `<svg viewBox="0 0 24 24" fill="#fff" width="32" height="32"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>` 
      : `<svg viewBox="0 0 24 24" fill="#fff" width="32" height="32"><path d="M8 5v14l11-7z"/></svg>`;
  }
}

// ─── CONTROLS WIRING ────────
document.getElementById("btnPlayPause")?.addEventListener("click", (e) => { e.stopPropagation(); togglePlayPause(); });
document.getElementById("innerPlayBtn")?.addEventListener("click", togglePlayPause);
document.getElementById("mobilePlayBtn")?.addEventListener("click", (e) => { e.stopPropagation(); togglePlayPause(); });

document.getElementById("btnNext")?.addEventListener("click", (e) => { e.stopPropagation(); playNext(); });
document.getElementById("innerNext")?.addEventListener("click", playNext);

document.getElementById("btnPrev")?.addEventListener("click", (e) => { e.stopPropagation(); playPrev(); });
document.getElementById("innerPrev")?.addEventListener("click", playPrev);

document.getElementById("btnShuffle")?.addEventListener("click", (e) => {
    e.stopPropagation();
    isShuffle = !isShuffle;
    e.currentTarget.classList.toggle("active-mode", isShuffle);
});

document.getElementById("btnRepeat")?.addEventListener("click", (e) => {
    e.stopPropagation();
    isRepeat = !isRepeat;
    e.currentTarget.classList.toggle("active-mode", isRepeat);
});

function playNext() {
  if (currentQueue.length === 0) return;
  currentIndex = isShuffle ? Math.floor(Math.random() * currentQueue.length) : (currentIndex + 1) % currentQueue.length;
  const track = currentQueue[currentIndex];
  playVideo(track.id, track.title, track.channel, track.thumb);
}

function playPrev() {
  if (currentQueue.length === 0) return;
  currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  const track = currentQueue[currentIndex];
  playVideo(track.id, track.title, track.channel, track.thumb);
}

// ─── PROGRESS BAR SYNC ────────────────────────────────────
document.getElementById("progressBar")?.addEventListener("click", seekAudio);
document.getElementById("innerProgressBar")?.addEventListener("click", seekAudio);

function seekAudio(e) {
  if (!audioPlayer.src) return;
  const bar = e.currentTarget;
  const pct = e.offsetX / bar.offsetWidth;
  const total = audioPlayer.duration || 0;
  if (total > 0 && !isNaN(total) && total !== Infinity) {
      audioPlayer.currentTime = pct * total;
  }
}

function formatTime(sec) {
  if (isNaN(sec) || sec === Infinity) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── HEART & FAVORITE WIRING ──────────────────────────────
function toggleFavoriteAction(e) {
  e.stopPropagation();
  if (currentIndex === -1) return;
  const track = currentQueue[currentIndex];
  const existsIndex = userFavorites.findIndex(t => t.id === track.id);
  if (existsIndex > -1) { userFavorites.splice(existsIndex, 1); } 
  else { userFavorites.push(track); }
  saveFavorites();
  checkIfFavorite();
}

function checkIfFavorite() {
  if (currentIndex === -1) return;
  const track = currentQueue[currentIndex];
  const isFav = userFavorites.some(t => t.id === track.id);
  document.getElementById("npHeart")?.classList.toggle("liked", isFav);
  document.getElementById("innerHeart")?.classList.toggle("liked", isFav);
}

document.getElementById("npHeart")?.addEventListener("click", toggleFavoriteAction);
document.getElementById("innerHeart")?.addEventListener("click", toggleFavoriteAction);

// ─── INNER SCREEN SLIDE LOGIC ─────────────────────────────
const mainPlayerBar = document.getElementById("mainPlayerBar");
const innerPlayerScreen = document.getElementById("innerPlayerScreen");
const closeInnerScreen = document.getElementById("closeInnerScreen");

if (mainPlayerBar && innerPlayerScreen) {
    mainPlayerBar.addEventListener("click", () => { innerPlayerScreen.classList.add("active"); });
}
if (closeInnerScreen && innerPlayerScreen) {
    closeInnerScreen.addEventListener("click", (e) => { e.stopPropagation(); innerPlayerScreen.classList.remove("active"); });
}

// ─── SEARCH & BULLETPROOF UI NAVIGATION ────────────────────
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
let searchTimeout = null;

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    if (searchClear) searchClear.classList.toggle("hidden", !q);
    clearTimeout(searchTimeout);
    if (q.length > 1) {
      showSection("search");
      searchTimeout = setTimeout(() => searchYT(q), 500);
    } else if (!q) {
      document.getElementById("searchResults").innerHTML = "";
    }
  });
}

window.showSection = function(name) {
  const sections = ["home", "search", "library", "settings", "playHistory", "downloads"];

  sections.forEach(sec => {
    const el = document.getElementById(sec + "Section");
    if (el) el.classList.toggle("hidden", name !== sec);
  });

  document.querySelectorAll(".nav-item, .mobile-nav-btn").forEach(el => {
    el.classList.remove("active");
  });

  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  const desktopBtn = document.getElementById("nav" + capitalized);
  if (desktopBtn) desktopBtn.classList.add("active");

  const mobileBtn = document.getElementById("mobileNav" + capitalized);
  if (mobileBtn) mobileBtn.classList.add("active");
};

// ─── SEARCH ENGINE CONNECTION ───
async function searchYT(query) {
  const results = document.getElementById("searchResults");
  if (results) results.innerHTML = `<div class="status-msg-box" style="padding: 20px; color: #a7a7a7;">Searching tracks...</div>`;

  try {
    const data = await fetchFromBackendProxy(query);
    const items = data.items || [];
    currentQueue = items.map((item) => ({
      id: item.id.videoId, title: item.snippet.title, channel: item.snippet.channelTitle,
      thumb: item.snippet.thumbnails?.high?.url || `https://img.youtube.com/vi/${item.id.videoId}/0.jpg`,
    }));

    if (results) {
      if (currentQueue.length === 0) {
        results.innerHTML = `<div class="status-msg-box" style="padding: 20px; color: #a7a7a7;">No tracks found.</div>`;
      } else {
        results.innerHTML = currentQueue.map((track, i) => `
          <div class="search-item" onclick="playFromQueue(${i})">
            <img class="search-thumb" src="${track.thumb}" alt="" onerror="this.src='https://img.youtube.com/vi/${track.id}/0.jpg'">
            <div class="search-info">
              <div class="search-title">${escHtml(track.title)}</div>
              <div class="search-channel">${escHtml(track.channel)}</div>
            </div>
          </div>
        `).join("");
      }
    }
  } catch (err) {
    if (results) results.innerHTML = `<div class="status-msg-box" style="padding: 20px; color: #ff4444;">Search failed. Try again.</div>`;
  }
}

window.playFromQueue = function(index) {
  currentIndex = index; const track = currentQueue[index]; playVideo(track.id, track.title, track.channel, track.thumb);
};

window.playFromFavorites = function(index) {
  currentQueue = [...userFavorites]; currentIndex = index; const track = currentQueue[index]; playVideo(track.id, track.title, track.channel, track.thumb);
};

// ─── SEQUENTIAL WATERFALL FEED LOADER ───────────────────────
function generateCardsHTML(containerId, tracks) {
  return tracks.map((track, i) => `
    <div class="music-card" onclick="playFeedTrack('${containerId}', ${i})">
      <img class="card-thumb" src="${track.thumb}" alt="" onerror="this.src='https://img.youtube.com/vi/${track.id}/0.jpg'">
      <div class="card-title">${escHtml(track.title)}</div>
      <div class="card-sub">${escHtml(track.channel)}</div>
    </div>
  `).join("");
}

async function loadFeed(query, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container._feedData = fallbackTracks;
  container.innerHTML = generateCardsHTML(containerId, fallbackTracks);

  try {
    const data = await fetchFromBackendProxy(query);
    const items = data.items || [];
    if (items.length > 0) {
      container._feedData = items.map((item) => ({
        id: item.id.videoId, title: item.snippet.title, channel: item.snippet.channelTitle,
        thumb: item.snippet.thumbnails?.high?.url || `https://img.youtube.com/vi/${item.id.videoId}/0.jpg`,
      }));
      container.innerHTML = generateCardsHTML(containerId, container._feedData);
    }
  } catch (err) { console.warn(`Keeping backup fallback tracks on screen for ${containerId}`); }
}

async function fetchFromBackendProxy(query) {
  const optimizedQuery = query + " official audio";
  const url = `${BACKEND_SEARCH_URL}?q=${encodeURIComponent(optimizedQuery)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Backend error");
  return await res.json();
}

window.playFeedTrack = function(containerId, index) {
  const container = document.getElementById(containerId);
  if (!container || !container._feedData) return;
  currentQueue = container._feedData;
  currentIndex = index;
  const track = currentQueue[index];
  playVideo(track.id, track.title, track.channel, track.thumb);
};

function escHtml(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

document.querySelectorAll(".quick-card").forEach(card => {
  card.addEventListener("click", () => {
    const query = card.dataset.query;
    if (searchInput) searchInput.value = query;
    if (searchClear) searchClear.classList.remove("hidden");
    showSection("search");
    searchYT(query);
  });
});

// ─── RUN SYSTEM ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  renderFavoritesList();

  const lastPlayedTrack = JSON.parse(localStorage.getItem('shinzi_last_played'));
  if (lastPlayedTrack) {
      document.getElementById('mainPlayerBar')?.classList.remove('hidden-player');
      updateNowPlaying(lastPlayedTrack.title, lastPlayedTrack.channel, lastPlayedTrack.thumb);
      currentQueue = [lastPlayedTrack];
      currentIndex = 0;
      checkIfFavorite();
  }

  await loadFeed("Top Hindi Songs", "madeForYou");
  await loadFeed("Trending Music India", "trendingRow");
  await loadFeed("Anime OST", "animeRow");
});
