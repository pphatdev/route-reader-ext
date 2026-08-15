import * as vscode from 'vscode';
import { ControllerInfo, HttpMethod, ParamInfo, RouteInfo } from './routeScanner';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'all', 'options', 'head']);

const FRAMEWORK_RE =
  /\bnew\s+(?:Hono|Elysia)\b|\brequire\s*\(\s*['"](?:hono|express|fastify|elysia)['"]\)|\bfrom\s+['"](?:hono|express|fastify|elysia)(?:\/[^'"]*)?['"]/;

export function parseFrameworkFile(text: string, file: vscode.Uri): ControllerInfo[] {
  if (!FRAMEWORK_RE.test(text)) return [];

  const lineStarts = computeLineStarts(text);
  const importMap = parseImports(text);
  const docBlocks = extractDocBlocks(text);
  const routes: RouteInfo[] = [];

  const callRe = /(?<=[\w)])\s*\.\s*(get|post|put|delete|patch|all|options|head)\s*\(\s*(['"`])(\/[^'"`]*)\2/g;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(text)) !== null) {
    const lineNum = offsetToLine(m.index, lineStarts);
    const doc = findDocForRoute(lineStarts[lineNum], docBlocks, text);
    routes.push({
      method: m[1].toUpperCase() as HttpMethod,
      subPath: m[3],
      line: lineNum,
      handlerModule: resolveHandlerModule(text, m.index + m[0].length, importMap),
      description: doc?.description,
      params: doc?.params.length ? doc.params : undefined,
    });
  }

  const onRe = /(?<=[\w)])\s*\.\s*on\s*\(\s*(['"`])(\w+)\1\s*,\s*(['"`])(\/[^'"`]*)\3/g;
  while ((m = onRe.exec(text)) !== null) {
    const upper = m[2].toUpperCase();
    if (!HTTP_METHODS.has(upper.toLowerCase())) continue;
    const lineNum = offsetToLine(m.index, lineStarts);
    const doc = findDocForRoute(lineStarts[lineNum], docBlocks, text);
    routes.push({
      method: upper as HttpMethod,
      subPath: m[4],
      line: lineNum,
      handlerModule: resolveHandlerModule(text, m.index + m[0].length, importMap),
      description: doc?.description,
      params: doc?.params.length ? doc.params : undefined,
    });
  }

  if (routes.length === 0) return [];

  routes.sort((a, b) => a.line - b.line);

  const basePath = longestCommonPrefix(routes.map((r) => r.subPath));
  const stripped = routes.map((r) => ({
    ...r,
    subPath: stripPrefix(r.subPath, basePath),
  }));

  const className = detectExportName(text) ?? fileBaseName(file);

  return [
    {
      className,
      basePath: basePath.replace(/^\/+/, '').replace(/\/+$/, ''),
      file,
      line: 0,
      routes: stripped,
    },
  ];
}

function longestCommonPrefix(paths: string[]): string {
  if (paths.length === 0) return '';
  const segsList = paths.map((p) => p.split('/').filter(Boolean));
  const first = segsList[0];
  const common: string[] = [];
  for (let i = 0; i < first.length; i++) {
    const seg = first[i];
    if (segsList.every((s) => s[i] === seg)) common.push(seg);
    else break;
  }
  if (common.length === 0) return '';
  return '/' + common.join('/');
}

function stripPrefix(path: string, prefix: string): string {
  if (!prefix) return path;
  if (!path.startsWith(prefix)) return path;
  const rest = path.slice(prefix.length);
  if (!rest) return '/';
  return rest.startsWith('/') ? rest : '/' + rest;
}

function detectExportName(text: string): string | null {
  const aliased = text.match(/export\s*\{\s*\w+\s+as\s+(\w+)\s*\}/);
  if (aliased) return aliased[1];
  const named = text.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/);
  if (named) return named[1];
  return null;
}

function fileBaseName(file: vscode.Uri): string {
  const parts = file.path.split('/');
  const last = parts[parts.length - 1] ?? 'routes';
  return last.replace(/\.(routes|route|controller|module)\.ts$/, '').replace(/\.ts$/, '');
}

function parseImports(text: string): Map<string, string> {
  const map = new Map<string, string>();
  const importRe = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(text)) !== null) {
    const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()!.trim()).filter(Boolean);
    for (const n of names) map.set(n, m[2]);
  }
  return map;
}

function resolveHandlerModule(text: string, startIdx: number, imports: Map<string, string>): string | undefined {
  const endIdx = findCallEnd(text, startIdx);
  const slice = text.slice(startIdx, endIdx);
  const matches = Array.from(slice.matchAll(/\b(\w+Controller)\s*\.\s*\w+/g));
  if (matches.length === 0) return undefined;
  const last = matches[matches.length - 1];
  const importPath = imports.get(last[1]);
  if (!importPath) return undefined;
  return moduleFolderFromImport(importPath);
}

function findCallEnd(text: string, startIdx: number): number {
  let depth = 1;
  let i = startIdx;
  while (i < text.length && depth > 0) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    i++;
  }
  return i;
}

function moduleFolderFromImport(importPath: string): string | undefined {
  const parts = importPath.split('/').filter((p) => p && p !== '.');
  if (parts.length < 2) return undefined;
  const parent = parts[parts.length - 2];
  if (parent === '..') return undefined;
  return parent;
}

interface DocInfo {
  description?: string;
  params: ParamInfo[];
}

interface DocBlock {
  end: number;
  info: DocInfo;
}

function extractDocBlocks(text: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  const re = /\/\*\*([\s\S]*?)\*\//g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    blocks.push({ end: m.index + m[0].length, info: parseDocBlock(m[1]) });
  }
  return blocks;
}

function findDocForRoute(routeStart: number, blocks: DocBlock[], text: string): DocInfo | undefined {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.end > routeStart) continue;
    const gap = text.slice(b.end, routeStart);
    if (/^\s*$/.test(gap)) return b.info;
    return undefined;
  }
  return undefined;
}

function parseDocBlock(body: string): DocInfo {
  const cleaned = body
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\*\s?/, '').trimEnd())
    .join('\n');
  const descMatch = cleaned.match(/@description\s+([^\n]+)/);
  const description = descMatch?.[1].trim();
  const params: ParamInfo[] = [];
  const paramRe = /@param\s+\{([^}]+)\}\s+(\[[^\]]+\]|[\w$]+)\s*([^\n]*)/g;
  let m: RegExpExecArray | null;
  while ((m = paramRe.exec(cleaned)) !== null) {
    const type = m[1].trim();
    let name = m[2].trim();
    const desc = m[3].trim();
    let required = true;
    let defaultValue: string | undefined;
    if (name.startsWith('[') && name.endsWith(']')) {
      required = false;
      name = name.slice(1, -1);
      const eq = name.indexOf('=');
      if (eq !== -1) {
        defaultValue = name.slice(eq + 1).trim();
        name = name.slice(0, eq).trim();
      }
    }
    params.push({ name, type, required, description: desc || undefined, defaultValue });
  }
  return { description, params };
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
