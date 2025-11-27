/**
 * Utility functions to transform raw Google Sheets data into structured JSON
 * suitable for database storage and chart visualization
 */

export interface SheetDataStructure {
    type: 'financial' | 'tabular' | 'timeseries';
    headers: string[];
    categories: string[];
    data: Record<string, any>[];
    timePoints?: string[];
}

/**
 * Find the row index that contains the actual column headers (months)
 * Requires at least 2 month matches to confirm it's a header row
 */
function findHeaderRow(data: string[][]): number {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    // Search first 10 rows (increased from 5 to be safe)
    for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i] || [];
        let monthMatches = 0;

        row.forEach(cell => {
            if (!cell) return;
            const cellLower = cell.toLowerCase().trim();
            // Check for exact match or "Jan 2025" format
            // Avoid "Summary" matching "mar" by ensuring word boundary or start
            const isMonth = monthNames.some(month =>
                cellLower === month ||
                cellLower.startsWith(month + ' ') ||
                cellLower.startsWith(month + '-') ||
                cellLower.includes(` ${month} `)
            );

            if (isMonth) {
                monthMatches++;
            }
        });

        // If we found at least 2 months, this is likely the header row
        if (monthMatches >= 2) {
            return i;
        }
    }
    return 0; // Default to first row if no month headers found
}

/**
 * Transform raw sheet data (2D array) into structured JSON
 */
export function transformSheetData(rawData: string[][]): SheetDataStructure {
    if (!rawData || rawData.length === 0) {
        throw new Error('No data provided');
    }

    // Detect if this is a financial/category-based sheet
    const isFinancialSheet = detectFinancialSheet(rawData);

    if (isFinancialSheet) {
        return transformFinancialData(rawData);
    }

    // Default: treat as tabular data
    return transformTabularData(rawData);
}

/**
 * Detect if the sheet contains financial/category data
 */
function detectFinancialSheet(data: string[][]): boolean {
    if (data.length < 3) return false;

    // Find the header row
    const headerRowIndex = findHeaderRow(data);

    // If findHeaderRow returned 0, double check if it actually has months
    // If it doesn't have multiple months, and we're at row 0, it might be a false positive or just tabular
    if (headerRowIndex === 0) {
        const row = data[0] || [];
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        let matchCount = 0;
        row.forEach(cell => {
            if (cell && monthNames.some(m => cell.toLowerCase().includes(m))) matchCount++;
        });
        // If row 0 has fewer than 2 month-like things, assume it's NOT financial headers
        // unless it has "Total" and categories
        if (matchCount < 2) {
            // Check for "Total" and categories to be sure
            const hasTotal = row.some(c => c && c.toLowerCase().includes('total'));
            if (!hasTotal) return false;
        }
    }

    const headerRow = data[headerRowIndex] || [];

    // Check if there's a "Total" column
    const hasTotalColumn = headerRow.some(cell =>
        cell && cell.toLowerCase().includes('total')
    );

    // Look for category rows after the header
    let hasCategories = false;
    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        // Check first column for text
        if (row && row[0] && row[0].trim() && isNaN(parseFloat(row[0]))) {
            hasCategories = true;
            break;
        }
    }

    return true; // If findHeaderRow found something valid, we assume it's financial structure
}

/**
 * Transform financial/category-based data
 */
function transformFinancialData(rawData: string[][]): SheetDataStructure {
    // Find the actual header row
    const headerRowIndex = findHeaderRow(rawData);
    const headerRow = rawData[headerRowIndex] || [];

    const categories: string[] = [];
    const data: Record<string, any>[] = [];

    // Find the column index where category names start (usually column 0 or 1)
    let categoryColumnIndex = 0;
    // Check if first column is empty in header row, category might be in column 0
    // Or look for "Summary" or "Category"
    for (let i = 0; i < headerRow.length; i++) {
        const cell = headerRow[i]?.toLowerCase() || '';
        if (cell === 'summary' || cell === 'category' || cell === 'description') {
            categoryColumnIndex = i;
            break;
        }
    }

    // If header row has empty first cell but months in others, category is likely col 0
    if (!headerRow[0] && headerRow[1]) {
        categoryColumnIndex = 0;
    }

    // Extract time points (months/periods) from header row
    const timePoints: string[] = [];
    const timePointIndices: number[] = [];
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    headerRow.forEach((cell, index) => {
        const cellLower = cell?.toLowerCase().trim() || '';
        if (!cell || cell.trim() === '') return;

        // Skip category column
        if (index === categoryColumnIndex) return;

        // Skip Total/Balance
        if (cellLower.includes('total') || cellLower.includes('balance')) return;

        // Check if it looks like a month
        const isMonth = monthNames.some(month =>
            cellLower === month ||
            cellLower.startsWith(month + ' ') ||
            cellLower.startsWith(month + '-')
        );

        if (isMonth) {
            timePoints.push(cell.trim());
            timePointIndices.push(index);
        }
    });

    // Process each row after the header
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const category = row[categoryColumnIndex]?.trim();
        if (!category || category === '') continue;

        // Skip rows that are empty or just totals/balance labels
        if (category.toLowerCase() === 'total' || category.toLowerCase() === 'balance') {
            continue;
        }

        categories.push(category);

        const rowData: Record<string, any> = {
            category,
        };

        // Map values to time points using the actual column indices
        timePoints.forEach((timePoint, idx) => {
            const columnIndex = timePointIndices[idx];
            const value = row[columnIndex];
            rowData[timePoint] = parseNumericValue(value);
        });

        // Add total if exists
        const totalIndex = headerRow.findIndex((h: string) => h?.toLowerCase().includes('total'));
        if (totalIndex > 0 && row[totalIndex]) {
            rowData.total = parseNumericValue(row[totalIndex]);
        }

        data.push(rowData);
    }

    // Create a combined headers array for reference
    const allHeaders = [headerRow[categoryColumnIndex] || 'Category', ...timePoints];
    if (headerRow.some((h: string) => h?.toLowerCase().includes('total'))) {
        allHeaders.push('Total');
    }

    return {
        type: 'financial',
        headers: allHeaders,
        categories,
        data,
        timePoints,
    };
}

/**
 * Transform tabular data (generic table format)
 */
function transformTabularData(rawData: string[][]): SheetDataStructure {
    const headers = rawData[0] || [];
    const data: Record<string, any>[] = [];

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const rowData: Record<string, any> = {};
        headers.forEach((header, index) => {
            if (header && header.trim() !== '') {
                rowData[header] = row[index] || '';
            }
        });

        data.push(rowData);
    }

    return {
        type: 'tabular',
        headers,
        categories: [],
        data,
    };
}

/**
 * Parse numeric value from string, handling different formats
 */
function parseNumericValue(value: any): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    // Remove commas, % signs, and convert to number
    const cleaned = String(value).replace(/,/g, '').replace(/%/g, '');
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? null : parsed;
}

/**
 * Prepare data for chart visualization
 */
export function prepareChartData(structure: SheetDataStructure) {
    if (structure.type === 'financial' && structure.timePoints) {
        // Transform to format suitable for line/bar charts
        return structure.timePoints.map(timePoint => {
            const dataPoint: Record<string, any> = { name: timePoint };

            structure.data.forEach(row => {
                const category = row.category;
                const value = row[timePoint];
                if (category && value !== null) {
                    dataPoint[category] = value;
                }
            });

            return dataPoint;
        });
    }

    // For other types, return as-is
    return structure.data;
}
