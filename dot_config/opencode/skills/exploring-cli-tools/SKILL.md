---
name: exploring-cli-tools
description: Explores CLI tools using --help flags and man pages to understand capabilities, discover subcommands, and find specific options. Use when investigating how a command-line tool works, checking if a tool supports a feature, or finding the correct syntax for a command.
---

# Exploring CLI Tools

## Workflow

1. Run `<tool> --help` or `<tool> -h` for overview
2. For subcommands: `<tool> <subcommand> --help`
3. If help is insufficient: `man <tool>`
4. For extensive help output: pipe through `grep` to find specific flags

## Help flag conventions

Tools vary in conventions:
- `--help` or `-h` (most common)
- `help` as subcommand: `git help commit`
- `-?` (Windows-originated tools)
- No flags (some tools show help when run without arguments)

## Constraints

- Only use read-only exploration: `--help`, `-h`, `man`, `--version`
- Do NOT execute commands that modify state
- If help requires authentication/setup, report this limitation

## Response format

Provide:
1. **Answer**: Direct response to what was asked
2. **Syntax**: Exact command with required flags
3. **Caveats**: Version-specific or platform-specific notes (if any)

## Examples

**Task**: Find how to create a git branch
```bash
git branch --help
```
**Result**: `git branch <name>` or `git checkout -b <name>`

**Task**: Check if curl follows redirects
```bash
curl --help all | grep -i redirect
```
**Result**: `-L, --location` follows redirects

**Task**: Explore nested subcommands (kubectl)
```bash
kubectl --help
kubectl get --help
```
