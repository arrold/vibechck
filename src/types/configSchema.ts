/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { AlertSeverity } from './index.js';

interface ConfigValidationError {
  field: string;
  message: string;
  value: any;
}

export class ConfigValidator {
  static validate(config: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!config || typeof config !== 'object') {
      errors.push({
        field: 'root',
        message: 'Configuration must be an object',
        value: config,
      });
      return errors;
    }

    errors.push(...this.validateSeverity(config));
    errors.push(...this.validateModules(config));
    errors.push(...this.validateHallucination(config));
    errors.push(...this.validateArchitecture(config));
    errors.push(...this.validateScanning(config));
    errors.push(...this.validateLaziness(config));

    return errors;
  }

  private static validateSeverity(config: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (config.severity) {
      if (!Array.isArray(config.severity)) {
        errors.push({
          field: 'severity',
          message: 'Severity must be an array',
          value: config.severity,
        });
      } else {
        const validSeverities = Object.values(AlertSeverity);
        config.severity.forEach((severity: any, index: number) => {
          if (!validSeverities.includes(severity)) {
            errors.push({
              field: `severity[${index}]`,
              message: `Invalid severity: ${severity}. Must be one of: ${validSeverities.join(', ')}`,
              value: severity,
            });
          }
        });
      }
    }
    return errors;
  }

  private static validateModules(config: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (config.modules) {
      if (typeof config.modules !== 'object') {
        errors.push({
          field: 'modules',
          message: 'Modules must be an object',
          value: config.modules,
        });
      } else {
        const requiredModules = ['hallucination', 'laziness', 'security', 'architecture'];
        requiredModules.forEach((module) => {
          if (config.modules[module] !== undefined && typeof config.modules[module] !== 'boolean') {
            errors.push({
              field: `modules.${module}`,
              message: `Module ${module} must be a boolean`,
              value: config.modules[module],
            });
          }
        });
      }
    }
    return errors;
  }

  private static validateHallucination(config: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (config.hallucination) {
      const hallucination = config.hallucination;

      if (
        hallucination.packageAgeThresholdDays !== undefined &&
        (typeof hallucination.packageAgeThresholdDays !== 'number' ||
          hallucination.packageAgeThresholdDays < 0)
      ) {
        errors.push({
          field: 'hallucination.packageAgeThresholdDays',
          message: 'Package age threshold must be a positive number',
          value: hallucination.packageAgeThresholdDays,
        });
      }

      if (
        hallucination.packageDownloadThreshold !== undefined &&
        (typeof hallucination.packageDownloadThreshold !== 'number' ||
          hallucination.packageDownloadThreshold < 0)
      ) {
        errors.push({
          field: 'hallucination.packageDownloadThreshold',
          message: 'Package download threshold must be a positive number',
          value: hallucination.packageDownloadThreshold,
        });
      }

      if (
        hallucination.typosquatLevenshteinDistance !== undefined &&
        (typeof hallucination.typosquatLevenshteinDistance !== 'number' ||
          hallucination.typosquatLevenshteinDistance < 1 ||
          hallucination.typosquatLevenshteinDistance > 3)
      ) {
        errors.push({
          field: 'hallucination.typosquatLevenshteinDistance',
          message: 'Typosquat Levenshtein distance must be between 1 and 3',
          value: hallucination.typosquatLevenshteinDistance,
        });
      }
    }
    return errors;
  }

  private static validateArchitecture(config: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (config.architecture) {
      const architecture = config.architecture;

      if (
        architecture.cyclomaticComplexityThreshold !== undefined &&
        (typeof architecture.cyclomaticComplexityThreshold !== 'number' ||
          architecture.cyclomaticComplexityThreshold < 1)
      ) {
        errors.push({
          field: 'architecture.cyclomaticComplexityThreshold',
          message: 'Cyclomatic complexity threshold must be a positive number',
          value: architecture.cyclomaticComplexityThreshold,
        });
      }

      if (
        architecture.linesOfCodeThreshold !== undefined &&
        (typeof architecture.linesOfCodeThreshold !== 'number' ||
          architecture.linesOfCodeThreshold < 1)
      ) {
        errors.push({
          field: 'architecture.linesOfCodeThreshold',
          message: 'Lines of code threshold must be a positive number',
          value: architecture.linesOfCodeThreshold,
        });
      }
    }
    return errors;
  }

  private static validateScanning(config: any): ConfigValidationError[] {
    // Skipping excessive implementation details for brevity, but needed
    const errors: ConfigValidationError[] = [];
    if (config.scanning) {
      const scanning = config.scanning;

      if (scanning.include && !Array.isArray(scanning.include)) {
        errors.push({
          field: 'scanning.include',
          message: 'Scanning include patterns must be an array',
          value: scanning.include,
        });
      }

      if (scanning.exclude && !Array.isArray(scanning.exclude)) {
        errors.push({
          field: 'scanning.exclude',
          message: 'Scanning exclude patterns must be an array',
          value: scanning.exclude,
        });
      }

      if (
        scanning.maxFileSize !== undefined &&
        (typeof scanning.maxFileSize !== 'number' || scanning.maxFileSize < 0)
      ) {
        errors.push({
          field: 'scanning.maxFileSize',
          message: 'Max file size must be a positive number',
          value: scanning.maxFileSize,
        });
      }

      if (scanning.followSymlinks !== undefined && typeof scanning.followSymlinks !== 'boolean') {
        errors.push({
          field: 'scanning.followSymlinks',
          message: 'Follow symlinks must be a boolean',
          value: scanning.followSymlinks,
        });
      }
    }
    return errors;
  }

  private static validateLaziness(config: any): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (config.laziness) {
      if (
        config.laziness.commentDensityThreshold !== undefined &&
        (typeof config.laziness.commentDensityThreshold !== 'number' ||
          config.laziness.commentDensityThreshold < 0 ||
          config.laziness.commentDensityThreshold > 1)
      ) {
        errors.push({
          field: 'laziness.commentDensityThreshold',
          message: 'Comment density threshold must be a number between 0 and 1',
          value: config.laziness.commentDensityThreshold,
        });
      }
    }
    return errors;
  }
}
