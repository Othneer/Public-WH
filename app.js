import { supabase } from './supabaseClient.js';
import { getCurrentUser, onAuthStateChange, signOutUser } from './auth.js';
import { getCurrentUserProfile } from './profiles.js';
import { getAllListings } from './listings.js';

// Global state
let currentUser = null;
let currentProfile = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    await initializeAuth();
    await loadListings();
    setupEventListeners();
});

// Authentication initialization
async function initializeAuth() {
    // Check current session
    currentUser = await getCurrentUser();
    
    if (currentUser) {
        const profileResult = await getCurrentUserProfile();
        if (profileResult.success) {
            currentProfile = profileResult.profile;
        }
    }
    
    updateNavigation();
    
    // Listen for auth changes
    onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            updateNavigation();
            // Redirect to profile setup if no profile exists
            checkProfileSetup();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentProfile = null;
            updateNavigation();
        }
    });
}

// Update navigation based on auth state
function updateNavigation() {
    const userActions = document.querySelector('.user-actions');
    if (!userActions) return;

    if (currentUser) {
        // User is logged in
        const username = currentProfile?.username || currentUser.email.split('@')[0];
        userActions.innerHTML = `
            <a href="create-listing.html">
                <button class="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-medium">
                    Sell
                </button>
            </a>
            <a href="wishlist.html">
                <button class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md font-medium">
                    Wishlist
                </button>
            </a>
            <div class="relative">
                <button id="user-menu-btn" class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md font-medium flex items-center">
                    <i data-lucide="user" class="w-4 h-4 mr-2"></i>
                    ${username}
                    <i data-lucide="chevron-down" class="w-4 h-4 ml-2"></i>
                </button>
                <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <a href="profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Profile</a>
                    <a href="profile-setup.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit Profile</a>
                    <button id="logout-btn" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Logout</button>
                </div>
            </div>
        `;
        
        // Re-initialize icons after updating HTML
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Setup user menu
        setupUserMenu();
    } else {
        // User is not logged in
        userActions.innerHTML = `
            <a href="login.html">
                <button class="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-medium flex items-center">
                    <i data-lucide="user" class="w-4 h-4 mr-2"></i>
                    Log In
                </button>
            </a>
        `;
        
        // Re-initialize icons after updating HTML
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Setup user menu dropdown
function setupUserMenu() {
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenu = document.getElementById('user-menu');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('hidden');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function() {
            userMenu.classList.add('hidden');
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            const result = await signOutUser();
            if (result.success) {
                window.location.href = 'index.html';
            }
        });
    }
}

// Check if user needs to complete profile setup
async function checkProfileSetup() {
    if (!currentUser) return;
    
    const profileResult = await getCurrentUserProfile();
    if (!profileResult.success || !profileResult.profile?.username) {
        // Redirect to profile setup if on a page that requires a complete profile
        const currentPage = window.location.pathname.split('/').pop();
        if (['profile.html', 'create-listing.html'].includes(currentPage)) {
            window.location.href = 'profile-setup.html';
        }
    }
}

// Load and display listings
async function loadListings() {
    const listingsContainer = document.getElementById('listings-container');
    if (!listingsContainer) return;

    try {
        const result = await getAllListings();
        if (result.success) {
            displayListings(result.listings, listingsContainer);
        } else {
            console.error('Failed to load listings:', result.error);
        }
    } catch (error) {
        console.error('Error loading listings:', error);
    }
}

// Display listings in container
function displayListings(listings, container) {
    if (listings.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i data-lucide="package" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
                <p class="text-gray-500">Be the first to create a listing!</p>
                <a href="create-listing.html" class="inline-block mt-4 bg-slate-900 hover:bg-slate-700 text-white px-6 py-2 rounded-md font-medium">
                    Create Listing
                </a>
            </div>
        `;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        return;
    }

    container.innerHTML = listings.map(listing => `
        <div class="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div class="relative">
                <img 
                    src="${listing.image_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/cc3d9dcc6_mathieu-andrieux-XRZxrcpgXKs-unsplash.jpg'}"
                    alt="${listing.title}"
                    class="w-full h-48 object-cover"
                />
                <button class="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                    <i data-lucide="heart" class="w-4 h-4 text-slate-600"></i>
                </button>
                <span class="absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                    new listing
                </span>
            </div>
            
            <div class="p-4">
                <h3 class="font-semibold text-slate-900 mb-2 line-clamp-2">${listing.title}</h3>
                <p class="text-sm text-slate-600 mb-3 line-clamp-2">${listing.description || 'No description provided'}</p>
                
                <div class="flex items-center justify-between text-sm text-slate-500 mb-3">
                    <div class="flex items-center gap-1">
                        <i data-lucide="user" class="w-3 h-3"></i>
                        ${listing.profiles?.username || 'Unknown User'}
                    </div>
                    <div class="flex items-center gap-1">
                        <i data-lucide="calendar" class="w-3 h-3"></i>
                        ${new Date(listing.created_at).toLocaleDateString()}
                    </div>
                </div>
                
                <button onclick="viewListing(${listing.id})" class="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 px-4 rounded-md font-medium">
                    View Details
                </button>
            </div>
        </div>
    `).join('');

    // Re-initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// View listing function (global)
window.viewListing = function(listingId) {
    window.location.href = `detail-ad.html?id=${listingId}`;
};

// Setup general event listeners
function setupEventListeners() {
    // Mobile menu toggle (if exists)
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            const menu = document.getElementById('mobile-menu');
            const icon = this.querySelector('i');
            
            if (menu.classList.contains('hidden')) {
                menu.classList.remove('hidden');
                icon.setAttribute('data-lucide', 'x');
            } else {
                menu.classList.add('hidden');
                icon.setAttribute('data-lucide', 'menu');
            }
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
    }
}

// Export for global access
window.app = {
    currentUser: () => currentUser,
    currentProfile: () => currentProfile,
    loadListings,
    updateNavigation
};
