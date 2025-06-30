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

// Authentication state management
class AuthManager {
    constructor() {
        this.user = null;
        this.userProfile = null;
        this.isAuthenticated = false;
        
        if (!supabase) {
            console.error('Supabase client not initialized');
            return;
        }
        
        this.init();
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
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.user = session.user;
            this.isAuthenticated = true;
            await this.loadUserProfile();
            this.onAuthStateChange();
        } else {
            // If no session, still update the UI to show login/signup buttons
            this.updateAuthUI();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                this.user = session.user;
                this.isAuthenticated = true;
                await this.loadUserProfile();
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.userProfile = null;
                this.isAuthenticated = false;
            }
            this.onAuthStateChange();
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
            document.getElementById('debugBtn')?.addEventListener('click', () => this.runDebugTests());
        }
    }

    async signUp(email, password, firstName, lastName) {
        try {
            console.log('Starting signup process for:', email);
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName
                    }
                }
            });
            
            console.log('Supabase auth response:', { data, error });
            
            if (error) {
                console.error('Supabase auth error:', error);
                console.error('Error message:', error.message);
                console.error('Error status:', error.status);
                
                // Check for ANY error message that indicates duplicate email
                const errorMsg = error.message.toLowerCase();
                if (errorMsg.includes('already') || 
                    errorMsg.includes('exists') || 
                    errorMsg.includes('registered') ||
                    errorMsg.includes('duplicate') ||
                    errorMsg.includes('user already registered')) {
                    return { 
                        success: false, 
                        message: 'An account with this email already exists. Please try logging in instead.',
                        errorType: 'duplicate_email'
                    };
                }
                
                // Return the actual error message from Supabase
                return { success: false, message: error.message };
            }
            
            // Check if user already exists (Supabase doesn't error, to prevent enumeration)
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                console.warn('Signup attempt for existing email:', email);
                return { 
                    success: false, 
                    message: 'An account with this email already exists. Please try logging in instead.',
                    errorType: 'duplicate_email'
                };
            }
            
            // Check if user was created successfully
            if (!data.user) {
                console.error('No user data returned from signup');
                return { success: false, message: 'Failed to create user account. Please try again.' };
            }
            
            console.log('User created successfully:', data.user.id);
            
            // DON'T create profile here - let it be created when user first logs in
            // This avoids the RLS policy issues during signup
            
            return { success: true, message: 'Check your email for verification link!' };
        } catch (error) {
            console.error('Signup error:', error);
            console.error('Error message:', error.message);
            
            // Check for ANY error message that indicates duplicate email
            const errorMsg = error.message.toLowerCase();
            if (errorMsg.includes('already') || 
                errorMsg.includes('exists') || 
                errorMsg.includes('registered') ||
                errorMsg.includes('duplicate') ||
                errorMsg.includes('user already registered')) {
                return { 
                    success: false, 
                    message: 'An account with this email already exists. Please try logging in instead.',
                    errorType: 'duplicate_email'
                };
            }
            
            // Return the actual error message
            return { success: false, message: error.message };
        }
    }

    async createUserProfile(userId, email, firstName, lastName) {
        try {
            console.log('Creating profile for user:', userId, 'with email:', email);
            
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
                    console.log('Duplicate key detected, trying to update profile...');
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
                    console.log('Profile updated successfully');
                    return true;
                } else {
                    console.error('Database error creating profile:', error.message);
                    return false;
                }
            }
            
            console.log('Profile created successfully:', data);
            return true;
        } catch (error) {
            console.error('Error creating/updating user profile:', error);
            console.error('Error message:', error.message);
            return false;
        }
    }

    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            if (error) {
                console.error('Login error:', error);
                
                // Handle specific error cases
                if (error.message.includes('Invalid login credentials')) {
                    return { success: false, message: 'Invalid email or password. Please try again.' };
                } else if (error.message.includes('Email not confirmed')) {
                    return { success: false, message: 'Please check your email and click the verification link before logging in.' };
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    return { success: false, message: 'Network error. Please check your connection and try again.' };
                } else {
                    return { success: false, message: `Login failed: ${error.message}` };
                }
            }
            
            if (!data.user) {
                return { success: false, message: 'Login failed. Please try again.' };
            }
            
            // Create user profile if it doesn't exist (first login)
            try {
                await this.createUserProfile(data.user.id, email, data.user.user_metadata?.first_name || '', data.user.user_metadata?.last_name || '');
            } catch (profileError) {
                console.error('Profile creation error during login:', profileError);
                // Don't fail login if profile creation fails
            }
            
            return { success: true, message: 'Login successful!' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: `Login failed: ${error.message}` };
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
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email
            });
            
            if (error) throw error;
            
            return { success: true, message: 'Verification email sent! Please check your inbox.' };
        } catch (error) {
            console.error('Resend verification error:', error);
            return { success: false, message: error.message };
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
        console.log('Form submitted for type:', type);
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');

        console.log('Form data:', { email, firstName, lastName, passwordLength: password?.length });

        // Validate all required fields for signup
        if (type === 'signup') {
            // Check if all required fields are filled
            if (!email || !email.trim()) {
                this.showMessage('Email is required', 'error');
                return;
            }
            if (!password || !password.trim()) {
                this.showMessage('Password is required', 'error');
                return;
            }
            if (!firstName || !firstName.trim()) {
                this.showMessage('First name is required', 'error');
                return;
            }
            if (!lastName || !lastName.trim()) {
                this.showMessage('Last name is required', 'error');
                return;
            }
            if (!confirmPassword || !confirmPassword.trim()) {
                this.showMessage('Please confirm your password', 'error');
                return;
            }
            
            // Validate password confirmation
            if (password !== confirmPassword) {
                this.showMessage('Passwords do not match', 'error');
                return;
            }
            if (password.length < 6) {
                this.showMessage('Password must be at least 6 characters long', 'error');
                return;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.showMessage('Please enter a valid email address', 'error');
                return;
            }
        } else if (type === 'login') {
            // Validate login fields
            if (!email || !email.trim()) {
                this.showMessage('Email is required', 'error');
                return;
            }
            if (!password || !password.trim()) {
                this.showMessage('Password is required', 'error');
                return;
            }
            
            // Validate email format for login
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.showMessage('Please enter a valid email address', 'error');
                return;
            }
        }

        const submitBtn = document.getElementById('authSubmitBtn');
        if (!submitBtn) {
            console.error('Submit button not found');
            return;
        }

        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Loading...';
        submitBtn.disabled = true;

        try {
            console.log('Calling auth method for type:', type);
            let result;
            if (type === 'signup') {
                result = await this.signUp(email, password, firstName, lastName);
            } else {
                result = await this.login(email, password);
            }

            console.log('Auth result:', result);

            if (result.success) {
                this.showMessage(result.message, 'success');
                if (type === 'login') {
                    document.getElementById('authModal').style.display = 'none';
                }
            } else {
                if (result.errorType === 'duplicate_email') {
                    // Show special popup for duplicate email
                    this.showDuplicateEmailPopup(email);
                } else {
                    this.showMessage(result.message, 'error');
                }
            }
        } catch (error) {
            console.error('Auth submission error:', error);
            this.showMessage('An unexpected error occurred. Please try again.', 'error');
        } finally {
            // Always re-enable the button
            console.log('Re-enabling submit button');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
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

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.textContent = message;
        
        const modal = document.getElementById('authModal') || document.getElementById('userProfileModal');
        modal.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
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
        if (!this.isAuthenticated) return;

        // Sync local storage data with new database structure
        const localVideos = JSON.parse(localStorage.getItem('dashboardVideos') || '[]');
        const localPlaylists = JSON.parse(localStorage.getItem('dashboardPlaylists') || '[]');
        const localTags = JSON.parse(localStorage.getItem('dashboardTags') || '[]');

        // Migrate local data to new structure
        for (const video of localVideos) {
            await this.saveVideo(video);
        }

        for (const playlist of localPlaylists) {
            await this.savePlaylist(playlist);
        }

        // Clear local storage after migration
        localStorage.removeItem('dashboardVideos');
        localStorage.removeItem('dashboardPlaylists');
        localStorage.removeItem('dashboardTags');

        // Refresh dashboard
        if (typeof renderDashboard === 'function') {
            renderDashboard();
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

    showDuplicateEmailPopup(email) {
        // Create a custom popup for duplicate email
        const popup = document.createElement('div');
        popup.className = 'duplicate-email-popup';
        popup.innerHTML = `
            <div class="duplicate-email-content">
                <div class="duplicate-email-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Email Already Registered</h3>
                    <button class="close-popup-btn" onclick="this.closest('.duplicate-email-popup').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="duplicate-email-body">
                    <p>An account with the email <strong>${email}</strong> already exists.</p>
                    <p>What would you like to do?</p>
                    <div class="duplicate-email-options">
                        <button class="option-btn login-option" onclick="this.closest('.duplicate-email-popup').remove(); window.authManager.showAuthModal('login');">
                            <i class="fas fa-sign-in-alt"></i>
                            Login to Existing Account
                        </button>
                        <button class="option-btn reset-option" onclick="this.closest('.duplicate-email-popup').remove(); window.authManager.showResetPasswordModal('${email}');">
                            <i class="fas fa-key"></i>
                            Reset Password
                        </button>
                        <button class="option-btn cancel-option" onclick="this.closest('.duplicate-email-popup').remove();">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(popup);
        
        // Close on outside click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
    }

    showResetPasswordModal(email) {
        // Create a simple reset password modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content auth-modal-content">
                <div class="auth-header">
                    <h2>Reset Password</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="auth-form">
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" value="${email}" readonly style="background: #f8f9fa;">
                    </div>
                    <div class="form-actions">
                        <button class="auth-submit-btn" onclick="window.authManager.sendResetPassword('${email}', this)">
                            Send Reset Link
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async sendResetPassword(email, button) {
        try {
            button.textContent = 'Sending...';
            button.disabled = true;
            
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            
            if (error) throw error;
            
            this.showMessage('Password reset link sent! Check your email.', 'success');
            button.closest('.modal').remove();
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            button.textContent = 'Send Reset Link';
            button.disabled = false;
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
            
            console.log('Database connection test successful');
            return true;
        } catch (error) {
            console.error('Database connection test error:', error);
            return false;
        }
    }

    // Test function to debug signup issues
    async debugSignup(email, password, firstName, lastName) {
        console.log('=== DEBUG SIGNUP START ===');
        console.log('Testing with:', { email, firstName, lastName, passwordLength: password?.length });
        
        // Test database connection first
        const dbConnected = await this.testDatabaseConnection();
        console.log('Database connected:', dbConnected);
        
        if (!dbConnected) {
            console.error('Database connection failed - cannot proceed with signup');
            return;
        }
        
        // Test the signup process
        const result = await this.signUp(email, password, firstName, lastName);
        console.log('Signup result:', result);
        console.log('=== DEBUG SIGNUP END ===');
        
        return result;
    }

    // Run comprehensive debug tests
    async runDebugTests() {
        console.log('=== RUNNING DEBUG TESTS ===');
        
        // Test 1: Database connection
        console.log('Test 1: Database Connection');
        const dbConnected = await this.testDatabaseConnection();
        console.log('Database connected:', dbConnected);
        
        // Test 2: Try signup with existing email
        console.log('\nTest 2: Signup with existing email');
        const existingResult = await this.debugSignup('test@example.com', 'password123', 'Test', 'User');
        console.log('Existing email result:', existingResult);
        
        // Test 3: Try signup with new email
        console.log('\nTest 3: Signup with new email');
        const timestamp = Date.now();
        const newEmail = `test${timestamp}@example.com`;
        const newResult = await this.debugSignup(newEmail, 'password123', 'Test', 'User');
        console.log('New email result:', newResult);
        
        console.log('=== DEBUG TESTS COMPLETE ===');
        
        // Show results in UI
        this.showMessage(`Debug tests complete. Check console for details.`, 'success');
    }
}

// Export for use in other files
window.AuthManager = AuthManager;
window.supabase = supabase; 