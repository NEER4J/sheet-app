import { createClient } from "@/lib/supabase/server";
import { transformSheetData } from "@/lib/sheet-data-transformer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sheetData, spreadsheetId, tabName, sheetName } = body;

        if (!sheetData || !spreadsheetId || !tabName || !sheetName) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Transform raw sheet data to structured JSON
        const structuredData = transformSheetData(sheetData);

        // Save to database
        const { data, error } = await supabase
            .from("saved_sheets")
            .insert({
                user_id: user.id,
                sheet_name: sheetName,
                spreadsheet_id: spreadsheetId,
                tab_name: tabName,
                data_json: structuredData,
                metadata: {
                    rowCount: sheetData.length,
                    columnCount: sheetData[0]?.length || 0,
                    savedAt: new Date().toISOString(),
                },
            })
            .select()
            .single();

        if (error) {
            console.error("Error saving sheet data:", error);
            return NextResponse.json(
                { error: "Failed to save sheet data" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            savedSheet: data,
        });
    } catch (error) {
        console.error("Error in save sheet endpoint:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
