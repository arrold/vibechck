import { Alert, Report, VibechckConfig, VibechckPlugin } from '../types/index.js';
import { SyncHook, AsyncSeriesHook } from 'tapable';

export class PluginManager {
  hooks = {
    initialize: new AsyncSeriesHook<[VibechckConfig]>(['config']),
    beforeAnalyze: new AsyncSeriesHook<[VibechckConfig]>(['config']),
    onAnalyze: new AsyncSeriesHook<[string[], VibechckConfig, Alert[]]>([
      'files',
      'config',
      'alerts',
    ]),
    afterAnalyze: new AsyncSeriesHook<[Alert[], VibechckConfig]>(['alerts', 'config']),
    onReport: new SyncHook<[Report]>(['report']),
  };
  private plugins: VibechckPlugin[] = [];

  constructor() {}

  register(plugin: VibechckPlugin): void {
    this.plugins.push(plugin);
    plugin.apply(this);
  }

  async initialize(config: VibechckConfig): Promise<void> {
    await this.hooks.initialize.promise(config);
  }

  async beforeAnalyze(config: VibechckConfig): Promise<void> {
    await this.hooks.beforeAnalyze.promise(config);
  }

  async onAnalyze(files: string[], config: VibechckConfig, alerts: Alert[]): Promise<void> {
    await this.hooks.onAnalyze.promise(files, config, alerts);
  }

  async afterAnalyze(alerts: Alert[], config: VibechckConfig): Promise<void> {
    await this.hooks.afterAnalyze.promise(alerts, config);
  }
}
