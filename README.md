# Rotation YAML IntelliSense

VS Code extension providing IntelliSense support for Rotation YAML DSL files.

## Features

- **Autocompletion** for expressions, step options, and special actions
- **Hover documentation** for all DSL elements
- **Diagnostics** for common errors and typos
- **Syntax highlighting** for rotation YAML files

## Expressions Supported

### Resources
- `energy`, `rage`, `mana`, `focus`, `combo_points`, etc.
- Properties: `.max`, `.deficit`, `.pct`, `.regen`, `.time_to_max`

### Buffs/Debuffs/DoTs
- `buff.SPELL.up/down/remains/stack/refreshable`
- `debuff.SPELL.up/down/remains/stack/refreshable`
- `dot.SPELL.ticking/remains/refreshable`

### Cooldowns
- `cooldown.SPELL.ready/remains/charges/max_charges`

### Player State
- `player.moving`, `player.casting`, `player.combat`
- `player.health`, `player.stunned`, `player.burst.active`

### Target
- `target.exists`, `target.health.pct`, `target.boss`
- `target.casting.interruptible`, `target.time_to_die`

### And more...
- Talents, totems, equipment, group healing, variables, config settings

## Installation

### Development
1. Run `npm install` in this folder
2. Run `npm run compile`
3. Press F5 in VS Code to launch Extension Development Host

### Package for Distribution
```bash
npm install -g @vscode/vsce
vsce package
```

Then install the `.vsix` file in VS Code.

## Usage

The extension activates automatically for YAML files in a `yaml/` folder or files containing `lists:` or `actions:` sections.

### Autocompletion
- Type expressions after `if=` to get suggestions
- Type `.` after `buff`, `debuff`, `cooldown`, etc. for property completions
- Type `,` in action lines for step option suggestions

### Hover
- Hover over any expression to see documentation
- Hover over operators to see their meaning

## Configuration

No configuration needed. The extension works out of the box.
