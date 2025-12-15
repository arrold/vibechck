import * as fs from 'fs/promises';
import * as path from 'path';
import { Query, SyntaxNode } from 'tree-sitter';
import {
  AnalysisModule,
  Alert,
  AlertSeverity,
  VibechckConfig,
  AnalysisContext,
  VibechckPlugin,
} from '../../types/index.js';
import { isRuleIgnored } from '../../utils/ignoreRules.js';
import { VibechckFileScanner } from '../../core/FileScanner.js';
import { ParserFactory, SupportedLanguage } from '../../core/ParserFactory.js';
import { PluginManager } from '../../core/PluginManager.js';

export class LazinessLinter implements AnalysisModule, VibechckPlugin {
  name = 'LazinessLinter';
  private fileScanner: VibechckFileScanner;
  private parserFactory: ParserFactory;

  private readonly MIN_LINES_FOR_ANALYSIS = 5;
  private readonly TEST_FILE_DENSITY_THRESHOLD = 0.4;

  constructor() {
    this.fileScanner = new VibechckFileScanner({} as VibechckConfig);
    this.parserFactory = ParserFactory.getInstance();
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
    return config.modules.laziness;
  }

  async analyze(files: string[], config: VibechckConfig): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const sourceFiles = files.filter((file) => this.fileScanner.isSourceFile(file));

