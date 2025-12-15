# vibechck Scanner 🔍✨

> **AI Coding Assistant Criticism Scanner**
> _Ensure your codebase passes the vibe check._

[**🌐 Visit Website**](https://arrold.github.io/vibechck)

vibechck is a static analysis tool designed specifically to detect anti-patterns, hallucinations, and "lazy" coding practices often introduced by Large Language Models (LLMs) and AI coding assistants.

## 🚀 Key Features

- **👻 Hallucination Detection**: Finds phantom dependencies, "newborn" packages (supply chain risk), and typosquatting attempts.
- **😴 Laziness Linter**: Catches "lazy" AI patterns like `// ... rest of code`, hollow functions, and mock implementations left in production code.
- **🔒 Security Sentinel**: Detects hardcoded secrets and dangerous deserialization patterns common in AI-generated code.
- **🏗️ Architecture Scanner**: Identifies "God functions" and circular dependencies.

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

## 🌍 making it available to others

To share Vibechck with your team or the world:

1.  **Publish to npm**:
    ```bash
    npm login
    npm publish --access public
    ```
    Users can then run `npx vibechck` immediately without installation.

2.  **Docker Image**:
    Build a Docker image to run Vibechck in any environment:
    ```bash
    docker build -t myorg/vibechck .
    docker run -v $(pwd):/app myorg/vibechck
    ```

## 📝 Configuration

Create a `.vibechck.json` file in your project root to customize rules:

```json
{
  "severity": ["critical", "high", "medium"],
  "modules": {
    "hallucination": true,
    "laziness": true
  },
  "laziness": {
    "detectAIPreambles": true,
    "patterns": ["// ... existing code ..."]
  },
  "ignoreRules": {
    "magic-number": ["tests/**/*.ts", "examples/magic.ts"],
    "unused-export": ["src/api/public/**"]
  }
}
```

### Ignore Rules
Vibechck supports granular ignores using **glob patterns** (via `minimatch`). You can ignore specific rules for specific files or directories:

- **`**`**: Matches any validation of characters (recursive).
- **`*`**: Matches any validation of characters (single level).
- **Relativity**: Patterns are matched relative to the project root.

### Default Ignores
To prevent recursion crashes and save time, Vibechck **automatically ignores** the following directories by default:
- `node_modules`
- `.git`
- `.venv`
- `dist`, `build`, `.next`, `.nuxt`, `.output`, `target`, `vendor`

```

## 📄 License
AGPL-3.0-or-later
