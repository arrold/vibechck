import * as fs from 'fs/promises';
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

/**
 * CostSentinel - Detects expensive API calls that could lead to unexpected costs
 * 
 * Focuses on:
 * - Expensive APIs called in loops without rate limiting
 * - Missing caching for costly operations
 * - Lack of cost tracking/logging
 */
export class CostSentinel implements AnalysisModule, VibechckPlugin {
    name = 'CostSentinel';
    private fileScanner: VibechckFileScanner;
    private parserFactory: ParserFactory;

    // Known expensive APIs and their patterns
    private readonly EXPENSIVE_APIS = {
        // OpenAI
        'openai.chat.completions.create': { cost: 'high', type: 'llm' },
        'openai.completions.create': { cost: 'high', type: 'llm' },
        'openai.embeddings.create': { cost: 'medium', type: 'llm' },
        'openai.images.generate': { cost: 'high', type: 'image' },

        // Anthropic
        'anthropic.messages.create': { cost: 'high', type: 'llm' },
        'anthropic.completions.create': { cost: 'high', type: 'llm' },

        // Image Processing
        'cloudinary.uploader.upload': { cost: 'medium', type: 'image' },
        'cloudinary.uploader.destroy': { cost: 'low', type: 'image' },
        'sharp().resize': { cost: 'low', type: 'image' },

        // Video Processing
        'ffmpeg': { cost: 'high', type: 'video' },
        'cloudconvert': { cost: 'high', type: 'video' },

        // Other AI Services
        'cohere.generate': { cost: 'high', type: 'llm' },
        'replicate.run': { cost: 'high', type: 'ai' },
    };

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
        return config.modules.cost ?? false;
    }

    async analyze(files: string[], config: VibechckConfig): Promise<Alert[]> {
        const alerts: Alert[] = [];
        const sourceFiles = files.filter((file) => this.fileScanner.isSourceFile(file));

        for (const file of sourceFiles) {
            if (isRuleIgnored('cost', file, config)) continue;

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
                // Silently skip problematic files
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

        // Detect expensive APIs in loops
        alerts.push(
            ...this.detectExpensiveAPIsInLoops(
                tree.rootNode,
                language,
                fileInfo.path,
                parser.getLanguage(),
                config
            )
        );

        // Detect missing caching
        alerts.push(
            ...this.detectMissingCache(
                tree.rootNode,
                language,
                fileInfo.path,
                parser.getLanguage(),
                config
            )
        );

        return alerts;
    }

    private detectExpensiveAPIsInLoops(
        rootNode: SyntaxNode,
        language: SupportedLanguage,
        filePath: string,
        parserLanguage: any,
        config: VibechckConfig
    ): Alert[] {
        if (isRuleIgnored('expensive-api-in-loop', filePath, config)) return [];

        if (language === 'javascript' || language === 'typescript') {
            return this.detectExpensiveAPIsInLoopsJS(rootNode, parserLanguage, filePath);
        } else if (language === 'python') {
            return this.detectExpensiveAPIsInLoopsPython(rootNode, parserLanguage, filePath);
        }
        return [];
    }

    private detectExpensiveAPIsInLoopsJS(
        rootNode: SyntaxNode,
        parserLanguage: any,
        filePath: string
    ): Alert[] {
        const alerts: Alert[] = [];

        // Query for loops
        const loopQueryString = `
      [
        (for_statement body: (_) @body)
        (for_in_statement body: (_) @body)
        (while_statement body: (_) @body)
        (do_statement body: (_) @body)
      ]
    `;

        try {
            const loopQuery = new Query(parserLanguage, loopQueryString);
            const loopMatches = loopQuery.matches(rootNode);

            for (const loopMatch of loopMatches) {
                const bodyNode = loopMatch.captures.find((c) => c.name === 'body')?.node;
                if (!bodyNode) continue;

                // Check for expensive API calls in loop body
                const expensiveCall = this.findExpensiveAPICall(bodyNode);
                if (expensiveCall) {
                    // Check if there's rate limiting
                    const hasRateLimiting = this.hasRateLimiting(bodyNode);

                    if (!hasRateLimiting) {
                        const startLine = bodyNode.startPosition.row + 1;
                        alerts.push({
                            id: `expensive-api-in-loop-${startLine}`,
                            severity: AlertSeverity.HIGH,
                            message: `Expensive API in Loop: ${expensiveCall.api} called in loop without rate limiting`,
                            file: filePath,
                            line: startLine,
                            module: this.name,
                            rule: 'expensive-api-in-loop',
                            suggestion: `Add rate limiting (e.g., p-limit, Bottleneck) or move expensive ${expensiveCall.type} API calls outside the loop`,
                        });
                    }
                }
            }
        } catch (e) {
            console.warn(`Query error in ${filePath}:`, e);
        }

        return alerts;
    }

    private detectExpensiveAPIsInLoopsPython(
        rootNode: SyntaxNode,
        parserLanguage: any,
        filePath: string
    ): Alert[] {
        const alerts: Alert[] = [];

        // Query for Python loops
        const loopQueryString = `
      [
        (for_statement body: (block) @body)
        (while_statement body: (block) @body)
      ]
    `;

        try {
            const loopQuery = new Query(parserLanguage, loopQueryString);
            const loopMatches = loopQuery.matches(rootNode);

            for (const loopMatch of loopMatches) {
                const bodyNode = loopMatch.captures.find((c) => c.name === 'body')?.node;
                if (!bodyNode) continue;

                const expensiveCall = this.findExpensiveAPICall(bodyNode);
                if (expensiveCall) {
                    const hasRateLimiting = this.hasRateLimiting(bodyNode);

                    if (!hasRateLimiting) {
                        const startLine = bodyNode.startPosition.row + 1;
                        alerts.push({
                            id: `expensive-api-in-loop-${startLine}`,
                            severity: AlertSeverity.HIGH,
                            message: `Expensive API in Loop: ${expensiveCall.api} called in loop without rate limiting`,
                            file: filePath,
                            line: startLine,
                            module: this.name,
                            rule: 'expensive-api-in-loop',
                            suggestion: `Add rate limiting (e.g., ratelimit, asyncio.sleep) or move expensive ${expensiveCall.type} API calls outside the loop`,
                        });
                    }
                }
            }
        } catch (e) {
            console.warn(`Query error in ${filePath}:`, e);
        }

        return alerts;
    }

    private detectMissingCache(
        rootNode: SyntaxNode,
        language: SupportedLanguage,
        filePath: string,
        parserLanguage: any,
        config: VibechckConfig
    ): Alert[] {
        if (isRuleIgnored('missing-cache-for-expensive-call', filePath, config)) return [];

        const alerts: Alert[] = [];

        // Find functions that call expensive APIs
        const functionQueryString =
            language === 'python'
                ? `(function_definition name: (identifier) @name body: (block) @body)`
                : `
          [
            (function_declaration name: (identifier) @name body: (statement_block) @body)
            (arrow_function body: (statement_block) @body)
          ]
        `;

        try {
            const funcQuery = new Query(parserLanguage, functionQueryString);
            const funcMatches = funcQuery.matches(rootNode);

            for (const funcMatch of funcMatches) {
                const bodyNode = funcMatch.captures.find((c) => c.name === 'body')?.node;
                const nameNode = funcMatch.captures.find((c) => c.name === 'name')?.node;
                if (!bodyNode) continue;

                const expensiveCall = this.findExpensiveAPICall(bodyNode);
                if (expensiveCall) {
                    // Check if function checks cache first
                    const hasCache = this.hasCacheCheck(bodyNode);

                    if (!hasCache) {
                        const funcName = nameNode ? nameNode.text : 'anonymous';
                        const startLine = bodyNode.startPosition.row + 1;
                        alerts.push({
                            id: `missing-cache-${funcName}-${startLine}`,
                            severity: AlertSeverity.MEDIUM,
                            message: `Missing Cache: Function ${funcName} calls expensive ${expensiveCall.type} API without caching`,
                            file: filePath,
                            line: startLine,
                            module: this.name,
                            rule: 'missing-cache-for-expensive-call',
                            suggestion: `Add caching (Redis, Map, lru-cache) for ${expensiveCall.api} to reduce costs`,
                        });
                    }
                }
            }
        } catch (e) {
            console.warn(`Query error in ${filePath}:`, e);
        }

        return alerts;
    }

    private findExpensiveAPICall(node: SyntaxNode): { api: string; type: string } | null {
        const nodeText = node.text.toLowerCase();

        for (const [apiPattern, info] of Object.entries(this.EXPENSIVE_APIS)) {
            const pattern = apiPattern.toLowerCase();
            if (nodeText.includes(pattern)) {
                return { api: apiPattern, type: info.type };
            }
        }

        return null;
    }

    private hasRateLimiting(node: SyntaxNode): boolean {
        const nodeText = node.text.toLowerCase();

        const rateLimitPatterns = [
            'plimit',
            'p-limit',
            'bottleneck',
            'ratelimit',
            'sleep(',
            'delay(',
            'wait(',
            'throttle',
            'debounce',
            'asyncio.sleep',
            'time.sleep',
        ];

        return rateLimitPatterns.some((pattern) => nodeText.includes(pattern));
    }

    private hasCacheCheck(node: SyntaxNode): boolean {
        const nodeText = node.text.toLowerCase();

        const cachePatterns = [
            'cache.get',
            'cache.set',
            'redis.get',
            'redis.set',
            'localstorage.get',
            'sessionstorage.get',
            'map.get',
            'map.set',
            'lru',
            'memoize',
            '@cache',
            'functools.lru_cache',
        ];

        return cachePatterns.some((pattern) => nodeText.includes(pattern));
    }
}
