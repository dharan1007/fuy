import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';

export interface ParsedExercise {
    name: string;
    sets: number;
    reps: string;
    weight: number;
    muscleGroup: string;
}

/**
 * Parses a workout text block into structured exercises.
 * Expected formats per line:
 * - "Bench Press 3x10 100kg"
 * - "Squats 4 sets of 12 reps"
 * - "Pullups 3xFailure"
 */
export function parseTextWorkout(text: string): ParsedExercise[] {
    const lines = text.split('\n');
    const exercises: ParsedExercise[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Reset default values
        let name = trimmed;
        let sets = 3;
        let reps = "10";
        let weight = 0;

        // 1. Extract Sets x Reps (e.g., "3x10", "3 x 10", "3 sets 10 reps")
        // Regex looks for: Digits, 'x' or 'sets', Digits, optionally 'reps'
        const setsRepsRegex = /(\d+)\s*(?:x|sets?|sets\s+of)\s*(\d+|failure|max)/i;
        const setsRepsMatch = trimmed.match(setsRepsRegex);

        if (setsRepsMatch) {
            sets = parseInt(setsRepsMatch[1], 10);
            reps = setsRepsMatch[2];
            // Remove the match from the name to clean it up
            name = name.replace(setsRepsMatch[0], '').trim();
        }

        // 2. Extract Weight (e.g., "100kg", "50lbs", "100 lbs")
        const weightRegex = /(\d+(?:\.\d+)?)\s*(?:kg|lbs?)/i;
        const weightMatch = trimmed.match(weightRegex);

        if (weightMatch) {
            weight = parseFloat(weightMatch[1]);
            // Remove weight from name
            name = name.replace(weightMatch[0], '').trim();
        }

        // 3. Cleanup Name
        // Remove common separators or trailing info
        name = name.replace(/[,.-]+$/, '').trim();

        // Basic muscle group inference based on keywords (simple heuristic)
        let muscleGroup = "Other";
        const lowerName = name.toLowerCase();
        if (lowerName.match(/bench|chest|fly|pushup/)) muscleGroup = "Chest";
        else if (lowerName.match(/squat|leg|lunge|calf/)) muscleGroup = "Legs";
        else if (lowerName.match(/pull|row|back|lat/)) muscleGroup = "Back";
        else if (lowerName.match(/curl|bicep/)) muscleGroup = "Arms";
        else if (lowerName.match(/tricep|dip|extension/)) muscleGroup = "Arms";
        else if (lowerName.match(/shoulder|press|raise/)) muscleGroup = "Shoulders";
        else if (lowerName.match(/abs|crunch|plank/)) muscleGroup = "Core";

        if (name.length > 2) {
            exercises.push({
                name,
                sets,
                reps,
                weight,
                muscleGroup
            });
        }
    }

    return exercises;
}

/**
 * Parses an Excel or CSV file URI into structured exercises.
 * Assumes headers might be vague, so it uses basic column matching.
 */
export async function parseExcelFile(uri: string): Promise<ParsedExercise[]> {
    try {
        const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });

        const workbook = XLSX.read(fileContent, { type: 'base64' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array of arrays
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (data.length < 2) return [];

        // Find header row index (first row that looks like headers)
        let headerRowIdx = 0;
        const headers = data[0].map(h => String(h).toLowerCase());

        // Map column indices
        let nameIdx = -1, setsIdx = -1, repsIdx = -1, weightIdx = -1, muscleIdx = -1;

        headers.forEach((h, i) => {
            if (h.includes('exercise') || h.includes('name') || h.includes('workout')) nameIdx = i;
            if (h.includes('set')) setsIdx = i;
            if (h.includes('rep')) repsIdx = i;
            if (h.includes('weight') || h.includes('load') || h.includes('kg') || h.includes('lbs')) weightIdx = i;
            if (h.includes('muscle') || h.includes('group') || h.includes('target')) muscleIdx = i;
        });

        // If simple header mapping failed, assume standard columns: Name, Sets, Reps, Weight
        if (nameIdx === -1) {
            // Fallback: Col 0 = Name, Col 1 = Sets, Col 2 = Reps...
            nameIdx = 0; setsIdx = 1; repsIdx = 2; weightIdx = 3;
        }

        const exercises: ParsedExercise[] = [];

        // Iterate data rows
        for (let i = headerRowIdx + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const name = row[nameIdx] ? String(row[nameIdx]).trim() : "Unknown Exercise";
            const sets = row[setsIdx] ? parseInt(String(row[setsIdx])) || 3 : 3;
            const reps = row[repsIdx] ? String(row[repsIdx]) : "10";
            const weight = row[weightIdx] ? parseFloat(String(row[weightIdx])) || 0 : 0;
            const muscleGroup = (muscleIdx !== -1 && row[muscleIdx]) ? String(row[muscleIdx]) : "Other";

            if (name && name.toLowerCase() !== 'name' && name.toLowerCase() !== 'total') {
                exercises.push({
                    name,
                    sets,
                    reps,
                    weight,
                    muscleGroup
                });
            }
        }

        return exercises;

    } catch (error) {
        console.error("Error parsing Excel file:", error);
        throw new Error("Failed to parse workout file. Please ensure it is a valid Excel or CSV file.");
    }
}
