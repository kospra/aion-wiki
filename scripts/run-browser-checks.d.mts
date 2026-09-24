export interface BrowserCheckOptions {
  port?: number;
  checks?: string[];
}

export declare function runBrowserChecks(
  options?: BrowserCheckOptions,
): Promise<void>;
