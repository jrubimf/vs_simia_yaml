import * as vscode from 'vscode';
import { EXPRESSIONS, STEP_OPTIONS, SPECIAL_ACTIONS } from './expressions';

// Expressions that become context-sensitive in cycle= context
const CYCLE_CONTEXT_EXPRESSIONS: Record<string, { type: string; description: string; example?: string }> = {
    'health': { type: 'cycle', description: 'Current cycle member health percentage (0-100)', example: 'if=health<50' },
    'health.pct': { type: 'cycle', description: 'Current cycle member health percentage', example: 'if=health.pct<=30' },
    'range': { type: 'cycle', description: 'Range to current cycle member in yards', example: 'if=range<=40' },
    'dead': { type: 'cycle', description: 'Current cycle member is dead', example: 'if=!dead' },
};

export class RotationHoverProvider implements vscode.HoverProvider {

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.Hover | undefined {
        const line = document.lineAt(position).text;
        const wordRange = document.getWordRangeAtPosition(position, /[\w._]+/);

        if (!wordRange) {
            return undefined;
        }

        const word = document.getText(wordRange);

        // Check if line has cycle= context
        const hasCycleContext = /cycle\s*=\s*(members|tanks|healers|dps)/.test(line);

        // Check for cycle-context-sensitive expressions first
        if (hasCycleContext && CYCLE_CONTEXT_EXPRESSIONS[word]) {
            return this.createCycleContextHover(word, CYCLE_CONTEXT_EXPRESSIONS[word]);
        }

        // Check for exact expression match
        if (EXPRESSIONS[word]) {
            return this.createExpressionHover(word, EXPRESSIONS[word]);
        }

        // Check for template matches (buff.X.up, cooldown.X.ready, etc)
        const templateMatch = this.matchTemplate(word, hasCycleContext);
        if (templateMatch) {
            return templateMatch;
        }

        // Check for step options
        const optionMatch = word.match(/^(\w+)$/);
        if (optionMatch && STEP_OPTIONS[optionMatch[1]]) {
            return this.createStepOptionHover(optionMatch[1], STEP_OPTIONS[optionMatch[1]]);
        }

        // Check for special actions
        if (SPECIAL_ACTIONS[word]) {
            return this.createActionHover(word, SPECIAL_ACTIONS[word]);
        }

        // Check for operators in context
        const charAtPos = line[position.character];
        const operatorHover = this.getOperatorHover(charAtPos, line, position.character);
        if (operatorHover) {
            return operatorHover;
        }

        return undefined;
    }

