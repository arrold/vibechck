import { Alert, Report, VibechckConfig } from '../types/index.js';
import { ConfigLoader } from './ConfigLoader.js';
import { VibechckFileScanner } from './FileScanner.js';
import { PluginManager } from './PluginManager.js';
import { HallucinationSentinel } from '../modules/hallucination/HallucinationSentinel.js';
import { LazinessLinter } from '../modules/laziness/LazinessLinter.js';
import { SecuritySentinel } from '../modules/security/SecuritySentinel.js';
import { ArchitectureScanner } from '../modules/architecture/ArchitectureScanner.js';
import { CostSentinel } from '../modules/cost/CostSentinel.js';

export class AnalysisEngine {
  private configLoader: ConfigLoader;
  private pluginManager: PluginManager;
  private fileScanner: VibechckFileScanner; // Added based on original code and usage

  constructor() {
    this.configLoader = new ConfigLoader();
    this.pluginManager = new PluginManager();
    this.registerDefaultPlugins();
    // Initialize fileScanner here as it's used in analyze, and constructor is the right place for initial setup
    this.fileScanner = new VibechckFileScanner({} as VibechckConfig);
  }

  private registerDefaultPlugins(): void {
    this.pluginManager.register(new HallucinationSentinel());
    this.pluginManager.register(new LazinessLinter());
    this.pluginManager.register(new SecuritySentinel());
    this.pluginManager.register(new ArchitectureScanner());
    this.pluginManager.register(new CostSentinel());
  }

  async initialize(): Promise<void> {}

  async analyze(directory: string, config?: VibechckConfig): Promise<Report> {
    const activeConfig = config || (await this.configLoader.load());
    const startTime = Date.now();

    // Update file scanner config
    this.fileScanner = new VibechckFileScanner(activeConfig);

    // Initialize plugins
    await this.pluginManager.initialize(activeConfig);

    // Scan directory for files
    const files = await this.fileScanner.scanDirectory(directory);

    // Filter alerts by severity
    const allAlerts: Alert[] = [];

    // Run plugin hooks
    await this.pluginManager.beforeAnalyze(activeConfig);
    await this.pluginManager.onAnalyze(files, activeConfig, allAlerts);
    await this.pluginManager.afterAnalyze(allAlerts, activeConfig);

    // Filter alerts by configured severity levels
    const filteredAlerts = this.filterAlertsBySeverity(allAlerts, activeConfig.severity);

    // Deduplicate alerts
    const deduplicatedAlerts = this.deduplicateAlerts(filteredAlerts);

    const endTime = Date.now();

    return {
      summary: this.generateSummary(deduplicatedAlerts),
      alerts: deduplicatedAlerts,
      scanInfo: {
        directory,
        filesScanned: files.length,
        scanDuration: endTime - startTime,
        timestamp: new Date(),
        config: activeConfig,
      },
    };
  }

  private filterAlertsBySeverity(alerts: Alert[], severities: string[]): Alert[] {
    return alerts.filter((alert) => severities.includes(alert.severity));
  }

  private deduplicateAlerts(alerts: Alert[]): Alert[] {
    const seen = new Set<string>();
    return alerts.filter((alert) => {
      const key = `${alert.file}:${alert.line}:${alert.rule}:${alert.message} `;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private generateSummary(alerts: Alert[]): Report['summary'] {
    const summary = {
      total: alerts.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const alert of alerts) {
      switch (alert.severity) {
        case 'CRITICAL':
          summary.critical++;
          break;
        case 'HIGH':
          summary.high++;
          break;
        case 'MEDIUM':
          summary.medium++;
          break;
        case 'LOW':
          summary.low++;
          break;
      }
    }

    return summary;
  }
}
