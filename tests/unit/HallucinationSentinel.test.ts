import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

const mockCheckPackageExists = jest.fn();
const mockGetPackageInfo = jest.fn();
const MockRegistryClient = jest.fn(() => ({
    checkPackageExists: mockCheckPackageExists,
    getPackageInfo: mockGetPackageInfo,
}));

jest.unstable_mockModule('../../src/core/RegistryClient.js', () => ({
    VibechckRegistryClient: MockRegistryClient
}));

const mockReadFile = jest.fn();
jest.unstable_mockModule('fs/promises', () => ({
    readFile: mockReadFile,
}));

const { HallucinationSentinel } = await import('../../src/modules/hallucination/HallucinationSentinel.js');
const { DEFAULT_CONFIG } = await import('../../src/types/defaultConfig.js');
const { AlertSeverity } = await import('../../src/types/index.js');

describe('HallucinationSentinel', () => {
    let sentinel: HallucinationSentinel;
    let mockConfig: any;

    beforeEach(() => {
        MockRegistryClient.mockClear();
        mockCheckPackageExists.mockReset();
        mockGetPackageInfo.mockReset();
        mockReadFile.mockReset();

        sentinel = new HallucinationSentinel();

        // Setup default mock responses
        mockCheckPackageExists.mockResolvedValue(true);
        mockGetPackageInfo.mockResolvedValue({
            name: 'test-package',
            version: '1.0.0',
            description: 'Test',
            createdAt: new Date('2020-01-01'),
            downloads: 10000,
            maintainers: []
        });

        mockConfig = {
            ...DEFAULT_CONFIG,
            modules: { ...DEFAULT_CONFIG.modules, hallucination: true, laziness: false, security: false, architecture: false },
            hallucination: { ...DEFAULT_CONFIG.hallucination, packageAgeThresholdDays: 30, packageDownloadThreshold: 500, typosquatLevenshteinDistance: 1 },
        };
    });

    it('should detect phantom packages (404)', async () => {
        const file = 'package.json';
        const content = JSON.stringify({
            dependencies: { 'phantom-package': '1.0.0' }
        });

        mockReadFile.mockResolvedValue(content);
        mockCheckPackageExists.mockResolvedValue(false);

        const alerts = await sentinel.analyze([file], mockConfig);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].rule).toBe('phantom-package');
        expect(alerts[0].severity).toBe(AlertSeverity.CRITICAL);
        expect(alerts[0].message).toContain('phantom-package');
    });

    it('should detect newborn packages (Supply Chain)', async () => {
        const file = 'package.json';
        const content = JSON.stringify({
            dependencies: { 'new-package': '1.0.0' }
        });

        // Enable checkNewborn
        const configWithSupplyChain = {
            ...mockConfig,
            supplyChain: {
                checkNewborn: true,
                checkScorecard: false,
                minScorecardScore: 5
            }
        };

        mockReadFile.mockResolvedValue(content);
        mockCheckPackageExists.mockResolvedValue(true);
        mockGetPackageInfo.mockResolvedValue({
            name: 'new-package',
            version: '1.0.0',
            description: 'New',
            createdAt: new Date(), // Now
            downloads: 10,
            maintainers: []
        });

        const alerts = await sentinel.analyze([file], configWithSupplyChain);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].rule).toBe('newborn-package');
        expect(alerts[0].severity).toBe(AlertSeverity.MEDIUM);
        expect(alerts[0].message).toContain('Newborn Package');
    });

    it('should detect typosquatting', async () => {
        const file = 'package.json';
        // 'reacts' is distance 1 from 'react' (configured in HallucinationSentinel)
        const content = JSON.stringify({
            dependencies: { 'reacts': '1.0.0' }
        });

        mockReadFile.mockResolvedValue(content);

        const alerts = await sentinel.analyze([file], mockConfig);

        expect(alerts.length).toBeGreaterThan(0);
        const typoAlert = alerts.find((a: any) => a.rule === 'typosquat-risk');
        expect(typoAlert).toBeDefined();
        expect(typoAlert?.message).toContain('reacts');
    });
});
