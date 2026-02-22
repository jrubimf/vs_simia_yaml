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

        // In config section (config variable properties)
        if (this.isInSection(document, position, 'config:')) {
            return this.getConfigSectionCompletions(linePrefix, document, position);
        }

        return undefined;
    }

    private getConfigSectionCompletions(linePrefix: string, document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
        const items: vscode.CompletionItem[] = [];

        // Check indentation level to determine context
        const indent = linePrefix.match(/^(\s*)/)?.[1].length ?? 0;

        // At 2-space indent, we're defining a config variable name
        if (indent === 2 && !linePrefix.trim().includes(':')) {
            // User is typing a new config variable name - no completions needed
            return undefined;
        }

        // At 4-space indent, we're defining config variable properties
        if (indent >= 4) {
            const configProps = [
                { name: 'type', desc: 'Widget type: slider, checkbox, or dropdown' },
                { name: 'label', desc: 'Display label for the UI' },
                { name: 'default', desc: 'Default value' },
                { name: 'min', desc: 'Minimum value (slider only)' },
                { name: 'max', desc: 'Maximum value (slider only)' },
                { name: 'options', desc: 'Dropdown options array' },
            ];

            // Check if we're typing a value for type=
            const typeMatch = linePrefix.match(/type:\s*(\w*)$/);
            if (typeMatch) {
                const partial = typeMatch[1];
                const types = [
                    { name: 'slider', desc: 'Numeric slider with min/max values' },
                    { name: 'checkbox', desc: 'Boolean checkbox (true/false)' },
                    { name: 'dropdown', desc: 'Single-select dropdown menu' },
                    { name: 'multi_select', desc: 'Multi-select dropdown (allows multiple options)' },
                ];
                return types
                    .filter(t => t.name.startsWith(partial) || partial === '')
                    .map(t => {
                        const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.EnumMember);
                        item.detail = `Config widget type`;
                        item.documentation = t.desc;
                        return item;
                    });
            }

            return configProps.map(p => {
                const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
                item.documentation = p.desc;
                if (p.name === 'type') {
                    item.insertText = new vscode.SnippetString('type: ${1|slider,checkbox,dropdown,multi_select|}');
                } else if (p.name === 'options') {
                    item.insertText = new vscode.SnippetString('options:\n        - label: "${1:Option 1}"\n          value: ${2:1}');
                } else if (p.name === 'default') {
                    // For multi_select, default is an array of indices
                    item.documentation = 'Default value. For multi_select, use array of indices: [0, 2]';
                    item.insertText = new vscode.SnippetString(`${p.name}: \${1}`);
                } else {
                    item.insertText = new vscode.SnippetString(`${p.name}: \${1}`);
                }
                return item;
            });
        }

        return undefined;
    }

    private getExpressionCompletions(linePrefix: string, position: vscode.Position, document?: vscode.TextDocument): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        // Get the current expression context (what's after if= or &/|)
        const match = linePrefix.match(/(?:if=|&|\|)([^&|]*)$/);
        let currentExpr = match ? match[1] : '';

        // Fallback for variables/movement_allowed context: scan backward for expression token
        if (!match) {
            let tokenStart = position.character;
            while (tokenStart > 0 && /[a-zA-Z0-9._]/.test(linePrefix[tokenStart - 1])) {
                tokenStart--;
            }
            currentExpr = linePrefix.substring(tokenStart, position.character);
        }

        // Determine context from prefix
        const isNegated = currentExpr.startsWith('!');
        const exprWithoutNegation = isNegated ? currentExpr.slice(1) : currentExpr;

        // Compute replacement range covering the full typed expression (including dots)
        // This prevents double-insertion like target.target.moving
        const replaceStart = position.character - exprWithoutNegation.length;
        const replaceRange = new vscode.Range(position.line, replaceStart, position.line, position.character);

        // Add expressions based on what's typed
        for (const [key, info] of Object.entries(EXPRESSIONS)) {
            if (key.startsWith(exprWithoutNegation) || exprWithoutNegation === '') {
                const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
                item.detail = info.type;
                item.documentation = new vscode.MarkdownString(info.description);
                if (info.example) {
                    item.documentation.appendCodeblock(info.example, 'yaml');
                }
                item.range = replaceRange;
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

        // Add config variable completions (config.xxx and settings.xxx)
        const configMatch = exprWithoutNegation.match(/^(config|settings)\.(\w*)$/);
        if (configMatch && document) {
            const partial = configMatch[2];
            items.push(...this.getConfigVarCompletions(document, partial, configMatch[1]));
        }

        // Add config.NAME.has() and settings.NAME.has() completion for multi_select types
        const configHasMatch = exprWithoutNegation.match(/^(config|settings)\.(\w+)\.(\w*)$/);
        if (configHasMatch) {
            const partial = configHasMatch[3] ?? '';
            if ('has'.startsWith(partial)) {
                const item = new vscode.CompletionItem('has', vscode.CompletionItemKind.Method);
                item.detail = `${configHasMatch[1]}.${configHasMatch[2]}.has(VALUE)`;
                item.documentation = 'For multi_select config: returns 1 if VALUE (number or label) is selected, 0 otherwise';
                item.insertText = new vscode.SnippetString('has(${1:value})');
                items.push(item);
            }
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
        const nameplatePropMatch = exprWithoutNegation.match(/^nameplates\.(buff|debuff)\.\w+\.\w*$/);
        if (nameplatePropMatch) {
            items.push(...this.getNameplateAuraPropertyCompletions(nameplatePropMatch[1] as 'buff' | 'debuff'));
        }

        items.push(...this.getAnySuffixCompletions(exprWithoutNegation));

        // Add cycle.* completions
        const cycleMatch = exprWithoutNegation.match(/^cycle\.(\w*)$/);
        if (cycleMatch) {
            items.push(...this.getCycleCompletions(cycleMatch[1]));
        }
        const cycleAuraMatch = exprWithoutNegation.match(/^cycle\.(buff|debuff)\.(\w*)$/);
        if (cycleAuraMatch) {
            const [, auraType, partial] = cycleAuraMatch;
            items.push(...this.getSpellNameCompletions(`cycle.${auraType}`, partial));
        }
        const cycleAuraPropMatch = exprWithoutNegation.match(/^cycle\.(buff|debuff)\.\w+\.(\w*)$/);
        if (cycleAuraPropMatch) {
            items.push(...this.getCycleAuraPropertyCompletions(cycleAuraPropMatch[1] as 'buff' | 'debuff'));
        }

        // Add one_button_assistant completions
        const obaMatch = exprWithoutNegation.match(/^one_button_assistant\.(\w*)$/);
        if (obaMatch) {
            items.push(...this.getSpellNameCompletions('one_button_assistant', obaMatch[1]));
        }
        const obaPropMatch = exprWithoutNegation.match(/^one_button_assistant\.\w+\.(\w*)$/);
        if (obaPropMatch) {
            const partial = obaPropMatch[1] ?? '';
            if ('elapsed'.startsWith(partial)) {
                const item = new vscode.CompletionItem('elapsed', vscode.CompletionItemKind.Property);
                item.detail = 'one_button_assistant.SPELL.elapsed';
                item.documentation = 'Seconds since spell was last shown (999 if never)';
                items.push(item);
            }
        }

        // Add group.buff/missing completions
        const groupAuraMatch = exprWithoutNegation.match(/^group\.(buff|missing)\.(\w*)$/);
        if (groupAuraMatch) {
            const [, auraType, partial] = groupAuraMatch;
            items.push(...this.getSpellNameCompletions(`group.${auraType}`, partial));
        }

        // Add unit.buff/debuff spell completions (player/target/focus/mouseover/pet)
        const unitAuraMatch = exprWithoutNegation.match(/^(player|target|focus|mouseover|pet)\.(buff|debuff)\.(\w*)$/);
        if (unitAuraMatch) {
            const [, unit, auraType, partial] = unitAuraMatch;
            items.push(...this.getSpellNameCompletions(`${unit}.${auraType}`, partial));
        }

        // Add unit.buff/debuff property completions
        const unitAuraPropMatch = exprWithoutNegation.match(/^(player|target|focus|mouseover|pet)\.(buff|debuff)\.\w+\.(\w*)$/);
        if (unitAuraPropMatch) {
            items.push(...this.getUnitAuraPropertyCompletions(unitAuraPropMatch[2] as 'buff' | 'debuff'));
        }

        // Add group.lowest.buff/debuff completions
        const groupLowestAuraMatch = exprWithoutNegation.match(/^group\.lowest\.(buff|debuff)\.(\w*)$/);
        if (groupLowestAuraMatch) {
            const [, auraType, partial] = groupLowestAuraMatch;
            items.push(...this.getSpellNameCompletions(`group.lowest.${auraType}`, partial));
        }

        // Add group.lowest.buff/debuff property completions
        const groupLowestAuraPropMatch = exprWithoutNegation.match(/^group\.lowest\.(buff|debuff)\.\w+\.(\w*)$/);
        if (groupLowestAuraPropMatch) {
            items.push(...this.getGroupLowestAuraPropertyCompletions());
        }

        // Add pet.buff/debuff spell completions
        const petAuraMatch = exprWithoutNegation.match(/^pet\.(buff|debuff)\.(\w*)$/);
        if (petAuraMatch) {
            const [, auraType, partial] = petAuraMatch;
            items.push(...this.getSpellNameCompletions(`pet.${auraType}`, partial));
        }

        // Add operators
        items.push(...this.getOperatorCompletions());

        return items;
    }

    private getCycleCompletions(partial: string): vscode.CompletionItem[] {
        const cycleProps = [
            { name: 'health.current', desc: 'Current cycle member health value' },
            { name: 'health.max', desc: 'Current cycle member max health' },
            { name: 'health.pct', desc: 'Current cycle member health percentage' },
            { name: 'health.deficit', desc: 'Current cycle member missing HP' },
            { name: 'range', desc: 'Range to current cycle member' },
            { name: 'dead', desc: 'Current cycle member is dead' },
            { name: 'alive', desc: 'Current cycle member is alive' },
            { name: 'guid', desc: 'Current cycle member has a GUID' },
            { name: 'buff', desc: 'Check buff on current cycle member' },
            { name: 'debuff', desc: 'Check debuff on current cycle member' },
            { name: 'dispelable', desc: 'Check dispellable debuff on cycle member' },
        ];

        return cycleProps
            .filter(p => p.name.startsWith(partial) || partial === '')
            .map(p => {
                const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
                item.detail = `cycle.${p.name}`;
                item.documentation = p.desc;
                return item;
            });
    }

    private getCycleAuraPropertyCompletions(auraType: 'buff' | 'debuff'): vscode.CompletionItem[] {
        const properties = [
            { name: 'up', desc: `Cycle member has ${auraType} (player-applied by default)` },
            { name: 'down', desc: `Cycle member missing ${auraType}` },
            { name: 'remains', desc: `${auraType} time remaining on cycle member` },
            { name: 'elapsed', desc: `Time since ${auraType} applied on cycle member` },
            { name: 'stack', desc: `${auraType} stacks on cycle member` },
            { name: 'mine', desc: `Cycle member has player-applied ${auraType}` },
        ];

        return properties.map(p => {
            const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
            item.detail = `cycle.${auraType}.SPELL.${p.name}`;
            item.documentation = p.desc;
            return item;
        });
    }

    private getAuraPropertyCompletions(prefix: string): vscode.CompletionItem[] {
        const playerOnlyNote = (prefix === 'buff' || prefix === 'debuff' || prefix === 'dot')
            ? ' (player-applied by default; use .any for any source)'
            : '';

        const commonAuraProps = [
            { name: 'remains', desc: `Time remaining in seconds${playerOnlyNote}` },
            { name: 'elapsed', desc: `Time since application in seconds${playerOnlyNote}` },
            { name: 'stack', desc: `Current stack count${playerOnlyNote}` },
            { name: 'duration', desc: `Base duration of the aura${playerOnlyNote}` },
            { name: 'refreshable', desc: `Aura can be refreshed (pandemic window)${playerOnlyNote}` },
        ];

        const buffDebuffExtras = [
            { name: 'mine', desc: 'Aura was applied by player' },
            { name: 'magic', desc: `Aura is Magic dispel type${playerOnlyNote}` },
            { name: 'curse', desc: `Aura is Curse dispel type${playerOnlyNote}` },
            { name: 'disease', desc: `Aura is Disease dispel type${playerOnlyNote}` },
            { name: 'poison', desc: `Aura is Poison dispel type${playerOnlyNote}` },
            { name: 'stealable', desc: `Aura can be stolen${playerOnlyNote}` },
            { name: 'icon', desc: `Aura icon ID${playerOnlyNote}` },
        ];

        let properties: Array<{ name: string; desc: string }>;
        if (prefix === 'dot') {
            properties = [
                { name: 'ticking', desc: `DoT is active${playerOnlyNote}` },
                ...commonAuraProps,
            ];
        } else if (prefix === 'debuff') {
            properties = [
                { name: 'up', desc: `Aura is active (returns 1/0)${playerOnlyNote}` },
                { name: 'down', desc: `Aura is NOT active${playerOnlyNote}` },
                { name: 'ticking', desc: `Aura is active (alias of .up)${playerOnlyNote}` },
                ...commonAuraProps,
                ...buffDebuffExtras,
            ];
        } else {
            properties = [
                { name: 'up', desc: `Aura is active (returns 1/0)${playerOnlyNote}` },
                { name: 'down', desc: `Aura is NOT active${playerOnlyNote}` },
                { name: 'react', desc: `Aura is active (same as .up)${playerOnlyNote}` },
                ...commonAuraProps,
                ...buffDebuffExtras,
            ];
        }

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

    private getNameplateAuraPropertyCompletions(auraType: 'buff' | 'debuff'): vscode.CompletionItem[] {
        const properties = [
            { name: 'count', desc: `Count of nameplates with this ${auraType} (player-applied by default; use .any for any source)` },
            { name: 'lowest', desc: `Lowest remaining ${auraType} duration on nameplates (player-applied by default; use .any for any source)` },
            { name: 'highest', desc: `Highest remaining ${auraType} duration on nameplates (player-applied by default; use .any for any source)` },
        ];

        return properties.map(p => {
            const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
            item.detail = `nameplates.${auraType}.SPELL.${p.name}`;
            item.documentation = p.desc;
            return item;
        });
    }

    private getUnitAuraPropertyCompletions(auraType: 'buff' | 'debuff'): vscode.CompletionItem[] {
        const properties = [
            { name: 'up', desc: `Unit has ${auraType}` },
            { name: 'down', desc: `Unit does not have ${auraType}` },
            { name: 'remains', desc: `${auraType} time remaining` },
            { name: 'elapsed', desc: `Time since ${auraType} applied` },
            { name: 'stack', desc: `${auraType} stack count` },
        ];

        return properties.map(p => {
            const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
            item.detail = `unit.${auraType}.SPELL.${p.name}`;
            item.documentation = p.desc;
            return item;
        });
    }

    private getGroupLowestAuraPropertyCompletions(): vscode.CompletionItem[] {
        const properties = [
            { name: 'up', desc: 'Lowest member has this buff/debuff' },
            { name: 'remains', desc: 'Buff/debuff time remaining on lowest member' },
        ];

        return properties.map(p => {
            const item = new vscode.CompletionItem(p.name, vscode.CompletionItemKind.Property);
            item.detail = `group.lowest.buff/debuff.SPELL.${p.name}`;
            item.documentation = p.desc;
            return item;
        });
    }

    private getAnySuffixCompletions(exprWithoutNegation: string): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        const buffDebuffAnyMatch = exprWithoutNegation.match(/^(buff|debuff|dot)\.\w+\.\w+\.(\w*)$/);
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

        const nameplateAuraAnyMatch = exprWithoutNegation.match(/^nameplates\.(buff|debuff)\.\w+\.(count|lowest|highest)\.(\w*)$/);
        if (nameplateAuraAnyMatch) {
            const partial = nameplateAuraAnyMatch[3] ?? '';
            if ('any'.startsWith(partial)) {
                const item = new vscode.CompletionItem('any', vscode.CompletionItemKind.Keyword);
                item.detail = `nameplates.${nameplateAuraAnyMatch[1]}.SPELL.${nameplateAuraAnyMatch[2]}.any`;
                item.documentation = 'Use auras from any source (not just player-applied)';
                items.push(item);
            }
        }

        return items;
    }

    /**
     * Get config variable completions from the document's config: section
     */
    private getConfigVarCompletions(document: vscode.TextDocument, partial: string, prefix: string = 'config'): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const configVars = this.collectConfigVars(document);

        for (const varName of configVars) {
            if (varName.startsWith(partial) || partial === '') {
                const item = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);
                item.detail = prefix === 'settings' ? 'Config variable (legacy alias)' : 'Config variable';
                item.documentation = `User-configurable variable defined in config: section.\n\nFor multi_select type, use .has(VALUE) to check if an option is selected.`;
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

            // Special handling for name= after call_action_list/run_action_list OR call= - provide defined list names
            if ((optionName === 'name' && (linePrefix.includes('call_action_list') || linePrefix.includes('run_action_list'))) || optionName === 'call') {
                if (!document) return items;
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
            { key: 'morphs', desc: 'Define spell morph variants (base_spell: morph_variant)' },
            { key: 'entry', desc: 'Entry point list name (defaults to "main")' },
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
