import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getGoogleTokens } from "@/lib/google-tokens";

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tokens from database
    const tokens = await getGoogleTokens(user.id);

    if (!tokens || !tokens.provider_token) {
        return NextResponse.json({ error: "Google account not connected" }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: tokens.provider_token });

    const drive = google.drive({ version: "v3", auth });

    try {
        const response = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.spreadsheet'",
            fields: "files(id, name)",
            pageSize: 20, // Limit to 20 for now
        });

        return NextResponse.json({ files: response.data.files });
    } catch (error) {
        console.error("Error fetching sheets:", error);
        return NextResponse.json(
            { error: "Failed to fetch sheets" },
            { status: 500 },
        );
    }
}
