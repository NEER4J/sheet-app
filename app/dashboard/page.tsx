"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GoogleConnectButton } from "@/components/google-connect-button";
import { SheetSelector } from "@/components/sheet-selector";
import { DataTable } from "@/components/data-table";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [sheetData, setSheetData] = useState<string[][]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);

            // Check if we can fetch sheets (implies connected)
            try {
                const res = await fetch("/api/sheets/list");
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

        checkUser();
    }, [router, supabase]);

    const handleSheetSelect = async (spreadsheetId: string, range: string) => {
        setLoadingData(true);
        try {
            const res = await fetch(
                `/api/sheets/data?spreadsheetId=${spreadsheetId}&range=${range}`,
            );
            if (res.ok) {
                const data = await res.json();
                setSheetData(data.values || []);
            } else {
                console.error("Failed to fetch data");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">
                            View your Google Sheets data
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                            {user?.email}
                        </div>
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                router.push("/login");
                            }}
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                            Sign out
                        </button>
                    </div>
                </header>

                <main className="space-y-8">
                    {!isConnected ? (
                        <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-card shadow-sm text-center space-y-4">
                            <div className="p-4 bg-blue-50 rounded-full">
                                <svg
                                    className="w-12 h-12 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                            </div>
                            <div className="max-w-md space-y-2">
                                <h2 className="text-xl font-semibold">Connect Google Sheets</h2>
                                <p className="text-muted-foreground">
                                    Connect your Google account to access and view your spreadsheets directly in this dashboard.
                                </p>
                            </div>
                            <GoogleConnectButton />
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <section>
                                <h2 className="text-lg font-semibold mb-4">Select Data Source</h2>
                                <SheetSelector onSelect={handleSheetSelect} />
                            </section>

                            {loadingData ? (
                                <div className="flex items-center justify-center p-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                </div>
                            ) : (
                                sheetData.length > 0 && (
                                    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-semibold">Sheet Data</h2>
                                            <span className="text-sm text-muted-foreground">
                                                {sheetData.length - 1} rows found
                                            </span>
                                        </div>
                                        <DataTable data={sheetData} />
                                    </section>
                                )
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
