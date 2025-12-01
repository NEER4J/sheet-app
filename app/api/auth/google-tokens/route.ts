import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleTokens } from "@/lib/google-tokens";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const tokens = await getGoogleTokens(user.id);

        if (!tokens) {
            return NextResponse.json(
                { error: "No Google tokens found" },
                { status: 404 }
            );
        }

        return NextResponse.json(tokens);
    } catch (error) {
        console.error("Error fetching Google tokens:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
