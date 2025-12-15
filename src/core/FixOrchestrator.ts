import { Report, Alert } from '../types/index.js';
import { JSCodeshiftAdapter } from './adapters/JSCodeshiftAdapter.js';
import { PythonCSTAdapter } from './adapters/PythonCSTAdapter.js';
import * as path from 'path';

export class FixOrchestrator {
  private jsAdapter: JSCodeshiftAdapter;
  private pyAdapter: PythonCSTAdapter;

  constructor() {
    this.jsAdapter = new JSCodeshiftAdapter();
    this.pyAdapter = new PythonCSTAdapter();
  }

  async applyFixes(report: Report): Promise<void> {
    const fixableAlerts = report.alerts.filter((issue: Alert) => issue.rule === 'hollow-function');

    if (fixableAlerts.length === 0) {
      console.log('No auto-fixable issues found.');
      return;
    }

    console.log(`Found ${fixableAlerts.length} fixable issues. Applying fixes...`);

    // 2. Group by language/adapter
    const jsFiles = new Set<string>();
    const pyFiles = new Set<string>();

    for (const alert of fixableAlerts) {
      // Check file extension
      // Alert doesn't strictly have full path, but usually it does in our implementation?
      // Wait, AnalysisEngine returns Report -> Result -> Issue.
      // Result is per file usually?
      // Actually Report structure is { summary, results: AnalysisResult[] }.
      // AnalysisResult = { timestamp, duration, issues: Alert[] }.
      // Alert = { rule, severity, message, file, line... }.

      const ext = path.extname(alert.file).toLowerCase();
      if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
        jsFiles.add(alert.file);
      } else if (['.py'].includes(ext)) {
        pyFiles.add(alert.file);
      }
    }

    // 3. Dispatch to adapters
    if (jsFiles.size > 0) {
      console.log(`Running JS codemods on ${jsFiles.size} files...`);
      await this.jsAdapter.run(Array.from(jsFiles));
    }

    if (pyFiles.size > 0) {
      console.log(`Running Python codemods on ${pyFiles.size} files...`);
      await this.pyAdapter.run(Array.from(pyFiles));
    }

    console.log('Auto-fix complete.');
  }
}
