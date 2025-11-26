"use client";

import { useEffect, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SheetFile {
    id: string;
    name: string;
}

interface SheetTab {
    properties: {
        sheetId: number;
        title: string;
    };
}

interface SheetSelectorProps {
    onSelect: (spreadsheetId: string, range: string) => void;
}

export function SheetSelector({ onSelect }: SheetSelectorProps) {
    const [files, setFiles] = useState<SheetFile[]>([]);
    const [selectedFileId, setSelectedFileId] = useState<string>("");
    const [tabs, setTabs] = useState<SheetTab[]>([]);
    const [selectedTabTitle, setSelectedTabTitle] = useState<string>("");
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isLoadingTabs, setIsLoadingTabs] = useState(false);

    // Fetch list of sheets on mount
    useEffect(() => {
        async function fetchFiles() {
            setIsLoadingFiles(true);
            try {
                const res = await fetch("/api/sheets/list");
                if (res.ok) {
                    const data = await res.json();
                    setFiles(data.files || []);
                }
            } catch (error) {
                console.error("Failed to fetch files", error);
            } finally {
                setIsLoadingFiles(false);
            }
        }
        fetchFiles();
    }, []);

    // Fetch tabs when a file is selected
    useEffect(() => {
        if (!selectedFileId) return;

        async function fetchTabs() {
            setIsLoadingTabs(true);
            setTabs([]);
            setSelectedTabTitle("");
            try {
                const res = await fetch(
                    `/api/sheets/meta?spreadsheetId=${selectedFileId}`,
                );
                if (res.ok) {
                    const data = await res.json();
                    setTabs(data.sheets || []);
                    // Default to first tab
                    if (data.sheets && data.sheets.length > 0) {
                        setSelectedTabTitle(data.sheets[0].properties.title);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch tabs", error);
            } finally {
                setIsLoadingTabs(false);
            }
        }
        fetchTabs();
    }, [selectedFileId]);

    const handleLoadData = () => {
        if (selectedFileId && selectedTabTitle) {
            onSelect(selectedFileId, selectedTabTitle);
        }
    };

    return (
        <div className="grid gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm max-w-md">
            <div className="grid gap-2">
                <Label htmlFor="sheet-file">Select Google Sheet</Label>
                <Select onValueChange={setSelectedFileId} value={selectedFileId}>
                    <SelectTrigger id="sheet-file" className="w-full">
                        <SelectValue placeholder="Select a spreadsheet" />
                    </SelectTrigger>
                    <SelectContent>
                        {isLoadingFiles ? (
                            <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        ) : (
                            files.map((file) => (
                                <SelectItem key={file.id} value={file.id}>
                                    {file.name}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            {selectedFileId && (
                <div className="grid gap-2">
                    <Label htmlFor="sheet-tab">Select Worksheet (Tab)</Label>
                    <Select onValueChange={setSelectedTabTitle} value={selectedTabTitle}>
                        <SelectTrigger id="sheet-tab" className="w-full">
                            <SelectValue placeholder="Select a tab" />
                        </SelectTrigger>
                        <SelectContent>
                            {isLoadingTabs ? (
                                <div className="flex items-center justify-center p-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            ) : (
                                tabs.map((tab) => (
                                    <SelectItem
                                        key={tab.properties.sheetId}
                                        value={tab.properties.title}
                                    >
                                        {tab.properties.title}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <Button
                onClick={handleLoadData}
                disabled={!selectedFileId || !selectedTabTitle}
                className="w-full bg-blue-600 hover:bg-blue-700"
            >
                Load Data
            </Button>
        </div>
    );
}
