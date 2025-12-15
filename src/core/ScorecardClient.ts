import axios from 'axios';

export interface ScorecardResult {
  score: number;
  checks: {
    name: string;
    score: number;
    reason: string;
  }[];
  date: Date;
}

interface ScorecardApiResponse {
  score: number;
  checks: {
    name: string;
    score: number;
    reason: string;
  }[];
  date: string;
}

export class ScorecardClient {
  private cache = new Map<string, ScorecardResult | null>();
  private cacheTimeout = 60 * 60 * 1000; // 1 hour

  async getScore(repositoryUrl: string): Promise<ScorecardResult | null> {
    if (!repositoryUrl) return null;

    // Normalize URL to platform/org/repo
    // e.g. https://github.com/facebook/react -> github.com/facebook/react
    const match = repositoryUrl.match(/https?:\/\/([^/]+)\/([^/]+)\/([^/?#]+)/);
    if (!match) return null;

    const domain = match[1]; // e.g. github.com
    const org = match[2];
    const repo = match[3].replace(/\.git$/, '');

    const platform =
      domain === 'github.com' ? 'github.com' : domain === 'gitlab.com' ? 'gitlab.com' : null;
    if (!platform) return null; // Scorecard mostly supports GitHub/GitLab

    const cacheKey = `${platform}/${org}/${repo}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.date.getTime() < this.cacheTimeout) {
      return cached;
    }

    try {
      const response = await axios.get<ScorecardApiResponse>(
        `https://api.securityscorecards.dev/projects/${platform}/${org}/${repo}`,
        {
          timeout: 5000,
        }
      );

      const data = response.data;
      const result: ScorecardResult = {
        score: data.score,
        checks: data.checks.map((c) => ({
          name: c.name,
          score: c.score,
          reason: c.reason,
        })),
        date: new Date(data.date),
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      // API 404 means no score available
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        this.cache.set(cacheKey, null); // Cache negative result
        return null;
      }
      console.debug(`Scorecard API error for ${cacheKey}: ${error}`);
      return null;
    }
  }
}