    private createExpressionHover(name: string, info: { type: string; description: string; example?: string }): vscode.Hover {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${name}**\n\n`);
        md.appendMarkdown(`*Type:* \`${info.type}\`\n\n`);
        md.appendMarkdown(info.description);
        if (info.example) {
            md.appendMarkdown('\n\n**Example:**\n');
            md.appendCodeblock(info.example, 'yaml');
        }
        return new vscode.Hover(md);
    }

    private createCycleContextHover(name: string, info: { type: string; description: string; example?: string }): vscode.Hover {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${name}** *(cycle context)*\n\n`);
        md.appendMarkdown(`*Type:* \`${info.type}\`\n\n`);
        md.appendMarkdown(info.description);
        md.appendMarkdown('\n\n⚠️ *This expression is context-sensitive because `cycle=` is present on this line.*');
        if (info.example) {
            md.appendMarkdown('\n\n**Example:**\n');
            md.appendCodeblock(info.example, 'yaml');
        }
        return new vscode.Hover(md);
    }

    private createStepOptionHover(name: string, info: { description: string; values?: string[] }): vscode.Hover {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${name}**\n\n`);
        md.appendMarkdown(info.description);
        if (info.values) {
            md.appendMarkdown('\n\n**Values:** ' + info.values.map(v => `\`${v}\``).join(', '));
        }
        return new vscode.Hover(md);
    }

    private createActionHover(name: string, description: string): vscode.Hover {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${name}** *(Special Action)*\n\n`);
        md.appendMarkdown(description);
        return new vscode.Hover(md);
    }

    private matchTemplate(word: string, hasCycleContext: boolean = false): vscode.Hover | undefined {
        // buff.SPELL.property.any
        const buffAnyMatch = word.match(/^buff\.(\w+)\.(\w+)\.any$/);
        if (buffAnyMatch) {
            const [, spell, prop] = buffAnyMatch;
            const templateKeyAny = `buff.SPELL.${prop}.any`;
            const templateKey = `buff.SPELL.${prop}`;
            if (EXPRESSIONS[templateKeyAny] || EXPRESSIONS[templateKey]) {
                const md = new vscode.MarkdownString();
                md.appendMarkdown(`**buff.${spell}.${prop}.any**\n\n`);
                md.appendMarkdown(`Check \`${prop}\` property of buff \`${spell}\` from any source\n\n`);
                md.appendMarkdown((EXPRESSIONS[templateKeyAny] || EXPRESSIONS[templateKey]).description);
                return new vscode.Hover(md);
            }
        }

        // buff.SPELL.property
        const buffMatch = word.match(/^buff\.(\w+)\.(\w+)$/);
        if (buffMatch) {
            const [, spell, prop] = buffMatch;
            const templateKey = `buff.SPELL.${prop}`;
            if (EXPRESSIONS[templateKey]) {
                const md = new vscode.MarkdownString();
                if (hasCycleContext) {
                    md.appendMarkdown(`**buff.${spell}.${prop}** *(cycle context)*\n\n`);
                    md.appendMarkdown(`Check \`${prop}\` property of player-applied buff \`${spell}\` on **current cycle member**\n\n`);
                    md.appendMarkdown(EXPRESSIONS[templateKey].description);
                    md.appendMarkdown('\n\n⚠️ *This expression is context-sensitive because `cycle=` is present on this line.*');
                } else {
                    md.appendMarkdown(`**buff.${spell}.${prop}**\n\n`);
                    md.appendMarkdown(`Check \`${prop}\` property of player-applied buff \`${spell}\` (use \`.any\` for any source)\n\n`);
                    md.appendMarkdown(EXPRESSIONS[templateKey].description);
                }
                return new vscode.Hover(md);
            }
        }

        // debuff.SPELL.property.any
        const debuffAnyMatch = word.match(/^debuff\.(\w+)\.(\w+)\.any$/);
        if (debuffAnyMatch) {
            const [, spell, prop] = debuffAnyMatch;
            const templateKeyAny = `debuff.SPELL.${prop}.any`;
            const templateKey = `debuff.SPELL.${prop}`;
            if (EXPRESSIONS[templateKeyAny] || EXPRESSIONS[templateKey]) {
                const md = new vscode.MarkdownString();
                md.appendMarkdown(`**debuff.${spell}.${prop}.any**\n\n`);
                md.appendMarkdown(`Check \`${prop}\` property of debuff \`${spell}\` on target from any source\n\n`);
                md.appendMarkdown((EXPRESSIONS[templateKeyAny] || EXPRESSIONS[templateKey]).description);
                return new vscode.Hover(md);
            }
        }

        // debuff.SPELL.property
        const debuffMatch = word.match(/^debuff\.(\w+)\.(\w+)$/);
        if (debuffMatch) {
            const [, spell, prop] = debuffMatch;
            const templateKey = `debuff.SPELL.${prop}`;
            if (EXPRESSIONS[templateKey]) {
                const md = new vscode.MarkdownString();
                md.appendMarkdown(`**debuff.${spell}.${prop}**\n\n`);
                md.appendMarkdown(`Check \`${prop}\` property of player-applied debuff \`${spell}\` on target (use \`.any\` for any source)\n\n`);
                md.appendMarkdown(EXPRESSIONS[templateKey].description);
                return new vscode.Hover(md);
            }
        }

        // dot.SPELL.property
        const dotMatch = word.match(/^dot\.(\w+)\.(\w+)$/);
        if (dotMatch) {
            const [, spell, prop] = dotMatch;
            const templateKey = `dot.SPELL.${prop}`;
            if (EXPRESSIONS[templateKey]) {
                const md = new vscode.MarkdownString();
                md.appendMarkdown(`**dot.${spell}.${prop}**\n\n`);
                md.appendMarkdown(`Check \`${prop}\` property of DoT \`${spell}\`\n\n`);
                md.appendMarkdown(EXPRESSIONS[templateKey].description);
                return new vscode.Hover(md);
            }
        }

        // cooldown.SPELL.property
        const cdMatch = word.match(/^cooldown\.(\w+)\.(\w+)$/);
        if (cdMatch) {
            const [, spell, prop] = cdMatch;
            const templateKey = `cooldown.SPELL.${prop}`;
            if (EXPRESSIONS[templateKey]) {
                const md = new vscode.MarkdownString();
                md.appendMarkdown(`**cooldown.${spell}.${prop}**\n\n`);
                md.appendMarkdown(`Check \`${prop}\` property of \`${spell}\` cooldown\n\n`);
                md.appendMarkdown(EXPRESSIONS[templateKey].description);
                return new vscode.Hover(md);
            }
        }

        // totem.SPELL.property
        const totemMatch = word.match(/^totem\.(\w+)\.(\w+)$/);
        if (totemMatch) {
            const [, spell, prop] = totemMatch;
            const templateKey = `totem.SPELL.${prop}`;
            if (EXPRESSIONS[templateKey]) {
                const md = new vscode.MarkdownString();
                md.appendMarkdown(`**totem.${spell}.${prop}**\n\n`);
                md.appendMarkdown(`Check \`${prop}\` property of totem \`${spell}\`\n\n`);
                md.appendMarkdown(EXPRESSIONS[templateKey].description);
                return new vscode.Hover(md);
            }
        }

        // talent.NAME
        const talentMatch = word.match(/^talent\.(\w+)$/);
        if (talentMatch) {
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**talent.${talentMatch[1]}**\n\n`);
            md.appendMarkdown(`Returns 1 if talent \`${talentMatch[1]}\` is selected, 0 otherwise`);
            return new vscode.Hover(md);
        }

        // talent.NAME.enabled/rank
        const talentPropMatch = word.match(/^talent\.(\w+)\.(enabled|rank)$/);
        if (talentPropMatch) {
            const [, talent, prop] = talentPropMatch;
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**talent.${talent}.${prop}**\n\n`);
            if (prop === 'enabled') {
                md.appendMarkdown(`Returns 1 if talent \`${talent}\` is selected`);
            } else {
                md.appendMarkdown(`Returns the rank of talent \`${talent}\` (0 if not selected)`);
            }
            return new vscode.Hover(md);
        }

        // prev_gcd.N.SPELL
        const prevMatch = word.match(/^prev_gcd\.([123])\.(\w+)$/);
        if (prevMatch) {
            const [, n, spell] = prevMatch;
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**prev_gcd.${n}.${spell}**\n\n`);
            md.appendMarkdown(`Returns 1 if \`${spell}\` was cast ${n} GCD(s) ago`);
            return new vscode.Hover(md);
        }

        // active_dot.SPELL.any
        const activeDotAnyMatch = word.match(/^active_dot\.(\w+)\.any$/);
        if (activeDotAnyMatch) {
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**active_dot.${activeDotAnyMatch[1]}.any**\n\n`);
            md.appendMarkdown(`Count of enemies with any \`${activeDotAnyMatch[1]}\` DoT active`);
            return new vscode.Hover(md);
        }

        // active_dot.SPELL
        const activeDotMatch = word.match(/^active_dot\.(\w+)$/);
        if (activeDotMatch) {
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**active_dot.${activeDotMatch[1]}**\n\n`);
            md.appendMarkdown(`Count of enemies with your \`${activeDotMatch[1]}\` DoT active (player-applied only; use \`.any\` for any source)`);
            return new vscode.Hover(md);
        }

        // nameplates.debuff.SPELL.count(.any)
        const nameplatesDebuffAnyMatch = word.match(/^nameplates\.debuff\.(\w+)\.(\w+)\.any$/);
        if (nameplatesDebuffAnyMatch) {
            const [, spell, prop] = nameplatesDebuffAnyMatch;
            const templateKey = `nameplates.debuff.SPELL.${prop}.any`;
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**nameplates.debuff.${spell}.${prop}.any**\n\n`);
            md.appendMarkdown(`Count nameplates with \`${spell}\` debuff from any source\n\n`);
            if (EXPRESSIONS[templateKey]) {
                md.appendMarkdown(EXPRESSIONS[templateKey].description);
            }
            return new vscode.Hover(md);
        }

        const nameplatesDebuffMatch = word.match(/^nameplates\.debuff\.(\w+)\.(\w+)$/);
        if (nameplatesDebuffMatch) {
            const [, spell, prop] = nameplatesDebuffMatch;
            const templateKey = `nameplates.debuff.SPELL.${prop}`;
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**nameplates.debuff.${spell}.${prop}**\n\n`);
            md.appendMarkdown(`Count nameplates with your \`${spell}\` debuff (player-applied only; use \`.any\` for any source)\n\n`);
            if (EXPRESSIONS[templateKey]) {
                md.appendMarkdown(EXPRESSIONS[templateKey].description);
            }
            return new vscode.Hover(md);
        }

        // usable.SPELL
        const usableMatch = word.match(/^usable\.(\w+)$/);
        if (usableMatch) {
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**usable.${usableMatch[1]}**\n\n`);
            md.appendMarkdown(`Returns 1 if \`${usableMatch[1]}\` is usable (has resources and off cooldown)`);
            return new vscode.Hover(md);
        }

        // var.NAME
        const varMatch = word.match(/^var\.(\w+)$/);
        if (varMatch) {
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**var.${varMatch[1]}**\n\n`);
            md.appendMarkdown(`User-defined variable. Value is evaluated each tick from the \`variables:\` section.`);
            return new vscode.Hover(md);
        }

        // config.NAME / settings.NAME
        const configMatch = word.match(/^(config|settings)\.(\w+)$/);
        if (configMatch) {
            const md = new vscode.MarkdownString();
            md.appendMarkdown(`**${configMatch[1]}.${configMatch[2]}**\n\n`);
            md.appendMarkdown(`User config setting. Defined in the \`config:\` section (slider, checkbox, or dropdown).`);
            return new vscode.Hover(md);
        }

        return undefined;
    }

    private getOperatorHover(char: string, line: string, pos: number): vscode.Hover | undefined {
        const operators: Record<string, string> = {
            '&': 'AND operator - both conditions must be true',
            '|': 'OR operator - either condition must be true',
            '!': 'NOT operator - negates the following condition',
            '<': 'Less than comparison',
            '>': 'Greater than comparison',
            '=': 'Equality comparison',
        };

        // Check for multi-char operators
        const twoChar = line.substring(pos, pos + 2);
        if (twoChar === '<=' || twoChar === '>=' || twoChar === '!=' || twoChar === '==') {
            const desc = {
                '<=': 'Less than or equal',
                '>=': 'Greater than or equal',
                '!=': 'Not equal',
                '==': 'Equal (same as =)'
            }[twoChar];
            return new vscode.Hover(new vscode.MarkdownString(`**${twoChar}** - ${desc}`));
        }

        if (twoChar === '>?' || twoChar === '<?') {
            const desc = {
                '>?': 'Min operator (SimC style) - returns minimum of two values',
                '<?': 'Max operator (SimC style) - returns maximum of two values'
            }[twoChar];
            return new vscode.Hover(new vscode.MarkdownString(`**${twoChar}** - ${desc}`));
        }

        if (operators[char]) {
            return new vscode.Hover(new vscode.MarkdownString(`**${char}** - ${operators[char]}`));
        }

        return undefined;
    }
}
