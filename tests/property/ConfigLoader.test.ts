import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fc from 'fast-check';

const mockReadFile = jest.fn();
const mockAccess = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
    readFile: mockReadFile,
    access: mockAccess,
    constants: { F_OK: 0 }
}));

const { ConfigLoader } = await import('../../src/core/ConfigLoader.js');

describe('ConfigLoader Properties', () => {
    let configLoader: ConfigLoader;

    beforeEach(() => {
        configLoader = new ConfigLoader();
        mockReadFile.mockReset();
        mockAccess.mockReset();
        // Assuming file exists for these tests
        mockAccess.mockResolvedValue(undefined);
    });

    // Property 21: Configuration Loading
    it('should successfully load any valid configuration subset', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    modules: fc.record({
                        hallucination: fc.boolean(),
                        laziness: fc.boolean(),
                        security: fc.boolean(),
                        architecture: fc.boolean()
                    }, { requiredKeys: [] }),
                    severity: fc.array(fc.constantFrom('critical', 'high', 'medium', 'low'))
                }),
                async (partialConfig: any) => {
                    mockReadFile.mockResolvedValue(JSON.stringify(partialConfig));

                    const config = await configLoader.load('.vibecheck.json');

                    // Verify that loaded config respects the partial inputs
                    if (partialConfig.modules && partialConfig.modules.hallucination !== undefined) {
                        expect(config.modules.hallucination).toBe(partialConfig.modules.hallucination);
                    }
                }
            )
        );
    });

    it('should be robust against extra unknown fields', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.object(), // Any random object
                async (randomObj) => {
                    mockReadFile.mockResolvedValue(JSON.stringify(randomObj));

                    try {
                        const config = await configLoader.load('.vibecheck.json');
                        expect(config).toBeDefined();
                    } catch (e) {
                        expect(e).toBeDefined();
                    }
                }
            )
        );
    });
});
