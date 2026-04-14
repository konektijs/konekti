export interface WorkspaceBuildClosureResult {
  order: string[];
  packageManager: string;
  status: number;
  stderr: string;
  stdout: string;
}

export interface RunWorkspaceBuildClosureOptions {
  packageManager?: string;
  stdio?: 'inherit' | 'pipe';
}

export function resolveWorkspaceBuildOrder(targetPackageName: string, rootDirectory: string): string[];

export function runWorkspaceBuildClosure(
  targetPackageName: string,
  rootDirectory: string,
  options?: RunWorkspaceBuildClosureOptions,
): WorkspaceBuildClosureResult;
