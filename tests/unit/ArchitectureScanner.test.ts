import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import * as path from 'path';
import type { ArchitectureScanner } from '../../src/modules/architecture/ArchitectureScanner.js';
import type { VibechckConfig } from '../../src/types/index.js';

const mockReadFile = jest.fn() as jest.MockedFunction<() => Promise<string>>;
const mockStat = jest.fn() as jest.MockedFunction<() => Promise<{ size: number }>>;
jest.unstable_mockModule('fs/promises', () => ({
    readFile: mockReadFile,
    stat: mockStat,
}));

// Mock path for consistent separator across platforms
jest.unstable_mockModule('path', () => ({
    ...path,
    extname: jest.fn((p) => path.extname(p as string)),
    resolve: jest.fn((...args) => path.resolve(...(args as string[]))),
    sep: '/',
}));

const { ArchitectureScanner: ArchitectureScannerClass } =
    await import('../../src/modules/architecture/ArchitectureScanner.js');
const { DEFAULT_CONFIG } = await import('../../src/types/defaultConfig.js');

describe('ArchitectureScanner Magic Numbers', () => {
    let scanner: ArchitectureScanner;
    let mockConfig: VibechckConfig;

    beforeEach(() => {
        mockReadFile.mockReset();
        mockStat.mockReset();
        scanner = new ArchitectureScannerClass() as ArchitectureScanner;
        mockConfig = {
            ...DEFAULT_CONFIG,
            modules: { ...DEFAULT_CONFIG.modules, architecture: true },
            architecture: {
                ...DEFAULT_CONFIG.architecture,
                detectMagicNumbers: true,
            },
        };
        // Default mock for stat
        mockStat.mockResolvedValue({ size: 1000 });
    });

    it('should flag raw magic numbers', async () => {
        const file = 'src/test.ts';
        const content = `
            const val = 1234;
            function test() {
                const x = 5678;
                return x + 9999;
            }
        `;
        mockReadFile.mockResolvedValue(content);

        const alerts = await scanner.analyze([file], mockConfig);

        // 9999 should be flagged. 1234 and 5678 are assigned to constants.
        const magicNumberAlerts = alerts.filter((a) => a.rule === 'magic-number');
        expect(magicNumberAlerts).toHaveLength(1);
        expect(magicNumberAlerts[0].message).toContain('9999');
    });

    it('should ignore numbers in constant declarations (JS/TS)', async () => {
        const file = 'src/test.ts';
        const content = `
            const PORT = 1433;
            let count = 500;
            var timeout = 30000;
            const x = y + 10; // 10 is safe, but check if flagged
        `;
        mockReadFile.mockResolvedValue(content);

        const alerts = await scanner.analyze([file], mockConfig);
        const magicNumberAlerts = alerts.filter((a) => a.rule === 'magic-number');

        // 1433, 500, 30000 are in constants. 10 is safe.
        expect(magicNumberAlerts).toHaveLength(0);
    });

    it('should ignore numbers in Go constants', async () => {
        const file = 'src/test.go';
        const content = `
            package main
            const DefaultSQLServerPort = 1433
            func main() {
                x := 1433 // This SHOULD be flagged if not assigned at declaration
            }
        `;
        mockReadFile.mockResolvedValue(content);

        const alerts = await scanner.analyze([file], mockConfig);
        const magicNumberAlerts = alerts.filter((a) => a.rule === 'magic-number');

        // The one inside main should be flagged, the const one should not.
        expect(magicNumberAlerts).toHaveLength(1);
        expect(magicNumberAlerts[0].message).toContain('1433');
    });

    it('should ignore numbers inside string literals (e.g. SQL)', async () => {
        const file = 'src/test.go';
        const content = `
            query := "SUM(a.total_pages) * 8 / 1024 / 1024 as size_gb"
            val := 2048
        `;
        mockReadFile.mockResolvedValue(content);

        const alerts = await scanner.analyze([file], mockConfig);
        const magicNumberAlerts = alerts.filter((a) => a.rule === 'magic-number');

        // 8 and 1024 are inside strings. 2048 is raw.
        expect(magicNumberAlerts).toHaveLength(1);
        expect(magicNumberAlerts[0].message).toContain('2048');
    });

    it('should ignore numbers in Go const and var blocks', async () => {
        const file = 'src/retry.go';
        const content = `
            package main
            const (
                DefaultPort = 8080
                MaxRetries  = 3
            )
            var (
                Timeout = 500
            )
            func main() {
                val := 999
            }
        `;
        mockReadFile.mockResolvedValue(content);

        const alerts = await scanner.analyze([file], mockConfig);
        const magicNumberAlerts = alerts.filter(a => a.rule === 'magic-number');

        // 8080, 3, 500 are in blocks. 999 is raw.
        expect(magicNumberAlerts).toHaveLength(1);
        expect(magicNumberAlerts[0].message).toContain('999');
    });

    it('should ignore numbers in multiline strings', async () => {
        const file = 'src/query.go';
        const content = `
            query := \`
                SELECT * FROM users
                WHERE age > 18
                AND status = 1
            \`
            val := 999
        `;
        mockReadFile.mockResolvedValue(content);

        const alerts = await scanner.analyze([file], mockConfig);
        const magicNumberAlerts = alerts.filter(a => a.rule === 'magic-number');

        // 18 and 1 are in backticks. 100 is raw.
        expect(magicNumberAlerts).toHaveLength(1);
        expect(magicNumberAlerts[0].message).toContain('999');
    });

    it('should ignore Go blocks with comments and octal numbers', async () => {
        const file = 'pkg/common/constants.go';
        const content = `package common

const (
	// DefaultFileMode is the default permission for generated files (rw-r--r--)
	DefaultFileMode = 0644

	// DefaultDirMode is the default permission for directories (rwxr-xr-x)
	DefaultDirMode = 0755

	// PrivateFileMode is the permission for sensitive state/config files (rw-------)
	PrivateFileMode = 0600
)`;
        mockReadFile.mockResolvedValue(content);

        const alerts = await scanner.analyze([file], mockConfig);
        const magicNumberAlerts = alerts.filter(a => a.rule === 'magic-number');

        expect(magicNumberAlerts).toHaveLength(0);
    });
});
