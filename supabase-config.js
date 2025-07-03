// Supabase Configuration
const SUPABASE_URL = 'https://qsietaeyjivcqtrklxeq.supabase.co'; // User's Supabase project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzaWV0YWV5aml2Y3F0cmtseGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMTg0NzAsImV4cCI6MjA2Njg5NDQ3MH0.2REfgVUjpkT0pv6dYiTUDvKFKA1VJiOaHLPPAj7vH_I'; // User's Supabase anon key

// Initialize Supabase client
let supabase;
try {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error('Supabase library not loaded');
    }
} catch (error) {
    console.error('Error initializing Supabase:', error);
}

// Ensure there is only ever one instance of the AuthManager.
let authManagerInstance = null;

// Authentication state management
class AuthManager {
    constructor() {
        if (authManagerInstance) {
            return authManagerInstance;
        }

        this.user = null;
        this.userProfile = null;
        this.isAuthenticated = false;
        
        if (!supabase) {
            console.error('Supabase client not initialized');
            return;
        }
        
        this.init();
        authManagerInstance = this;
    }

    async init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initAuth());
        } else {
            this.initAuth();
        }
    }
    
    async initAuth() {
        // Check for existing session on page load
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.user = session.user;
            this.isAuthenticated = true;
            await this.loadUserProfile();
            this.onAuthStateChange(); // This syncs data and UI
        } else {
            // If no session, still update the UI to show login/signup buttons
            this.updateAuthUI();
        }

        // This listener now ONLY handles background changes, NOT the initial login flow,
        // which is now handled synchronously by the login() function.
        supabase.auth.onAuthStateChange(async (event, session) => {
            // The initial SIGNED_IN is handled by the robust login() function to prevent race conditions.
            // This listener only reacts to external events like logout or token refreshes.
            if (event === 'SIGNED_OUT') {
                this.user = null;
                this.userProfile = null;
                this.isAuthenticated = false;
                this.onAuthStateChange();
            } else if (event === 'USER_UPDATED') {
                // This handles cases where user data changes in another tab or a token is refreshed.
                this.user = session.user;
                await this.loadUserProfile();
                this.onAuthStateChange();
            }
        });
    }

    async loadUserProfile() {
        if (!this.user) return;
        
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', this.user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error loading user profile:', error);
                return;
            }
            
            this.userProfile = data;
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    onAuthStateChange() {
        // Update UI based on auth state
        this.updateAuthUI();
        // Sync data with user
        this.syncUserData();
    }

    updateAuthUI() {
        // Update UI based on auth state
        const authContainer = document.querySelector('.topbar-auth');
        if (!authContainer) return;

        if (this.isAuthenticated) {
            const firstName = this.userProfile?.first_name || this.user?.email?.split('@')[0] || 'User';
            const premiumBadge = this.userProfile?.is_premium ? 
                `<span class="premium-badge">${this.userProfile.premium_tier}</span>` : '';
            
            authContainer.innerHTML = `
                <button class="user-profile-btn" id="userProfileBtn" title="Account Settings">
                    <i class="fas fa-user"></i>
                    <span>${firstName}</span>
                </button>
                <button class="logout-btn" id="logoutBtn" title="Logout">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                </button>
                ${premiumBadge}
            `;
            
            // Add event listener for user profile button
            document.getElementById('userProfileBtn')?.addEventListener('click', () => this.showUserProfileModal());
            
            // Add event listener for logout button
            document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        } else {
            authContainer.innerHTML = `
                <button class="topbar-btn" id="signUpBtn">Sign Up</button>
                <button class="topbar-btn" id="loginBtn">Login</button>
            `;
            document.getElementById('signUpBtn')?.addEventListener('click', () => this.showAuthModal('signup'));
            document.getElementById('loginBtn')?.addEventListener('click', () => this.showAuthModal('login'));
        }
    }

    async signUp(email, password, firstName, lastName) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { first_name: firstName, last_name: lastName }
                }
            });

            if (error) {
                // This is the most reliable way to check for a duplicate user.
                if (error.message.toLowerCase().includes('user already registered')) {
                    return { success: false, message: 'An account with this email already exists.', errorType: 'duplicate_email' };
                }
                // For any other error (including SMTP issues), report it as a generic failure.
                // This prevents the UI from giving misleading success messages.
                return { success: false, message: 'Could not complete signup. Please check your details and try again.' };
            }

            // If there's no error, and we have a user, it's a success.
            if (data.user) {
                 return { success: true, message: 'Check your email for a verification link!' };
            }

            return { success: false, message: 'An unknown error occurred during signup.' };

        } catch (e) {
            console.error('Catastrophic signup error:', e);
            return { success: false, message: 'An unexpected error occurred.' };
        }
    }

    async createUserProfile(userId, email, firstName, lastName) {
        try {

            
            const { data, error } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: userId,
                    email: email,
                    first_name: firstName,
                    last_name: lastName
                })
                .select();
            
            if (error) {
                console.error('Error creating user profile:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                
                // If it's a duplicate key error, try to update instead
                if (error.code === '23505') { // Unique violation
    
                    const { error: updateError } = await supabase
                        .from('user_profiles')
                        .update({
                            first_name: firstName,
                            last_name: lastName
                        })
                        .eq('user_id', userId);
                    
                    if (updateError) {
                        console.error('Error updating user profile:', updateError);
                        return false;
                    }

                    return true;
                } else {
                    console.error('Database error creating profile:', error.message);
                    return false;
                }
            }
            

            return true;
        } catch (error) {
            console.error('Error creating/updating user profile:', error);
            console.error('Error message:', error.message);
            return false;
        }
    }

    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                const msg = error.message.toLowerCase();
                if (msg.includes('invalid login credentials')) return { success: false, message: 'Incorrect email or password.' };
                if (msg.includes('email not confirmed')) return { success: false, message: 'Please verify your email first.', errorType: 'unverified_email' };
                return { success: false, message: error.message };
            }

            if (data.user) {

                // This is the critical synchronous flow.
                this.user = data.user;
                this.isAuthenticated = true;
                await this.loadUserProfile();
                this.onAuthStateChange(); // This calls updateAuthUI() AND syncUserData()
                

                return { success: true };
            }
            return { success: false, message: 'An unknown error occurred.' };
        } catch (error) {
            console.error('Catastrophic login error:', error);
            return { success: false, message: 'An unexpected error occurred.' };
        }
    }

    async logout() {
        try {
            // Show loading state
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                const originalText = logoutBtn.innerHTML;
                logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
                logoutBtn.disabled = true;
            }

            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            // Show success message
            this.showMessage('Logged out successfully!', 'success');
            
            // Clear local storage
            localStorage.clear();
            
            // Wait a moment for the message to be seen, then reload
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Error logging out. Please try again.', 'error');
            
            // Re-enable logout button if there was an error
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            }
        }
    }

    async resendVerification(email) {
        const submitBtn = document.getElementById('resendVerificationBtn');
        if (!submitBtn) return;
        
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending...';
        
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email
            });

            if (error) {
                this.showMessage(error.message, 'error');
            } else {
                this.showMessage('Verification email sent!', 'success');
            }
        } catch (error) {
            console.error('Resend error:', error);
            this.showMessage('An unexpected error occurred.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    showAuthModal(type) {
        const modal = document.getElementById('authModal');
        const modalTitle = document.getElementById('authModalTitle');
        const authForm = document.getElementById('authForm');
        const submitBtn = document.getElementById('authSubmitBtn');
        const switchBtn = document.getElementById('authSwitchBtn');
        const resendVerificationBtn = document.getElementById('resendVerificationBtn');
        const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
        const confirmPasswordInput = document.getElementById('authConfirmPassword');
        const firstNameGroup = document.getElementById('firstNameGroup');
        const lastNameGroup = document.getElementById('lastNameGroup');
        const firstNameInput = document.getElementById('authFirstName');
        const lastNameInput = document.getElementById('authLastName');

        if (type === 'signup') {
            modalTitle.textContent = 'Sign Up';
            submitBtn.textContent = 'Sign Up';
            switchBtn.textContent = 'Already have an account? Login';
            switchBtn.onclick = () => this.showAuthModal('login');
            resendVerificationBtn.style.display = 'none';
            // Show all fields for signup
            firstNameGroup.style.display = 'block';
            lastNameGroup.style.display = 'block';
            confirmPasswordGroup.style.display = 'block';
            firstNameInput.required = true;
            lastNameInput.required = true;
            confirmPasswordInput.required = true;
        } else {
            modalTitle.textContent = 'Login';
            submitBtn.textContent = 'Login';
            switchBtn.textContent = "Don't have an account? Sign Up";
            switchBtn.onclick = () => this.showAuthModal('signup');
            resendVerificationBtn.style.display = 'block';
            // Hide name fields for login
            firstNameGroup.style.display = 'none';
            lastNameGroup.style.display = 'none';
            confirmPasswordGroup.style.display = 'none';
            firstNameInput.required = false;
            lastNameInput.required = false;
            confirmPasswordInput.required = false;
            
            // Add event listener for resend verification
            resendVerificationBtn.onclick = async () => {
                const email = document.getElementById('authEmail').value;
                if (!email) {
                    this.showMessage('Please enter your email address first', 'error');
                    return;
                }
                
                const result = await this.resendVerification(email);
                this.showMessage(result.message, result.success ? 'success' : 'error');
            };
        }

        modal.style.display = 'flex';
        authForm.onsubmit = (e) => this.handleAuthSubmit(e, type);
    }

    showUserProfileModal() {
        const modal = document.getElementById('userProfileModal');
        const form = document.getElementById('userProfileForm');
        
        // Populate form with current user data
        document.getElementById('profileFirstName').value = this.userProfile?.first_name || '';
        document.getElementById('profileLastName').value = this.userProfile?.last_name || '';
        document.getElementById('profileEmail').value = this.user?.email || '';
        
        modal.style.display = 'flex';
        
        // Handle form submission
        form.onsubmit = (e) => this.handleProfileSubmit(e);
        
        // Handle logout button
        document.getElementById('profileLogoutBtn').onclick = () => this.logout();
    }

    async handleAuthSubmit(e, type) {
        e.preventDefault();
        const submitBtn = document.getElementById('authSubmitBtn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        submitBtn.disabled = true;

        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            let result;
            if (type === 'signup') {
                const firstName = formData.get('firstName');
                const lastName = formData.get('lastName');
                const confirmPassword = formData.get('confirmPassword');
                if (password !== confirmPassword) {
                    this.showMessage('Passwords do not match.', 'error');
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                    return;
                }
                result = await this.signUp(email, password, firstName, lastName);
            } else {
                result = await this.login(email, password);
            }

            if (result.success) {
                if (type === 'signup') {
                    this.showMessage(result.message, 'success');
                }
                document.getElementById('authModal').style.display = 'none';
            } else {
                if (result.errorType === 'duplicate_email') {
                    this.showMessage(result.message, 'error');
                    this.showAuthModal('login');
                    const authEmailInput = document.getElementById('authEmail');
                    if (authEmailInput) {
                        authEmailInput.value = email;
                    }
                } else if (result.errorType === 'unverified_email') {
                    this.showMessage(result.message, 'error');
                    const resendBtn = document.getElementById('resendVerificationBtn');
                    if(resendBtn) resendBtn.style.display = 'block';
                } else {
                    this.showMessage(result.message, 'error');
                }
            }
        } catch (error) {
            console.error('Auth submission error:', error);
            this.showMessage('An unexpected error occurred.', 'error');
        } finally {
            if (type !== 'signup' || document.getElementById('authModalTitle').textContent !== 'Login') {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        }
    }

    async handleProfileSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        const submitBtn = document.getElementById('profileSubmitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            // Update user profile
            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({
                    first_name: firstName,
                    last_name: lastName
                })
                .eq('user_id', this.user.id);

            if (profileError) throw profileError;

            // Update password if provided
            if (newPassword && newPassword.trim()) {
                if (newPassword !== confirmPassword) {
                    this.showMessage('New passwords do not match', 'error');
                    return;
                }
                if (newPassword.length < 6) {
                    this.showMessage('New password must be at least 6 characters long', 'error');
                    return;
                }

                const { error: passwordError } = await supabase.auth.updateUser({
                    password: newPassword
                });

                if (passwordError) throw passwordError;
            }

            // Reload user profile
            await this.loadUserProfile();
            this.updateAuthUI();

            this.showMessage('Profile updated successfully!', 'success');
            document.getElementById('userProfileModal').style.display = 'none';

        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    showMessage(message, type = 'info') {
        const event = new CustomEvent('authMessage', {
            detail: { message, type }
        });
        document.dispatchEvent(event);
    }

    // Video Management
    async saveVideo(videoData) {
        if (!this.isAuthenticated) return null;
        
        try {
            const { data, error } = await supabase
                .from('videos')
                .upsert({
                    user_id: this.user.id,
                    video_id: videoData.videoId,
                    title: videoData.title,
                    description: videoData.description,
                    channel_name: videoData.channel,
                    channel_id: videoData.channelId,
                    duration: videoData.duration,
                    thumbnail_url: videoData.thumbnail,
                    tags: videoData.tags || []
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving video:', error);
            return null;
        }
    }

    async getVideos() {
        if (!this.isAuthenticated) return [];
        
        try {
            const { data, error } = await supabase
                .from('videos')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading videos:', error);
            return [];
        }
    }

    // Note Management
    async saveNote(noteData) {
        if (!this.isAuthenticated) return null;
        
        try {
            const { data, error } = await supabase
                .from('notes')
                .insert({
                    user_id: this.user.id,
                    video_id: noteData.videoId,
                    title: noteData.title,
                    content: noteData.content,
                    timestamp: noteData.timestamp,
                    timestamp_seconds: noteData.timestampSeconds,
                    tags: noteData.tags || [],
                    color: noteData.color
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving note:', error);
            return null;
        }
    }

    async getNotes(videoId = null) {
        if (!this.isAuthenticated) return [];
        
        try {
            let query = supabase
                .from('notes')
                .select('*')
                .eq('user_id', this.user.id);
            
            if (videoId) {
                query = query.eq('video_id', videoId);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading notes:', error);
            return [];
        }
    }

    // Playlist Management
    async savePlaylist(playlistData) {
        if (!this.isAuthenticated) return null;
        
        try {
            const { data, error } = await supabase
                .from('playlists')
                .insert({
                    user_id: this.user.id,
                    name: playlistData.name,
                    description: playlistData.description,
                    is_public: playlistData.isPublic || false
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving playlist:', error);
            return null;
        }
    }

    async getPlaylists() {
        if (!this.isAuthenticated) return [];
        
        try {
            const { data, error } = await supabase
                .from('playlists')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading playlists:', error);
            return [];
        }
    }

    // Sharing functionality
    async createShareLink(resourceType, resourceId, options = {}) {
        if (!this.isAuthenticated) return null;
        
        try {
            const { data, error } = await supabase
                .from('shared_links')
                .insert({
                    user_id: this.user.id,
                    share_token: this.generateShareToken(),
                    title: options.title,
                    description: options.description,
                    type: resourceType,
                    resource_id: resourceId,
                    resource_type: resourceType,
                    is_public: options.isPublic !== false,
                    expires_at: options.expiresAt,
                    allow_comments: options.allowComments || false,
                    allow_duplication: options.allowDuplication || false
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating share link:', error);
            return null;
        }
    }

    generateShareToken() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Premium feature checks
    hasPremiumFeature(featureName) {
        if (!this.userProfile) return false;
        
        // Free tier limitations
        if (!this.userProfile.is_premium) {
            const freeLimits = {
                'unlimited_notes': false,
                'advanced_export': false,
                'collaboration': false,
                'analytics': false,
                'custom_tags': false,
                'priority_support': false,
                'api_access': false,
                'team_management': false
            };
            return freeLimits[featureName] || false;
        }
        
        return true;
    }

    // Legacy sync methods for backward compatibility
    async syncUserData() {
        if (!this.user) return;
        try {

            const videos = await this.getVideos();
            const playlists = await this.getPlaylists();
            
            // Dispatch a custom event with the fetched data so the UI can update
            const event = new CustomEvent('userDataReady', { 
                detail: { videos, playlists } 
            });
            document.dispatchEvent(event);


        } catch (error) {
            console.error('Error syncing user data:', error);
        }
    }

    // Activity tracking
    async trackActivity(activityType, resourceId = null, resourceType = null, metadata = {}) {
        if (!this.isAuthenticated) return;
        
        try {
            await supabase
                .from('user_activity')
                .insert({
                    user_id: this.user.id,
                    activity_type: activityType,
                    resource_id: resourceId,
                    resource_type: resourceType,
                    metadata: metadata
                });
        } catch (error) {
            console.error('Error tracking activity:', error);
        }
    }

    // Test database connection
    async testDatabaseConnection() {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('count')
                .limit(1);
            
            if (error) {
                console.error('Database connection test failed:', error);
                return false;
            }
            

            return true;
        } catch (error) {
            console.error('Database connection test error:', error);
            return false;
        }
    }

    // ================================================================================================
    // YOUTUBE DATA API
    // ================================================================================================
    
    // API Key for YouTube Data API v3
    apiKey = 'AIzaSyBrj1ZEzZoRoyvOEkkUHMt3awRVebVuZ0g'; // Replace with your actual key if needed

    async fetchYouTubeVideoInfo(videoId) {
        if (!this.apiKey) {
            console.warn('YouTube API key not set. Returning basic info.');
            return {
                title: 'Title unavailable (API key needed)',
                channel: 'Channel unavailable (API key needed)',
                description: '',
                duration: '00:00',
                thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
            };
        }

        const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${this.apiKey}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error('YouTube API Error:', response.status, await response.text());
                return null;
            }
            const data = await response.json();
            if (!data.items || data.items.length === 0) {
                return null;
            }
            const item = data.items[0];
            return {
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                description: item.snippet.description,
                duration: this.parseYouTubeDuration(item.contentDetails.duration),
                thumbnail: item.snippet.thumbnails.medium.url,
                publishedAt: item.snippet.publishedAt
            };
        } catch (error) {
            console.error('Error fetching video info:', error);
            return null;
        }
    }

    parseYouTubeDuration(ytDuration) {
        const match = ytDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = (parseInt(match[1], 10) || 0);
        const minutes = (parseInt(match[2], 10) || 0);
        const seconds = (parseInt(match[3], 10) || 0);
        let duration = '';
        if (hours > 0) {
            duration += `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            duration += `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return duration;
    }
}

// Export for use in other files
window.AuthManager = AuthManager;
window.supabase = supabase; 