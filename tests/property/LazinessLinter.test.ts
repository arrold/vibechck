import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fc from 'fast-check';

const mockReadFile = jest.fn();
const mockStat = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
    readFile: mockReadFile,
    stat: mockStat,
}));

const { LazinessLinter } = await import('../../src/modules/laziness/LazinessLinter.js');
const { DEFAULT_CONFIG } = await import('../../src/types/defaultConfig.js');

describe('LazinessLinter Properties', () => {
    let linter: LazinessLinter;
    let mockConfig: any;

    beforeEach(() => {
        linter = new LazinessLinter();
        mockReadFile.mockReset();
        mockStat.mockReset();

        mockConfig = {
            ...DEFAULT_CONFIG,
            modules: { ...DEFAULT_CONFIG.modules, hallucination: false, laziness: true, security: false, architecture: false },
            laziness: {
                ...DEFAULT_CONFIG.laziness,
                patterns: ['//... rest of the code'],
                detectAIPreambles: true,
                detectHollowFunctions: true,
                detectMockImplementations: true
            }
        };
        mockStat.mockResolvedValue({ size: 100 });
    });

    // Property 6: Lazy Pattern Detection
    it('should detect configured lazy patterns in any generated string', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string(), // Prefix
                fc.string(), // Suffix
                async (prefix, suffix) => {
                    const pattern = '//... rest of the code';
                    const content = `${prefix}${pattern}${suffix}`;
                    const file = 'test.ts';

                    mockReadFile.mockResolvedValue(content);
                    // Mock stat handled in beforeEach, but if needed here:
                    // mockStat.mockResolvedValue({ size: 100 });

                    const alerts = await linter.analyze([file], mockConfig);

                    const found = alerts.some((a: any) => a.rule === 'placeholder-comment');
                    expect(found).toBe(true);
                }
            )
        );
    });

    // Property 7: AI Preamble Detection
    it('should detect AI preambles regardless of casing', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string(),
                async (suffix) => {
                    // Test one known pattern with random casing
                    const basePattern = "As an AI language model";
                    // Simple random casing simulation (not truly fully random per char in property, but close enough for property test logic)
                    // Better to let fc generate it? 
                    // Let's just use fc to generate casing logic? 
                    // Actually, let's keep it simple.

                    const caseVariant = basePattern.split('').map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join('');

                    const content = `${caseVariant} ${suffix}`;

                    mockReadFile.mockResolvedValue(content);

                    const alerts = await linter.analyze(['test.ts'], mockConfig);

                    expect(alerts.some((a: any) => a.rule === 'ai-preamble')).toBe(true);
                }
            )
        );
    });
});
