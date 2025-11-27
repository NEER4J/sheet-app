"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import { prepareChartData, SheetDataStructure } from "@/lib/sheet-data-transformer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";

interface SheetChartProps {
    sheetData: SheetDataStructure;
    sheetName: string;
    tabName: string;
}

const COLORS = [
    "hsl(221, 83%, 53%)", // blue-600
    "hsl(142, 71%, 45%)", // green-600
    "hsl(48, 96%, 53%)", // yellow-500
    "hsl(0, 72%, 51%)", // red-600
    "hsl(262, 83%, 58%)", // purple-600
    "hsl(199, 89%, 48%)", // cyan-600
    "hsl(326, 78%, 55%)", // pink-600
    "hsl(31, 92%, 54%)", // orange-600
];

export function SheetChart({ sheetData, sheetName, tabName }: SheetChartProps) {
    const [chartType, setChartType] = useState<"line" | "bar">("bar");
    const [viewMode, setViewMode] = useState<"all" | "total" | "monthly">("all");
    const [selectedMonth, setSelectedMonth] = useState<string>(sheetData.timePoints?.[0] || "");

    const chartData = prepareChartData(sheetData);

    // Create chart config based on categories
    const chartConfig: ChartConfig = {};
    if (sheetData.type === "financial" && sheetData.categories) {
        sheetData.categories.forEach((category, index) => {
            chartConfig[category] = {
                label: category,
                color: COLORS[index % COLORS.length],
            };
        });
    }

    // Filter data based on view mode
    let displayData = chartData;
    if (viewMode === "monthly" && selectedMonth) {
        displayData = chartData.filter(d => d.name === selectedMonth);
    } else if (viewMode === "total") {
        // For total view, we want to show a single bar per category representing the total
        // But the current chart structure is TimePoint -> Categories
        // We need to pivot it to Category -> Total
        // Actually, we can just use the "total" field from the data rows if available, 
        // or sum it up.

        // Let's create a special data structure for the Total view
        // It will be a single "Total" timepoint with all categories
        const totalDataPoint: Record<string, any> = { name: "Total" };
        sheetData.data.forEach(row => {
            if (row.total !== undefined) {
                totalDataPoint[row.category] = row.total;
            } else {
                // Calculate sum if total not present
                let sum = 0;
                sheetData.timePoints?.forEach(tp => {
                    const val = parseFloat(row[tp]);
                    if (!isNaN(val)) sum += val;
                });
                totalDataPoint[row.category] = sum;
            }
        });
        displayData = [totalDataPoint];
    }

    if (!chartData || chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Data Available</CardTitle>
                    <CardDescription>Unable to generate chart from the provided data.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{sheetName}</CardTitle>
                            <CardDescription>{tabName}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <Button
                                    variant={viewMode === "all" ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("all")}
                                    className={viewMode === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}
                                >
                                    All Months
                                </Button>
                                <Button
                                    variant={viewMode === "monthly" ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("monthly")}
                                    className={viewMode === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}
                                >
                                    Monthly
                                </Button>
                                <Button
                                    variant={viewMode === "total" ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("total")}
                                    className={viewMode === "total" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}
                                >
                                    Total
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            {viewMode === "monthly" && sheetData.timePoints && (
                                <select
                                    className="h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                >
                                    {sheetData.timePoints.map(tp => (
                                        <option key={tp} value={tp}>{tp}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant={chartType === "bar" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setChartType("bar")}
                                className={chartType === "bar" ? "bg-blue-600" : ""}
                            >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Bar
                            </Button>
                            <Button
                                variant={chartType === "line" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setChartType("line")}
                                className={chartType === "line" ? "bg-blue-600" : ""}
                            >
                                <LineChartIcon className="h-4 w-4 mr-2" />
                                Line
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    {chartType === "bar" ? (
                        <BarChart data={displayData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            {sheetData.categories.map((category, index) => (
                                <Bar
                                    key={category}
                                    dataKey={category}
                                    fill={COLORS[index % COLORS.length]}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    ) : (
                        <LineChart data={displayData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            {sheetData.categories.map((category, index) => (
                                <Line
                                    key={category}
                                    type="monotone"
                                    dataKey={category}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                            ))}
                        </LineChart>
                    )}
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
