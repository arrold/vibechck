import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { FileScanner, FileInfo, Language, VibechckConfig } from '../types/index.js';

export class VibechckFileScanner implements FileScanner {
  private config: VibechckConfig;

  constructor(config: VibechckConfig) {
    this.config = config;
  }

  async scanDirectory(directoryPath: string): Promise<string[]> {
    const files: string[] = [];
    const cwd = path.resolve(directoryPath);

    // Use glob patterns to find files
    for (const pattern of this.config.scanning.include) {
      // run glob relative to the directoryPath
      const matchedFiles = await glob(pattern, {
        cwd: cwd,
        ignore: [
          ...this.config.scanning.exclude,
          // Hard-coded ignores to prevent recursion crashes and performance issues
          '**/node_modules/**',
          '**/.git/**',
          '**/.venv/**',
          '**/dist/**',
          '**/build/**',
          '**/.next/**',
          '**/.nuxt/**',
          '**/.output/**',
          '**/target/**',
          '**/vendor/**',
        ],
        nodir: true,
        absolute: true,
        follow: this.config.scanning.followSymlinks,
      });

      files.push(...matchedFiles);
    }

    // Remove duplicates and filter by file size
    const uniqueFiles = [...new Set(files)];
    return this.filterByFileSize(uniqueFiles);
  }

  detectLanguage(filePath: string): Language {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();

    // JavaScript/TypeScript
    if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return 'javascript';
    if (['.ts', '.tsx'].includes(ext)) return 'typescript';

    // Python
    if (ext === '.py') return 'python';

    // Rust
    if (ext === '.rs') return 'rust';

    // Go
    if (ext === '.go') return 'go';

    // Vue/Svelte
    if (ext === '.vue') return 'vue';
    if (ext === '.svelte') return 'svelte';

    // Dependency files
    if (basename === 'package.json') return 'javascript';
    if (basename === 'requirements.txt' || basename === 'pyproject.toml' || basename === 'setup.py')
      return 'python';
    if (basename === 'Cargo.toml' || basename === 'Cargo.lock') return 'rust';
    if (basename === 'go.mod' || basename === 'go.sum') return 'go';

    return 'unknown';
  }

  isDependencyFile(filePath: string): boolean {
    const basename = path.basename(filePath).toLowerCase();
    const dependencyFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'requirements.txt',
      'requirements-dev.txt',
      'pyproject.toml',
      'setup.py',
      'poetry.lock',
      'cargo.toml',
      'cargo.lock',
      'go.mod',
      'go.sum',
      'go.work',
      'pom.xml',
      'build.gradle',
      'gradle.properties',
    ];

    return dependencyFiles.includes(basename);
  }

  isSourceFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const sourceExtensions = [
      '.js',
      '.jsx',
      '.mjs',
      '.cjs',
      '.ts',
      '.tsx',
      '.py',
      '.rs',
      '.go',
      '.java',
      '.kt',
      '.cs',
      '.cpp',
      '.c',
      '.h',
      '.php',
      '.rb',
      '.swift',
      '.scala',
      '.vue',
      '.svelte',
    ];

    return sourceExtensions.includes(ext);
  }

  async getFileInfo(filePath: string): Promise<FileInfo> {
    const stats = await fs.stat(filePath);
    const language = this.detectLanguage(filePath);

    return {
      path: filePath,
      language,
      size: stats.size,
      isDependencyFile: this.isDependencyFile(filePath),
      isSourceFile: this.isSourceFile(filePath),
    };
  }

  private async filterByFileSize(files: string[]): Promise<string[]> {
    const filteredFiles: string[] = [];

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        if (stats.size <= this.config.scanning.maxFileSize) {
          filteredFiles.push(file);
        }
      } catch (error) {
        // Skip files that can't be accessed
        console.warn(`Warning: Cannot access file ${file}: ${error}`);
      }
    }

    return filteredFiles;
  }

  async getFileContent(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }
}
