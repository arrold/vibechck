/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/explicit-function-return-type */
import * as fs from 'fs/promises';
import * as path from 'path';
import { PackageDependency } from '../types/index.js';

export class DependencyParser {
  static async parseDependencyFile(filePath: string): Promise<PackageDependency[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const basename = path.basename(filePath).toLowerCase();

    switch (basename) {
      case 'package.json':
        return this.parsePackageJson(content, filePath);
      case 'requirements.txt':
        return this.parseRequirementsTxt(content, filePath);
      case 'pyproject.toml':
        return this.parsePyprojectToml(content, filePath);
      case 'cargo.toml':
        return this.parseCargoToml(content, filePath);
      case 'go.mod':
        return this.parseGoMod(content, filePath);
      default:
        return [];
    }
  }

  private static parsePackageJson(content: string, filePath: string): PackageDependency[] {
    try {
      const pkg = JSON.parse(content);
      const dependencies: PackageDependency[] = [];

      const addDeps = (deps: any, type: PackageDependency['type']) => {
        if (!deps) return;
        Object.entries(deps).forEach(([name, version]) => {
          dependencies.push({
            name,
            version: typeof version === 'string' ? version : undefined,
            type,
            registry: 'npm',
            file: filePath,
          });
        });
      };

      addDeps(pkg.dependencies, 'production');
      addDeps(pkg.devDependencies, 'development');
      addDeps(pkg.peerDependencies, 'peer');
      addDeps(pkg.optionalDependencies, 'optional');

      return dependencies;
    } catch {
      return [];
    }
  }

  private static parseRequirementsTxt(content: string, filePath: string): PackageDependency[] {
    const dependencies: PackageDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse requirements.txt format: package==version or package>=version
      const match = trimmed.match(/^([a-zA-Z0-9\-_.]+)(?:[><=!]+(.+))?/);
      if (match) {
        dependencies.push({
          name: match[1],
          version: match[2],
          type: 'production',
          registry: 'pypi',
          file: filePath,
        });
      }
    }

    return dependencies;
  }

  private static parsePyprojectToml(content: string, filePath: string): PackageDependency[] {
    // Simplified TOML parsing - in a real implementation, use a proper TOML parser
    const dependencies: PackageDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('dependencies = [')) {
        // Extract dependencies from array format
        const depsMatch = trimmed.match(/\[([^\]]+)\]/);
        if (depsMatch) {
          const deps = depsMatch[1]
            .split(',')
            .map((dep: string) => dep.trim().replace(/['"]/g, ''));
          for (const dep of deps) {
            const match = dep.match(/^([a-zA-Z0-9\-_.]+)(?:[><=!]+(.+))?/);
            if (match) {
              dependencies.push({
                name: match[1],
                version: match[2],
                type: 'production',
                registry: 'pypi',
                file: filePath,
              });
            }
          }
        }
      }
    }

    return dependencies;
  }

  private static parseCargoToml(content: string, filePath: string): PackageDependency[] {
    const dependencies: PackageDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[dependencies]')) continue;
      if (trimmed.startsWith('[dev-dependencies]')) continue;
      if (trimmed.startsWith('[')) continue;

      const match = trimmed.match(/^([a-zA-Z0-9\-_]+)\s*=\s*["']([^"']+)["']/);
      if (match) {
        dependencies.push({
          name: match[1],
          version: match[2],
          type: 'production',
          registry: 'crates',
          file: filePath,
        });
      }
    }

    return dependencies;
  }

  private static parseGoMod(content: string, filePath: string): PackageDependency[] {
    const dependencies: PackageDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;

      // Parse go.mod format: module version
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        dependencies.push({
          name: parts[0],
          version: parts[1],
          type: 'production',
          registry: 'go',
          file: filePath,
        });
      }
    }

    return dependencies;
  }
}
