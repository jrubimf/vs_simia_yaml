import * as vscode from 'vscode';
import { EXPRESSIONS, STEP_OPTIONS, SPECIAL_ACTIONS, ExpressionInfo } from './expressions';
import { spellDatabase } from './spellData';

export class RotationCompletionProvider implements vscode.CompletionItemProvider {

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.CompletionItem[] | undefined {
        const line = document.lineAt(position).text;
        const linePrefix = line.substring(0, position.character);

        // Check if we're in an action line (starts with -)
        const isActionLine = line.trimStart().startsWith('-');

        // Check context
        const inIfCondition = /,if=/.test(linePrefix) || /if:\s*/.test(linePrefix);
        const inVariables = this.isInSection(document, position, 'variables:');
        const inMovementAllowed = linePrefix.includes('movement_allowed:');

        // After if= or in variables section, provide expression completions
        if (inIfCondition || inVariables || inMovementAllowed) {
            return this.getExpressionCompletions(linePrefix, position, document);
        }

        // At start of action line, provide spell/action completions
        if (isActionLine && !linePrefix.includes(',')) {
            return this.getActionCompletions();
        }

        // After comma, provide step options
        if (isActionLine && linePrefix.includes(',') && !inIfCondition) {
            return this.getStepOptionCompletions(linePrefix, document);
        }

        // In lists section keys
        if (this.isInSection(document, position, 'lists:') && !isActionLine) {
            return this.getListNameCompletions();
        }

        // Root level keys
        if (position.character === 0 || linePrefix.trim() === '') {
            return this.getRootKeyCompletions();
        }

        return undefined;
    }

    private getExpressionCompletions(linePrefix: string, position: vscode.Position, document?: vscode.TextDocument): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        // Get the current expression context (what's after if= or &/|)
        const match = linePrefix.match(/(?:if=|&|\|)([^&|]*)$/);
        const currentExpr = match ? match[1] : '';

        // Determine context from prefix
        const isNegated = currentExpr.startsWith('!');
        const exprWithoutNegation = isNegated ? currentExpr.slice(1) : currentExpr;

        // Add expressions based on what's typed
        for (const [key, info] of Object.entries(EXPRESSIONS)) {
            if (key.startsWith(exprWithoutNegation) || exprWithoutNegation === '') {
                const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
                item.detail = info.type;
                item.documentation = new vscode.MarkdownString(info.description);
                if (info.example) {
                    item.documentation.appendCodeblock(info.example, 'yaml');
                }
                items.push(item);
            }
        }

        // Add spell name completions from database
        const spellContextMatch = exprWithoutNegation.match(/^(buff|debuff|dot|cooldown|totem|talent|usable|active_dot)\.(\w*)$/);
        if (spellContextMatch) {
            const [, contextType, partial] = spellContextMatch;
            items.push(...this.getSpellNameCompletions(contextType, partial));
        }
        const nameplateSpellMatch = exprWithoutNegation.match(/^nameplates\.(buff|debuff)\.(\w*)$/);
        if (nameplateSpellMatch) {
            const [, auraType, partial] = nameplateSpellMatch;
            items.push(...this.getSpellNameCompletions(`nameplates.${auraType}`, partial));
        }

        // Add config variable completions (config.xxx)
        const configMatch = exprWithoutNegation.match(/^config\.(\w*)$/);
        if (configMatch && document) {
            const partial = configMatch[1];
            items.push(...this.getConfigVarCompletions(document, partial));
        }

        // Add variable completions (var.xxx)
        const varMatch = exprWithoutNegation.match(/^var\.(\w*)$/);
        if (varMatch && document) {
            const partial = varMatch[1];
            items.push(...this.getVariableCompletions(document, partial));
        }

