// Dashboard State
const DASHBOARD_STORAGE_KEY = 'dashboardVideos';
const PLAYLISTS_STORAGE_KEY = 'dashboardPlaylists';
const TAGS_STORAGE_KEY = 'dashboardTags';

let videos = JSON.parse(localStorage.getItem(DASHBOARD_STORAGE_KEY)) || [];
let playlists = JSON.parse(localStorage.getItem(PLAYLISTS_STORAGE_KEY)) || [];
let tags = JSON.parse(localStorage.getItem(TAGS_STORAGE_KEY)) || [];

const videosGrid = document.getElementById('videosGrid');
const playlistsContainer = document.getElementById('playlistsContainer');
const dashboardSearchInput = document.getElementById('dashboardSearchInput');
const createNoteBtn = document.getElementById('createNoteBtn');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const sidebarVideosBtn = document.getElementById('sidebarVideosBtn');
const sidebarSettingsBtn = document.getElementById('sidebarSettingsBtn');
const dashboardSettingsSection = document.getElementById('dashboardSettingsSection');
const dashboardContent = document.querySelector('.dashboard-content');

// Modal logic for Create New Note
const createNoteModal = document.getElementById('createNoteModal');
const modalMasterTitle = document.getElementById('modalMasterTitle');
const modalVideoUrl = document.getElementById('modalVideoUrl');
const modalCreateBtn = document.getElementById('modalCreateBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

// Authentication
let authManager;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AuthManager
    authManager = new AuthManager();
    
    // Add event listeners to existing auth buttons
    setupAuthButtonListeners();
    
    // Add event listeners for modals
    setupModalEventListeners();
    
    // Listen for the custom event from AuthManager to load user's data
    document.addEventListener('userDataReady', (e) => {
        console.log('Event userDataReady received by dashboard.');
        if (e.detail) {
            // Overwrite local arrays with fresh data from the database
            videos = e.detail.videos || [];
            playlists = e.detail.playlists || [];

            // Clear legacy local storage to prevent using stale data on next load
            localStorage.removeItem(DASHBOARD_STORAGE_KEY);
            localStorage.removeItem(PLAYLISTS_STORAGE_KEY);
            
            console.log('Dashboard data updated from event:', { videos, playlists });
            
            // Render the dashboard with the new, correct data
            renderDashboard();
        }
    });

    // Fallback for when the page loads and user is already logged in,
    // but the event fires before this listener is attached.
    if (authManager && authManager.isAuthenticated) {
        authManager.syncUserData();
    }
    
    // Listen for UI messages from the AuthManager
    document.addEventListener('authMessage', (e) => {
        if (e.detail) {
            showMessage(e.detail.message, e.detail.type);
        }
    });
});

function setupAuthButtonListeners() {
    // Add event listeners to the existing Sign Up and Login buttons
    const signUpBtn = document.getElementById('signUpBtn');
    const loginBtn = document.getElementById('loginBtn');
    
    if (signUpBtn) {
        signUpBtn.addEventListener('click', () => {
            if (authManager) {
                authManager.showAuthModal('signup');
            }
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (authManager) {
                authManager.showAuthModal('login');
            }
        });
    }
}

function setupModalEventListeners() {
    // Close auth modal
    document.getElementById('closeAuthModal')?.addEventListener('click', () => {
        document.getElementById('authModal').style.display = 'none';
    });
    
    // Close user profile modal
    document.getElementById('closeUserProfileModal')?.addEventListener('click', () => {
        document.getElementById('userProfileModal').style.display = 'none';
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const authModal = document.getElementById('authModal');
        const userProfileModal = document.getElementById('userProfileModal');
        
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
        if (e.target === userProfileModal) {
            userProfileModal.style.display = 'none';
        }
    });
}

// --- Navigation ---
sidebarVideosBtn.addEventListener('click', () => {
    sidebarVideosBtn.classList.add('active');
    sidebarSettingsBtn.classList.remove('active');
    dashboardContent.style.display = '';
    dashboardSettingsSection.style.display = 'none';
});
sidebarSettingsBtn.addEventListener('click', () => {
    sidebarSettingsBtn.classList.add('active');
    sidebarVideosBtn.classList.remove('active');
    dashboardContent.style.display = 'none';
    dashboardSettingsSection.style.display = '';
});

