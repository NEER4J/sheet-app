import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';








export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get("spreadsheetId");
    const range = searchParams.get("range") || "Sheet1!A1:Z100"; // Default range if not specified

    if (!spreadsheetId) {
        return NextResponse.json(
            { error: "Spreadsheet ID is required" },
            { status: 400 },
        );
    }

    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.provider_token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.provider_token });

    const sheets = google.sheets({ version: "v4", auth });

    try {
        // First, if range is just a sheet name (or empty), we might want to get the sheet names first?
        // But for now, let's assume the user selects a sheet and we default to the first tab or they provide a range.
        // Actually, to make it user friendly, we should probably have an endpoint to get sheet metadata (tabs).

        // Let's just fetch the values for now.
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        return NextResponse.json({ values: response.data.values });
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        return NextResponse.json(
            { error: "Failed to fetch sheet data" },
            { status: 500 },
        );
    }
}
