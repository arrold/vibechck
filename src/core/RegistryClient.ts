/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call */
import axios from 'axios';
import { RegistryClient, PackageInfo } from '../types/index.js';

// Interfaces for Registry Responses
interface NpmPackageResponse {
  name: string;
  description?: string;
  'dist-tags'?: { latest: string };
  versions: Record<
    string,
    {
      version: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repository?: { url: string } | string | any;
    }
  >;
  time?: { created: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repository?: { url: string } | string | any;
  maintainers?: { name: string }[];
}

interface PyPiPackageResponse {
  info: {
    name: string;
    version: string;
    summary: string;
    upload_time: string;
    author?: string;
    home_page?: string;
    project_urls?: Record<string, string>;
  };
}

interface CratesPackageResponse {
  crate: {
    name: string;
    max_version: string;
    description: string;
    created_at: string;
    downloads: number;
  };
}

export class VibechckRegistryClient implements RegistryClient {
  private cache: Map<string, PackageInfo | null> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async checkPackageExists(packageName: string, registry: string): Promise<boolean> {
    try {
      const info = await this.getPackageInfo(packageName, registry);
      return info !== null;
    } catch {
      return false;
    }
  }

  async getPackageInfo(packageName: string, registry: string): Promise<PackageInfo | null> {
    const cacheKey = `${registry}:${packageName}`;
    const cached = this.cache.get(cacheKey);

    // Check cache first
    if (cached && Date.now() - cached.createdAt.getTime() < this.cacheTimeout) {
      return cached;
    }

    let packageInfo: PackageInfo | null = null;

    try {
      switch (registry) {
        case 'npm':
          packageInfo = await this.getNpmPackageInfo(packageName);
          break;
        case 'pypi':
          packageInfo = await this.getPypiPackageInfo(packageName);
          break;
        case 'crates':
          packageInfo = await this.getCratesPackageInfo(packageName);
          break;
        case 'go':
          packageInfo = await this.getGoPackageInfo(packageName);
          break;
        default:
          throw new Error(`Unsupported registry: ${registry}`);
      }

      if (packageInfo) {
        this.cache.set(cacheKey, packageInfo);
      }

      return packageInfo;
    } catch (error) {
      // If package doesn't exist, return null
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async getNpmPackageInfo(packageName: string): Promise<PackageInfo | null> {
    try {
      const response = await axios.get<NpmPackageResponse>(
        `https://registry.npmjs.org/${packageName}`,
        {
          timeout: 10000,
        }
      );

      const data = response.data;
      const latest = data['dist-tags']?.latest;
      const versionData = latest
        ? data.versions[latest]
        : data.versions[Object.keys(data.versions)[0]];

      let repositoryUrl = data.repository?.url || data.repository;
      if (typeof repositoryUrl === 'string') {
        repositoryUrl = repositoryUrl.replace(/^git\+/, '').replace(/\.git$/, '');
      }

      return {
        name: data.name,
        version: versionData?.version || '0.0.0',
        description: data.description,
        createdAt: new Date(data.time?.created || Date.now()),
        downloads: 0, // npm doesn't provide download count in this endpoint
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        maintainers: data.maintainers?.map((m: any) => m.name) || [],
        repositoryUrl,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch npm package info for ${packageName}: ${error}`);
    }
  }

  private async getPypiPackageInfo(packageName: string): Promise<PackageInfo | null> {
    try {
      const response = await axios.get<PyPiPackageResponse>(
        `https://pypi.org/pypi/${packageName}/json`,
        {
          timeout: 10000,
        }
      );

      const data = response.data;
      const latest = data.info;
      // const releases = data.releases; // Not strictly needed for version info if we trust info

      // Try to find repository URL in project_urls
      let repositoryUrl = '';
      if (latest.project_urls) {
        const urls = latest.project_urls;
        repositoryUrl = urls.Source || urls.Repository || urls.GitHub || urls['Source Code'] || '';
      }

      // Fallback to home_page if it looks like a repo
      if (
        !repositoryUrl &&
        latest.home_page &&
        (latest.home_page.includes('github.com') || latest.home_page.includes('gitlab.com'))
      ) {
        repositoryUrl = latest.home_page;
      }

      return {
        name: latest.name,
        version: latest.version,
        description: latest.summary,
        createdAt: new Date(latest.upload_time || Date.now()),
        downloads: 0, // PyPI doesn't provide download count in this endpoint
        maintainers: latest.author ? [latest.author] : [],
        repositoryUrl: repositoryUrl || undefined,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch PyPI package info for ${packageName}: ${error}`);
    }
  }

  private async getCratesPackageInfo(packageName: string): Promise<PackageInfo | null> {
    try {
      const response = await axios.get<CratesPackageResponse>(
        `https://crates.io/api/v1/crates/${packageName}`,
        {
          timeout: 10000,
        }
      );

      const data = response.data.crate;

      return {
        name: data.name,
        version: data.max_version,
        description: data.description,
        createdAt: new Date(data.created_at),
        downloads: data.downloads,
        maintainers: [], // Not easily available in crates.io API
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch crates.io package info for ${packageName}: ${error}`);
    }
  }

  private async getGoPackageInfo(packageName: string): Promise<PackageInfo | null> {
    // Go modules are more complex - they don't have a centralized registry
    // For now, we'll do a basic check by trying to fetch the module
    try {
      // This is a simplified approach - in reality, Go modules are distributed
      // via various sources and don't have a single registry API
      const response = await axios.get<string>(`https://proxy.golang.org/${packageName}/@v/list`, {
        timeout: 10000,
      });

      if (response.status === 200) {
        const versions = response.data.trim().split('\n');
        const latest = versions[versions.length - 1];

        return {
          name: packageName,
          version: latest,
          description: '', // Not available in Go proxy
          createdAt: new Date(), // Not available in Go proxy
          downloads: 0, // Not available in Go proxy
          maintainers: [], // Not available in Go proxy
        };
      }

      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch Go module info for ${packageName}: ${error}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
