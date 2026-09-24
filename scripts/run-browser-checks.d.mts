export interface BrowserCheckOptions {
  port?: number;
  checks?: string[];
  afterPortProbe?: () => Promise<void>;
}

export declare function runBrowserChecks(
  options?: BrowserCheckOptions,
): Promise<void>;

export declare function runNode(
  file: string,
  args: string[],
  signal: AbortSignal,
): Promise<void>;
