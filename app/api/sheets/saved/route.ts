import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("saved_sheets")
            .select("id, sheet_name, spreadsheet_id, tab_name, metadata, created_at, updated_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching saved sheets:", error);
            return NextResponse.json(
                { error: "Failed to fetch saved sheets" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            savedSheets: data || [],
        });
    } catch (error) {
        console.error("Error in saved sheets endpoint:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