// --- Render Functions ---
function renderDashboard() {
    renderVideos();
    renderPlaylists();
    updateSettingsUserInfo();
}

function updateSettingsUserInfo() {
    const userEmail = document.getElementById('userEmail');
    if (userEmail && authManager && authManager.user) {
        userEmail.textContent = authManager.user.email;
    }
}

function renderVideos(filter = '', playlistId = null) {
    videosGrid.innerHTML = '';
    let filtered = videos;
    if (playlistId) {
        const playlist = playlists.find(pl => pl.id === playlistId);
        if (playlist) {
            filtered = videos.filter(v => playlist.videoIds.includes(v.videoId));
        }
    }
    if (filter) {
        const q = filter.toLowerCase();
        filtered = filtered.filter(video =>
            (video.title && video.title.toLowerCase().includes(q)) ||
            (video.channel && video.channel.toLowerCase().includes(q)) ||
            (video.tags && video.tags.some(tag => tag.toLowerCase().includes(q)))
        );
    }
    filtered.forEach(video => {
        const box = createVideoBox(video);
        videosGrid.appendChild(box);
    });
}

function renderPlaylists() {
    playlistsContainer.innerHTML = '';
    playlists.forEach((playlist, idx) => {
        const plBox = document.createElement('div');
        plBox.className = 'playlist-box';
        plBox.setAttribute('data-playlist-id', playlist.id);
        plBox.innerHTML = `
            <div class="playlist-title playlist-folder" tabindex="0"><i class="fas fa-folder"></i> ${playlist.title}</div>
        `;
        playlistsContainer.appendChild(plBox);
        // Make playlist droppable
        plBox.ondragover = e => { e.preventDefault(); plBox.style.background = '#f6c7be'; };
        plBox.ondragleave = e => { plBox.style.background = '#fff'; };
        plBox.ondrop = e => {
            e.preventDefault();
            plBox.style.background = '#fff';
            const videoId = e.dataTransfer.getData('videoId');
            if (!playlist.videoIds.includes(videoId)) {
                playlist.videoIds.push(videoId);
                savePlaylists();
                renderPlaylists();
            }
        };
        // Double-click to open/close playlist
        const folderTitle = plBox.querySelector('.playlist-title');
        folderTitle.ondblclick = () => {
            if (plBox.classList.contains('open')) {
                plBox.classList.remove('open');
                renderVideos();
            } else {
                plBox.classList.add('open');
                renderVideos('', playlist.id);
            }
        };
    });
}

function createVideoBox(video) {
    const box = document.createElement('div');
    box.className = 'video-box';
    box.setAttribute('draggable', true);
    box.setAttribute('data-video-id', video.videoId);
    box.innerHTML = `
        <img class="video-thumb" src="${video.thumbnail}" alt="Thumbnail">
        <div class="video-title">${video.title}</div>
        <div class="video-meta">
            <span><i class="fas fa-user"></i> ${video.channel}</span>
            <span><i class="fas fa-clock"></i> ${video.duration}</span>
        </div>
        <div class="video-tags">
            ${(video.tags || []).map(tag => `<span class="tag-chip">${tag}</span>`).join('')}
        </div>
        <button class="video-delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
    `;
    // Drag
    box.ondragstart = e => {
        e.dataTransfer.setData('videoId', video.videoId);
    };
    // Click to open note editor
    box.addEventListener('click', e => {
        if (e.target.closest('.video-delete-btn')) return;
        localStorage.setItem('dashboardSelectedVideoId', video.videoId);
        window.location.href = 'note.html';
    });
    // Delete
    box.querySelector('.video-delete-btn').onclick = e => {
        e.stopPropagation();
        if (confirm('Delete this video and all its notes?')) {
            videos = videos.filter(v => v.videoId !== video.videoId);
            playlists.forEach(pl => {
                pl.videoIds = pl.videoIds.filter(id => id !== video.videoId);
            });
            saveVideos();
            savePlaylists();
            renderDashboard();
        }
    };
    // Tag click (filter)
    box.querySelectorAll('.tag-chip').forEach(tagChip => {
        tagChip.onclick = e => {
            e.stopPropagation();
            dashboardSearchInput.value = tagChip.textContent;
            renderVideos(tagChip.textContent);
        };
    });
    return box;
}

// --- Search ---
dashboardSearchInput.addEventListener('input', e => {
    renderVideos(e.target.value);
});

