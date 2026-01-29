# VS Simia YAML Extension - Update Instructions

## Overview

This VS Code extension provides IntelliSense support for the Rotation YAML DSL used by the Simia client. The extension is updated based on the reference documentation in the rotation_example.yaml file.

## Reference File

The canonical reference for all expressions, options, and DSL features:
```
D:\Rubim\Projects Work\Uni\simia_client\yaml\rotation_example.yaml
```


## Config constants ##

These config are constants that must be added to the config namespace.
```
D:\Rubim\Projects Work\Uni\yaml_data\_shared.yaml
```

## How to Update the Extension

When new features, expressions, or sections are added to `rotation_example.yaml`, update the extension as follows:

### 1. Identify the Changes

Read the `rotation_example.yaml` file to identify:
- New expressions (SECTION numbers indicate major feature areas)
- New step options
- New special actions
- New config types or properties

### 2. Update Source Files

Depending on the change type, update these files:

| Change Type | File(s) to Update |
|-------------|-------------------|
| New expressions | `src/expressions.ts` - Add to `EXPRESSIONS` constant |
| New step options | `src/expressions.ts` - Add to `STEP_OPTIONS` constant |
| New special actions | `src/expressions.ts` - Add to `SPECIAL_ACTIONS` constant |
| Hover documentation | `src/hoverProvider.ts` - Add template matchers |
| Completions | `src/completionProvider.ts` - Add completion logic |
| Diagnostics/Linting | `src/diagnosticProvider.ts` - Add validation rules |

### 3. Key Files Structure

```
src/
  expressions.ts       - All DSL expressions, step options, special actions
  hoverProvider.ts     - Hover documentation for expressions
  completionProvider.ts - Autocomplete suggestions
  diagnosticProvider.ts - Linting and validation
  spellData.ts         - Spell database loading
  extension.ts         - Extension entry point
```

## Workflow for Changes

**IMPORTANT: Always follow this workflow:**

### Step 1: Make Changes
- Read the relevant section from `rotation_example.yaml`
- Update the appropriate source files
- Follow existing patterns in the codebase

### Step 2: Compile and Test
```bash
npm run compile
```
Ensure no TypeScript errors.

### Step 3: Ask for Approval
**Before committing, always ask the user:**
> "Changes compiled successfully. Do you want me to update the version and package the extension?"

### Step 4: If Approved - Version and Package

1. **Update version in package.json:**
   - Patch version (0.2.2 -> 0.2.3) for bug fixes
   - Minor version (0.2.2 -> 0.3.0) for new features
   - Major version (0.2.2 -> 1.0.0) for breaking changes

2. **Package the extension:**
   ```bash
   npx vsce package
   ```
   This creates a `.vsix` file for installation.

3. **Commit the changes:**
   ```bash
   git add .
   git commit -m "feat: <description of changes>"
   ```

## Section Reference (rotation_example.yaml)

Key sections that map to extension features:

| Section | Topic | Primary File |
|---------|-------|--------------|
| 1 | Operators | expressions.ts |
| 2 | Player Resources | expressions.ts |
| 3 | Health Conditions | expressions.ts |
| 4 | Buff Conditions | expressions.ts |
| 5 | Debuff Conditions | expressions.ts |
| 5B | Aura Properties | expressions.ts |
| 5C | Target/Player Aura Detection | expressions.ts |
| 5D | Dispel List | expressions.ts |
| 6 | DoT Conditions | expressions.ts |
| 7 | Cooldown Conditions | expressions.ts |
| 8 | Usable and Range | expressions.ts |
| 8B | Step Options | expressions.ts (STEP_OPTIONS) |
| 9 | Talent Conditions | expressions.ts |
| 10 | Action/Ability Properties | expressions.ts |
| 11 | GCD | expressions.ts |
| 12 | Previous Cast Tracking | expressions.ts |
| 12B | Last Cast Time | expressions.ts |
| 13 | Player Status | expressions.ts |
| 13B | Player Loss of Control | expressions.ts |
| 14 | Player Role | expressions.ts |
| 14A | Player Character Stats | expressions.ts |
| 14B | Player Instance/Zone | expressions.ts |
| 14C | Boss Fight & Target Validation | expressions.ts |
| 15 | Target Conditions | expressions.ts |
| 16 | Unit Conditions | expressions.ts |
| 17 | Enemy/Combat Count | expressions.ts |
| 18 | Healing Targeting System | expressions.ts |
| 19 | Aura Point Values | expressions.ts |
| 20 | Totem Conditions | expressions.ts |
| 21 | Equipment Slot Conditions | expressions.ts |
| 22 | Shared YAML Files | expressions.ts |
| 23 | System State | expressions.ts |
| 23B | One Button Assistant | expressions.ts |
| 24 | User-Defined Variables | expressions.ts |
| 25 | User Config Options | expressions.ts |
| 26 | Special Actions | expressions.ts (SPECIAL_ACTIONS) |
| 27 | Cast Target Modifiers | hoverProvider.ts |
| 28 | Action Lists | completionProvider.ts |
| 29 | Variables | completionProvider.ts |

## Expression Entry Format

When adding expressions to `expressions.ts`:

```typescript
'expression.name': {
    type: 'category',           // e.g., 'buff', 'debuff', 'resource', 'state'
    description: 'Description', // Clear explanation
    example?: 'if=expression'   // Optional usage example
},
```

## Common Patterns

### Template Expressions (with SPELL placeholder)
```typescript
'buff.SPELL.up': { type: 'buff', description: '...' },
'buff.SPELL.down': { type: 'buff', description: '...' },
```

### Function-call Syntax
```typescript
'player.buff.remains(SPELL)': { type: 'buff', description: '...' },
```

### Source Filtering (.any suffix)
```typescript
'buff.SPELL.up': { ... },      // Player-applied only
'buff.SPELL.up.any': { ... },  // Any source
```

## Testing Checklist

Before asking for approval:
- [ ] `npm run compile` succeeds
- [ ] New expressions appear in autocomplete
- [ ] Hover shows correct documentation
- [ ] No regressions in existing functionality
