import { supabase } from './supabaseClient.js';

// Always returns the current Supabase auth user object
async function getCurrentUser() {
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            console.log('[getCurrentUser] error:', error);
            return null;
        }
        return data.user;
    } catch (error) {
        console.log('[getCurrentUser] unexpected error:', error);
        return null;
    }
}

// Sign up user, store full_name in user_metadata, redirect to profile-setup.html
async function signUpUser(email, password, full_name) {
    try {
        // Use full_name as username for initial signup
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name, username: full_name }
            }
        });
        console.log('[signUpUser] result:', { data, error });
        if (error) {
            return { success: false, error: error.message };
        }
        // Redirect after signup
        window.location.href = 'profile-setup.html';
        return { success: true, user: data.user };
    } catch (error) {
        console.log('[signUpUser] unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Sign in user, redirect to profile.html
async function signInUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        console.log('[signInUser] result:', { data, error });
        if (error) {
            return { success: false, error: error.message };
        }
        window.location.href = 'profile.html';
        return { success: true, user: data.user };
    } catch (error) {
        console.log('[signInUser] unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Sign out user, redirect to index.html
async function signOutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        console.log('[signOutUser] result:', { error });
        if (error) {
            return { success: false, error: error.message };
        }
        window.location.href = 'index.html';
        return { success: true };
    } catch (error) {
        console.log('[signOutUser] unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Listen for auth state changes and update UI
function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}

// Dynamic navbar UI based on auth state
function setupAuthUI() {
    const userActions = document.querySelector('.user-actions');
    if (!userActions) return;
    getCurrentUser().then(user => {
        userActions.innerHTML = '';
        if (!user) {
            // Logged out: show Log In and Sign Up
            userActions.innerHTML = `
                <a href="login.html">
                    <button class="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-medium flex items-center">
                        <i data-lucide="user" class="w-4 h-4 mr-2"></i> Log In
                    </button>
                </a>
                <a href="signup.html">
                    <button class="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-medium flex items-center">
                        <i data-lucide="user-plus" class="w-4 h-4 mr-2"></i> Sign Up
                    </button>
                </a>
            `;
        } else {
            // Logged in: show Sell, Wishlist, Profile, Logout
            const username = user.user_metadata?.username || user.user_metadata?.full_name || 'User';
            userActions.innerHTML = `
                <a href="create-listing.html">
                    <button class="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-medium flex items-center">
                        <i data-lucide="plus-circle" class="w-4 h-4 mr-2"></i> Sell
                    </button>
                </a>
                <a href="wishlist.html">
                    <button class="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-medium flex items-center">
                        <i data-lucide="heart" class="w-4 h-4 mr-2"></i> Wishlist
                    </button>
                </a>
                <a href="profile.html">
                    <button class="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-medium flex items-center">
                        <span id="nav-username" class="mr-2">${username}</span>
                        <i data-lucide="user" class="w-4 h-4"></i>
                    </button>
                </a>
                <button id="logout-btn" class="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-medium flex items-center">
                    <i data-lucide="log-out" class="w-4 h-4 mr-2"></i> Logout
                </button>
            `;
            // Attach logout handler
            setTimeout(() => {
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', signOutUser);
                }
                lucide.createIcons();
            }, 0);
        }
        lucide.createIcons();
    });
}

// Auto-update navbar on auth state change
onAuthStateChange(() => {
    setupAuthUI();
});

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    const errors = {
        tooShort: password.length < 8,
        noUpperCase: !/[A-Z]/.test(password),
        noLowerCase: !/[a-z]/.test(password),
        noNumbers: !/\d/.test(password)
    };

    const isValid = !Object.values(errors).some(error => error);

    return {
        isValid,
        errors
    }
}

export {
    getCurrentUser,
    signUpUser,
    signInUser,
    signOutUser,
    resetPassword,
    onAuthStateChange,
    setupAuthUI,
    isValidEmail,
    validatePassword
};
