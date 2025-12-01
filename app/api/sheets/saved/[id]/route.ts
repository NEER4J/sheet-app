import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { transformSheetData } from "@/lib/sheet-data-transformer";
import { google } from "googleapis";
import { getGoogleTokens } from "@/lib/google-tokens";

export const dynamic = 'force-dynamic';


export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const supabase = await createClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch the saved sheet metadata from Supabase
        const { data: savedSheet, error: fetchError } = await supabase
            .from("saved_sheets")
            .select("*")
            .eq("id", id)
            .eq("user_id", session.user.id)
            .single();

        if (fetchError) {
            console.error("Error fetching saved sheet:", fetchError);
            return NextResponse.json(
                { error: "Failed to fetch saved sheet" },
                { status: 500 }
            );
        }

        if (!savedSheet) {
            return NextResponse.json(
                { error: "Sheet not found" },
                { status: 404 }
            );
        }

        // 2. Try to fetch fresh data from Google Sheets if we have a token
        const tokens = await getGoogleTokens(session.user.id);

        if (tokens?.provider_token && savedSheet.spreadsheet_id && savedSheet.tab_name) {
            try {
                const auth = new google.auth.OAuth2();
                auth.setCredentials({ access_token: tokens.provider_token });

                const sheets = google.sheets({ version: "v4", auth });

                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: savedSheet.spreadsheet_id,
                    range: savedSheet.tab_name,
                });

                const rawValues = response.data.values;

                if (rawValues && rawValues.length > 0) {
                    // 3. Transform the fresh data
                    const transformedData = transformSheetData(rawValues);

                    // 4. Update the record in Supabase with fresh data
                    const { data: updatedSheet, error: updateError } = await supabase
                        .from("saved_sheets")
                        .update({
                            data_json: transformedData,
                            metadata: {
                                ...savedSheet.metadata,
                                rows: rawValues.length,
                                cols: rawValues[0]?.length || 0,
                                last_updated: new Date().toISOString(),
                            },
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", id)
                        .select()
                        .single();

                    if (!updateError && updatedSheet) {
                        // Return the FRESH updated data
                        return NextResponse.json({
                            savedSheet: updatedSheet,
                        });
                    }
                }
            } catch (googleError) {
                console.warn("Failed to auto-refresh from Google Sheets, returning saved data:", googleError);
                // Fallthrough to return the existing saved data
            }
        }

        // Fallback: Return the existing saved data (if Google fetch failed or no token)
        return NextResponse.json({
            savedSheet: savedSheet,
        });

    } catch (error) {
        console.error("Error in saved sheet endpoint:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        // Transform the data
        const transformedData = transformSheetData(sheetData);

        // Update the record
        const { data, error } = await supabase
            .from("saved_sheets")
            .update({
                sheet_name: sheetName,
                spreadsheet_id: spreadsheetId,
                tab_name: tabName,
                data_json: transformedData,
                metadata: {
                    rows: sheetData.length,
                    cols: sheetData[0]?.length || 0,
                    last_updated: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating saved sheet:", error);
            return NextResponse.json(
                { error: "Failed to update saved sheet" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            savedSheet: data,
        });
    } catch (error) {
        console.error("Error in update sheet endpoint:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { error } = await supabase
            .from("saved_sheets")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting saved sheet:", error);
            return NextResponse.json(
                { error: "Failed to delete saved sheet" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.error("Error in delete sheet endpoint:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
