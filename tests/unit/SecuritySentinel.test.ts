import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

const mockParseDependencyFile = jest.fn();
const mockGetScore = jest.fn();
const mockGetPackageInfo = jest.fn();

const MockDependencyParser = {
    parseDependencyFile: mockParseDependencyFile
};

const MockScorecardClient = jest.fn(() => ({
    getScore: mockGetScore
}));

const MockRegistryClient = jest.fn(() => ({
    getPackageInfo: mockGetPackageInfo
}));

jest.unstable_mockModule('../../src/core/DependencyParser.js', () => ({
    DependencyParser: MockDependencyParser
}));

jest.unstable_mockModule('../../src/core/ScorecardClient.js', () => ({
    ScorecardClient: MockScorecardClient
}));

jest.unstable_mockModule('../../src/core/RegistryClient.js', () => ({
    VibechckRegistryClient: MockRegistryClient
}));

const mockStat = jest.fn();
const mockReadFile = jest.fn();
jest.unstable_mockModule('fs/promises', () => ({
    stat: mockStat,
    readFile: mockReadFile
}));

const { SecuritySentinel } = await import('../../src/modules/security/SecuritySentinel.js');
const { DEFAULT_CONFIG } = await import('../../src/types/defaultConfig.js');
const { AlertSeverity } = await import('../../src/types/index.js');

describe('SecuritySentinel', () => {
    let sentinel: SecuritySentinel;
    let mockConfig: any;

    beforeEach(() => {
        mockParseDependencyFile.mockReset();
        mockGetScore.mockReset();
        mockGetPackageInfo.mockReset();
        mockStat.mockReset();
        mockReadFile.mockReset();
        MockScorecardClient.mockClear();
        MockRegistryClient.mockClear();

        sentinel = new SecuritySentinel();

        mockConfig = {
            ...DEFAULT_CONFIG,
            modules: { ...DEFAULT_CONFIG.modules, security: true },
            security: { ...DEFAULT_CONFIG.security, detectHardcodedSecrets: true },
            supplyChain: {
                checkNewborn: false,
                checkScorecard: true,
                minScorecardScore: 5
            }
        };
    });

    it('should detect low scorecard scores', async () => {
        const file = 'package.json';
        const content = '{}';

        mockStat.mockResolvedValue({ size: 100, isFile: () => true });
        mockReadFile.mockResolvedValue(content);

        // Mock DependencyParser
        mockParseDependencyFile.mockResolvedValue([
            { name: 'unsafe-lib', version: '1.0.0', registry: 'npm', file }
        ]);

        // Mock RegistryClient
        mockGetPackageInfo.mockResolvedValue({
            name: 'unsafe-lib',
            version: '1.0.0',
            description: 'Unsafe',
            createdAt: new Date(),
            downloads: 100,
            maintainers: [],
            repositoryUrl: 'https://github.com/unsafe/lib'
        });

        // Mock ScorecardClient
        mockGetScore.mockResolvedValue({
            score: 2.5,
            checks: [],
            date: new Date()
        });

        const alerts = await sentinel.analyze([file], mockConfig);

        expect(alerts).toHaveLength(1);
        expect(alerts[0].rule).toBe('low-scorecard-score');
        expect(alerts[0].severity).toBe(AlertSeverity.MEDIUM);
        expect(alerts[0].message).toContain('2.5/10');
    });

    it('should ignore dependencies with high scores', async () => {
        const file = 'package.json';
        const content = '{}';

        mockStat.mockResolvedValue({ size: 100, isFile: () => true });
        mockReadFile.mockResolvedValue(content);

        // Mock DependencyParser
        mockParseDependencyFile.mockResolvedValue([
            { name: 'safe-lib', version: '1.0.0', registry: 'npm', file }
        ]);

        // Mock RegistryClient
        mockGetPackageInfo.mockResolvedValue({
            name: 'safe-lib',
            version: '1.0.0',
            description: 'Safe',
            createdAt: new Date(),
            downloads: 100,
            maintainers: [],
            repositoryUrl: 'https://github.com/safe/lib'
        });

        // Mock ScorecardClient
        mockGetScore.mockResolvedValue({
            score: 8.5,
            checks: [],
            date: new Date()
        });

        const alerts = await sentinel.analyze([file], mockConfig);

        expect(alerts).toHaveLength(0);
    });

    it('should detect hardcoded secrets in source files', async () => {
        const file = 'src/app.ts';
        const content = 'const apiKey = "AIzaSyD1234567890abcdef1234567890abcde";';

        mockStat.mockResolvedValue({ size: 100, isFile: () => true });
        mockReadFile.mockResolvedValue(content);

        const alerts = await sentinel.analyze([file], mockConfig);

        expect(alerts.length).toBeGreaterThan(0);
        expect(alerts[0].rule).toBe('hardcoded-secret');
    });
});
