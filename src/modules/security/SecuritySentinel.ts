import * as fs from 'fs/promises';
import {
  AnalysisModule,
  Alert,
  AlertSeverity,
  VibechckConfig,
  AnalysisContext,
  PackageDependency,
  VibechckPlugin,
} from '../../types/index.js';
import { isRuleIgnored } from '../../utils/ignoreRules.js';
import { VibechckFileScanner } from '../../core/FileScanner.js';

import { DependencyParser } from '../../core/DependencyParser.js';
import { ScorecardClient } from '../../core/ScorecardClient.js';
import { VibechckRegistryClient } from '../../core/RegistryClient.js';
import { PluginManager } from '../../core/PluginManager.js';

export class SecuritySentinel implements AnalysisModule, VibechckPlugin {
  name = 'SecuritySentinel';
  private fileScanner: VibechckFileScanner;
  private scorecardClient: ScorecardClient;
  private registryClient: VibechckRegistryClient;

  constructor() {
    this.fileScanner = new VibechckFileScanner({} as VibechckConfig);
    this.scorecardClient = new ScorecardClient();
    this.registryClient = new VibechckRegistryClient();
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
    return config.modules.security;
  }

  async analyze(files: string[], config: VibechckConfig): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const sourceFiles = files.filter((file) => this.fileScanner.isSourceFile(file));
    const dependencyFiles = files.filter((file) => this.fileScanner.isDependencyFile(file));

