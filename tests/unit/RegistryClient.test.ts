import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

const mockGet = jest.fn();
const mockIsAxiosError = jest.fn();
// Mock create to return an object that shares the same mockGet, 
// so we can assert on mockGet calls even if they go through the instance.
const mockCreate = jest.fn(() => ({
    get: mockGet,
    interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
    }
}));

jest.unstable_mockModule('axios', () => ({
    default: {
        get: mockGet,
        create: mockCreate,
        isAxiosError: mockIsAxiosError,
    }
}));

const { VibechckRegistryClient } = await import('../../src/core/RegistryClient.js');

describe('RegistryClient', () => {
    let registryClient: VibechckRegistryClient;

    beforeEach(() => {
        registryClient = new VibechckRegistryClient();
        mockGet.mockReset();
        mockIsAxiosError.mockReset();
        mockCreate.mockClear();
    });

    describe('npm', () => {
        it('should return true if package exists', async () => {
            mockGet.mockResolvedValue({
                data: {
                    name: 'react',
                    'dist-tags': { latest: '18.2.0' },
                    versions: { '18.2.0': { version: '18.2.0' } },
                    time: { created: '2013-05-29T18:20:17.915Z' }
                }
            });

            const exists = await registryClient.checkPackageExists('react', 'npm');
            expect(exists).toBe(true);
        });

        it('should return false if package does not exist (404)', async () => {
            const error = new Error('Not Found');
            // @ts-ignore
            error.isAxiosError = true;
            // @ts-ignore
            error.response = { status: 404 };

            mockIsAxiosError.mockReturnValue(true);
            mockGet.mockRejectedValue(error);

            const exists = await registryClient.checkPackageExists('non-existent-package-xyz', 'npm');
            expect(exists).toBe(false);
        });
    });

    describe('pypi', () => {
        it('should return true if package exists', async () => {
            mockGet.mockResolvedValue({
                data: {
                    info: { name: 'requests', version: '2.31.0' },
                    releases: { '2.31.0': [{}] }
                }
            });

            const exists = await registryClient.checkPackageExists('requests', 'pypi');
            expect(exists).toBe(true);
        });
    });
    describe('getPackageInfo detailed', () => {
        it('should extract repositoryUrl for npm', async () => {
            mockGet.mockResolvedValue({
                data: {
                    name: 'react',
                    'dist-tags': { latest: '18.2.0' },
                    versions: { '18.2.0': { version: '18.2.0' } },
                    time: { created: '2013-05-29T18:20:17.915Z' },
                    repository: { url: 'git+https://github.com/facebook/react.git' }
                }
            });

            const info = await registryClient.getPackageInfo('react', 'npm');
            expect(info).not.toBeNull();
            expect(info?.repositoryUrl).toBe('https://github.com/facebook/react');
        });

        it('should extract repositoryUrl for pypi from project_urls', async () => {
            mockGet.mockResolvedValue({
                data: {
                    info: {
                        name: 'requests',
                        version: '2.31.0',
                        project_urls: {
                            'Source': 'https://github.com/psf/requests'
                        }
                    },
                    releases: { '2.31.0': [{}] }
                }
            });

            const info = await registryClient.getPackageInfo('requests', 'pypi');
            expect(info).not.toBeNull();
            expect(info?.repositoryUrl).toBe('https://github.com/psf/requests');
        });
    });
});
