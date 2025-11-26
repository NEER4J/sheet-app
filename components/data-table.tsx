"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface DataTableProps {
    data: string[][];
}

export function DataTable({ data }: DataTableProps) {
    if (!data || data.length === 0) {
        return <div className="text-center p-4 text-muted-foreground">No data to display</div>;
    }

    // Assume first row is header
    const header = data[0];
    const rows = data.slice(1);

    return (
        <div className="rounded-md border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            {header.map((cell, index) => (
                                <TableHead key={index} className="font-semibold text-foreground whitespace-nowrap">
                                    {cell}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, rowIndex) => (
                            <TableRow key={rowIndex} className="hover:bg-muted/50 transition-colors">
                                {row.map((cell, cellIndex) => (
                                    <TableCell key={cellIndex} className="whitespace-nowrap">
                                        {cell}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
