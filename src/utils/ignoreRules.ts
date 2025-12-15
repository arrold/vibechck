import { VibechckConfig } from '../types/index.js';
import { minimatch } from 'minimatch';

export function isRuleIgnored(ruleId: string, filePath: string, config: VibechckConfig): boolean {
  const rules = config.ignoreRules || {};
  const patterns = rules[ruleId];
  if (!patterns) return false;

  for (const pattern of patterns) {
    // Use matchBase: true to allow patterns like "magic.ts" to match "examples/magic.ts"
    // Use dot: true to allow matching hidden files if necessary (though usually explicit)
    if (minimatch(filePath, pattern, { matchBase: true, dot: true })) {
      return true;
    }
  }

  return false;
}
