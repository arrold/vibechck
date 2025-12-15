import { Report, Alert } from '../types/index.js';
import chalk from 'chalk';

export class ReportGenerator {
  generateJsonReport(report: Report): string {
    return JSON.stringify(report, null, 2);
  }

  generateTextReport(report: Report): string {
    let output = '';

    output += chalk.bold(`\nVibeCheck Analysis Report\n`);
    output += chalk.gray('=========================\n\n');

    output += `Analyzed Files: ${report.scanInfo.filesScanned}\n`;
    output += `Total Alerts: ${report.summary.total}\n`;
    output += `Duration: ${report.scanInfo.scanDuration}ms\n\n`;

    if (report.alerts.length === 0) {
      output += chalk.green('No issues found. Good vibes only! ✨\n');
      return output;
    }

    // Group by severity
    const critical = report.alerts.filter((a) => a.severity === 'CRITICAL');
    const high = report.alerts.filter((a) => a.severity === 'HIGH');
    const medium = report.alerts.filter((a) => a.severity === 'MEDIUM');
    const low = report.alerts.filter((a) => a.severity === 'LOW');

    this.appendSeveritySection('CRITICAL', critical);
    this.appendSeveritySection('HIGH', high);
    this.appendSeveritySection('MEDIUM', medium);
    this.appendSeveritySection('LOW', low);

    return output;
  }

  private appendSeveritySection(title: string, alerts: Alert[]): void {
    if (alerts.length > 0) {
      // output += colorFn(`${title} (${alerts.length})`) + '\n';
      // Simple implementation for now
    }
  }
}
