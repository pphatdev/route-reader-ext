import * as vscode from 'vscode';
import { ControllerInfo, HttpMethod } from './routeScanner';

export interface FolderNode {
  kind: 'folder';
  label: string;
  children: TreeNode[];
}

export interface RouteLeaf {
  kind: 'route';
  method: HttpMethod;
  fullPath: string;
  file: vscode.Uri;
  line: number;
}

export type TreeNode = FolderNode | RouteLeaf;

interface FlatRoute {
  method: HttpMethod;
  fullPath: string;
  file: vscode.Uri;
  line: number;
  sourceFileBase: string;
}

const METHOD_ORDER: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ALL', 'OPTIONS', 'HEAD'];

export function buildTree(controllers: ControllerInfo[]): TreeNode[] {
  const routes: FlatRoute[] = [];
  for (const c of controllers) {
    for (const r of c.routes) {
      routes.push({
        method: r.method,
        fullPath: joinPath(c.basePath, r.subPath),
        file: c.file,
        line: r.line,
        sourceFileBase: fileBase(c.file),
      });
    }
  }
  if (routes.length === 0) return [];

  const allSegs = routes.map((r) => segments(r.fullPath));
  const skip = longestCommonSegments(allSegs).length;

  const buckets = new Map<string, FlatRoute[]>();
  for (const r of routes) {
    const segs = segments(r.fullPath);
    const key = segs[skip] || '/';
    let list = buckets.get(key);
    if (!list) buckets.set(key, (list = []));
    list.push(r);
  }

  const roots: FolderNode[] = [];
  for (const [name, group] of buckets) {
    roots.push(buildBucket(name, group, skip + 1));
  }
  roots.sort((a, b) => a.label.localeCompare(b.label));
  return roots;
}

function buildBucket(bucketName: string, routes: FlatRoute[], nextSegIdx: number): FolderNode {
  const label = titleCase(bucketName === '/' ? 'Root' : bucketName);
  const files = new Set(routes.map((r) => r.sourceFileBase));

  if (files.size > 1) {
    const subFolders: FolderNode[] = [];
    for (const f of files) {
      const fileRoutes = routes.filter((r) => r.sourceFileBase === f);
      subFolders.push({
        kind: 'folder',
        label: subLabelFromFile(f, bucketName),
        children: fileRoutes.map(toLeaf).sort(compareLeaves),
      });
    }
    subFolders.sort((a, b) => folderRank(a) - folderRank(b) || a.label.localeCompare(b.label));
    return { kind: 'folder', label, children: subFolders };
  }

  const rootRoutes: FlatRoute[] = [];
  const branches = new Map<string, FlatRoute[]>();
  for (const r of routes) {
    const segs = segments(r.fullPath);
    let key: string | undefined;
    for (let i = nextSegIdx; i < segs.length; i++) {
      if (!segs[i].startsWith(':')) { key = segs[i]; break; }
    }
    if (!key) {
      rootRoutes.push(r);
    } else {
      let list = branches.get(key);
      if (!list) branches.set(key, (list = []));
      list.push(r);
    }
  }

  if (branches.size <= 1) {
    return { kind: 'folder', label, children: routes.map(toLeaf).sort(compareLeaves) };
  }

  const children: TreeNode[] = [];
  for (const r of rootRoutes.sort(compareFlat)) children.push(toLeaf(r));
  const subFolders: FolderNode[] = [];
  for (const [seg, segRoutes] of branches) {
    subFolders.push({
      kind: 'folder',
      label: titleCase(seg),
      children: segRoutes.map(toLeaf).sort(compareLeaves),
    });
  }
  subFolders.sort((a, b) => a.label.localeCompare(b.label));
  children.push(...subFolders);
  return { kind: 'folder', label, children };
}

function toLeaf(r: FlatRoute): RouteLeaf {
  return { kind: 'route', method: r.method, fullPath: r.fullPath, file: r.file, line: r.line };
}

function compareLeaves(a: TreeNode, b: TreeNode): number {
  if (a.kind !== 'route' || b.kind !== 'route') return 0;
  const p = a.fullPath.localeCompare(b.fullPath);
  return p !== 0 ? p : METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method);
}

function compareFlat(a: FlatRoute, b: FlatRoute): number {
  const p = a.fullPath.localeCompare(b.fullPath);
  return p !== 0 ? p : METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method);
}

function folderRank(f: FolderNode): number {
  return f.label === 'Core' ? 0 : 1;
}

function segments(p: string): string[] {
  return p.split('/').filter(Boolean);
}

function longestCommonSegments(lists: string[][]): string[] {
  if (lists.length === 0) return [];
  const first = lists[0];
  const common: string[] = [];
  for (let i = 0; i < first.length; i++) {
    const seg = first[i];
    if (lists.every((l) => l[i] === seg)) common.push(seg);
    else break;
  }
  return common;
}

function joinPath(base: string, sub: string): string {
  const b = base.replace(/^\/+|\/+$/g, '');
  const s = sub.replace(/^\/+/, '');
  if (!b && !s) return '/';
  if (!b) return '/' + s;
  if (!s) return '/' + b;
  return '/' + b + '/' + s;
}

function fileBase(uri: vscode.Uri): string {
  const parts = uri.path.split('/');
  const last = parts[parts.length - 1] ?? '';
  return last.replace(/\.(controller|routes|module)\.ts$/, '').replace(/\.ts$/, '');
}

function titleCase(s: string): string {
  if (!s) return '';
  return s
    .split(/[-_ ]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function subLabelFromFile(fileBaseName: string, bucketName: string): string {
  const bucket = bucketName.toLowerCase();
  const base = fileBaseName.toLowerCase();
  if (base === bucket) return 'Core';
  const singular = bucket.endsWith('s') ? bucket.slice(0, -1) : bucket;
  if (base === singular) return 'Core';
  if (base.startsWith(bucket + '-')) return titleCase(base.slice(bucket.length + 1));
  if (base.startsWith(singular + '-')) return titleCase(base.slice(singular.length + 1));
  return titleCase(fileBaseName);
}
