import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getGoogleTokens } from "@/lib/google-tokens";

export const dynamic = 'force-dynamic';








export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get("spreadsheetId");

    if (!spreadsheetId) {
        return NextResponse.json(
            { error: "Spreadsheet ID is required" },
            { status: 400 },
        );
    }

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

    const sheets = google.sheets({ version: "v4", auth });

    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
            fields: "sheets.properties",
        });

        return NextResponse.json({ sheets: response.data.sheets });
    } catch (error) {
        console.error("Error fetching sheet metadata:", error);
        return NextResponse.json(
            { error: "Failed to fetch sheet metadata" },
            { status: 500 },
        );
    }
}