// --- Create New Note ---
if (createNoteBtn) {
    createNoteBtn.addEventListener('click', () => {
        // Check if user is authenticated
        if (authManager && !authManager.isAuthenticated) {
            alert('Please login to create notes');
            authManager.showAuthModal('login');
            return;
        }
        
        modalMasterTitle.value = '';
        modalVideoUrl.value = '';
        createNoteModal.style.display = 'flex';
        setTimeout(() => modalMasterTitle.focus(), 100);
    });
}
if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', () => {
        createNoteModal.style.display = 'none';
    });
}
if (modalCreateBtn) {
    modalCreateBtn.addEventListener('click', async () => {
        const url = modalVideoUrl.value.trim();
        const title = modalMasterTitle.value.trim();
        if (!url || !title) {
            alert('Please enter both a title and a valid YouTube URL.');
            return;
        }

        const videoId = extractYouTubeVideoId(url);
        if (!videoId) {
            alert('Invalid YouTube URL. Please enter a valid video URL.');
            return;
        }

        // Use the AuthManager to fetch real video info
        const videoInfo = await authManager.fetchYouTubeVideoInfo(videoId);
        if (!videoInfo) {
            alert('Could not fetch video information. Please check the URL and try again.');
            return;
        }
        
        const videoData = {
            master_title: title,
            video_id: videoId,
            title: videoInfo.title,
            channel_name: videoInfo.channel,
            duration: videoInfo.duration,
            thumbnail_url: videoInfo.thumbnail,
            published_at: videoInfo.publishedAt,
            url: url
        };
        
        // Use AuthManager to save the video, which handles DB operations
        const { success, error } = await authManager.saveVideo(videoData);
        
        if (success) {
            // Prepare a pending note for the note editor page
            localStorage.setItem('pendingNote', JSON.stringify({
                url: url,
                title: title,
                videoId: videoId
            }));
            
            // Redirect to the note editor page
            window.location.href = 'note.html';
        } else {
            alert(`Error: ${error.message}`);
        }
        
        createNoteModal.style.display = 'none';
    });
}
// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === createNoteModal) {
        createNoteModal.style.display = 'none';
    }
});

// --- Create Playlist ---
createPlaylistBtn.addEventListener('click', () => {
    // Check if user is authenticated
    if (authManager && !authManager.isAuthenticated) {
        alert('Please login to create playlists');
        authManager.showAuthModal('login');
        return;
    }
    
    const title = prompt('Enter playlist name:');
    if (title && title.trim()) {
        playlists.push({ id: 'pl_' + Date.now(), title: title.trim(), videoIds: [] });
        savePlaylists();
        renderPlaylists();
    }
});

// --- Tag Management ---
function addTagToVideo(videoId, tag) {
    const video = videos.find(v => v.videoId === videoId);
    if (!video) return;
    if (!video.tags) video.tags = [];
    if (!video.tags.includes(tag)) video.tags.push(tag);
    saveVideos();
    renderDashboard();
}

// --- Save Helpers ---
function saveVideos() {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(videos));
    // Sync with Supabase if authenticated
    if (authManager && authManager.isAuthenticated) {
        authManager.uploadUserData('videos', videos);
    }
}
function savePlaylists() {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
    // Sync with Supabase if authenticated
    if (authManager && authManager.isAuthenticated) {
        authManager.uploadUserData('playlists', playlists);
    }
}
function saveTags() {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
    // Sync with Supabase if authenticated
    if (authManager && authManager.isAuthenticated) {
        authManager.uploadUserData('tags', tags);
    }
}

// --- YouTube Helpers ---
function extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// --- Initial Render ---
function initializeDashboard() {
    // Wait for auth to initialize before rendering
    setTimeout(() => {
        renderDashboard();
    }, 100);
}

function showMessage(message, type = 'success') {
    const messageContainer = document.createElement('div');
    messageContainer.className = `auth-message ${type}`;
    messageContainer.textContent = message;
    
    // Prepend to the main dashboard area
    const container = document.querySelector('.dashboard-main');
    if (container) {
        container.insertBefore(messageContainer, container.firstChild);
        // Add animation class
        setTimeout(() => messageContainer.classList.add('visible'), 10);
    }

    // Remove after a few seconds
    setTimeout(() => {
        messageContainer.classList.remove('visible');
        setTimeout(() => messageContainer.remove(), 500);
    }, 4000);
}