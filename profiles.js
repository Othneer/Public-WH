import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';

// Create or update profile
export async function createOrUpdateProfile(profileData) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('[createOrUpdateProfile] No user');
            return { success: false, error: 'User not authenticated' };
        }
        const upsertData = {
            id: user.id,
            username: profileData.username,
            full_name: profileData.full_name,
            bio: profileData.bio || '',
            location: profileData.location || '',
            avatar_url: profileData.avatar_url || null,
            updated_at: new Date().toISOString()
        };
        console.log('[createOrUpdateProfile] upsertData:', upsertData);
        const { data, error } = await supabase
            .from('profiles')
            .upsert(upsertData)
            .select();
        if (error) {
            console.error('[createOrUpdateProfile] error:', error);
            return { success: false, error: error.message };
        }
        console.log('[createOrUpdateProfile] success:', data);
        return { success: true, profile: data[0] };
    } catch (error) {
        console.error('[createOrUpdateProfile] Unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Get profile by user ID
export async function getProfile(userId) {
    try {
        console.log('[getProfile] userId:', userId);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) {
            console.error('[getProfile] error:', error);
            return { success: false, error: error.message };
        }
        console.log('[getProfile] success:', data);
        return { success: true, profile: data };
    } catch (error) {
        console.error('[getProfile] Unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Get current logged-in user's profile
export async function getCurrentUserProfile() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('[getCurrentUserProfile] No user');
            return { success: false, error: 'User not authenticated' };
        }
        const result = await getProfile(user.id);
        console.log('[getCurrentUserProfile] result:', result);
        return result;
    } catch (error) {
        console.error('[getCurrentUserProfile] Unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Upload avatar
export async function uploadAvatar(file) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('[uploadAvatar] No user');
            return { success: false, error: 'User not authenticated' };
        }
        const fileExt = file.name.split('.').pop();
        const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;
        console.log('[uploadAvatar] uploading:', fileName);
        const { error: uploadError } = await supabase.storage
            .from('listings-images')
            .upload(fileName, file);
        if (uploadError) {
            console.error('[uploadAvatar] upload error:', uploadError);
            return { success: false, error: uploadError.message };
        }
        const { data: publicData } = supabase.storage
            .from('listings-images')
            .getPublicUrl(fileName);
        console.log('[uploadAvatar] public URL:', publicData.publicUrl);
        return { success: true, url: publicData.publicUrl };
    } catch (error) {
        console.error('[uploadAvatar] Unexpected error:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}
