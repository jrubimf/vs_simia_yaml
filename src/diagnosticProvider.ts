import * as vscode from 'vscode';
import { spellDatabase } from './spellData';

export class RotationDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor(diagnosticCollection: vscode.DiagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;
    }

    updateDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];

        // First pass: collect all defined items
        const definedLists = this.collectDefinedLists(document);
        const definedConfigVars = this.collectDefinedConfigVars(document);
        const definedVariables = this.collectDefinedVariables(document);

        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            const line = document.lineAt(lineNum);
            const text = line.text;

            // Skip comments and empty lines
            if (text.trim().startsWith('#') || text.trim() === '') {
                continue;
            }

            // Check action lines
            if (text.trimStart().startsWith('-')) {
                this.validateActionLine(text, lineNum, diagnostics, definedLists);
            }

            // Validate spell names in expressions
            this.validateSpellNames(text, lineNum, diagnostics);

            // Validate config and variable references
            this.validateConfigAndVarReferences(text, lineNum, diagnostics, definedConfigVars, definedVariables);

            // Check for common typos
            this.checkCommonTypos(text, lineNum, diagnostics);
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    /**
     * Collect all action list names defined in the document under 'lists:' section
     */
    private collectDefinedLists(document: vscode.TextDocument): Set<string> {
        const lists = new Set<string>();
        let inListsSection = false;

        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            const text = document.lineAt(lineNum).text;

            // Check if we're entering the lists: section
            if (/^lists:\s*$/.test(text)) {
                inListsSection = true;
                continue;
            }

            // Check if we're leaving the lists section (another root key)
            if (inListsSection && /^[a-z_]+:\s*$/.test(text) && !text.startsWith(' ')) {
                inListsSection = false;
                continue;
            }

            // If in lists section, look for list definitions (indented names followed by colon)
            if (inListsSection) {
                const listMatch = text.match(/^\s{2}(\w+):\s*$/);
                if (listMatch) {
                    lists.add(listMatch[1]);
                }
            }
        }

        return lists;
    }

    /**
     * Collect all config variable names defined under 'config:' section
     * Config format:
     *   config:
     *     var_name:
     *       label: "..."
     *       type: slider|checkbox|dropdown
     */
    private collectDefinedConfigVars(document: vscode.TextDocument): Set<string> {
        const configVars = new Set<string>();
        let inConfigSection = false;

        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            const text = document.lineAt(lineNum).text;

            // Check if we're entering the config: section
            if (/^config:\s*$/.test(text)) {
                inConfigSection = true;
                continue;
            }

            // Check if we're leaving the config section (another root key)
            if (inConfigSection && /^[a-z_]+:\s*$/.test(text) && !text.startsWith(' ')) {
                inConfigSection = false;
                continue;
            }

            // If in config section, look for variable definitions (2-space indent, name followed by colon)
            if (inConfigSection) {
                const varMatch = text.match(/^\s{2}(\w+):\s*$/);
                if (varMatch) {
                    configVars.add(varMatch[1]);
                }
            }
        }

        return configVars;
    }

    /**
     * Collect all variable names defined under 'variables:' section
     * Variables format:
     *   variables:
     *     var_name: expression
     */
    private collectDefinedVariables(document: vscode.TextDocument): Set<string> {
        const variables = new Set<string>();
        let inVariablesSection = false;

        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            const text = document.lineAt(lineNum).text;

            // Check if we're entering the variables: section
            if (/^variables:\s*$/.test(text)) {
                inVariablesSection = true;
                continue;
            }

            // Check if we're leaving the variables section (another root key)
            if (inVariablesSection && /^[a-z_]+:\s*$/.test(text) && !text.startsWith(' ')) {
                inVariablesSection = false;
                continue;
            }

            // If in variables section, look for variable definitions
            if (inVariablesSection) {
                const varMatch = text.match(/^\s{2}(\w+):/);
                if (varMatch) {
                    variables.add(varMatch[1]);
                }
            }
        }

        return variables;
    }

    /**
     * Validate config.xxx and var.xxx references
     */
    private validateConfigAndVarReferences(
        text: string,
        lineNum: number,
        diagnostics: vscode.Diagnostic[],
        definedConfigVars: Set<string>,
        definedVariables: Set<string>
    ): void {
        // Shared config variables from _shared.yaml (always available)
        const sharedConfigVars = new Set([
            'auto_target_enabled', 'auto_target_range', 'auto_target_delay',
            'auto_heal_enabled', 'auto_heal_range',
            'interrupt_enabled', 'interrupt_delay', 'interrupt_threshold',
            'defensive_enabled', 'defensive_threshold',
            'burst_enabled', 'aoe_enabled', 'aoe_threshold',
            'movement_threshold', 'gcd_tolerance',
            // Add more shared config variables as needed
        ]);

        // Check config.xxx references
        const configPattern = /\bconfig\.(\w+)/g;
        let match;
        while ((match = configPattern.exec(text)) !== null) {
            const varName = match[1];
            if (!definedConfigVars.has(varName) && !sharedConfigVars.has(varName)) {
                const startIndex = match.index + 7; // 7 = 'config.'.length
                const availableVars = Array.from(definedConfigVars);
                let message = `Config variable "${varName}" is not defined`;
                if (availableVars.length > 0) {
                    message += `. Available: ${availableVars.slice(0, 5).join(', ')}${availableVars.length > 5 ? '...' : ''}`;
                }
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNum, startIndex, lineNum, startIndex + varName.length),
                    message,
                    vscode.DiagnosticSeverity.Warning
                ));
            }
        }

        // Check var.xxx references
        const varPattern = /\bvar\.(\w+)/g;
        while ((match = varPattern.exec(text)) !== null) {
            const varName = match[1];
            if (!definedVariables.has(varName)) {
                const startIndex = match.index + 4; // 4 = 'var.'.length
                const availableVars = Array.from(definedVariables);
                let message = `Variable "${varName}" is not defined`;
                if (availableVars.length > 0) {
                    message += `. Available: ${availableVars.slice(0, 5).join(', ')}${availableVars.length > 5 ? '...' : ''}`;
                }
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNum, startIndex, lineNum, startIndex + varName.length),
                    message,
                    vscode.DiagnosticSeverity.Warning
                ));
            }
        }
    }

    private validateActionLine(text: string, lineNum: number, diagnostics: vscode.Diagnostic[], definedLists: Set<string>): void {
        // Extract the action content (after the dash)
        const match = text.match(/^\s*-\s*(.+)$/);
        if (!match) return;

        const actionContent = match[1];

        // Check for unbalanced parentheses
        const openParens = (actionContent.match(/\(/g) || []).length;
        const closeParens = (actionContent.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(lineNum, 0, lineNum, text.length),
                `Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`,
                vscode.DiagnosticSeverity.Error
            ));
        }

        // Check for if= without condition
        if (/,if=\s*(,|$)/.test(actionContent)) {
            const ifIndex = text.indexOf(',if=');
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(lineNum, ifIndex, lineNum, ifIndex + 4),
                'Empty condition after if=',
                vscode.DiagnosticSeverity.Error
            ));
        }

        // Check for double operators
        if (/[&|]{3,}/.test(actionContent)) {
            const match = actionContent.match(/[&|]{3,}/);
            if (match) {
                const index = text.indexOf(match[0]);
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNum, index, lineNum, index + match[0].length),
                    'Invalid operator sequence',
                    vscode.DiagnosticSeverity.Error
                ));
            }
        }

        // Check for trailing operators
        if (/[&|]\s*(,|$)/.test(actionContent)) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(lineNum, 0, lineNum, text.length),
                'Condition ends with an operator',
                vscode.DiagnosticSeverity.Warning
            ));
        }

        // Check for leading operators in condition
        if (/,if=[&|]/.test(actionContent)) {
            const ifIndex = text.indexOf(',if=');
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(lineNum, ifIndex, lineNum, ifIndex + 5),
                'Condition starts with an operator (use ! for negation)',
                vscode.DiagnosticSeverity.Warning
            ));
        }

        // Check for common mistakes
        if (/\.up\s*=\s*true/i.test(actionContent)) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(lineNum, 0, lineNum, text.length),
                '.up already returns boolean, no need for =true (use just .up)',
                vscode.DiagnosticSeverity.Information
            ));
        }

        if (/\.down\s*=\s*true/i.test(actionContent)) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(lineNum, 0, lineNum, text.length),
                '.down already returns boolean, no need for =true (use just .down)',
                vscode.DiagnosticSeverity.Information
            ));
        }

        // Check for missing spell name
        if (/^\s*-\s*,/.test(text)) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(lineNum, 0, lineNum, text.length),
                'Missing spell name before comma',
                vscode.DiagnosticSeverity.Error
            ));
        }

        // Validate call_action_list/run_action_list has name=
        if ((actionContent.startsWith('call_action_list') || actionContent.startsWith('run_action_list')) && !actionContent.includes('name=')) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(lineNum, 0, lineNum, text.length),
                'call_action_list/run_action_list requires name= parameter',
                vscode.DiagnosticSeverity.Error
            ));
        }

        // Validate call= (alias for call_action_list) has a value
        const callAliasMatch = actionContent.match(/\bcall=(\w*)/);
        if (callAliasMatch && !callAliasMatch[1]) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(lineNum, 0, lineNum, text.length),
                'call= requires a list name',
                vscode.DiagnosticSeverity.Error
            ));
        }

        // Validate call_action_list/run_action_list references an existing list
        let listMatch = actionContent.match(/(?:call|run)_action_list.*name=(\w+)/);
        // Also check for call= syntax
        if (!listMatch && callAliasMatch && callAliasMatch[1]) {
            listMatch = callAliasMatch;
        }
        if (listMatch) {
            const listName = listMatch[1];
            // Skip validation for shared/common lists
            const sharedLists = [
                'spell_queue', 'sanity_checks', 'auto_target', 'auto_heal',
                'variables', 'precombat', 'cooldowns', 'defensives', 'interrupts'
            ];
            if (!definedLists.has(listName) && !sharedLists.includes(listName)) {
                const nameIndex = text.indexOf('name=' + listName) + 5; // +5 for 'name='
                const availableLists = Array.from(definedLists);
                let message = `Action list "${listName}" is not defined`;
                if (availableLists.length > 0) {
                    message += `. Available lists: ${availableLists.join(', ')}`;
                }
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNum, nameIndex, lineNum, nameIndex + listName.length),
                    message,
                    vscode.DiagnosticSeverity.Error
                ));
            }
        }
    }

    private validateSpellNames(text: string, lineNum: number, diagnostics: vscode.Diagnostic[]): void {
        if (!spellDatabase.isLoaded()) return;

        // Patterns that contain spell names: buff.SPELL, debuff.SPELL, cooldown.SPELL, dot.SPELL, etc.
        const patterns = [
            { regex: /\bbuff\.(\w+)\./g, type: 'buff' },
            { regex: /\bdebuff\.(\w+)\./g, type: 'debuff' },
            { regex: /\bdot\.(\w+)\./g, type: 'dot' },
            { regex: /\bcooldown\.(\w+)\./g, type: 'cooldown' },
            { regex: /\btotem\.(\w+)\./g, type: 'totem' },
            { regex: /\btalent\.(\w+)/g, type: 'talent' },
            { regex: /\busable\.(\w+)/g, type: 'usable' },
            { regex: /\bactive_dot\.(\w+)/g, type: 'active_dot' },
            { regex: /\bnameplates\.debuff\.(\w+)\./g, type: 'nameplates.debuff' },
            { regex: /\bnameplates\.buff\.(\w+)\./g, type: 'nameplates.buff' },
            { regex: /\bprev_gcd\.\d\.(\w+)/g, type: 'prev_gcd' },
            // Function-call syntax patterns
            { regex: /\b(?:player|target|focus|mouseover)\.buff\.(?:up|down|remains|stacks)\((\w+)\)/g, type: 'buff function' },
            { regex: /\b(?:player|target|focus|mouseover)\.debuff\.(?:up|down|remains|stacks)\((\w+)\)/g, type: 'debuff function' },
            { regex: /\bplayer\.talent\((\w+)\)/g, type: 'talent function' },
            { regex: /\bplayer\.prev_gcd_[1-5]\((\w+)\)/g, type: 'prev_gcd function' },
        ];

        // Also check action spell names (first word after -)
        const actionMatch = text.match(/^\s*-\s*(\w+)/);
        if (actionMatch) {
            const spellName = actionMatch[1];
            // Skip special actions
            const specialActions = [
                'call_action_list', 'run_action_list', 'return', 'stop_casting', 'queue_spell',
                'trinket_1', 'trinket_2', 'healthstone', 'health_potion',
                'mana_potion', 'combat_potion', 'target_enemy', 'attack_target',
                'weapon_onuse', 'wrist_onuse', 'helm_onuse', 'cloak_onuse', 'belt_onuse',
                'interact_target', 'interact_mouseover', 'loot_a_rang', 'augment_rune',
                'focus_party1', 'focus_party2', 'focus_party3', 'focus_party4',
                'target_mouseover', 'target_focus', 'focus_target', 'focus_mouseover', 'call',
                // focus_raid1 through focus_raid40
                ...Array.from({length: 40}, (_, i) => `focus_raid${i + 1}`)
            ];
            // Skip if it's a spell ID (numeric)
            if (/^\d+$/.test(spellName)) {
                // Valid spell ID
            } else if (!specialActions.includes(spellName) && !spellDatabase.isValidSpell(spellName)) {
                const startIndex = text.indexOf(spellName);
                const similar = spellDatabase.findSimilar(spellName);
                let message = `Unknown spell: "${spellName}"`;
                if (similar.length > 0) {
                    message += `. Did you mean: ${similar.map(s => s.normalizedName).join(', ')}?`;
                }
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNum, startIndex, lineNum, startIndex + spellName.length),
                    message,
                    vscode.DiagnosticSeverity.Warning
                ));
            }
        }

        // Check spell names in expressions
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                const spellName = match[1];
                // Skip template placeholders
                if (spellName === 'SPELL' || spellName === 'TALENT' || spellName === 'VARNAME') {
                    continue;
                }
                // Skip if it's a spell ID (numeric)
                if (/^\d+$/.test(spellName)) {
                    continue;
                }
                if (!spellDatabase.isValidSpell(spellName)) {
                    const startIndex = match.index + match[0].indexOf(spellName);
                    const similar = spellDatabase.findSimilar(spellName);
                    let message = `Unknown spell in ${pattern.type}: "${spellName}"`;
                    if (similar.length > 0) {
                        message += `. Did you mean: ${similar.map(s => s.normalizedName).join(', ')}?`;
                    }
                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(lineNum, startIndex, lineNum, startIndex + spellName.length),
                        message,
                        vscode.DiagnosticSeverity.Warning
                    ));
                }
            }
        }
    }

    private checkCommonTypos(text: string, lineNum: number, diagnostics: vscode.Diagnostic[]): void {
        const typos: Array<{ pattern: RegExp; message: string; severity: vscode.DiagnosticSeverity }> = [
            { pattern: /\bbuf\./g, message: 'Did you mean "buff."?', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\bdebbuf\./g, message: 'Did you mean "debuff."?', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\bcooldonw\./g, message: 'Did you mean "cooldown."?', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\btalant\./g, message: 'Did you mean "talent."?', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\bhealth_pct\b/g, message: 'Did you mean "health.pct"?', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\btarget_health\b/g, message: 'Did you mean "target.health.pct"?', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\bplayer_moving\b/g, message: 'Did you mean "player.moving"?', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\bactive_enemie\b/g, message: 'Did you mean "active_enemies"?', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\bremaning\b/g, message: 'Did you mean "remains"?', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\bstack\s*>/g, message: 'Did you mean ".stack>"?', severity: vscode.DiagnosticSeverity.Information },
            { pattern: /==+/g, message: 'Use single = for equality', severity: vscode.DiagnosticSeverity.Information },
            { pattern: /\band\b/gi, message: 'Use & for AND operator', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\bor\b/gi, message: 'Use | for OR operator', severity: vscode.DiagnosticSeverity.Warning },
            { pattern: /\bnot\s+\w/gi, message: 'Use ! for NOT operator', severity: vscode.DiagnosticSeverity.Warning },
        ];

        for (const typo of typos) {
            let match;
            while ((match = typo.pattern.exec(text)) !== null) {
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNum, match.index, lineNum, match.index + match[0].length),
                    typo.message,
                    typo.severity
                ));
            }
        }
    }
}
