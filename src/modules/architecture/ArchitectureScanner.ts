import * as fs from 'fs/promises';
import * as path from 'path';
import {
  AnalysisModule,
  Alert,
  AlertSeverity,
  VibechckConfig,
  AnalysisContext,
  ImportGraph,
  ImportNode,
  VibechckPlugin,
} from '../../types/index.js';
import { VibechckFileScanner } from '../../core/FileScanner.js';
import { isRuleIgnored } from '../../utils/ignoreRules.js';
import { PluginManager } from '../../core/PluginManager.js';

export class ArchitectureScanner implements AnalysisModule, VibechckPlugin {
  name = 'ArchitectureScanner';
  private fileScanner: VibechckFileScanner;
  private importGraph: ImportGraph = { nodes: new Map(), edges: new Map() };

  constructor() {
    this.fileScanner = new VibechckFileScanner({} as VibechckConfig);
  }

  apply(compiler: PluginManager): void {
    compiler.hooks.onAnalyze.tapPromise(this.name, async (files, config, alerts) => {
      if (this.isEnabled(config)) {
        const moduleAlerts = await this.analyze(files, config);
        alerts.push(...moduleAlerts);
      }
    });
  }

  isEnabled(config: VibechckConfig): boolean {
    return config.modules.architecture;
  }

  async analyze(files: string[], config: VibechckConfig): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const sourceFiles = files.filter((file) => this.fileScanner.isSourceFile(file));

    // Build import graph
    await this.buildImportGraph(sourceFiles);