    for (const file of sourceFiles) {
      // Check if laziness module is ignored for this file
      if (isRuleIgnored('laziness', file, config)) continue;

      try {
        const content = await fs.readFile(file, 'utf-8');
        const fileInfo = await this.fileScanner.getFileInfo(file);
        const context: AnalysisContext = {
          fileInfo,
          content,
          config,
          dependencies: [],
          imports: null as any, // Laziness doesn't need graph
        };

        const fileAlerts = await this.analyzeFile(context);
        alerts.push(...fileAlerts);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Invalid argument') || msg.includes('EINVAL')) {
          // Silently skip large/problematic files
        } else {
          console.warn(`Analysis error on ${file}`);
          if (error instanceof Error) console.warn(error.stack || error.message);
        }
      }
    }

    return alerts;
  }

  private async analyzeFile(context: AnalysisContext): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const { content, fileInfo, config } = context;
    const language = this.parserFactory.getLanguageForFile(fileInfo.path);

    if (language === 'unknown') {
      return alerts;
    }

    const parser = this.parserFactory.getParser(language);
    const tree = parser.parse(content);

    // 1. Run Regex-based checks (text pattern matching)
    alerts.push(...this.runRegexChecks(content, fileInfo.path, config));

    // 2. Run AST-based checks (structure analysis)
    alerts.push(
      ...this.runASTChecks(tree.rootNode, language, fileInfo.path, parser.getLanguage(), config)
    );

    return alerts;
  }

  private runRegexChecks(content: string, filePath: string, config: VibechckConfig): Alert[] {
    const alerts: Alert[] = [];

    // Check for AI preambles
    if (config.laziness.detectAIPreambles && !isRuleIgnored('ai-preamble', filePath, config)) {
      alerts.push(...this.detectAIPreambles(content, filePath));
    }

    // Check for placeholder comments
    if (
      config.laziness.detectPlaceholderComments &&
      !isRuleIgnored('placeholder-comment', filePath, config)
    ) {
      alerts.push(...this.detectPlaceholderComments(content, filePath, config));
    }

    // Check for over-commenting
    if (config.laziness.detectOverCommenting) {
      alerts.push(...this.detectOverCommenting(content, filePath, config));
    }

    return alerts;
  }

  private runASTChecks(
    rootNode: SyntaxNode,
    language: SupportedLanguage,
    filePath: string,
    parserLanguage: any,
    config: VibechckConfig
  ): Alert[] {
    const alerts: Alert[] = [];

    // Check for hollow functions
    if (
      config.laziness.detectHollowFunctions &&
      !isRuleIgnored('hollow-function', filePath, config)
    ) {
      alerts.push(
        ...this.detectHollowFunctionsAST(rootNode, language, filePath, parserLanguage)
      );
    }

    // Check for mock implementations
    if (
      config.laziness.detectMockImplementations &&
      !isRuleIgnored('mock-implementation', filePath, config)
    ) {
      alerts.push(
        ...this.detectMockImplementationsAST(rootNode, language, filePath, parserLanguage)
      );
    }

    // Check for unlogged errors (new observability check)
    if (
      config.laziness.detectUnloggedErrors &&
      !isRuleIgnored('unlogged-error', filePath, config)
    ) {
      alerts.push(
        ...this.detectUnloggedErrorsAST(rootNode, language, filePath, parserLanguage)
      );
    }

    return alerts;
  }

  // Regex-based helpers kept for text scanning (comments/preambles)
  private detectAIPreambles(content: string, filePath: string): Alert[] {
    const alerts: Alert[] = [];
    const aiPreamblePatterns = [
      new RegExp('As an AI' + ' language model', 'i'),
      new RegExp('Here is the' + ' updated code', 'i'),
      new RegExp("I've updated" + ' the code', 'i'),
      new RegExp('Below is the' + ' implementation', 'i'),
      new RegExp("Here's how" + ' you can', 'i'),
    ];

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of aiPreamblePatterns) {
        if (pattern.test(line)) {
          alerts.push({
            id: `ai - preamble - ${Date.now()} -${i} `,
            severity: AlertSeverity.MEDIUM,
            message: 'AI Preamble Detected: Blind copy-paste of AI response detected',
            file: filePath,
            line: i + 1,
            module: this.name,
            rule: 'ai-preamble',
            suggestion: 'Remove AI-generated preambles from production code',
          });
          break;
        }
      }
    }
    return alerts;
  }

  private detectPlaceholderComments(
    content: string,
    filePath: string,
    config: VibechckConfig
  ): Alert[] {
    const alerts: Alert[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of config.laziness.patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(line)) {
          alerts.push({
            id: `placeholder - ${Date.now()} -${i} `,
            severity: AlertSeverity.HIGH,
            message: 'Lazy Implementation: Placeholder comment detected',
            file: filePath,
            line: i + 1,
            module: this.name,
            rule: 'placeholder-comment',
            suggestion: 'Replace placeholder comments with actual implementation',
          });
          break;
        }
      }
    }
    return alerts;
  }

  private detectOverCommenting(content: string, filePath: string, config: VibechckConfig): Alert[] {
    if (isRuleIgnored('over-commenting', filePath, config)) return [];

    const alerts: Alert[] = [];
    const lines = content.split('\n');

    // Filter out blank lines for density calculation
    const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
    if (nonEmptyLines.length < this.MIN_LINES_FOR_ANALYSIS) return []; // Skip tiny files

    const isTestFile =
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      path.basename(filePath).startsWith('test_') ||
      path.basename(filePath).endsWith('_test.py');

    let effectiveThreshold = config.laziness.commentDensityThreshold;
    // Relax threshold for test files to 40%
    if (isTestFile) {
      effectiveThreshold = this.TEST_FILE_DENSITY_THRESHOLD;
    }

    let commentLines = 0;
    // Basic heuristic: lines starting with //, #, *, or inside docstrings (simplified)
    for (const line of nonEmptyLines) {
      const trim = line.trim();
      if (
        trim.startsWith('//') ||
        trim.startsWith('#') ||
        trim.startsWith('*') ||
        trim.startsWith('/*') ||
        trim.endsWith('*/')
      ) {
        commentLines++;
      }
      // For Python test files, ignore docstrings as "comments" mostly
      else if (isTestFile && (trim.startsWith('"""') || trim.startsWith("'''"))) {
        // Treat docstring openers/closers as code to avoid punishing valid test docs
        continue;
      }
    }

    const density = commentLines / nonEmptyLines.length;

    if (density > effectiveThreshold) {
      alerts.push({
        id: `over-commenting-${path.basename(filePath)}`,
        severity: AlertSeverity.LOW, // Reduced from MEDIUM as it's often a style choice
        message: `Excessive Commenting (${Math.round(
          density * 100
        )}%): AI-generated code often over-explains.`,
        file: filePath,
        module: this.name,
        rule: 'over-commenting',
        suggestion: 'Remove redundant comments that verify the code behavior.',
      });
    }

    return alerts;
  }

  // AST Logic
  private detectHollowFunctionsAST(
    rootNode: SyntaxNode,
    language: SupportedLanguage,
    filePath: string,
    parserLanguage: any
  ): Alert[] {
    if (language === 'javascript' || language === 'typescript') {
      return this.detectHollowFunctionsJS(rootNode, parserLanguage, filePath);
    } else if (language === 'python') {
      return this.detectHollowFunctionsPython(rootNode, parserLanguage, filePath);
    } else {
      return [];
    }
  }

  private detectHollowFunctionsJS(
    rootNode: SyntaxNode,
    parserLanguage: any,
    filePath: string
  ): Alert[] {
    const queryString = `
  (function_declaration
          name: (identifier) @name
          body: (statement_block) @body
  )
  (arrow_function
          body: (statement_block) @body
  )
  (function_expression
          body: (statement_block) @body
  )
  `;

    return this.runHollowQuery(rootNode, parserLanguage, queryString, filePath, 'javascript');
  }

  private detectHollowFunctionsPython(
    rootNode: SyntaxNode,
    parserLanguage: any,
    filePath: string
  ): Alert[] {
    const queryString = `
  (function_definition
          name: (identifier) @name
          body: (block) @body
  )
      `;
    return this.runHollowQuery(rootNode, parserLanguage, queryString, filePath, 'python');
  }

  private runHollowQuery(
    rootNode: SyntaxNode,
    parserLanguage: any,
    queryString: string,
    filePath: string,
    language: SupportedLanguage
  ): Alert[] {
    const alerts: Alert[] = [];

    try {
      const query = new Query(parserLanguage, queryString);
      const matches = query.matches(rootNode);

      for (const match of matches) {
        const bodyNode = match.captures.find((c) => c.name === 'body')?.node;
        const nameNode = match.captures.find((c) => c.name === 'name')?.node;
        const funcName = nameNode ? nameNode.text : 'anonymous';

        if (bodyNode && this.isNodeHollow(bodyNode, language)) {
          // Calculate line number (1-indexed)
          const startLine = bodyNode.startPosition.row + 1;
          alerts.push({
            id: `hollow - function- ${funcName} -${startLine} `,
            severity: AlertSeverity.HIGH,
            message: `Hollow Function: Function ${funcName} appears to be empty or only contains placeholder comments`,
            file: filePath,
            line: startLine,
            module: this.name,
            rule: 'hollow-function',
            suggestion: 'Implement the function logic or remove if unnecessary',
          });
        }
      }
    } catch (e) {
      console.warn(`Query error in ${filePath}: `, e);
    }

    return alerts;
  }

  private isNodeHollow(node: SyntaxNode, language: SupportedLanguage): boolean {
    if (node.childCount === 0) return true; // Truly empty

    // Filter out syntax tokens like { } or : which are children but not named nodes usually (depending on grammar)
    // Actually, namedChildCount is better.
    if (node.namedChildCount === 0) {
      // It might have text content that is just comments or whitespace
      // Tree-sitter usually doesn't include comments as named children unless configured?
      // Actually standard grammars put comments as 'extras', so they are not named children of the block usually?
      // Wait, 'extras' are skipped.
      // If namedChildCount is 0, it's basically empty `{ } `.
      return true;
    }

    // Check children content
    let hasLogic = false;
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (!child) continue;
      if (child.type === 'comment') continue;

      if (language === 'python') {
        if (child.type === 'pass_statement') continue;
        if (child.type === 'expression_statement' && child.text.match(/^['"][\s\S]*['"]$/))
          continue; // Docstring
      } else {
        // JS/TS
        if (child.type === 'return_statement') {
          // Check if return is empty or returns null/undefined
          if (child.namedChildCount === 0) continue; // return;
          const retVal = child.namedChild(0);
          if (retVal && (retVal.type === 'null' || retVal.text === 'undefined')) continue;
        }
      }

      hasLogic = true;
      break;
    }

    return !hasLogic;
  }

  private detectMockImplementationsAST(
    rootNode: SyntaxNode,
    language: SupportedLanguage,
    filePath: string,
    parserLanguage: any
  ): Alert[] {
    if (language === 'javascript' || language === 'typescript') {
      return this.detectMockImplementationsJS(rootNode, parserLanguage, filePath);
    } else if (language === 'python') {
      return this.detectMockImplementationsPython(rootNode, parserLanguage, filePath);
    }
    return [];
  }

  private detectMockImplementationsJS(
    rootNode: SyntaxNode,
    parserLanguage: any,
    filePath: string
  ): Alert[] {
    const alerts: Alert[] = [];
    const functionQueryString = `
  (function_declaration name: (identifier) @name body: (statement_block) @body)
  (arrow_function body: (statement_block) @body)
  (function_expression body: (statement_block) @body)
  `;
    const callQueryString = `
  (call_expression
          function: (identifier) @func
    (#match? @func "^(sleep|setTimeout)$")
  )
  `;

    try {
      const funcQuery = new Query(parserLanguage, functionQueryString);
      const matches = funcQuery.matches(rootNode);

      for (const match of matches) {
        const nameNode = match.captures.find((c) => c.name === 'name')?.node;
        const bodyNode = match.captures.find((c) => c.name === 'body')?.node;
        const funcName = nameNode ? nameNode.text : 'anonymous';

        if (!funcName.match(/^(calculate|process)/i)) continue;
        if (!bodyNode) continue;

        const callQuery = new Query(parserLanguage, callQueryString);
        const callMatches = callQuery.matches(bodyNode);

        if (callMatches.length > 0) {
          const startLine = bodyNode.startPosition.row + 1;
          alerts.push({
            id: `mock - implementation - ${funcName} -${startLine} `,
            severity: AlertSeverity.HIGH,
            message:
              'Mock Implementation: Function appears to simulate behavior (sleep/timeout) rather than implement logic',
            file: filePath,
            line: startLine,
            module: this.name,
            rule: 'mock-implementation',
            suggestion: 'Replace mock implementation with actual business logic',
          });
        }
      }
    } catch (e) {
      console.warn(`Query error in ${filePath}:`, e);
    }

    return alerts;
  }

  private detectMockImplementationsPython(
    rootNode: SyntaxNode,
    parserLanguage: any,
    filePath: string
  ): Alert[] {
    const alerts: Alert[] = [];
    const functionQueryString = `
  (function_definition name: (identifier) @name body: (block) @body)
  `;
    const callQueryString = `
  (call
          function: (attribute object: (identifier) @mod attribute: (identifier) @method)
  (#eq? @mod "time")
  (#eq? @method "sleep")
        )
(call
          function: (identifier) @func
  (#eq? @func "sleep")
        )
`;

    try {
      const funcQuery = new Query(parserLanguage, functionQueryString);
      const matches = funcQuery.matches(rootNode);

      for (const match of matches) {
        const nameNode = match.captures.find((c) => c.name === 'name')?.node;
        const bodyNode = match.captures.find((c) => c.name === 'body')?.node;
        const funcName = nameNode ? nameNode.text : 'anonymous';

        if (!funcName.match(/^(calculate|process)/i)) continue;
        if (!bodyNode) continue;

        const callQuery = new Query(parserLanguage, callQueryString);
        const callMatches = callQuery.matches(bodyNode);

        if (callMatches.length > 0) {
          const startLine = bodyNode.startPosition.row + 1;
          alerts.push({
            id: `mock - implementation - ${funcName} -${startLine} `,
            severity: AlertSeverity.HIGH,
            message:
              'Mock Implementation: Function appears to simulate behavior (sleep/timeout) rather than implement logic',
            file: filePath,
            line: startLine,
            module: this.name,
            rule: 'mock-implementation',
            suggestion: 'Replace mock implementation with actual business logic',
          });
        }
      }
    } catch (e) {
      console.warn(`Query error in ${filePath}:`, e);
    }
    return alerts;
  }

  // ===== OBSERVABILITY CHECKS =====

  private detectUnloggedErrorsAST(
    rootNode: SyntaxNode,
    language: SupportedLanguage,
    filePath: string,
    parserLanguage: any
  ): Alert[] {
    if (language === 'javascript' || language === 'typescript') {
      return this.detectUnloggedErrorsJS(rootNode, parserLanguage, filePath);
    } else if (language === 'python') {
      return this.detectUnloggedErrorsPython(rootNode, parserLanguage, filePath);
    }
    return [];
  }

  private detectUnloggedErrorsJS(
    rootNode: SyntaxNode,
    parserLanguage: any,
    filePath: string
  ): Alert[] {
    const alerts: Alert[] = [];

    // Query for try-catch statements
    const queryString = `
      (try_statement
        handler: (catch_clause
          parameter: (identifier)? @param
          body: (statement_block) @body
        )
      )
    `;

    try {
      const query = new Query(parserLanguage, queryString);
      const matches = query.matches(rootNode);

      for (const match of matches) {
        const bodyNode = match.captures.find((c) => c.name === 'body')?.node;
        if (!bodyNode) continue;

        // Check if catch block has logging
        const hasLogging = this.hasLoggingInBlock(bodyNode);

        if (!hasLogging) {
          const startLine = bodyNode.startPosition.row + 1;
          alerts.push({
            id: `unlogged-error-${startLine}`,
            severity: AlertSeverity.MEDIUM,
            message: 'Unlogged Error: Catch block does not log the error',
            file: filePath,
            line: startLine,
            module: this.name,
            rule: 'unlogged-error',
            suggestion:
              'Add error logging (console.error, logger.error, or error tracking service) to catch blocks for better observability',
          });
        }
      }
    } catch (e) {
      console.warn(`Query error in ${filePath}:`, e);
    }

    return alerts;
  }

  private detectUnloggedErrorsPython(
    rootNode: SyntaxNode,
    parserLanguage: any,
    filePath: string
  ): Alert[] {
    const alerts: Alert[] = [];

    // Query for try-except statements
    const queryString = `
      (try_statement
        (except_clause
          (block) @body
        )
      )
    `;

    try {
      const query = new Query(parserLanguage, queryString);
      const matches = query.matches(rootNode);

      for (const match of matches) {
        const bodyNode = match.captures.find((c) => c.name === 'body')?.node;
        if (!bodyNode) continue;

        // Check if except block has logging
        const hasLogging = this.hasLoggingInBlock(bodyNode);

        if (!hasLogging) {
          const startLine = bodyNode.startPosition.row + 1;
          alerts.push({
            id: `unlogged-error-${startLine}`,
            severity: AlertSeverity.MEDIUM,
            message: 'Unlogged Error: Except block does not log the error',
            file: filePath,
            line: startLine,
            module: this.name,
            rule: 'unlogged-error',
            suggestion:
              'Add error logging (logging.error, print, or error tracking) to except blocks for better observability',
          });
        }
      }
    } catch (e) {
      console.warn(`Query error in ${filePath}:`, e);
    }

    return alerts;
  }

  private hasLoggingInBlock(blockNode: SyntaxNode): boolean {
    const blockText = blockNode.text.toLowerCase();

    // Check for common logging patterns
    const loggingPatterns = [
      'console.log',
      'console.error',
      'console.warn',
      'logger.',
      'log.',
      'logging.',
      'sentry.',
      'logrocket.',
      'bugsnag.',
      'rollbar.',
      'print(',  // Python
      '.error(',
      '.warn(',
      '.info(',
      '.debug(',
    ];

    return loggingPatterns.some((pattern) => blockText.includes(pattern));
  }
}
