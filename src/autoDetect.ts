import * as vscode from 'vscode';
import { scanControllers } from './routeScanner';

export interface DetectionResult {
  frameworks: string[];
  filePatterns: string[];
  suggestedInclude: string;
  suggestedExclude: string;
  urlPrefix?: string;
  filesFound: number;
  routesFound: number;
}

const FRAMEWORK_PATTERNS: Array<[string, RegExp]> = [
  ['NestJS', /@Controller\s*\(/],
  ['Hono', /\bnew\s+Hono\b|\bfrom\s+['"]hono(?:\/[^'"]*)?['"]/],
  ['Elysia', /\bnew\s+Elysia\b|\bfrom\s+['"]elysia['"]/],
  ['Express', /\brequire\s*\(\s*['"]express['"]|\bfrom\s+['"]express['"]/],
  ['Fastify', /\brequire\s*\(\s*['"]fastify['"]|\bfrom\s+['"]fastify['"]/],
];

const NAME_PATTERNS: Array<[string, RegExp]> = [
  ['controller', /\.controller\.ts$/],
  ['module', /\.module\.ts$/],
  ['route', /\.route\.ts$/],
  ['routes', /\.routes\.ts$/],
];

const BROAD_INCLUDE = '**/*.{controller,module,route,routes}.ts';
const DEFAULT_EXCLUDE = '**/{node_modules,dist,out,build,coverage,.next,.turbo}/**';

export async function detectProjectSettings(): Promise<DetectionResult> {
  const files = await vscode.workspace.findFiles(BROAD_INCLUDE, DEFAULT_EXCLUDE);

  const patterns = new Set<string>();
  const frameworks = new Set<string>();

  await Promise.all(
    files.map(async (file) => {
      const name = file.path.split('/').pop() || '';
      for (const [key, re] of NAME_PATTERNS) if (re.test(name)) patterns.add(key);
      try {
        const bytes = await vscode.workspace.fs.readFile(file);
        const text = Buffer.from(bytes).toString('utf8');
        for (const [key, re] of FRAMEWORK_PATTERNS) if (re.test(text)) frameworks.add(key);
      } catch {
        // Ignore unreadable files
      }
    }),
  );

  const patternList = Array.from(patterns).sort();
  const suggestedInclude =
    patternList.length > 0 ? `**/*.{${patternList.join(',')}}.ts` : BROAD_INCLUDE;

  const scan = await scanControllers();
  const allPaths: string[] = [];
  for (const c of scan.controllers) {
    const base = c.basePath.replace(/^\/+|\/+$/g, '');
    for (const r of c.routes) {
      const sub = r.subPath.replace(/^\/+/, '');
      allPaths.push('/' + [base, sub].filter(Boolean).join('/'));
    }
  }
  const urlPrefix = longestCommonPathPrefix(allPaths);

  return {
    frameworks: Array.from(frameworks).sort(),
    filePatterns: patternList,
    suggestedInclude,
    suggestedExclude: DEFAULT_EXCLUDE,
    urlPrefix,
    filesFound: files.length,
    routesFound: allPaths.length,
  };
}

function longestCommonPathPrefix(paths: string[]): string | undefined {
  if (paths.length === 0) return undefined;
  const segsList = paths.map((p) => p.split('/').filter(Boolean));
  const first = segsList[0];
  const common: string[] = [];
  for (let i = 0; i < first.length; i++) {
    const seg = first[i];
    if (segsList.every((s) => s[i] === seg)) common.push(seg);
    else break;
  }
  return common.length > 0 ? '/' + common.join('/') : undefined;
}
