import * as vscode from 'vscode';
import { ControllerInfo, HttpMethod, ParamInfo } from './routeScanner';

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
  description?: string;
  params?: ParamInfo[];
}

export type TreeNode = FolderNode | RouteLeaf;

interface FlatRoute {
  method: HttpMethod;
  fullPath: string;
  file: vscode.Uri;
  line: number;
  module: string;
  description?: string;
  params?: ParamInfo[];
}

const METHOD_ORDER: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ALL', 'OPTIONS', 'HEAD'];

export function buildModuleTree(controllers: ControllerInfo[]): TreeNode[] {
  const routes: FlatRoute[] = [];
  for (const c of controllers) {
    const fileFolder = parentFolder(c.file);
    for (const r of c.routes) {
      routes.push({
        method: r.method,
        fullPath: joinPath(c.basePath, r.subPath),
        file: c.file,
        line: r.line,
        module: r.handlerModule ?? fileFolder,
        description: r.description,
        params: r.params,
      });
    }
  }
  if (routes.length === 0) return [];

  const byModule = new Map<string, FlatRoute[]>();
  for (const r of routes) {
    let list = byModule.get(r.module);
    if (!list) byModule.set(r.module, (list = []));
    list.push(r);
  }

  const moduleNames = Array.from(byModule.keys());
  const parentOf = new Map<string, string>();
  for (const child of moduleNames) {
    const parent = findParent(child, moduleNames);
    if (parent) parentOf.set(child, parent);
  }

  const folders = new Map<string, FolderNode>();
  for (const name of moduleNames) {
    folders.set(name, { kind: 'folder', label: name, children: [] });
  }

  for (const name of moduleNames) {
    const folder = folders.get(name)!;
    const bucket = byModule.get(name)!.slice().sort(compareFlat);
    for (const r of bucket) folder.children.push(toLeaf(r));
  }

  const roots: FolderNode[] = [];
  for (const name of moduleNames) {
    const parent = parentOf.get(name);
    const folder = folders.get(name)!;
    if (parent) {
      const parentFolder = folders.get(parent)!;
      folder.label = stripPrefix(name, parent);
      parentFolder.children.push(folder);
    } else {
      roots.push(folder);
    }
  }

  for (const f of folders.values()) sortChildren(f);
  roots.sort((a, b) => a.label.localeCompare(b.label));
  return roots;
}

function findParent(child: string, all: string[]): string | undefined {
  let best: string | undefined;
  for (const candidate of all) {
    if (candidate === child) continue;
    const singular = candidate.endsWith('s') ? candidate.slice(0, -1) : candidate;
    if (child.startsWith(candidate + '-') || child.startsWith(singular + '-')) {
      if (!best || candidate.length > best.length) best = candidate;
    }
  }
  return best;
}

function stripPrefix(child: string, parent: string): string {
  const singular = parent.endsWith('s') ? parent.slice(0, -1) : parent;
  if (child.startsWith(parent + '-')) return child.slice(parent.length + 1);
  if (child.startsWith(singular + '-')) return child.slice(singular.length + 1);
  return child;
}

function sortChildren(folder: FolderNode): void {
  folder.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'route' ? -1 : 1;
    if (a.kind === 'route' && b.kind === 'route') return compareLeaves(a, b);
    if (a.kind === 'folder' && b.kind === 'folder') return a.label.localeCompare(b.label);
    return 0;
  });
}

function toLeaf(r: FlatRoute): RouteLeaf {
  return {
    kind: 'route',
    method: r.method,
    fullPath: r.fullPath,
    file: r.file,
    line: r.line,
    description: r.description,
    params: r.params,
  };
}

function compareLeaves(a: RouteLeaf, b: RouteLeaf): number {
  const p = a.fullPath.localeCompare(b.fullPath);
  return p !== 0 ? p : METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method);
}

function compareFlat(a: FlatRoute, b: FlatRoute): number {
  const p = a.fullPath.localeCompare(b.fullPath);
  return p !== 0 ? p : METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method);
}

function joinPath(base: string, sub: string): string {
  const b = base.replace(/^\/+|\/+$/g, '');
  const s = sub.replace(/^\/+/, '');
  if (!b && !s) return '/';
  if (!b) return '/' + s;
  if (!s) return '/' + b;
  return '/' + b + '/' + s;
}

function parentFolder(uri: vscode.Uri): string {
  const parts = uri.path.split('/').filter(Boolean);
  return parts[parts.length - 2] ?? 'unknown';
}
