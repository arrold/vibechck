import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/explicit-function-return-type */
import { VibechckConfig } from '../types/index.js';
import { DEFAULT_CONFIG } from '../types/defaultConfig.js';
import { ConfigValidator } from '../types/configSchema.js';

export class ConfigLoader {
  async load(configPath?: string): Promise<VibechckConfig> {
    if (configPath) {
      return this.loadConfigFile(configPath);
    }

    // Try to find config file in current directory and parent directories
    const configFiles = ['.vibechck.json', '.vibechck.yaml', '.vibechck.yml', '.vibecheck.json'];
    const currentDir = process.cwd();

    for (const configFile of configFiles) {
      const configFilePath = path.join(currentDir, configFile);
      if (await this.fileExists(configFilePath)) {
        return this.loadConfigFile(configFilePath);
      }
    }

    // Return default config if no config file found
    return DEFAULT_CONFIG;
  }

  private async loadConfigFile(filePath: string): Promise<VibechckConfig> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();

      let config: any;
      if (ext === '.json') {
        config = JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        config = yaml.parse(content);
      } else {
        throw new Error(`Unsupported config file format: ${ext}`);
      }

      // Normalize severity to uppercase
      if (config.severity && Array.isArray(config.severity)) {
        config.severity = config.severity.map((s: any) =>
          typeof s === 'string' ? s.toUpperCase() : s
        );
      }

      // Validate configuration
      // Merge with default config to fill in missing fields
      const mergedConfig = this.mergeWithDefaults(config);

      // Validate configuration
      const errors = ConfigValidator.validate(mergedConfig);
      if (errors.length > 0) {
        console.error('Configuration validation errors:');
        errors.forEach((error) => {
          console.error(`  ${error.field}: ${error.message} (value: ${error.value})`);
        });
        throw new Error('Invalid configuration');
      }

      return mergedConfig;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(
          `Invalid ${path.extname(filePath)} syntax in ${filePath}: ${error.message}`
        );
      }
      throw error;
    }
  }

  private mergeWithDefaults(config: any): VibechckConfig {
    return {
      severity: config.severity || DEFAULT_CONFIG.severity,
      modules: { ...DEFAULT_CONFIG.modules, ...config.modules },
      hallucination: { ...DEFAULT_CONFIG.hallucination, ...config.hallucination },
      laziness: { ...DEFAULT_CONFIG.laziness, ...config.laziness },
      security: { ...DEFAULT_CONFIG.security, ...config.security },
      architecture: { ...DEFAULT_CONFIG.architecture, ...config.architecture },
      scanning: { ...DEFAULT_CONFIG.scanning, ...config.scanning },
      ignoreRules: config.ignoreRules || DEFAULT_CONFIG.ignoreRules,
    };
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
