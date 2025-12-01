import { createClient } from "@/lib/supabase/server";

export interface GoogleTokens {
    provider_token: string;
    provider_refresh_token?: string;
    expires_at?: string;
}

/**
 * Retrieve Google OAuth tokens for the current user from the database
 */
export async function getGoogleTokens(userId: string): Promise<GoogleTokens | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("google_tokens")
        .select("provider_token, provider_refresh_token, expires_at")
        .eq("user_id", userId)
        .single();

    if (error || !data) {
        console.error("Error fetching Google tokens:", error);
        return null;
    }

    // Check if token is expired and needs refresh
    if (data.expires_at) {
        const expiresAt = new Date(data.expires_at);
        const now = new Date();

        // If token expires in less than 5 minutes, refresh it
        if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
            if (data.provider_refresh_token) {
                const refreshed = await refreshGoogleToken(data.provider_refresh_token, userId);
                if (refreshed) {
                    return refreshed;
                }
            }
        }
    }

    return {
        provider_token: data.provider_token,
        provider_refresh_token: data.provider_refresh_token || undefined,
        expires_at: data.expires_at || undefined,
    };
}

/**
 * Save or update Google OAuth tokens in the database
 */
export async function saveGoogleTokens(
    userId: string,
    tokens: GoogleTokens
): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("google_tokens")
        .upsert({
            user_id: userId,
            provider_token: tokens.provider_token,
            provider_refresh_token: tokens.provider_refresh_token,
            expires_at: tokens.expires_at,
        }, {
            onConflict: "user_id"
        });

    if (error) {
        console.error("Error saving Google tokens:", error);
        return false;
    }

    return true;
}

/**
 * Refresh an expired Google OAuth access token
 */
async function refreshGoogleToken(
    refreshToken: string,
    userId: string
): Promise<GoogleTokens | null> {
    try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }),
        });

        if (!response.ok) {
            console.error("Failed to refresh Google token:", await response.text());
            return null;
        }

        const data = await response.json();

        const newTokens: GoogleTokens = {
            provider_token: data.access_token,
            provider_refresh_token: refreshToken, // Keep the same refresh token
            expires_at: data.expires_in
                ? new Date(Date.now() + data.expires_in * 1000).toISOString()
                : undefined,
        };

        // Save the refreshed tokens
        await saveGoogleTokens(userId, newTokens);

        return newTokens;
    } catch (error) {
        console.error("Error refreshing Google token:", error);
        return null;
    }
}

/**
 * Delete Google OAuth tokens from the database
 */
export async function deleteGoogleTokens(userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("google_tokens")
        .delete()
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting Google tokens:", error);
        return false;
    }

    return true;
}
