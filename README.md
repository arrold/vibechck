# vibechck Scanner 🔍✨

> **AI Coding Assistant Criticism Scanner**
> _Ensure your codebase passes the vibe check._

[**🌐 Visit Website**](https://vibechck.dev)
[**GitHub**](https://github.com/arrold/vibechck)

vibechck is a static analysis tool designed specifically to detect anti-patterns, hallucinations, and "lazy" coding practices often introduced by Large Language Models (LLMs) and AI coding assistants.

## 🚀 Key Features

- **👻 Hallucination Detection**: Finds phantom dependencies, "newborn" packages (supply chain risk), and typosquatting attempts.
- **😴 Laziness Linter**: Catches "lazy" AI patterns like `// ... rest of code`, hollow functions, mock implementations, and unlogged errors in catch blocks.
- **🔒 Security Sentinel**: Detects hardcoded secrets, dangerous deserialization patterns, insecure JWT usage, and hardcoded production URLs.
- **🏗️ Architecture Scanner**: Identifies "God functions", circular dependencies, and unused exports.
- **👁️ Observability Checks**: Flags unlogged errors and missing error tracking services (Sentry, LogRocket, etc.).
- **💸 Cost Detection**: Identifies expensive API calls (OpenAI, Anthropic, Cloudinary) in loops without rate limiting or caching.
- **🛡️ Environment Safety**: Detects destructive operations without environment guards and hardcoded production URLs.


## 📦 Installation

To use vibechck in your project, install it via npm:

```bash
npm install --save-dev vibechck
# OR
npx vibechck
```

## 🛠️ Usage

### Basic Scan
Run Vibechck in your project root to scan the current directory:

```bash
npx vibechck
```

### Options

```bash
# Scan a specific directory
npx vibechck ./src

# Output results as JSON (great for CI/CD)
npx vibechck --json > report.json

# Filter by severity
npx vibechck --severity=critical,high

# Run only specific modules
npx vibechck --module=laziness,hallucination

# Disable colored output (auto-detected in CI)
npx vibechck --no-color
```

## 🔌 Integration Guide

### Adding to a CI/CD Pipeline (GitHub Actions)
Ensure every PR passes the vibe check before merging.

```yaml
name: Vibechck
on: [push, pull_request]

jobs:
  vibechck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run Vibechck
        run: npx vibechck --severity=critical,high
```

### Adding to pre-commit hooks
Use `husky` to prevent committing "lazy" code.

```bash
npx husky add .husky/pre-commit "npx vibechck --module=laziness"
```

## 📝 Configuration

Create a `.vibechck.yaml` file in your project root to customize rules:

```yaml
severity:
  - critical
  - high
  - medium

modules:
  hallucination: true
  laziness: true
  security: true
  architecture: true
  cost: true

laziness:
  detectAIPreambles: true
  detectUnloggedErrors: true
  patterns:
    - "// ... existing code ..."

ignoreRules:
  magic-number:
    - "tests/**/*.ts"
    - "examples/magic.ts"
  unused-export:
    - "src/api/public/**"
```

### Ignore Rules
Vibechck supports granular ignores using **glob patterns** (via `minimatch`). You can ignore specific rules for specific files or directories:

- **`**`**: Matches any sequence of characters (recursive).
- **`*`**: Matches any sequence of characters (single level).
- **Relativity**: Patterns are matched relative to the project root.

### Default Ignores
To prevent recursion crashes and save time, Vibechck **automatically ignores** the following directories by default:
- `node_modules`
- `.git`
- `.venv`
- `dist`, `build`, `.next`, `.nuxt`, `.output`, `target`, `vendor`

## 📄 License
AGPL-3.0-or-later
