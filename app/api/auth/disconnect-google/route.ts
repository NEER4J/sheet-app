import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { deleteGoogleTokens, getGoogleTokens } from "@/lib/google-tokens";

export async function POST() {
    const supabase = await createClient();

    try {
        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "No active session" }, { status: 401 });
        }

        // Get stored tokens to revoke with Google
        const tokens = await getGoogleTokens(user.id);

        if (tokens?.provider_token) {
            try {
                // Revoke the Google token
                const revokeResponse = await fetch(
                    `https://oauth2.googleapis.com/revoke?token=${tokens.provider_token}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                    }
                );

                if (!revokeResponse.ok) {
                    console.warn("Failed to revoke Google token, but continuing with local cleanup");
                }
            } catch (error) {
                console.warn("Error revoking Google token:", error);
            }
        }

        // Delete tokens from database
        await deleteGoogleTokens(user.id);

        // Sign out from Supabase (this will clear the session and tokens)
        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
            return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Google account disconnected successfully" });

    } catch (error) {
        console.error("Error disconnecting Google account:", error);
        return NextResponse.json(
            { error: "Failed to disconnect Google account" },
            { status: 500 }
        );
    }
}
