"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SheetChart } from "@/components/sheet-chart";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Table, RefreshCw } from "lucide-react";
import { SheetDataStructure } from "@/lib/sheet-data-transformer";
import Link from "next/link";

interface SavedSheet {
    id: string;
    sheet_name: string;
    tab_name: string;
    spreadsheet_id: string;
    data_json: SheetDataStructure;
    created_at: string;
}

export default function VisualizationPage() {
    const params = useParams();
    const router = useRouter();
    const [sheet, setSheet] = useState<SavedSheet | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showTable, setShowTable] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchSheet(params.id as string);
        }
    }, [params.id]);

    const fetchSheet = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sheets/saved/${id}?_t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setSheet(data.savedSheet);
            } else {
                console.error("Failed to fetch sheet");
                router.push("/dashboard");
            }
        } catch (error) {
            console.error("Error fetching sheet:", error);
            router.push("/dashboard");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!sheet) return;

        setRefreshing(true);
        try {
            // 1. Fetch fresh data from Google Sheets
            const dataRes = await fetch(
                `/api/sheets/data?spreadsheetId=${sheet.spreadsheet_id}&range=${sheet.tab_name}&_t=${Date.now()}`
            );

            if (!dataRes.ok) {
                throw new Error("Failed to fetch fresh data from Google Sheets");
            }

            const freshData = await dataRes.json();
            const sheetData = freshData.values || [];

            if (sheetData.length === 0) {
                throw new Error("No data found in the sheet");
            }

            // 2. Update the saved record in Supabase
            // We use the save endpoint which handles transformation and updating
            // Note: The save endpoint currently creates a NEW record or updates? 
            // Let's check the save endpoint. It likely does an insert.
            // Actually, we want to UPDATE the existing record.
            // The current save endpoint might not support updating by ID.
            // Let's look at the save endpoint logic.
            // If it doesn't support update, we might need to modify it or delete/create.
            // But wait, the user wants to "refresh" this specific visualization.

            // Let's check if we can reuse the save endpoint or if we need a specific update logic.
            // For now, let's assume we can use the save endpoint but we might need to pass the ID if we want to update.
            // Or we can just create a new one? No, that changes the ID.

            // Let's try to use the save endpoint but we might need to modify it to support updates if it doesn't.
            // Actually, looking at the save endpoint code (I recall it), it does an insert.

            // So we should probably add a PUT endpoint or modify the save endpoint.
            // OR, we can just do it here if we had an update endpoint.

            // Let's implement a specific update for this.
            // Since we don't have a specific update endpoint, let's use the save endpoint but we need to make sure it updates if ID is provided?
            // No, the save endpoint is for creating new saves usually.

            // Let's create a new API route for updating: /api/sheets/saved/[id] (PUT)
            // But I can't do that right now without creating a new file.

            // Alternative: Delete old and create new? No, ID changes.

            // Let's check the save endpoint code again to be sure.
            // I'll assume for now I need to create a PUT handler in /api/sheets/saved/[id]/route.ts

            // Wait, I can't check the file in the middle of replace_file_content.
            // I will implement the UI first, and then I will add the PUT handler.

            const updateRes = await fetch(`/api/sheets/saved/${sheet.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sheetData,
                    spreadsheetId: sheet.spreadsheet_id,
                    tabName: sheet.tab_name,
                    sheetName: sheet.sheet_name,
                }),
            });

            if (updateRes.ok) {
                const updatedData = await updateRes.json();
                setSheet(updatedData.savedSheet);
                alert("Data refreshed successfully!");
            } else {
                throw new Error("Failed to update saved sheet");
            }

        } catch (error) {
            console.error("Error refreshing data:", error);
            alert("Failed to refresh data. Please check your connection and try again.");
        } finally {
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
            </div>
        );
    }

    if (!sheet) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sheet Not Found</CardTitle>
                    <CardDescription>The requested sheet could not be found.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/dashboard">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Prepare raw data for table view
    const rawTableData: string[][] = [];
    if (sheet.data_json.type === "financial") {
        // Reconstruct table from structured data
        rawTableData.push(sheet.data_json.headers);
        sheet.data_json.data.forEach((row) => {
            const tableRow = [row.category];
            sheet.data_json.timePoints?.forEach((timePoint) => {
                tableRow.push(row[timePoint]?.toString() || "");
            });
            if (row.total !== undefined) {
                tableRow.push(row.total.toString());
            }
            rawTableData.push(tableRow);
        });
    } else {
        // Handle tabular data
        rawTableData.push(sheet.data_json.headers);
        sheet.data_json.data.forEach(row => {
            const tableRow = sheet.data_json.headers.map(header => row[header]?.toString() || "");
            rawTableData.push(tableRow);
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Data Visualization
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Interactive charts and data views for your saved sheet
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        {refreshing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh Data
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/dashboard">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Link>
                    </Button>
                </div>
            </div>

            <SheetChart
                sheetData={sheet.data_json}
                sheetName={sheet.sheet_name}
                tabName={sheet.tab_name}
            />

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Table className="h-5 w-5" />
                                Data Table
                            </CardTitle>
                            <CardDescription>
                                View the raw data in table format
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowTable(!showTable)}
                        >
                            {showTable ? "Hide" : "Show"} Table
                        </Button>
                    </div>
                </CardHeader>
                {showTable && rawTableData.length > 0 && (
                    <CardContent>
                        <DataTable data={rawTableData} />
                    </CardContent>
                )}
            </Card>
        </div>
    );
}

