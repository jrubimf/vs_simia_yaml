import * as vscode from 'vscode';
import { RotationCompletionProvider } from './completionProvider';
import { RotationHoverProvider } from './hoverProvider';
import { RotationDiagnosticProvider } from './diagnosticProvider';
import { spellDatabase } from './spellData';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Rotation YAML IntelliSense is now active');

    // Set extension path for loading bundled resources
    spellDatabase.setExtensionPath(context.extensionPath);

    // Load spell database from CSV
    const loaded = await spellDatabase.autoLoad();
    if (loaded) {
        vscode.window.showInformationMessage(
            `Rotation YAML: Loaded ${spellDatabase.getSpellCount()} spells`
        );
    } else {
        console.log('Rotation YAML: No spells.csv found. Spell validation disabled.');
    }

    // Register reload command
    context.subscriptions.push(
        vscode.commands.registerCommand('rotation-yaml.reloadSpells', async () => {
            const result = await spellDatabase.reload();
            if (result) {
                vscode.window.showInformationMessage(
                    `Rotation YAML: Reloaded ${spellDatabase.getSpellCount()} spells`
                );
            } else {
                vscode.window.showWarningMessage(
                    'Rotation YAML: No spells.csv found. Place spells.csv in project root, data/, or yaml/ folder.'
                );
            }
        })
    );

    // Register status command
    context.subscriptions.push(
        vscode.commands.registerCommand('rotation-yaml.status', () => {
            if (spellDatabase.isLoaded()) {
                vscode.window.showInformationMessage(
                    `Rotation YAML: ${spellDatabase.getSpellCount()} spells loaded`
                );
            } else {
                vscode.window.showWarningMessage(
                    'Rotation YAML: No spells loaded. Use "Reload Spells" command.'
                );
            }
        })
    );

    // Register for both yaml and rotation-yaml
    const yamlSelector: vscode.DocumentSelector = [
        { scheme: 'file', language: 'yaml' },
        { scheme: 'file', language: 'rotation-yaml' },
        { scheme: 'file', pattern: '**/yaml/**/*.yaml' }
    ];

    // Completion provider
    const completionProvider = new RotationCompletionProvider();
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            yamlSelector,
            completionProvider,
            '.', '=', ',', '&', '|', '(', '<', '>', '!'
        )
    );

    // Hover provider
    const hoverProvider = new RotationHoverProvider();
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(yamlSelector, hoverProvider)
    );

    // Diagnostic provider
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('rotation-yaml');
    const diagnosticProvider = new RotationDiagnosticProvider(diagnosticCollection);
    context.subscriptions.push(diagnosticCollection);

    // Update diagnostics on document change
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => {
            if (isRotationYaml(e.document)) {
                diagnosticProvider.updateDiagnostics(e.document);
            }
        })
    );

    // Update diagnostics on document open
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => {
            if (isRotationYaml(doc)) {
                diagnosticProvider.updateDiagnostics(doc);
            }
        })
    );

    // Initial diagnostics for already open documents
    vscode.workspace.textDocuments.forEach(doc => {
        if (isRotationYaml(doc)) {
            diagnosticProvider.updateDiagnostics(doc);
        }
    });
}

function isRotationYaml(document: vscode.TextDocument): boolean {
    if (document.languageId !== 'yaml' && document.languageId !== 'rotation-yaml') {
        return false;
    }
    // Check if in yaml folder or has rotation-like content
    return document.uri.fsPath.includes('yaml') ||
           document.getText().includes('lists:') ||
           document.getText().includes('actions:');
}

export function deactivate() {}
