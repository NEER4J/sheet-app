"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileSpreadsheet, Trash2, TrendingUp } from "lucide-react";
import Link from "next/link";

interface SavedSheet {
    id: string;
    sheet_name: string;
    spreadsheet_id: string;
    tab_name: string;
    metadata: {
        rowCount: number;
        columnCount: number;
        savedAt: string;
    };
    created_at: string;
}

export function SavedSheetsList() {
    const [sheets, setSheets] = useState<SavedSheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSavedSheets();
    }, []);

    const fetchSavedSheets = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/sheets/saved");
            if (res.ok) {
                const data = await res.json();
                setSheets(data.savedSheets || []);
            }
        } catch (error) {
            console.error("Failed to fetch saved sheets:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this saved sheet?")) {
            return;
        }

        setDeletingId(id);
        try {
            const res = await fetch(`/api/sheets/saved/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setSheets(sheets.filter((s) => s.id !== id));
            } else {
                alert("Failed to delete sheet");
            }
        } catch (error) {
            console.error("Error deleting sheet:", error);
            alert("Error deleting sheet");
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                </CardContent>
            </Card>
        );
    }

    if (sheets.length === 0) {
        return (
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FileSpreadsheet className="w-6 h-6 text-slate-600" />
                    </div>
                    <CardTitle>No Saved Sheets</CardTitle>
                    <CardDescription>
                        Save a sheet from the Data Viewer to see it here and create visualizations.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sheets.map((sheet) => (
                <Card key={sheet.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                                    {sheet.sheet_name}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {sheet.tab_name}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm text-slate-600">
                                <span>
                                    {sheet.metadata.rowCount} rows × {sheet.metadata.columnCount} cols
                                </span>
                            </div>
                            <div className="text-xs text-slate-500">
                                Saved {new Date(sheet.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    asChild
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    size="sm"
                                >
                                    <Link href={`/dashboard/visualizations/${sheet.id}`}>
                                        <TrendingUp className="h-4 w-4 mr-2" />
                                        View Chart
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(sheet.id)}
                                    disabled={deletingId === sheet.id}
                                >
                                    {deletingId === sheet.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
