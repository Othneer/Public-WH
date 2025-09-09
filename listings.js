// listings.js
import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';

// Create listing: insert listing first, then upload images and insert listing_images rows
export async function createListing(listingData, imageFiles) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('[createListing] No user');
      return { success: false, error: 'User not authenticated' };
    }

    // 1) Insert listing skeleton (no image_url yet)
    const insertData = {
      user_id: user.id,
      title: listingData.title ?? null,
      description: listingData.description ?? null,
      price: listingData.price ?? null,
      currency: listingData.currency ?? null,
      category: listingData.category ?? null,
      condition: listingData.condition ?? null,
      created_at: new Date().toISOString()
    };

    const { data: inserted, error: insertError } = await supabase
      .from('listings')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[createListing] insert error:', insertError);
      return { success: false, error: insertError.message || 'Failed to insert listing' };
    }

    const listingId = inserted.id;
    const uploadedUrls = [];

    // 2) Upload images and insert listing_images rows
    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const ext = (file.name || '').split('.').pop();
        const fileName = `listings/${listingId}/${user.id}-${Date.now()}-${i}.${ext}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('listings-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error('[createListing] upload error:', uploadError);
          await supabase.from('listings').delete().eq('id', listingId).catch(() => {});
          return { success: false, error: 'Failed to upload image: ' + (uploadError.message || uploadError) };
        }

        // Get public URL
        const { data: publicData } = supabase.storage.from('listings-images').getPublicUrl(fileName);
        const publicUrl = publicData?.publicUrl ?? null;
        uploadedUrls.push(publicUrl);

        // Insert into listing_images
        const { error: liError } = await supabase
          .from('listing_images')
          .insert({
            listing_id: listingId,
            user_id: user.id,
            url: publicUrl
          });

        if (liError) {
          console.error('[createListing] listing_images insert error:', liError);
          await supabase.storage.from('listings-images').remove([fileName]).catch(()=>{});
          await supabase.from('listings').delete().eq('id', listingId).catch(()=>{});
          return { success: false, error: 'Failed to save image metadata: ' + (liError.message || liError) };
        }
      }
    }

    // 3) Update listing with first image_url (cover image)
    if (uploadedUrls.length > 0) {
      await supabase.from('listings').update({ image_url: uploadedUrls[0] }).eq('id', listingId);
    }

    // 4) Return full listing with images
    const { data: finalListing, error: fetchError } = await supabase
      .from('listings')
      .select(`
        *,
        profiles (username, full_name, avatar_url),
        listing_images (id, url, created_at)
      `)
      .eq('id', listingId)
      .single();

    if (fetchError) {
      console.warn('[createListing] could not fetch final listing:', fetchError);
      return { success: true, listing: inserted };
    }

    return { success: true, listing: finalListing };
  } catch (error) {
    console.error('[createListing] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ✅ Fetch all listings with images
export async function getAllListings() {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles (username, full_name, avatar_url),
        listing_images (id, url, created_at)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getAllListings] error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, listings: data };
  } catch (error) {
    console.error('[getAllListings] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ✅ Fetch listings for a specific user with images
export async function getUserListings(userId) {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        listing_images (id, url, created_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getUserListings] error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, listings: data };
  } catch (error) {
    console.error('[getUserListings] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ✅ Fetch single listing with images
export async function getListing(listingId) {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles (username, full_name, avatar_url),
        listing_images (id, url, created_at)
      `)
      .eq('id', listingId)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, listing: data };
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Delete listing (cover + images cleanup best-effort)
export async function deleteListing(listingId) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'User not authenticated' };

    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', listingId)
      .single();

    if (fetchError) return { success: false, error: 'Listing not found' };
    if (listing.user_id !== user.id) return { success: false, error: 'You can only delete your own listings' };

    // Delete images metadata + listing row
    await supabase.from('listing_images').delete().eq('listing_id', listingId).catch(()=>{});
    const { error } = await supabase.from('listings').delete().eq('id', listingId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' };
  }
}
