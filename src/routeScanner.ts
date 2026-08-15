import * as vscode from 'vscode';
import { parseFrameworkFile } from './frameworkParser';

export type HttpMethod =
  | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL' | 'OPTIONS' | 'HEAD';

export interface ParamInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: string;
}

export interface RouteInfo {
  method: HttpMethod;
  subPath: string;
  line: number;
  handlerModule?: string;
  description?: string;
  params?: ParamInfo[];
}

export interface ControllerInfo {
  className: string;
  basePath: string;
  file: vscode.Uri;
  line: number;
  routes: RouteInfo[];
}

const METHOD_DECORATORS: Record<string, HttpMethod> = {
  Get: 'GET', Post: 'POST', Put: 'PUT', Delete: 'DELETE', Patch: 'PATCH',
  All: 'ALL', Options: 'OPTIONS', Head: 'HEAD',
};

export interface ScanResult {
  controllers: ControllerInfo[];
  filesScanned: number;
  include: string;
  exclude: string;
  workspaceFolders: string[];
  errors: string[];
}

export async function scanControllers(): Promise<ScanResult> {
  const cfg = vscode.workspace.getConfiguration('nodeAutoRoutes');
  const include = cfg.get<string>('include') || '**/*.{controller,module,route,routes}.ts';
  const exclude = cfg.get<string>('exclude') || '**/{node_modules,dist,out,build}/**';

  const workspaceFolders = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
  const errors: string[] = [];
  const files = await vscode.workspace.findFiles(include, exclude);
  const controllers: ControllerInfo[] = [];

  await Promise.all(
    files.map(async (file) => {
      try {
        const bytes = await vscode.workspace.fs.readFile(file);
        const text = Buffer.from(bytes).toString('utf8');
        const nest = parseFile(text, file);
        controllers.push(...nest);
        if (nest.length === 0) {
          controllers.push(...parseFrameworkFile(text, file));
        }
      } catch (err) {
        errors.push(`${file.fsPath}: ${(err as Error)?.message ?? err}`);
      }
    }),
  );

  controllers.sort((a, b) => {
    const p = a.basePath.localeCompare(b.basePath);
    return p !== 0 ? p : a.className.localeCompare(b.className);
  });

  return { controllers, filesScanned: files.length, include, exclude, workspaceFolders, errors };
}

export function parseFile(text: string, file: vscode.Uri): ControllerInfo[] {
  const lineStarts = computeLineStarts(text);
  const result: ControllerInfo[] = [];

  const controllerDecorators: { basePath: string; offset: number }[] = [];
  const controllerRe = /@Controller\s*\(([\s\S]*?)\)/g;
  let cm: RegExpExecArray | null;
  while ((cm = controllerRe.exec(text)) !== null) {
    controllerDecorators.push({
      basePath: extractBasePath(cm[1]),
      offset: cm.index,
    });
  }
  if (controllerDecorators.length === 0) return result;

  const classes: { name: string; start: number; bodyStart: number; bodyEnd: number }[] = [];
  const classRe = /export\s+class\s+(\w+)/g;
  let clm: RegExpExecArray | null;
  while ((clm = classRe.exec(text)) !== null) {
    const braceStart = text.indexOf('{', clm.index);
    if (braceStart === -1) continue;
    classes.push({
      name: clm[1],
      start: clm.index,
      bodyStart: braceStart,
      bodyEnd: findMatchingBrace(text, braceStart),
    });
  }

  for (const ctrl of controllerDecorators) {
    const cls = classes.find((c) => c.start > ctrl.offset);
    if (!cls) continue;

    const body = text.slice(cls.bodyStart, cls.bodyEnd);
    const bodyOffset = cls.bodyStart;
    const routes: RouteInfo[] = [];

    const methodRe = /@(Get|Post|Put|Delete|Patch|All|Options|Head)\s*\(([\s\S]*?)\)/g;
    let mm: RegExpExecArray | null;
    while ((mm = methodRe.exec(body)) !== null) {
      routes.push({
        method: METHOD_DECORATORS[mm[1]],
        subPath: extractPath(mm[2]),
        line: offsetToLine(bodyOffset + mm.index, lineStarts),
      });
    }

    result.push({
      className: cls.name,
      basePath: normalize(ctrl.basePath),
      file,
      line: offsetToLine(ctrl.offset, lineStarts),
      routes,
    });
  }

  return result;
}

function extractBasePath(argsText: string): string {
  const trimmed = argsText.trim();
  if (!trimmed) return '';
  const str = trimmed.match(/^(['"`])([^'"`]*)\1/);
  if (str) return str[2];
  const obj = trimmed.match(/path\s*:\s*(['"`])([^'"`]*)\1/);
  if (obj) return obj[2];
  return '';
}

function extractPath(argsText: string): string {
  const trimmed = argsText.trim();
  if (!trimmed) return '/';
  const str = trimmed.match(/^(['"`])([^'"`]*)\1/);
  if (str) return normalizeSub(str[2]);
  const arr = trimmed.match(/^\[\s*(['"`])([^'"`]*)\1/);
  if (arr) return normalizeSub(arr[2]);
  return '/';
}

function normalizeSub(p: string): string {
  if (!p) return '/';
  return p.startsWith('/') ? p : '/' + p;
}

function normalize(basePath: string): string {
  return basePath.replace(/^\/+/, '').replace(/\/+$/, '');
}

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

function offsetToLine(offset: number, lineStarts: number[]): number {
  let lo = 0, hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function findMatchingBrace(text: string, openIdx: number): number {
  let depth = 0;
  let i = openIdx;
  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl + 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === quote) { i++; break; }
        if (quote === '`' && text[i] === '$' && text[i + 1] === '{') {
          let d = 1;
          i += 2;
          while (i < text.length && d > 0) {
            if (text[i] === '{') d++;
            else if (text[i] === '}') d--;
            i++;
          }
          continue;
        }
        i++;
      }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return text.length;
}
