import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

const mockReadFile = jest.fn();
const mockStat = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
    readFile: mockReadFile,
    stat: mockStat,
}));

const { LazinessLinter } = await import('../../src/modules/laziness/LazinessLinter.js');
const { DEFAULT_CONFIG } = await import('../../src/types/defaultConfig.js');

describe('LazinessLinter', () => {
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

    it('should detect AI preambles', async () => {
        const file = 'src/test.ts';
        const content = `
            // Here is the updated code for your request
            function add(a, b) { return a + b; }
        `;
        mockReadFile.mockResolvedValue(content);

        const alerts = await linter.analyze([file], mockConfig);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].rule).toBe('ai-preamble');
    });

    it('should detect placeholder comments', async () => {
        const file = 'src/test.ts';
        const content = `
            function todo() {
                //... rest of the code matches pattern
            }
        `;
        mockReadFile.mockResolvedValue(content);

        // Disable hollow function detection to isolate placeholder test
        mockConfig.laziness.detectHollowFunctions = false;

        const alerts = await linter.analyze([file], mockConfig);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].rule).toBe('placeholder-comment');
    });

    it('should detect hollow functions (JS/TS)', async () => {
        const file = 'src/test.ts';
        const content = `
            function empty() {
                // TODO: Implement later
                return null;
            }
        `;
        mockReadFile.mockResolvedValue(content);

        const alerts = await linter.analyze([file], mockConfig);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].rule).toBe('hollow-function');
    });

    it('should detect hollow functions (Python)', async () => {
        const file = 'src/test.py';
        const content = `
def empty_py():
    # TODO: Implement
    pass
        `;
        mockReadFile.mockResolvedValue(content);

        const alerts = await linter.analyze([file], mockConfig);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].rule).toBe('hollow-function');
    });

    it('should detect mock implementations', async () => {
        const file = 'src/test.ts';
        const content = `
            async function calculateMetrics() {
                await sleep(1000);
                return { success: true };
            }
        `;
        mockReadFile.mockResolvedValue(content);

        const alerts = await linter.analyze([file], mockConfig);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].rule).toBe('mock-implementation');
    });
});