        // Add spell-template completions for buff/debuff/cooldown etc (property completions)
        if (exprWithoutNegation.startsWith('buff.') && exprWithoutNegation.split('.').length === 3) {
            items.push(...this.getAuraPropertyCompletions('buff'));
        }
        if (exprWithoutNegation.startsWith('debuff.') && exprWithoutNegation.split('.').length === 3) {
            items.push(...this.getAuraPropertyCompletions('debuff'));
        }
        if (exprWithoutNegation.startsWith('dot.') && exprWithoutNegation.split('.').length === 3) {
            items.push(...this.getAuraPropertyCompletions('dot'));
        }
        if (exprWithoutNegation.startsWith('cooldown.') && exprWithoutNegation.split('.').length === 3) {
            items.push(...this.getCooldownPropertyCompletions());
        }
        if (exprWithoutNegation.startsWith('totem.') && exprWithoutNegation.split('.').length === 3) {
            items.push(...this.getTotemPropertyCompletions());
        }
        if (/^nameplates\.debuff\.\w+\.\w*$/.test(exprWithoutNegation)) {
            items.push(...this.getNameplateDebuffPropertyCompletions());
        }

        items.push(...this.getAnySuffixCompletions(exprWithoutNegation));

        // Add operators
        items.push(...this.getOperatorCompletions());

