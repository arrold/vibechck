import * as path from 'path';
import { Report, Alert, AlertSeverity } from '../types/index.js';

export class SarifFormatter {
  generateSarifReport(report: Report): string {
    const rules = this.getRules(report.alerts);
    const baseDir = path.resolve(report.scanInfo.directory);
    const results = report.alerts.map((alert) => this.convertAlertToResult(alert, baseDir));

    const sarif = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'VibeCheck',
              informationUri: 'https://github.com/google-deepmind/vibecheck',
              version: '1.0.0',
              rules: Array.from(rules.values()),
            },
          },
          results: results,
        },
      ],
    };

    return JSON.stringify(sarif, null, 2);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getRules(alerts: Alert[]): Map<string, any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rulesMap = new Map<string, any>();
    for (const alert of alerts) {
      if (!rulesMap.has(alert.rule)) {
        rulesMap.set(alert.rule, {
          id: alert.rule,
          shortDescription: {
            text: alert.message.split(':')[0], // Heuristic: Use first part of message as description
          },
          fullDescription: {
            text: alert.message,
          },
          defaultConfiguration: {
            level: this.mapSeverityToLevel(alert.severity),
          },
          properties: {
            module: alert.module,
            tags: [alert.module],
          },
        });
      }
    }
    return rulesMap;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertAlertToResult(alert: Alert, baseDir: string): any {
    // Convert absolute path to relative path for SARIF portability
    let relativePath = alert.file;
    if (path.isAbsolute(alert.file)) {
      relativePath = path.relative(baseDir, alert.file);
    }

    // Ensure forward slashes for URI consistency
    const uri = relativePath.split(path.sep).join('/');

    return {
      ruleId: alert.rule,
      level: this.mapSeverityToLevel(alert.severity),
      message: {
        text: alert.message + (alert.suggestion ? ` Recommendation: ${alert.suggestion}` : ''),
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: uri,
            },
            region: {
              startLine: alert.line,
              startColumn: alert.column || 1,
            },
          },
        },
      ],
      partialFingerprints: {
        primaryLocationLineHash: alert.id, // Using internal ID as fingerprint for now
      },
    };
  }

  private mapSeverityToLevel(severity: string): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
      case AlertSeverity.HIGH:
        return 'error';
      case AlertSeverity.MEDIUM:
        return 'warning';
      case AlertSeverity.LOW:
      default:
        return 'note';
    }
  }
}
