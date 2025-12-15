import { Report, AlertSeverity } from '../types/index.js';

export class ExitCodeHandler {
  determineExitCode(report: Report): number {
    if (report.alerts.some((a) => a.severity === AlertSeverity.CRITICAL)) {
      return 1;
    }
    return 0;
  }
}