    // Analyze source files
    for (const file of sourceFiles) {
      // Check if security module is ignored for this file
      if (isRuleIgnored('security', file, config)) continue;

      try {
        const content = await fs.readFile(file, 'utf-8');
        const fileInfo = await this.fileScanner.getFileInfo(file);
        const context: AnalysisContext = {
          fileInfo,
          content,
          config,
          dependencies: [],
          imports: null as any,
        };

        const fileAlerts = await this.analyzeFile(context);
        alerts.push(...fileAlerts);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Invalid argument') || msg.includes('EINVAL')) {
          // Silently skip
        } else {
          console.warn(`Analysis error on ${file}`);
          if (error instanceof Error) console.warn(error.stack || error.message);
        }
      }
    }

    // Analyze dependencies for Scorecard
    if (config.supplyChain?.checkScorecard) {
      for (const file of dependencyFiles) {
        try {
          const dependencies = await DependencyParser.parseDependencyFile(file);
          const depAlerts = await this.analyzeDependencies(dependencies, config);
          alerts.push(...depAlerts);
        } catch (error) {
          console.warn(`Warning: Failed to parse dependency file ${file}: ${error} `);
        }
      }
    }

    return alerts;
  }

  private async analyzeFile(context: AnalysisContext): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const { content, fileInfo, config } = context;

    // Check for hardcoded secrets
    if (config.security.detectHardcodedSecrets) {
      alerts.push(...this.detectHardcodedSecrets(content, fileInfo.path, config));
    }

    // Check for insecure deserialization
    if (config.security.detectInsecureDeserialization) {
      alerts.push(...this.detectInsecureDeserialization(content, fileInfo.path, config));
    }

    // Check for React2Shell (Next.js Server Actions)
    if (config.security.detectReact2Shell) {
      alerts.push(...this.detectReact2Shell(content, fileInfo.path, config));
    }

    // Check for Insecure JWT
    if (config.security.detectInsecureJWT) {
      const jwtAlerts = this.detectInsecureJWT(content, fileInfo.path, config);
      alerts.push(...jwtAlerts);
    }

    // Check for destructive operations without env checks
    if (config.security.detectMissingEnvCheck) {
      alerts.push(...this.detectMissingEnvCheck(content, fileInfo.path, config));
    }

    // Check for hardcoded production URLs
    if (config.security.detectHardcodedProductionURL) {
      alerts.push(...this.detectHardcodedProductionURL(content, fileInfo.path, config));
    }

    return alerts;
  }

  private detectHardcodedSecrets(
    content: string,
    filePath: string,
    config: VibechckConfig
  ): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Common secret patterns
    const secretPatterns = [
      // API Keys
      {
        pattern: /(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]/gi,
        type: 'API Key',
      },
      // JWT tokens
      {
        pattern: /['"]eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*['"]/gi,
        type: 'JWT Token',
      },
      // AWS credentials
      {
        pattern:
          /aws[_-]?(?:access[_-]?key[_-]?id|secret[_-]?access[_-]?key)\s*[:=]\s*['"]([a-zA-Z0-9+/]{20,})['"]/gi,
        type: 'AWS Credentials',
      },
      // Database URLs
      {
        pattern:
          /(?:database[_-]?url|db[_-]?url|mongodb[_-]?url|postgres[_-]?url)\s*[:=]\s*['"]([a-zA-Z0-9+/:@.-]{20,})['"]/gi,
        type: 'Database URL',
      },
      // Generic high-entropy strings
      {
        pattern: /['"]([a-zA-Z0-9+/]{32,})['"]/gi,
        type: 'High-entropy string',
        entropyThreshold: config.security.secretEntropyThreshold,
      },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const secretPattern of secretPatterns) {
        let match;
        while ((match = secretPattern.pattern.exec(line)) !== null) {
          const secret = match[1] || match[0];

          // Calculate entropy for generic patterns
          if (secretPattern.entropyThreshold) {
            const entropy = this.calculateEntropy(secret);
            if (entropy < secretPattern.entropyThreshold) {
              continue;
            }
          }

          alerts.push({
            id: `hardcoded - secret - ${Date.now()} -${i} `,
            severity: AlertSeverity.CRITICAL,
            message: `Hardcoded Secret: ${secretPattern.type} detected`,
            file: filePath,
            line: i + 1,
            column: match.index + 1,
            module: this.name,
            rule: 'hardcoded-secret',
            suggestion:
              'Move secrets to environment variables or a secure configuration management system',
          });
        }
      }
    }

    return alerts;
  }

  private calculateEntropy(str: string): number {
    const freq: { [key: string]: number } = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;

    for (const char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  private detectInsecureDeserialization(
    content: string,
    filePath: string,
    config: VibechckConfig
  ): Alert[] {
    if (isRuleIgnored('insecure-deserialization', filePath, config)) return [];

    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Pattern 1: pickle usage (Python)
    const isPython = filePath.endsWith('.py');
    if (isPython) {
      const picklePatterns = [/import\s+pickle/g, /pickle\.loads\s*\(/g, /pickle\.load\s*\(/g];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of picklePatterns) {
          if (pattern.test(line)) {
            alerts.push({
              id: `insecure - deserialization - ${Date.now()} -${i} `,
              severity: AlertSeverity.CRITICAL,
              message: 'Insecure Deserialization: pickle usage detected - RCE vulnerability risk',
              file: filePath,
              line: i + 1,
              module: this.name,
              rule: 'insecure-deserialization',
              suggestion: 'Use JSON serialization or implement proper input validation',
            });
          }
        }
      }
    }

    // JS/TS Checks
    const language = this.fileScanner.detectLanguage(filePath);
    if (language === 'javascript' || language === 'typescript') {
      alerts.push(...this.detectInsecureDeserializationJS(content, filePath));
    }

    return alerts;
  }

  private detectInsecureDeserializationJS(content: string, filePath: string): Alert[] {
    // if (isRuleIgnored('insecure-deserialization', filePath, this.config)) return []; // Assuming this line was intended for the outer function or needs config

    const alerts: Alert[] = [];
    const lines = content.split('\n');
    const unsafePatterns = [/eval\s*\(/g, /Function\s*\(/g, /new Function\s*\(/g];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of unsafePatterns) {
        if (pattern.test(line)) {
          alerts.push({
            id: `insecure - deserialization - ${Date.now()} -${i} `,
            severity: AlertSeverity.HIGH,
            message: 'Insecure Deserialization: eval/Function usage detected - potential RCE risk',
            file: filePath,
            line: i + 1,
            module: this.name,
            rule: 'insecure-deserialization',
            suggestion: 'Use JSON.parse or implement proper input validation',
          });
        }
      }
    }

    return alerts;
  }

  private detectReact2Shell(content: string, filePath: string, config: VibechckConfig): Alert[] {
    const alerts: Alert[] = [];
    const language = this.fileScanner.detectLanguage(filePath);

    if (language === 'javascript' || language === 'typescript') {
      alerts.push(...this.detectReact2ShellJS(content, filePath, config));
    }

    return alerts;
  }

  private detectReact2ShellJS(content: string, filePath: string, config: VibechckConfig): Alert[] {
    if (isRuleIgnored('react2shell', filePath, config)) return [];
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Check for "use server" directive (Next.js Server Actions)
    let inServerAction = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for "use server" directive
      if (line === '"use server"' || line === "'use server'") {
        inServerAction = true;
        continue;
      }

      // Check for exported async functions in server actions
      if (inServerAction) {
        const asyncFunctionMatch = line.match(/export\s+async\s+function\s+(\w+)\s*\([^)]*\)/);
        if (asyncFunctionMatch) {
          const functionName = asyncFunctionMatch[1];
          const functionContent = this.extractFunctionContent(content, i);

          if (!this.hasInputValidation(functionContent)) {
            alerts.push({
              id: `react2shell - ${functionName} -${Date.now()} `,
              severity: AlertSeverity.CRITICAL,
              message: 'Potential React2Shell: Unvalidated Server Action Input detected',
              file: filePath,
              line: i + 1,
              module: this.name,
              rule: 'react2shell',
              suggestion:
                'Add input validation using Zod, Yup, or similar schema validation library',
            });
          }
        }
      }

      // Reset server action context when we hit a new directive or end of file
      if (line.startsWith('"') || line.startsWith("'")) {
        inServerAction = false;
      }
    }

    return alerts;
  }

  private extractFunctionContent(content: string, startLineIndex: number): string {
    const lines = content.split('\n');
    let braceCount = 0;
    let functionContent = '';
    let foundOpeningBrace = false;

    for (let i = startLineIndex; i < lines.length; i++) {
      const line = lines[i];
      functionContent += line + '\n';

      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundOpeningBrace = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      if (foundOpeningBrace && braceCount === 0) {
        break;
      }
    }

    return functionContent;
  }

  private hasInputValidation(functionContent: string): boolean {
    // Check for common validation libraries
    const validationPatterns = [
      /zod\./g,
      /yup\./g,
      /joi\./g,
      /validator\./g,
      /\.parse\s*\(/g, // Common validation method
      /\.validate\s*\(/g,
      /\.validateSync\s*\(/g,
      /typeof\s+\w+\s*===/g, // Basic type checking
      /instanceof\s+/g, // Instance checking
    ];

    for (const pattern of validationPatterns) {
      if (pattern.test(functionContent)) {
        return true;
      }
    }

    return false;
  }

  private async analyzeDependencies(
    dependencies: PackageDependency[],
    config: VibechckConfig
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const minScore = config.supplyChain?.minScorecardScore || 5.0;

    for (const dep of dependencies) {
      // Only checking npm/pypi/crates for now as they have registry support
      if (!['npm', 'pypi', 'crates'].includes(dep.registry)) continue;

      try {
        const pkgInfo = await this.registryClient.getPackageInfo(dep.name, dep.registry);
        if (!pkgInfo || !pkgInfo.repositoryUrl) continue;

        const scorecard = await this.scorecardClient.getScore(pkgInfo.repositoryUrl);
        if (scorecard && scorecard.score < minScore) {
          alerts.push({
            id: `scorecard - ${dep.name} -${Date.now()} `,
            severity: AlertSeverity.MEDIUM,
            message: `Low Security Score: ${dep.name} has a Scorecard score of ${scorecard.score}/${10}`,
            file: dep.file,
            module: this.name,
            rule: 'low-scorecard-score',
            suggestion: `Review security posture of ${dep.name}. Consider alternatives or pinned versions.`,
          });
        }
      } catch (error) {
        // Silent fail for individual dependency analysis to avoid spamming
        // console.debug(`Failed to check scorecard for ${dep.name}: ${error}`);
      }
    }

    return alerts;
  }

  private detectInsecureJWT(content: string, filePath: string, config: VibechckConfig): Alert[] {
    if (isRuleIgnored('insecure-jwt', filePath, config)) return [];

    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Pattern 1: jwt.decode() usages (often unsafe as it skips signature verification)
    const decodePattern = /jwt\.decode\s*\(/g;

    // Pattern 2: alg: 'none' (Critical vulnerability)
    // Matches "alg": "none", 'alg': 'none', algorithm: 'none', etc.
    // Broken string to avoid self-detection
    const noneAlgPattern = new RegExp(
      '(?:alg|algorithm)\\s*[:=]\\s*[\'"]' + 'none' + '[\'"]',
      'gi'
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for jwt.decode
      if (decodePattern.test(line)) {
        alerts.push({
          id: `insecure-jwt-decode-${Date.now()}-${i}`,
          severity: AlertSeverity.HIGH,
          message:
            'Insecure JWT Usage: jwt.decode() does not verify signatures. Use jwt.verify() instead.',
          file: filePath,
          line: i + 1,
          module: this.name,
          rule: 'insecure-jwt',
          suggestion: 'Replace with jwt.verify() to ensure token integrity',
        });
      }

      // Check for 'none' algorithm
      if (noneAlgPattern.test(line)) {
        alerts.push({
          id: `insecure-jwt-none-${Date.now()}-${i}`,
          severity: AlertSeverity.CRITICAL,
          message:
            'Critical Vulnerability: JWT "none" algorithm detected. This allows token forgery.',
          file: filePath,
          line: i + 1,
          module: this.name,
          rule: 'insecure-jwt-none',
          suggestion: 'Never use the "none" algorithm. Use HS256 or RS256.',
        });
      }
    }

    return alerts;
  }

  // ===== ENVIRONMENT SAFETY CHECKS =====

  private detectMissingEnvCheck(
    content: string,
    filePath: string,
    config: VibechckConfig
  ): Alert[] {
    if (isRuleIgnored('missing-env-check', filePath, config)) return [];

    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Destructive operations that should have env checks
    const destructivePatterns = [
      { pattern: /\.deleteMany\s*\(/, operation: 'deleteMany' },
      { pattern: /\.drop\s*\(/, operation: 'drop' },
      { pattern: /\.truncate\s*\(/, operation: 'truncate' },
      { pattern: /\.destroy\s*\(\s*\{.*force:\s*true/i, operation: 'destroy with force' },
      { pattern: /DROP\s+TABLE/i, operation: 'DROP TABLE' },
      { pattern: /TRUNCATE\s+TABLE/i, operation: 'TRUNCATE TABLE' },
      { pattern: /DELETE\s+FROM.*WHERE\s+1\s*=\s*1/i, operation: 'DELETE FROM ... WHERE 1=1' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const { pattern, operation } of destructivePatterns) {
        if (pattern.test(line)) {
          // Check if there's an env check nearby (within 10 lines before)
          const hasEnvCheck = this.hasEnvCheckNearby(lines, i, 10);

          if (!hasEnvCheck) {
            alerts.push({
              id: `missing-env-check-${i}`,
              severity: AlertSeverity.MEDIUM,
              message: `Missing Environment Check: Destructive operation (${operation}) without environment guard`,
              file: filePath,
              line: i + 1,
              module: this.name,
              rule: 'missing-env-check',
              suggestion: `Wrap destructive operations in environment checks (e.g., if (process.env.NODE_ENV !== 'production') { ... })`,
            });
          }
          break;
        }
      }
    }

    return alerts;
  }

  private hasEnvCheckNearby(lines: string[], currentLine: number, lookback: number): boolean {
    const startLine = Math.max(0, currentLine - lookback);
    const contextLines = lines.slice(startLine, currentLine + 1).join('\n');

    const envCheckPatterns = [
      /process\.env\.NODE_ENV/,
      /NODE_ENV\s*[!=]=\s*['"]production['"]/,
      /if\s*\(\s*!?production/i,
      /process\.env\./,
      /import\.meta\.env/,
    ];

    return envCheckPatterns.some((pattern) => pattern.test(contextLines));
  }

  private detectHardcodedProductionURL(
    content: string,
    filePath: string,
    config: VibechckConfig
  ): Alert[] {
    if (isRuleIgnored('hardcoded-production-url', filePath, config)) return [];

    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Patterns for production-like URLs
    const productionURLPatterns = [
      /https?:\/\/api\.[a-z0-9-]+\.com/i,
      /https?:\/\/[a-z0-9-]+\.herokuapp\.com/i,
      /https?:\/\/[a-z0-9-]+\.vercel\.app/i,
      /https?:\/\/[a-z0-9-]+\.netlify\.app/i,
      /https?:\/\/[a-z0-9-]+\.railway\.app/i,
      /https?:\/\/prod\./i,
      /https?:\/\/production\./i,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;

      for (const pattern of productionURLPatterns) {
        if (pattern.test(line)) {
          // Check if it's in an env var assignment or config
          const isEnvVar = /process\.env|import\.meta\.env|process\.env|\.env/i.test(line);

          if (!isEnvVar) {
            const match = line.match(pattern);
            if (match) {
              alerts.push({
                id: `hardcoded-production-url-${i}`,
                severity: AlertSeverity.HIGH,
                message: `Hardcoded Production URL: ${match[0]} should use environment variable`,
                file: filePath,
                line: i + 1,
                module: this.name,
                rule: 'hardcoded-production-url',
                suggestion: `Replace hardcoded URL with environment variable (e.g., process.env.API_URL)`,
              });
            }
          }
          break;
        }
      }
    }

    return alerts;
  }
}