    // Analyze each file
    for (const file of sourceFiles) {
      // Allow ignoring the entire architecture module (or specific file for it)
      if (isRuleIgnored('architecture', file, config)) continue;

      try {
        const content = await fs.readFile(file, 'utf-8');
        const fileInfo = await this.fileScanner.getFileInfo(file);
        const context: AnalysisContext = {
          fileInfo,
          content,
          config,
          dependencies: [],
          imports: this.importGraph,
        };

        const fileAlerts = await this.analyzeFile(context);
        alerts.push(...fileAlerts);
      } catch (error) {
        // Graceful failure for single files
        // Check if error is "Invalid argument" (often file read/buffer issue)
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Invalid argument') || msg.includes('EINVAL')) {
          // Log as debug info or very minor warning
          // For now, we just say "Skipping"
          // console.warn(`Skipping ${file} due to file system constraints.`);
        } else {
          console.warn(`Analysis error on ${file}`);
          if (error instanceof Error) {
            console.warn(error.stack || error.message);
            if ((error as any).cause) console.warn('Cause:', (error as any).cause);
          }
        }
      }
    }

    // Check for circular dependencies
    if (config.architecture.detectCircularDependencies) {
      const circularDependencyAlerts = this.detectCircularDependencies();
      alerts.push(...circularDependencyAlerts);
    }

    // Check for unused exports
    if (config.architecture.detectUnusedExports) {
      const unusedExportAlerts = this.detectUnusedExports();
      const filtered = unusedExportAlerts.filter(
        (a) => !isRuleIgnored('unused-export', a.file, config)
      );
      alerts.push(...filtered);
    }

    return alerts;
  }

  private async analyzeFile(context: AnalysisContext): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const { content, fileInfo, config } = context;

    // Check for God Functions
    const godFunctionAlerts = await this.detectGodFunctions(content, fileInfo.path, config);
    alerts.push(...godFunctionAlerts);

    if (config.architecture.detectMixedNaming) {
      if (['javascript', 'typescript'].includes(fileInfo.language)) {
        // Detect mixed naming (camelCase/snake_case consistency)
        // Ignoring mixed naming for interfaces as valid use case (API contracts)
        alerts.push(...this.detectMixedNamingJS(content, fileInfo.path, config));
      }
    }

    // Check for Magic Numbers
    if (config.architecture.detectMagicNumbers) {
      alerts.push(...this.detectMagicNumbers(content, fileInfo.path, config));
    }

    return alerts;
  }

  private async detectGodFunctions(
    content: string,
    filePath: string,
    config: VibechckConfig
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    if (isRuleIgnored('god-function', filePath, config)) return alerts;

    const language = this.fileScanner.detectLanguage(filePath);

    if (language === 'javascript' || language === 'typescript') {
      alerts.push(...this.detectGodFunctionsJS(content, filePath, config));
    } else if (language === 'python') {
      alerts.push(...this.detectGodFunctionsPython(content, filePath, config));
    } else if (language === 'rust') {
      alerts.push(...this.detectGodFunctionsRust(content, filePath, config));
    } else if (language === 'go') {
      alerts.push(...this.detectGodFunctionsGo(content, filePath, config));
    }

    return alerts;
  }

  private detectGodFunctionsJS(content: string, filePath: string, config: VibechckConfig): Alert[] {
    const alerts: Alert[] = [];

    // Find all function declarations
    const functionRegex =
      /(?:function\s+(\w+)\s*\(|(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)|(?:^|[\s])(?!if|for|while|switch|catch|do|try\b)(\w+)\s*\([^)]*\)[^;{]*{)/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2] || match[3];
      const startPos = match.index;
      const endPos = this.findFunctionEnd(content, startPos);

      if (endPos !== -1) {
        const functionContent = content.substring(startPos, endPos);
        const startLine = content.substring(0, startPos).split('\n').length;
        const functionLines = functionContent.split('\n').length;

        const complexity = this.calculateCyclomaticComplexity(functionContent);

        if (
          complexity > config.architecture.cyclomaticComplexityThreshold &&
          functionLines > config.architecture.linesOfCodeThreshold
        ) {
          alerts.push({
            id: `god-function-${functionName}-${Date.now()}`,
            severity: AlertSeverity.HIGH,
            message: `Architectural Risk: Complex Monolith - function ${functionName} violates separation of concerns`,
            file: filePath,
            line: startLine,
            module: this.name,
            rule: 'god-function',
            suggestion: `Break down ${functionName} into smaller, more focused functions (CC: ${complexity}, LOC: ${functionLines})`,
          });
        }
      }
    }

    return alerts;
  }

  private detectGodFunctionsPython(
    content: string,
    filePath: string,
    config: VibechckConfig
  ): Alert[] {
    const alerts: Alert[] = [];

    // Find all function definitions
    const functionRegex = /def\s+(\w+)\s*\([^)]*\):/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      const startPos = match.index;
      const endPos = this.findPythonFunctionEnd(content, startPos);

      if (endPos !== -1) {
        const functionContent = content.substring(startPos, endPos);
        const startLine = content.substring(0, startPos).split('\n').length;
        const functionLines = functionContent.split('\n').length;

        const complexity = this.calculateCyclomaticComplexity(functionContent);

        if (
          complexity > config.architecture.cyclomaticComplexityThreshold &&
          functionLines > config.architecture.linesOfCodeThreshold
        ) {
          alerts.push({
            id: `god-function-${functionName}-${Date.now()}`,
            severity: AlertSeverity.HIGH,
            message: `Architectural Risk: Complex Monolith - function ${functionName} violates separation of concerns`,
            file: filePath,
            line: startLine,
            module: this.name,
            rule: 'god-function',
            suggestion: `Break down ${functionName} into smaller, more focused functions (CC: ${complexity}, LOC: ${functionLines})`,
          });
        }
      }
    }

    return alerts;
  }

  private detectGodFunctionsRust(
    content: string,
    filePath: string,
    config: VibechckConfig
  ): Alert[] {
    const alerts: Alert[] = [];

    // Find all function definitions in Rust
    const functionRegex = /fn\s+(\w+)\s*\([^)]*\)(?:\s*->\s*[^{]+)?\s*{/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      const startPos = match.index;
      const endPos = this.findFunctionEnd(content, startPos);

      if (endPos !== -1) {
        const functionContent = content.substring(startPos, endPos);
        const startLine = content.substring(0, startPos).split('\n').length;
        const functionLines = functionContent.split('\n').length;

        const complexity = this.calculateCyclomaticComplexity(functionContent);

        if (
          complexity > config.architecture.cyclomaticComplexityThreshold &&
          functionLines > config.architecture.linesOfCodeThreshold
        ) {
          alerts.push({
            id: `god-function-${functionName}-${Date.now()}`,
            severity: AlertSeverity.HIGH,
            message: `Architectural Risk: Complex Monolith - function ${functionName} violates separation of concerns`,
            file: filePath,
            line: startLine,
            module: this.name,
            rule: 'god-function',
            suggestion: `Break down ${functionName} into smaller, more focused functions (CC: ${complexity}, LOC: ${functionLines})`,
          });
        }
      }
    }

    return alerts;
  }

  private detectGodFunctionsGo(content: string, filePath: string, config: VibechckConfig): Alert[] {
    const alerts: Alert[] = [];

    // Find all function definitions in Go
    const functionRegex = /func\s+(\w+)\s*\([^)]*\)(?:\s*[^{]+)?\s*{/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      const startPos = match.index;
      const endPos = this.findFunctionEnd(content, startPos);

      if (endPos !== -1) {
        const functionContent = content.substring(startPos, endPos);
        const startLine = content.substring(0, startPos).split('\n').length;
        const functionLines = functionContent.split('\n').length;

        const complexity = this.calculateCyclomaticComplexity(functionContent);

        if (
          complexity > config.architecture.cyclomaticComplexityThreshold &&
          functionLines > config.architecture.linesOfCodeThreshold
        ) {
          alerts.push({
            id: `god-function-${functionName}-${Date.now()}`,
            severity: AlertSeverity.HIGH,
            message: `Architectural Risk: Complex Monolith - function ${functionName} violates separation of concerns`,
            file: filePath,
            line: startLine,
            module: this.name,
            rule: 'god-function',
            suggestion: `Break down ${functionName} into smaller, more focused functions (CC: ${complexity}, LOC: ${functionLines})`,
          });
        }
      }
    }

    return alerts;
  }

  private calculateCyclomaticComplexity(functionContent: string): number {
    let complexity = 1; // Base complexity

    // Decision points that increase complexity
    const decisionPatterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\belif\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bdo\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\btry\b/g,
      /\?\s*:/g, // Ternary operator
      /\|\|/g, // Logical OR
      /&&/g, // Logical AND
    ];

    for (const pattern of decisionPatterns) {
      const matches = functionContent.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private findFunctionEnd(content: string, startPos: number): number {
    const braceCount = { '{': 0, '}': 0 };
    let pos = startPos;
    let inString: string | null = null; // ' or " or `
    let inRegex = false; // crude check

    while (pos < content.length) {
      const char = content[pos];
      const prev = pos > 0 ? content[pos - 1] : '';

      // Handle strings
      if (inString) {
        if (char === inString && prev !== '\\') {
          inString = null;
        }
      } else if (inRegex) {
        if (char === '/' && prev !== '\\') {
          inRegex = false;
        }
      } else {
        // Start string?
        if (char === '"' || char === "'" || char === '`') {
          inString = char;
        }
        // Start regex? (Crude heuristic: / followed by non-space/non-operator)
        // This is hard to perfect without parser, but let's assume /.../
        else if (char === '/' && prev !== '*') { // Avoid /* comment start matching /
          // Regex detection is tricky; ignoring for now to avoid false positives on division
        }

        // Count braces if not in string
        else if (char === '{') braceCount['{']++;
        else if (char === '}') braceCount['}']++;
      }

      if (braceCount['{'] > 0 && braceCount['{'] === braceCount['}']) {
        return pos + 1;
      }

      pos++;
    }

    return -1;
  }

  private findPythonFunctionEnd(content: string, startPos: number): number {
    const lines = content.split('\n');
    const startLineIndex = content.substring(0, startPos).split('\n').length - 1;
    const baseIndent = lines[startLineIndex].match(/^(\s*)/)?.[1]?.length || 0;

    for (let i = startLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '' || line.trim().startsWith('#')) continue;

      const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
      if (indent <= baseIndent && line.trim()) {
        return content.split('\n').slice(0, i).join('\n').length;
      }
    }

    return content.length;
  }
  private detectMixedNamingConventions(
    content: string,
    filePath: string,
    config: VibechckConfig
  ): Alert[] {
    const alerts: Alert[] = [];
    const language = this.fileScanner.detectLanguage(filePath);

    if (language === 'javascript' || language === 'typescript') {
      alerts.push(...this.detectMixedNamingJS(content, filePath, config));
    } else if (language === 'python') {
      alerts.push(...this.detectMixedNamingPython(content, filePath));
    }

    return alerts;
  }

  private detectMixedNamingJS(content: string, filePath: string, config: VibechckConfig): Alert[] {
    if (isRuleIgnored('mixed-naming', filePath, config)) {
      return [];
    }
    const alerts: Alert[] = [];
    const lines = content.split('\n');
    let insideTypeOrInterface = false;

    // Find all variable and function names in a scope
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Simple heuristic for interfaces/types
      // Handle single-line types: type Foo = ...;
      if (line.match(/^\s*(export\s+)?type\s+\w+\s*=/)) {
        // Single line type alias, or start of one?
        // If it contains semicolon at end, it might be one line.
        // But for safety, let's just strip 'type X =' part and analyze right side?
        // Actually, contract names usually appear in the definition itself.
        // If it's `type snake_case = ...`, that's the contract name.
        // Let's just SKIP line if it defines a type alias.
        continue;
      }

      if (line.match(/^\s*(export\s+)?interface\s+\w+/)) {
        insideTypeOrInterface = true;
      }

      // If we see a close brace at start of line, we might be exiting interface
      if (insideTypeOrInterface && line.match(/^\s*}/)) {
        insideTypeOrInterface = false;
      }

      // If inside interface/type definition, snake_case is allowed (contracts)
      if (insideTypeOrInterface) continue;

      // Extract identifiers
      const identifiers = line.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
      const camelCase = identifiers.filter((id) => /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(id));
      const snakeCase = identifiers.filter((id) => /^[a-z][a-z0-9]*_[a-z0-9_]+$/.test(id));

      if (camelCase.length > 0 && snakeCase.length > 0) {
        alerts.push({
          id: `mixed-naming-${Date.now()}-${i}`,
          severity: AlertSeverity.MEDIUM,
          message:
            'Inconsistent Naming: Mixed naming conventions indicate mixed-source AI generation',
          file: filePath,
          line: i + 1,
          module: this.name,
          rule: 'mixed-naming',
          suggestion: 'Use consistent naming conventions (camelCase for JavaScript/TypeScript)',
        });
      }
    }

    return alerts;
  }

  private detectMixedNamingPython(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Find all variable and function names in a scope
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Extract identifiers
      const identifiers = line.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
      const camelCase = identifiers.filter((id) => /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(id));
      const snakeCase = identifiers.filter((id) => /^[a-z][a-z0-9]*_[a-z0-9_]+$/.test(id));

      if (camelCase.length > 0 && snakeCase.length > 0) {
        alerts.push({
          id: `mixed-naming-${Date.now()}-${i}`,
          severity: AlertSeverity.MEDIUM,
          message:
            'Inconsistent Naming: Mixed naming conventions indicate mixed-source AI generation',
          file: filePath,
          line: i + 1,
          module: this.name,
          rule: 'mixed-naming',
          suggestion: 'Use consistent naming conventions (snake_case for Python)',
        });
      }
    }

    return alerts;
  }

  private detectMagicNumbers(content: string, filePath: string, config: VibechckConfig): Alert[] {
    if (isRuleIgnored('magic-number', filePath, config)) return [];
    const language = this.fileScanner.detectLanguage(filePath);

    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Safe numbers to ignore
    const safeNumbers = new Set(['0', '1', '2', '10', '100', '-1']);

    // Regex to match numeric literals
    // Matches 123, 12.34, etc. but tries to avoid matching inside strings or property names
    // This is a heuristic regex and won't be perfect without AST, but sufficient for "vibe checking"
    const numberRegex = /\b\d+(\.\d+)?\b/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments
      if (line.startsWith('//') || line.startsWith('#') || line.startsWith('*')) continue;

      // Skip import/require/include lines usually
      if (line.startsWith('import') || line.startsWith('require') || line.startsWith('include'))
        continue;

      // Skip const/let/var declarations (defining constants is GOOD)
      // e.g. const MAX_USERS = 1000; -> 1000 is allowed here.
      if (/^(const|let|var|final|static|readonly)\s+/.test(line)) continue;
      if (language === 'python' && /^[A-Z_]+\s*=/.test(line)) continue; // Python caps constant assignment

      let match;
      while ((match = numberRegex.exec(line)) !== null) {
        const num = match[0];
        if (!safeNumbers.has(num)) {
          // Heuristic: Filter out array indices or obvious innocuous usages if possible
          // For now, raw detection.

          alerts.push({
            id: `magic-number-${Date.now()}-${i}-${match.index}`,
            severity: AlertSeverity.LOW,
            message: `Magic Number detected: ${num}. Unexplained numeric literals reduce readability.`,
            file: filePath,
            line: i + 1,
            column: match.index + 1,
            module: this.name,
            rule: 'magic-number',
            suggestion: `Extract ${num} to a named constant.`,
          });
        }
      }
    }

    return alerts;
  }

  private async buildImportGraph(files: string[]): Promise<void> {
    this.importGraph = { nodes: new Map(), edges: new Map() };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const { paths, symbols } = this.extractImports(content, file);

        const node: ImportNode = {
          filePath: file,
          imports: paths,
          importedSymbols: symbols,
          exports: this.extractExports(content, file),
        };

        this.importGraph.nodes.set(file, node);
        this.importGraph.edges.set(file, new Set(paths));
      } catch (error) {
        console.warn(`Warning: Failed to parse imports from ${file}: ${error}`);
      }
    }
  }

  private extractImports(
    content: string,
    filePath: string
  ): { paths: string[]; symbols: Map<string, string[]> } {
    const language = this.fileScanner.detectLanguage(filePath);
    const paths: string[] = [];
    const symbols = new Map<string, string[]>();

    let scriptContent = content;
    // For Vue/Svelte, extract script content
    if (language === 'vue' || language === 'svelte') {
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        scriptContent = scriptMatch[1];
      } else {
        return { paths: [], symbols: new Map() }; // No script, no imports
      }
    }

    if (
      language === 'javascript' ||
      language === 'typescript' ||
      language === 'vue' ||
      language === 'svelte'
    ) {
      const importRegex = /import\s+(?:type\s+)?([\w\s{},*]+)\s+from\s+['"]([^'"]+)['"]/g;

      let match;
      while ((match = importRegex.exec(scriptContent)) !== null) {
        const clause = match[1];
        const importPath = match[2];

        const shouldProcess = importPath.startsWith('.') || importPath.startsWith('@/');
        if (!shouldProcess) continue; // Ignore external deps for now

        paths.push(importPath);

        const currentSymbols = symbols.get(importPath) || [];

        if (clause.includes('*')) {
          currentSymbols.push('*');
        } else if (clause.startsWith('{')) {
          // Named imports: { Foo, Bar as Baz, type Qux }
          const named = clause
            .replace(/[{}]/g, '')
            .split(',')
            .map((s) => s.trim());
          named.forEach((n) => {
            // Handle "type" prefix inside braces: "type Foo"
            let cleanName = n;
            if (cleanName.startsWith('type ')) {
              cleanName = cleanName.substring(5).trim();
            }

            const parts = cleanName.split(/\s+as\s+/);
            currentSymbols.push(parts[0]); // Push the original exported name
          });
        } else {
          // Default import: import Foo from ...
          currentSymbols.push('default');
        }

        symbols.set(importPath, currentSymbols);
      }

      // Also catch require
      const requireMatches = scriptContent.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g) || [];
      requireMatches.forEach((m) => {
        const p = m.match(/['"]([^'"]+)['"]/)?.[1];
        if (p && p.startsWith('.')) {
          paths.push(p);
          const s = symbols.get(p) || [];
          s.push('*');
          symbols.set(p, s);
        }
      });

      // Also catch dynamic import()
      const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = dynamicImportRegex.exec(scriptContent)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.') || importPath.startsWith('@/')) {
          paths.push(importPath);
          const s = symbols.get(importPath) || [];
          s.push('*'); // Dynamic import imports the module namespace object
          symbols.set(importPath, s);
        }
      }
    } else if (language === 'python') {
      // from module import Foo, Bar
      const fromImportRegex = /from\s+(\S+)\s+import\s+(.+)/g;
      let match;
      while ((match = fromImportRegex.exec(content)) !== null) {
        const importPath = match[1];
        const names = match[2].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]);

        if (!importPath.startsWith('.')) {
          if (importPath.startsWith('.')) {
            paths.push(importPath);
            const s = symbols.get(importPath) || [];
            s.push(...names);
            symbols.set(importPath, s);
          }
        }
      }
    }

    return { paths, symbols };
  }

  private extractExports(content: string, filePath: string): string[] {
    const language = this.fileScanner.detectLanguage(filePath);
    const exports: string[] = [];

    let scriptContent = content;
    if (language === 'vue' || language === 'svelte') {
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        scriptContent = scriptMatch[1];
      } else {
        return [];
      }
    }

    if (
      language === 'javascript' ||
      language === 'typescript' ||
      language === 'vue' ||
      language === 'svelte'
    ) {
      const exportRegex =
        /export\s+(?:default\s+)?(?:function|class|const|let|var|type|interface)\s+(\w+)/g;
      let match;
      while ((match = exportRegex.exec(scriptContent)) !== null) {
        if (match[1]) exports.push(match[1]);
      }
    } else if (language === 'python') {
      // Python doesn't have explicit exports in the same way
      // We could look for __all__ but that's optional
      // For now, assume global defs are exports? Or just skip unused export check for Python for now.
    }

    return exports;
  }

  private detectCircularDependencies(): Alert[] {
    const alerts: Alert[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const node of this.importGraph.nodes.keys()) {
      if (!visited.has(node)) {
        const cycles = this.findCycles(node, visited, recursionStack, []);
        for (const cycle of cycles) {
          alerts.push({
            id: `circular-dependency-${Date.now()}-${cycle.length}`,
            severity: AlertSeverity.HIGH,
            message: `Circular Dependency: ${cycle.join(' <-> ')} - architectural flaw common in AI code`,
            file: cycle[0],
            module: this.name,
            rule: 'circular-dependency',
            suggestion:
              'Refactor to eliminate circular dependencies by extracting shared dependencies or restructuring modules',
          });
        }
      }
    }

    return alerts;
  }

  private findCycles(
    node: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): string[][] {
    const cycles: string[][] = [];

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const edges = this.importGraph.edges.get(node) || new Set();
    for (const neighbor of edges) {
      if (!visited.has(neighbor)) {
        cycles.push(...this.findCycles(neighbor, visited, recursionStack, [...path]));
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = [...path.slice(cycleStart), neighbor];
        cycles.push(cycle);
      }
    }

    recursionStack.delete(node);
    return cycles;
  }

  private detectUnusedExports(): Alert[] {
    const alerts: Alert[] = [];
    const usedExports = this.collectUsages();

    // 2. Check exports against usages
    for (const [filePath, node] of this.importGraph.nodes.entries()) {
      if (node.exports.length === 0) continue;

      node.exports.forEach((exportName) => {
        // Skip default export checks for now if not strictly tracked
        // or check if 'default' is in usedExports
        const isUsed =
          usedExports.get(filePath)?.has(exportName) ||
          usedExports.get(filePath)?.has('*') ||
          (exportName === 'default' && usedExports.get(filePath)?.has('default'));

        if (!isUsed) {
          // Special case: entry points?
          // We can't easily know entry points without config, but we can guess or ignore
          // straightforward unused exports.
          if (
            !filePath.endsWith('index.ts') &&
            !filePath.endsWith('index.js') &&
            !filePath.endsWith('main.ts') &&
            !filePath.endsWith('App.tsx')
          ) {
            alerts.push({
              id: `unused-export-${filePath}-${exportName}`,
              severity: AlertSeverity.LOW,
              message: `Unused Export: ${exportName} is exported but never imported`,
              file: filePath,
              module: this.name,
              rule: 'unused-export',
              suggestion: 'Remove the unused export or check if it is used dynamically',
            });
          }
        }
      });
    }

    return alerts;
  }

  private collectUsages(): Map<string, Set<string>> {
    const usedExports = new Map<string, Set<string>>();

    for (const [filePath, node] of this.importGraph.nodes.entries()) {
      node.importedSymbols.forEach((symbols, importPath) => {
        const resolvedPath = this.resolveImportPath(filePath, importPath);
        if (resolvedPath) {
          if (!usedExports.has(resolvedPath)) {
            usedExports.set(resolvedPath, new Set());
          }
          symbols.forEach((s) => usedExports.get(resolvedPath)!.add(s));
        }
      });
    }
    return usedExports;
  }

  private resolveImportPath(sourceFilePath: string, importPath: string): string | null {
    let absoluteImportPath = '';

    if (importPath.startsWith('@/')) {
      // Resolve alias @/ -> src/ relative to project root (approximate)
      const srcIndex = sourceFilePath.indexOf('/src/');
      if (srcIndex !== -1) {
        const projectRoot = sourceFilePath.substring(0, srcIndex);
        const relative = importPath.substring(2);
        absoluteImportPath = path.resolve(projectRoot, 'src', relative);
      } else {
        absoluteImportPath = path.resolve(process.cwd(), 'src', importPath.substring(2));
      }
    } else if (importPath.startsWith('.')) {
      absoluteImportPath = path.resolve(path.dirname(sourceFilePath), importPath);
    } else {
      return null;
    }

    // Try to match file with extension
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts', ''];
    for (const ext of extensions) {
      if (absoluteImportPath.endsWith('.js') && (ext === '.ts' || ext === '.tsx')) {
        const stripped = absoluteImportPath.slice(0, -3);
        const candidate = stripped + ext;
        if (this.importGraph.nodes.has(candidate)) return candidate;
      }

      const candidate = absoluteImportPath + ext;
      if (this.importGraph.nodes.has(candidate)) return candidate;

      // Try index file
      const indexCandidate = path.join(absoluteImportPath, `index${ext}`);
      if (this.importGraph.nodes.has(indexCandidate)) return indexCandidate;
    }

    return null;
  }
}
