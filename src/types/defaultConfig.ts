import { VibechckConfig, AlertSeverity } from './index.js';

export const DEFAULT_CONFIG: VibechckConfig = {
  severity: [AlertSeverity.CRITICAL, AlertSeverity.HIGH, AlertSeverity.MEDIUM],
  modules: {
    hallucination: true,
    laziness: true,
    security: true,
    architecture: true,
    cost: true,
  },

  hallucination: {
    packageAgeThresholdDays: 30,
    packageDownloadThreshold: 500,
    typosquatLevenshteinDistance: 1,
    topPackagesCount: 10000,
  },

  laziness: {
    patterns: [
      '//' + '.*rest of the code.*',
      '//' + '.*logic goes here.*',
      '#' + '.*rest of the code.*',
      '/\\*' + '.*implementation details.*\\*/',
      'As an AI' + ' language model',
      'Here is the' + ' updated code',
    ],
    detectAIPreambles: true,
    detectHollowFunctions: true,
    detectMockImplementations: true,
    detectPlaceholderComments: true,
    detectOverCommenting: true,
    detectUnloggedErrors: true,
    commentDensityThreshold: 0.2,
  },

  security: {
    detectHardcodedSecrets: true,
    detectInsecureDeserialization: true,
    detectReact2Shell: true,
    detectInsecureJWT: true,
    detectMissingEnvCheck: true,
    detectHardcodedProductionURL: true,
    secretEntropyThreshold: 4.5,
  },

  architecture: {
    cyclomaticComplexityThreshold: 25,
    linesOfCodeThreshold: 100,
    detectMixedNaming: true,
    detectCircularDependencies: true,
    detectMagicNumbers: true,
    detectUnusedExports: true,
  },

  scanning: {
    include: [
      '**/*.js',
      '**/*.ts',
      '**/*.jsx',
      '**/*.tsx',
      '**/*.py',
      '**/*.rs',
      '**/*.go',
      '**/*.json',
      '**/*.toml',
      '**/*.yaml',
      '**/*.yml',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.git/**',
      '**/*.min.js',
      '**/*.d.ts',
      '**/*.map',
    ],
    maxFileSize: 1024 * 1024, // 1MB
    followSymlinks: false,
  },
  ignoreRules: {},
};