        return items;
    }

    private getAuraPropertyCompletions(prefix: string): vscode.CompletionItem[] {
        const playerOnlyNote = (prefix === 'buff' || prefix === 'debuff')
            ? ' (player-applied by default; use .any for any source)'
            : '';

        const properties = [
            { name: 'up', desc: `Aura is active (returns 1/0)${playerOnlyNote}` },
            { name: 'down', desc: `Aura is NOT active${playerOnlyNote}` },
            { name: 'remains', desc: `Time remaining in seconds${playerOnlyNote}` },
            { name: 'stack', desc: `Current stack count${playerOnlyNote}` },
            { name: 'duration', desc: `Base duration of the aura${playerOnlyNote}` },
            { name: 'refreshable', desc: `Aura can be refreshed (pandemic window)${playerOnlyNote}` },
            { name: 'react', desc: `Aura is active (same as .up)${playerOnlyNote}` },
            { name: 'mine', desc: 'Aura was applied by player' },
            { name: 'magic', desc: 'Aura is Magic dispel type' },
            { name: 'curse', desc: 'Aura is Curse dispel type' },
            { name: 'disease', desc: 'Aura is Disease dispel type' },
            { name: 'poison', desc: 'Aura is Poison dispel type' },
        ];

        return properties.map(p => {
            const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
            item.detail = `${prefix}.SPELL.${p.name}`;
            item.documentation = p.desc;
            return item;
        });
    }

    private getCooldownPropertyCompletions(): vscode.CompletionItem[] {
        const properties = [
            { name: 'ready', desc: 'Spell is ready to cast (off cooldown)' },
            { name: 'up', desc: 'Same as .ready' },
            { name: 'down', desc: 'Spell is on cooldown' },
            { name: 'remains', desc: 'Time until ready in seconds' },
            { name: 'charges', desc: 'Current charge count' },
            { name: 'max_charges', desc: 'Maximum charges' },
            { name: 'full_recharge_time', desc: 'Time until all charges restored' },
            { name: 'charges_fractional', desc: 'Charges including partial progress' },
        ];

        return properties.map(p => {
            const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
            item.detail = `cooldown.SPELL.${p.name}`;
            item.documentation = p.desc;
            return item;
        });
    }

    private getTotemPropertyCompletions(): vscode.CompletionItem[] {
        const properties = [
            { name: 'up', desc: 'Totem is active' },
            { name: 'remains', desc: 'Time until totem expires' },
        ];

        return properties.map(p => {
            const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
            item.detail = `totem.SPELL.${p.name}`;
            item.documentation = p.desc;
            return item;
        });
    }

    private getNameplateDebuffPropertyCompletions(): vscode.CompletionItem[] {
        const properties = [
            { name: 'count', desc: 'Count of nameplates with this debuff (player-applied by default; use .any for any source)' },
        ];

        return properties.map(p => {
            const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
            item.detail = `nameplates.debuff.SPELL.${p.name}`;
            item.documentation = p.desc;
            return item;
        });
    }

    private getAnySuffixCompletions(exprWithoutNegation: string): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        const buffDebuffAnyMatch = exprWithoutNegation.match(/^(buff|debuff)\.\w+\.\w+\.(\w*)$/);
        if (buffDebuffAnyMatch) {
            const partial = buffDebuffAnyMatch[2] ?? '';
            if ('any'.startsWith(partial)) {
                const item = new vscode.CompletionItem('any', vscode.CompletionItemKind.Keyword);
                item.detail = `${buffDebuffAnyMatch[1]}.SPELL.property.any`;
                item.documentation = 'Check auras from any source (not just player-applied)';
                items.push(item);
            }
        }

        const activeDotAnyMatch = exprWithoutNegation.match(/^active_dot\.\w+\.(\w*)$/);
        if (activeDotAnyMatch) {
            const partial = activeDotAnyMatch[1] ?? '';
            if ('any'.startsWith(partial)) {
                const item = new vscode.CompletionItem('any', vscode.CompletionItemKind.Keyword);
                item.detail = 'active_dot.SPELL.any';
                item.documentation = 'Count DoTs from any source (not just player-applied)';
                items.push(item);
            }
        }

        const nameplateDebuffAnyMatch = exprWithoutNegation.match(/^nameplates\.debuff\.\w+\.count\.(\w*)$/);
        if (nameplateDebuffAnyMatch) {
            const partial = nameplateDebuffAnyMatch[1] ?? '';
            if ('any'.startsWith(partial)) {
                const item = new vscode.CompletionItem('any', vscode.CompletionItemKind.Keyword);
                item.detail = 'nameplates.debuff.SPELL.count.any';
                item.documentation = 'Count debuffs from any source (not just player-applied)';
                items.push(item);
            }
        }

        return items;
    }

    /**
     * Get config variable completions from the document's config: section
     */
    private getConfigVarCompletions(document: vscode.TextDocument, partial: string): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const configVars = this.collectConfigVars(document);

        for (const varName of configVars) {
            if (varName.startsWith(partial) || partial === '') {
                const item = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
                item.detail = 'Config variable';
                item.documentation = `User-configurable variable defined in config: section`;
                items.push(item);
            }
        }

        return items;
    }

    /**
     * Get variable completions from the document's variables: section
     */
    private getVariableCompletions(document: vscode.TextDocument, partial: string): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const variables = this.collectVariables(document);

        for (const varName of variables) {
            if (varName.startsWith(partial) || partial === '') {
                const item = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
                item.detail = 'Variable';
                item.documentation = `Expression variable defined in variables: section`;
                items.push(item);
            }
        }

        return items;
    }

    /**
     * Collect config variable names from the document
     */
    private collectConfigVars(document: vscode.TextDocument): Set<string> {
        const configVars = new Set<string>();
        let inConfigSection = false;

        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            const text = document.lineAt(lineNum).text;

            if (/^config:\s*$/.test(text)) {
                inConfigSection = true;
                continue;
            }

            if (inConfigSection && /^[a-z_]+:\s*$/.test(text) && !text.startsWith(' ')) {
                inConfigSection = false;
                continue;
            }

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
     * Collect variable names from the document
     */
    private collectVariables(document: vscode.TextDocument): Set<string> {
        const variables = new Set<string>();
        let inVariablesSection = false;

        for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
            const text = document.lineAt(lineNum).text;

            if (/^variables:\s*$/.test(text)) {
                inVariablesSection = true;
                continue;
            }

            if (inVariablesSection && /^[a-z_]+:\s*$/.test(text) && !text.startsWith(' ')) {
                inVariablesSection = false;
                continue;
            }

            if (inVariablesSection) {
                const varMatch = text.match(/^\s{2}(\w+):/);
                if (varMatch) {
                    variables.add(varMatch[1]);
                }
            }
        }

        return variables;
    }

    private getSpellNameCompletions(contextType: string, partial: string): vscode.CompletionItem[] {
        if (!spellDatabase.isLoaded()) {
            return [];
        }

        const spells = spellDatabase.searchSpells(partial, 30);
        return spells.map(spell => {
            const item = new vscode.CompletionItem(spell.normalizedName, vscode.CompletionItemKind.Value);
            item.detail = `${spell.name} (ID: ${spell.id})`;
            item.documentation = `Use in ${contextType}.${spell.normalizedName}.property`;
            item.insertText = spell.normalizedName;
            return item;
        });
    }

    private getOperatorCompletions(): vscode.CompletionItem[] {
        const operators = [
            { op: '&', desc: 'AND - both conditions must be true' },
            { op: '|', desc: 'OR - either condition must be true' },
            { op: '!', desc: 'NOT - negates the condition' },
            { op: '<', desc: 'Less than' },
            { op: '<=', desc: 'Less than or equal' },
            { op: '>', desc: 'Greater than' },
            { op: '>=', desc: 'Greater than or equal' },
            { op: '=', desc: 'Equal' },
            { op: '!=', desc: 'Not equal' },
            { op: '>?', desc: 'Min (SimC style: a>?b returns min(a,b))' },
            { op: '<?', desc: 'Max (SimC style: a<?b returns max(a,b))' },
        ];

        return operators.map(o => {
            const item = new vscode.CompletionItem(o.op, vscode.CompletionItemKind.Operator);
            item.documentation = o.desc;
            return item;
        });
    }

    private getActionCompletions(): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        for (const [action, desc] of Object.entries(SPECIAL_ACTIONS)) {
            if (action === 'call_action_list' || action === 'run_action_list') {
                continue;
            }
            const item = new vscode.CompletionItem(action, vscode.CompletionItemKind.Function);
            item.documentation = desc;
            item.detail = 'Special Action';
            items.push(item);
        }

        // Add call_action_list
        const callList = new vscode.CompletionItem('call_action_list', vscode.CompletionItemKind.Function);
        callList.documentation = 'Call another action list';
        callList.insertText = new vscode.SnippetString('call_action_list,name=${1:list_name}');
        items.push(callList);

        // Add run_action_list
        const runList = new vscode.CompletionItem('run_action_list', vscode.CompletionItemKind.Function);
        runList.documentation = 'Run an action list and restart rotation';
        runList.insertText = new vscode.SnippetString('run_action_list,name=${1:list_name}');
        items.push(runList);

        return items;
    }

    private getStepOptionCompletions(linePrefix: string, document?: vscode.TextDocument): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        // Check if we're typing a value for a step option (e.g., range_check=)
        const valueMatch = linePrefix.match(/(\w+)=(\w*)$/);
        if (valueMatch) {
            const [, optionName, partial] = valueMatch;

            // Special handling for name= after call_action_list/run_action_list - provide defined list names
            if (optionName === 'name' && (linePrefix.includes('call_action_list') || linePrefix.includes('run_action_list')) && document) {
                const definedLists = this.collectDefinedLists(document);

                // Add shared/common lists
                const sharedLists = [
                    { name: 'spell_queue', desc: 'Shared spell queue handling (_shared.yaml)' },
                    { name: 'sanity_checks', desc: 'Shared sanity check conditions (_shared.yaml)' },
                    { name: 'auto_target', desc: 'Shared auto-targeting logic (_shared.yaml)' },
                    { name: 'auto_heal', desc: 'Shared auto-heal logic (_shared.yaml)' },
                    { name: 'variables', desc: 'Common list for setting/updating variables' },
                ];

                for (const shared of sharedLists) {
                    if (shared.name.startsWith(partial) || partial === '') {
                        const item = new vscode.CompletionItem(shared.name, vscode.CompletionItemKind.Module);
                        item.detail = 'Shared action list (_shared.yaml)';
                        item.documentation = shared.desc;
                        items.push(item);
                    }
                }

                for (const listName of definedLists) {
                    if (listName.startsWith(partial) || partial === '') {
                        const item = new vscode.CompletionItem(listName, vscode.CompletionItemKind.Module);
                        item.detail = 'Defined action list';
                        item.documentation = `Call the "${listName}" action list`;
                        items.push(item);
                    }
                }
                return items;
            }

            const optionInfo = STEP_OPTIONS[optionName];
            if (optionInfo && optionInfo.values) {
                // Provide value completions
                for (const value of optionInfo.values) {
                    if (value.startsWith(partial) || partial === '') {
                        const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember);
                        item.detail = `${optionName} value`;
                        item.documentation = `Set ${optionName} to ${value}`;
                        items.push(item);
                    }
                }
                return items;
            }
        }

        for (const [option, info] of Object.entries(STEP_OPTIONS)) {
            // Skip if already present
            if (linePrefix.includes(option + '=')) continue;

            const item = new vscode.CompletionItem(option, vscode.CompletionItemKind.Property);
            item.documentation = new vscode.MarkdownString(info.description);
            if (info.values) {
                item.documentation.appendText('\n\nValues: ' + info.values.join(', '));
            }
            if (info.snippet) {
                item.insertText = new vscode.SnippetString(info.snippet);
            } else {
                item.insertText = new vscode.SnippetString(`${option}=\${1}`);
            }
            items.push(item);
        }

        // Always suggest if= last
        if (!linePrefix.includes(',if=')) {
            const ifItem = new vscode.CompletionItem('if', vscode.CompletionItemKind.Keyword);
            ifItem.documentation = 'Condition for this action';
            ifItem.insertText = new vscode.SnippetString('if=${1:condition}');
            ifItem.sortText = 'zzz'; // Sort last
            items.push(ifItem);
        }

        return items;
    }

    private getListNameCompletions(): vscode.CompletionItem[] {
        const commonLists = [
            'main', 'cooldowns', 'aoe', 'single_target', 'defensives',
            'opener', 'execute', 'cleave', 'filler', 'interrupts'
        ];

        return commonLists.map(name => {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Module);
            item.insertText = new vscode.SnippetString(`${name}:\n  - \${1:spell}`);
            return item;
        });
    }

    private getRootKeyCompletions(): vscode.CompletionItem[] {
        const rootKeys = [
            { key: 'movement_allowed', desc: 'Expression for when casting while moving is allowed' },
            { key: 'variables', desc: 'Define reusable expressions' },
            { key: 'config', desc: 'User-configurable settings (sliders, checkboxes, dropdowns)' },
            { key: 'lists', desc: 'Define action lists' },
            { key: 'actions', desc: 'Main action list (alternative to lists.main)' },
            { key: 'tier_sets', desc: 'Define tier set item IDs for set_bonus checks' },
        ];

        return rootKeys.map(k => {
            const item = new vscode.CompletionItem(k.key, vscode.CompletionItemKind.Struct);
            item.documentation = k.desc;
            item.insertText = new vscode.SnippetString(`${k.key}:\n  \${1}`);
            return item;
        });
    }

    private isInSection(document: vscode.TextDocument, position: vscode.Position, sectionName: string): boolean {
        for (let i = position.line; i >= 0; i--) {
            const lineText = document.lineAt(i).text;
            if (lineText.startsWith(sectionName)) {
                return true;
            }
            // Check if we hit another root section
            if (/^[a-z_]+:/.test(lineText) && !lineText.startsWith(' ')) {
                return lineText.startsWith(sectionName);
            }
        }
        return false;
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
}
