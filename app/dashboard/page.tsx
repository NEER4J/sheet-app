"use client";

import { useEffect, useState } from "react";
import { GoogleConnectButton } from "@/components/google-connect-button";
import { SheetSelector } from "@/components/sheet-selector";
import { DataTable } from "@/components/data-table";
import { SavedSheetsList } from "@/components/saved-sheets-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Database, FileSpreadsheet, Save, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sheetData, setSheetData] = useState<string[][]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [activeTab, setActiveTab] = useState<"viewer" | "saved">("viewer");
    const [saving, setSaving] = useState(false);
    const [currentSheetMeta, setCurrentSheetMeta] = useState<{
        spreadsheetId: string;
        tabName: string;
        sheetName: string;
    } | null>(null);

    useEffect(() => {
        checkGoogleConnection();
    }, []);

    const checkGoogleConnection = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sheets/list?_t=${Date.now()}`);
            if (res.ok) {
                setIsConnected(true);
            } else {
                setIsConnected(false);
            }
        } catch {
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSheetSelect = async (spreadsheetId: string, range: string, sheetName: string) => {
        setLoadingData(true);
        try {
            const res = await fetch(
                `/api/sheets/data?spreadsheetId=${spreadsheetId}&range=${range}&_t=${Date.now()}`,
            );
            if (res.ok) {
                const data = await res.json();
                setSheetData(data.values || []);
                setCurrentSheetMeta({
                    spreadsheetId,
                    tabName: range,
                    sheetName,
                });
            } else {
                console.error("Failed to fetch data");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleSaveSheet = async () => {
        if (!currentSheetMeta || sheetData.length === 0) {
            alert("No data to save");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/sheets/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sheetData,
                    spreadsheetId: currentSheetMeta.spreadsheetId,
                    tabName: currentSheetMeta.tabName,
                    sheetName: currentSheetMeta.sheetName,
                }),
            });

            if (res.ok) {
                alert("Sheet saved successfully!");
                setActiveTab("saved");
            } else {
                const error = await res.json();
                alert(`Failed to save sheet: ${error.error}`);
            }
        } catch (error) {
            console.error("Error saving sheet:", error);
            alert("Error saving sheet");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sheets Dashboard</h1>
                <p className="text-slate-600 mt-1">
                    Access, save, and visualize your Google Sheets data.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("viewer")}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === "viewer"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <Database className="inline h-4 w-4 mr-2" />
                    Data Viewer
                </button>
                <button
                    onClick={() => setActiveTab("saved")}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === "saved"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                        }`}
                >
                    <TrendingUp className="inline h-4 w-4 mr-2" />
                    Saved Sheets
                </button>
            </div>

            {activeTab === "viewer" ? (
                !isConnected ? (
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <FileSpreadsheet className="w-6 h-6 text-slate-600" />
                            </div>
                            <CardTitle>Connect Google Sheets</CardTitle>
                            <CardDescription>
                                Connect your Google account to access and view your spreadsheets directly in this dashboard.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center space-y-4 justify-center items-center flex flex-col">
                            <GoogleConnectButton />
                            <p className="text-sm text-slate-500">
                                Need help? Visit the{" "}
                                <Link href="/dashboard/google-account" className="text-blue-600 hover:underline">
                                    Google Account settings
                                </Link>{" "}
                                page.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="size-5" />
                                    Select Data Source
                                </CardTitle>
                                <CardDescription>
                                    Choose a spreadsheet and range to view your data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SheetSelector onSelect={handleSheetSelect} />
                            </CardContent>
                        </Card>

                        {loadingData ? (
                            <Card>
                                <CardContent className="flex items-center justify-center p-12">
                                    <div className="text-center space-y-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-slate-600 mx-auto" />
                                        <p className="text-sm text-slate-600">Loading spreadsheet data...</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            sheetData.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle>Sheet Data</CardTitle>
                                                <CardDescription className="mt-1">
                                                    Your spreadsheet data displayed in a clean table format.
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                    {sheetData.length - 1} rows
                                                </span>
                                                <Button
                                                    onClick={handleSaveSheet}
                                                    disabled={saving}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    {saving ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="h-4 w-4 mr-2" />
                                                            Save to Database
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable data={sheetData} />
                                    </CardContent>
                                </Card>
                            )
                        )}
                    </div>
                )
            ) : (
                <SavedSheetsList />
            )}
        </div>
    );
}
