import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';








export async function GET() {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.provider_token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.provider_token });

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
