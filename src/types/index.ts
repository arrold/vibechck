/**
 * Core type definitions for VibeCheck - AI Coding Assistant Criticism Scanner
 */

export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  file: string;
  line?: number;
  column?: number;
  module: string;
  rule: string;
  suggestion?: string;
}

export interface PackageDependency {
  name: string;
  version?: string;
  type: 'production' | 'development' | 'peer' | 'optional';
  registry: 'npm' | 'pypi' | 'crates' | 'go';
  file: string;
}

export interface FunctionMetrics {
  name: string;
  cyclomaticComplexity: number;
  linesOfCode: number;
  parameters: number;
  nestingDepth: number;
  file: string;
  startLine: number;
  endLine: number;
}

export interface VibechckConfig {
  // General settings
  severity: AlertSeverity[];
  modules: {
    hallucination: boolean;
    laziness: boolean;
    security: boolean;
    architecture: boolean;
    cost: boolean;
  };

  // Hallucination Sentinel settings
  hallucination: {
    packageAgeThresholdDays: number;
    packageDownloadThreshold: number;
    typosquatLevenshteinDistance: number;
    topPackagesCount: number;
  };

  // Laziness Linter settings
  laziness: {
    patterns: string[];
    detectAIPreambles: boolean;
    detectHollowFunctions: boolean;
    detectMockImplementations: boolean;
    detectPlaceholderComments: boolean;
    detectOverCommenting: boolean;
    detectUnloggedErrors: boolean;
    commentDensityThreshold: number;
  };

  // Security Sentinel settings
  security: {
    detectHardcodedSecrets: boolean;
    detectInsecureDeserialization: boolean;
    detectReact2Shell: boolean;
    detectInsecureJWT: boolean;
    detectMissingEnvCheck: boolean;
    detectHardcodedProductionURL: boolean;
    secretEntropyThreshold: number;
  };

  // Architecture Scanner settings
  architecture: {
    cyclomaticComplexityThreshold: number;
    linesOfCodeThreshold: number;
    detectMixedNaming: boolean;
    detectCircularDependencies: boolean;
    detectMagicNumbers: boolean;
    detectUnusedExports: boolean; // Added in Phase 5
  };

  // Supply Chain settings
  supplyChain?: {
    checkNewborn: boolean;
    checkScorecard: boolean;
    minScorecardScore: number;
  };

  // File scanning settings
  scanning: {
    include: string[];
    exclude: string[];
    maxFileSize: number;
    followSymlinks: boolean;
  };

  // Granular ignore rules
  // Map of rule ID to list of glob patterns/files to ignore for that rule
  ignoreRules?: {
    [ruleId: string]: string[];
  };
}

export interface Report {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  alerts: Alert[];
  scanInfo: {
    directory: string;
    filesScanned: number;
    scanDuration: number;
    timestamp: Date;
    config: VibechckConfig;
  };
}

export interface FileScanner {
  scanDirectory(path: string): Promise<string[]>;
  detectLanguage(filePath: string): string;
  isDependencyFile(filePath: string): boolean;
  isSourceFile(filePath: string): boolean;
}

export interface AnalysisModule {
  name: string;
  analyze(files: string[], config: VibechckConfig): Promise<Alert[]>;
  isEnabled(config: VibechckConfig): boolean;
}

export interface RegistryClient {
  checkPackageExists(packageName: string, registry: string): Promise<boolean>;
  getPackageInfo(packageName: string, registry: string): Promise<PackageInfo | null>;
}

export interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  createdAt: Date;
  downloads: number;
  maintainers: string[];
  repositoryUrl?: string;
}

export interface ImportGraph {
  nodes: Map<string, ImportNode>;
  edges: Map<string, Set<string>>;
}

export interface ImportNode {
  filePath: string;
  imports: string[];
  importedSymbols: Map<string, string[]>; // Path -> List of imported symbols (e.g. ['foo', 'bar'] or ['*'])
  exports: string[];
}

export type Language =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'rust'
  | 'go'
  | 'vue'
  | 'svelte'
  | 'unknown';

export interface FileInfo {
  path: string;
  language: Language;
  size: number;
  isDependencyFile: boolean;
  isSourceFile: boolean;
}

export type AnalysisModuleName = 'hallucination' | 'laziness' | 'security' | 'architecture';

export interface VibechckPlugin {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply(compiler: any): void; // Using any for now to avoid circular dependency with PluginManager
}

export interface AnalysisContext {
  fileInfo: FileInfo;
  content: string;
  config: VibechckConfig;
  dependencies: PackageDependency[];
  imports: ImportGraph;
}
