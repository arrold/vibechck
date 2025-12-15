import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fc from 'fast-check';

const mockReadFile = jest.fn();
jest.unstable_mockModule('fs/promises', () => ({
    readFile: mockReadFile,
}));

const mockCheckPackageExists = jest.fn();
const mockGetPackageInfo = jest.fn();
const MockRegistryClient = jest.fn(() => ({
    checkPackageExists: mockCheckPackageExists,
    getPackageInfo: mockGetPackageInfo,
}));

jest.unstable_mockModule('../../src/core/RegistryClient.js', () => ({
    VibechckRegistryClient: MockRegistryClient
}));

const { HallucinationSentinel } = await import('../../src/modules/hallucination/HallucinationSentinel.js');
const { DEFAULT_CONFIG } = await import('../../src/types/defaultConfig.js');

describe('HallucinationSentinel Properties', () => {
    let sentinel: HallucinationSentinel;
    let mockConfig: any;

    beforeEach(() => {
        MockRegistryClient.mockClear();
        mockCheckPackageExists.mockReset();
        mockGetPackageInfo.mockReset();
        mockReadFile.mockReset();

        sentinel = new HallucinationSentinel();

        // Default mock behavior
        mockCheckPackageExists.mockResolvedValue(true);
        mockGetPackageInfo.mockResolvedValue({
            createdAt: new Date('2020-01-01'),
            downloads: 10000
        });

        // Mock loadTopPackages
        // Since we can't easily spy on private methods or methods of the instance created inside without prototype spying,
        // we can assign it if it's on the instance. 
        // HallucinationSentinel doesn't define loadTopPackages as public, 
        // but it's likely defined on the class or instance.
        // The original test access it via (sentinel as any).
        (sentinel as any).loadTopPackages = jest.fn().mockImplementation(async () => {
            (sentinel as any).topPackages = ['react', 'vue'];
        });

        mockConfig = {
            ...DEFAULT_CONFIG,
            modules: { ...DEFAULT_CONFIG.modules, hallucination: true, laziness: false, security: false, architecture: false },
            hallucination: { ...DEFAULT_CONFIG.hallucination, packageAgeThresholdDays: 30, packageDownloadThreshold: 500, typosquatLevenshteinDistance: 1 },
        };
    });

    it('should robustly parse valid package.json structures', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.dictionary(fc.string(), fc.string()), // dependencies
                fc.dictionary(fc.string(), fc.string()), // devDependencies
                async (deps, devDeps) => {
                    const content = JSON.stringify({
                        dependencies: deps,
                        devDependencies: devDeps
                    });

                    mockReadFile.mockResolvedValue(content);

                    const alerts = await sentinel.analyze(['package.json'], mockConfig);
                    expect(Array.isArray(alerts)).toBe(true);
                }
            )
        );
    });

    it('should consistently identify strings within edit distance', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 4 }), // package name
                async (pkgName: string) => {
                    // Create a typo by changing one character
                    // Ensure only alphanumeric to avoid invalid package names causing other checks to fail?
                    // But here we mock fs, so it's fine.

                    const typo = pkgName.slice(0, -1) + (pkgName.slice(-1) === 'a' ? 'b' : 'a');

                    // Override top packages for this run
                    (sentinel as any).loadTopPackages = jest.fn().mockImplementation(async () => {
                        (sentinel as any).topPackages = [pkgName];
                    });

                    const content = JSON.stringify({
                        dependencies: { [typo]: '1.0.0' }
                    });
                    mockReadFile.mockResolvedValue(content);

                    const alerts = await sentinel.analyze(['package.json'], mockConfig);

                    // Should find a typosquat alert
                    const found = alerts.some((a: any) => a.rule === 'typosquat-risk');
                    expect(found).toBe(true);
                }
            )
        );
    });
});
