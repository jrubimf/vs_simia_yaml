import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface SpellInfo {
    id: number;
    name: string;
    normalizedName: string;  // lowercase, underscores instead of spaces
}

export class SpellDatabase {
    private spells: Map<string, SpellInfo> = new Map();
    private spellsById: Map<number, SpellInfo> = new Map();
    private loaded: boolean = false;
    private extensionPath: string = '';

    constructor() {}

    /**
     * Set the extension path for loading bundled resources
     */
    setExtensionPath(extensionPath: string): void {
        this.extensionPath = extensionPath;
    }

    /**
     * Load spells from CSV file
     * Supports formats:
     *   id,name
     *   id,name_lang
     * Example:
     *   id,name_lang
     *   12345,Fireball
     *   12346,Frost Nova
     */
    async loadFromCsv(csvPath: string): Promise<boolean> {
        try {
            if (!fs.existsSync(csvPath)) {
                console.log(`Spell CSV not found: ${csvPath}`);
                return false;
            }

            const content = fs.readFileSync(csvPath, 'utf-8');
            const lines = content.split(/\r?\n/);

            if (lines.length === 0) return false;

            // Parse header to find column indices
            const header = lines[0].toLowerCase().split(',').map(h => h.trim());
            const idIndex = header.findIndex(h => h === 'id');
            const nameIndex = header.findIndex(h => h === 'name' || h === 'name_lang');

            if (idIndex === -1 || nameIndex === -1) {
                console.log(`Invalid CSV header in ${csvPath}: expected id and name/name_lang columns`);
                return false;
            }

            const countBefore = this.spells.size;

            // Parse data rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Parse CSV (handle quoted values and multiple columns)
                const columns = this.parseCsvLine(line);
                if (columns.length <= Math.max(idIndex, nameIndex)) continue;

                const idStr = columns[idIndex];
                const name = columns[nameIndex];

                if (!idStr || !name) continue;

                const id = parseInt(idStr, 10);
                if (isNaN(id)) continue;

                const normalizedName = this.normalizeName(name);

                const spell: SpellInfo = { id, name, normalizedName };
                this.spells.set(normalizedName, spell);
                this.spellsById.set(id, spell);
            }

            const loaded = this.spells.size - countBefore;
            this.loaded = true;
            console.log(`Loaded ${loaded} spells from ${csvPath} (total: ${this.spells.size})`);
            return loaded > 0;
        } catch (error) {
            console.error('Failed to load spell CSV:', error);
            return false;
        }
    }

    /**
     * Parse a CSV line handling quoted values
     */
    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    /**
     * Try to find and load spells.csv from workspace
     * Loads ALL matching files and merges them
     */
    async autoLoad(): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            console.log('Rotation YAML: No workspace folders found');
            return false;
        }

        // Search for spells.csv in common locations
        const searchPaths = [
            'spells.csv',
            'data/spells.csv',
            'yaml/spells.csv',
            'vs_plugin/spells.csv',
            '../spells.csv',
            '../vs_plugin/spells.csv',
        ];

        let loadedAny = false;

        for (const folder of workspaceFolders) {
            console.log(`Rotation YAML: Searching in workspace: ${folder.uri.fsPath}`);

            for (const searchPath of searchPaths) {
                const fullPath = path.join(folder.uri.fsPath, searchPath);
                console.log(`Rotation YAML: Checking ${fullPath}`);
                if (fs.existsSync(fullPath)) {
                    console.log(`Rotation YAML: Found ${fullPath}`);
                    const result = await this.loadFromCsv(fullPath);
                    if (result) loadedAny = true;
                }
            }

            // Also look for any *spells*.csv files in data/ folder
            const dataDir = path.join(folder.uri.fsPath, 'data');
            if (fs.existsSync(dataDir)) {
                const files = fs.readdirSync(dataDir);
                for (const file of files) {
                    if (file.endsWith('.csv') && file.includes('spell')) {
                        const fullPath = path.join(dataDir, file);
                        console.log(`Rotation YAML: Found ${fullPath}`);
                        const result = await this.loadFromCsv(fullPath);
                        if (result) loadedAny = true;
                    }
                }
            }

            // Also check vs_plugin subfolder
            const vsPluginDir = path.join(folder.uri.fsPath, 'vs_plugin');
            if (fs.existsSync(vsPluginDir)) {
                const spellsCsv = path.join(vsPluginDir, 'spells.csv');
                if (fs.existsSync(spellsCsv)) {
                    console.log(`Rotation YAML: Found ${spellsCsv}`);
                    const result = await this.loadFromCsv(spellsCsv);
                    if (result) loadedAny = true;
                }
            }
        }

        // If no workspace spells found, try loading from extension's bundled spells.csv
        if (!loadedAny && this.extensionPath) {
            const bundledPaths = [
                path.join(this.extensionPath, 'spells.csv'),
                path.join(this.extensionPath, 'data', 'spells.csv'),
            ];

            for (const bundledPath of bundledPaths) {
                console.log(`Rotation YAML: Checking bundled ${bundledPath}`);
                if (fs.existsSync(bundledPath)) {
                    console.log(`Rotation YAML: Found bundled ${bundledPath}`);
                    const result = await this.loadFromCsv(bundledPath);
                    if (result) {
                        loadedAny = true;
                        break;
                    }
                }
            }
        }

        if (!loadedAny) {
            console.log('Rotation YAML: No spell CSV files found in any location');
        }

        return loadedAny;
    }

    /**
     * Clear and reload all spell data
     */
    async reload(): Promise<boolean> {
        this.spells.clear();
        this.spellsById.clear();
        this.loaded = false;
        return await this.autoLoad();
    }

    /**
     * Normalize spell name to match DSL format
     * "Frost Nova" -> "frost_nova"
     */
    normalizeName(name: string): string {
        return name
            .toLowerCase()
            .replace(/['']/g, '')           // Remove apostrophes
            .replace(/[^a-z0-9]+/g, '_')    // Replace non-alphanumeric with underscore
            .replace(/^_|_$/g, '')          // Trim leading/trailing underscores
            .replace(/_+/g, '_');           // Collapse multiple underscores
    }

    /**
     * Check if a spell name is valid
     */
    isValidSpell(name: string): boolean {
        if (!this.loaded) return true; // Don't validate if no data loaded
        const normalized = this.normalizeName(name);
        return this.spells.has(normalized);
    }

    /**
     * Get spell info by normalized name
     */
    getSpell(name: string): SpellInfo | undefined {
        return this.spells.get(this.normalizeName(name));
    }

    /**
     * Get spell info by ID
     */
    getSpellById(id: number): SpellInfo | undefined {
        return this.spellsById.get(id);
    }

    /**
     * Get all spell names for autocomplete
     */
    getAllSpellNames(): string[] {
        return Array.from(this.spells.keys());
    }

    /**
     * Search spells by prefix for autocomplete
     */
    searchSpells(prefix: string, limit: number = 20): SpellInfo[] {
        const normalized = this.normalizeName(prefix);
        const results: SpellInfo[] = [];

        for (const [name, spell] of this.spells) {
            if (name.startsWith(normalized) || spell.name.toLowerCase().includes(prefix.toLowerCase())) {
                results.push(spell);
                if (results.length >= limit) break;
            }
        }

        return results;
    }

    /**
     * Find similar spell names (for "did you mean" suggestions)
     */
    findSimilar(name: string, maxDistance: number = 2): SpellInfo[] {
        const normalized = this.normalizeName(name);
        const results: SpellInfo[] = [];

        for (const [spellName, spell] of this.spells) {
            const distance = this.levenshteinDistance(normalized, spellName);
            if (distance <= maxDistance && distance > 0) {
                results.push(spell);
            }
        }

        return results.slice(0, 5); // Return top 5 similar
    }

    private levenshteinDistance(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix: number[][] = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    isLoaded(): boolean {
        return this.loaded;
    }

    getSpellCount(): number {
        return this.spells.size;
    }
}

// Singleton instance
export const spellDatabase = new SpellDatabase();
