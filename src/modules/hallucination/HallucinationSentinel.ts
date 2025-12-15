import * as path from 'path';
import {
  AnalysisModule,
  Alert,
  AlertSeverity,
  PackageDependency,
  VibechckConfig,
  VibechckPlugin,
} from '../../types/index.js';
import { VibechckRegistryClient } from '../../core/RegistryClient.js';
import { DependencyParser } from '../../core/DependencyParser.js';
import { PluginManager } from '../../core/PluginManager.js';
import Levenshtein from 'levenshtein';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export class HallucinationSentinel implements AnalysisModule, VibechckPlugin {
  // Changed VibeCheckPlugin to VibechckPlugin
  name = 'HallucinationSentinel';
  private registryClient: VibechckRegistryClient;
  private topPackages: string[] = [];

  constructor() {
    this.registryClient = new VibechckRegistryClient();
  }

  apply(compiler: PluginManager): void {
    compiler.hooks.onAnalyze.tapPromise(this.name, async (files: string[], config: VibechckConfig, alerts: Alert[]) => {
      if (this.isEnabled(config)) {
        const moduleAlerts = await this.analyze(files, config);
        alerts.push(...moduleAlerts);
      }
    });
  }

  isEnabled(config: VibechckConfig): boolean {
    return config.modules.hallucination;
  }

  async analyze(files: string[], config: VibechckConfig): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const dependencyFiles = files.filter((file) => this.isDependencyFile(file));

    // Load top packages for typosquat detection
    await this.loadTopPackages();

    for (const file of dependencyFiles) {
      try {
        const dependencies = await this.parseDependencyFile(file);
        const fileAlerts = await this.analyzeDependencies(dependencies, config);
        alerts.push(...fileAlerts);
      } catch (error) {
        console.warn(`Warning: Failed to parse dependency file ${file}: ${error}`);
      }
    }

    return alerts;
  }

  private isDependencyFile(filePath: string): boolean {
    const basename = path.basename(filePath).toLowerCase();
    return ['package.json', 'requirements.txt', 'pyproject.toml', 'cargo.toml', 'go.mod'].includes(
      basename
    );
  }

  private async parseDependencyFile(filePath: string): Promise<PackageDependency[]> {
    return DependencyParser.parseDependencyFile(filePath);
  }

  private async analyzeDependencies(
    dependencies: PackageDependency[],
    config: VibechckConfig
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    for (const dep of dependencies) {
      try {
        // Phantom Check (404 detection)
        const exists = await this.registryClient.checkPackageExists(dep.name, dep.registry);
        if (!exists) {
          alerts.push({
            id: `hallucination-${dep.name}-${Date.now()}`,
            severity: AlertSeverity.CRITICAL,
            message: `Hallucinated Package: ${dep.name} does not exist in ${dep.registry}`,
            file: dep.file,
            module: this.name,
            rule: 'phantom-package',
            suggestion: `Remove the dependency or verify the correct package name`,
          });
          continue;
        }

        // Newborn Check (Supply Chain)
        if (config.supplyChain?.checkNewborn) {
          const packageInfo = await this.registryClient.getPackageInfo(dep.name, dep.registry);
          if (packageInfo) {
            const ageInDays =
              (Date.now() - packageInfo.createdAt.getTime()) /
              (MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY);
            const threshold = config.hallucination.packageAgeThresholdDays || 30; // Fallback default

            if (ageInDays < threshold) {
              alerts.push({
                id: `newborn-${dep.name}-${Date.now()}`,
                severity: AlertSeverity.MEDIUM,
                message: `Newborn Package: ${dep.name} is ${Math.round(ageInDays)} days old (newly registered)`,
                file: dep.file,
                module: this.name,
                rule: 'newborn-package',
                suggestion: `Verify the authenticity of this package. Recent packages have higher risk of being malicious.`,
              });
            }
          }
        }

        // Typosquat Check
        const typosquatMatch = this.findTyposquatMatch(
          dep.name,
          config.hallucination.typosquatLevenshteinDistance
        );
        if (typosquatMatch) {
          alerts.push({
            id: `typosquat-${dep.name}-${Date.now()}`,
            severity: AlertSeverity.MEDIUM,
            message: `Typosquatting Risk: ${dep.name} is similar to ${typosquatMatch}`,
            file: dep.file,
            module: this.name,
            rule: 'typosquat-risk',
            suggestion: `Verify you meant to use ${typosquatMatch} instead of ${dep.name}`,
          });
        }
      } catch (error) {
        console.warn(`Warning: Failed to analyze dependency ${dep.name}: ${error}`);
      }
    }

    return alerts;
  }

  private findTyposquatMatch(packageName: string, maxDistance: number): string | null {
    for (const topPackage of this.topPackages) {
      const distance = new Levenshtein(packageName, topPackage).distance;
      if (distance === maxDistance && distance > 0) {
        return topPackage;
      }
    }
    return null;
  }

  private async loadTopPackages(): Promise<void> {
    // In a real implementation, this would fetch the top N packages from each registry
    // For now, we'll use a hardcoded list of common packages
    this.topPackages = [
      'react',
      'vue',
      'angular',
      'express',
      'lodash',
      'moment',
      'axios',
      'webpack',
      'babel',
      'typescript',
      'eslint',
      'prettier',
      'jest',
      'webpack',
      'rollup',
      'vite',
      'next',
      'nuxt',
      'requests',
      'numpy',
      'pandas',
      'scipy',
      'matplotlib',
      'flask',
      'django',
      'fastapi',
      'serde',
      'tokio',
      'rayon',
      'clap',
      'log',
      'anyhow',
      'thiserror',
      'serde_json',
      'gin',
      'echo',
      'cobra',
      'viper',
      'gorm',
      'chi',
      'fiber',
      'negroni',
      'martini',
    ];
  }
}
