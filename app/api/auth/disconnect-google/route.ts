import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
    const supabase = await createClient();
    
    try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            return NextResponse.json({ error: "No active session" }, { status: 401 });
        }

        // If there's a provider token, we should revoke it with Google
        if (session.provider_token) {
            try {
                // Revoke the Google token
                const revokeResponse = await fetch(
                    `https://oauth2.googleapis.com/revoke?token=${session.provider_token}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                    }
                );
                
                if (!revokeResponse.ok) {
                    console.warn("Failed to revoke Google token, but continuing with local logout");
                }
            } catch (error) {
                console.warn("Error revoking Google token:", error);
            }
        }

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
