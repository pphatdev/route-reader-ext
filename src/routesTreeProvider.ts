import * as vscode from 'vscode';
import { ParamInfo, scanControllers, ScanResult } from './routeScanner';
import { buildModuleTree, TreeNode } from './moduleTree';

const VERSION = '0.1.0';

type Node = TreeNode | MessageNode | ParamLeaf;

interface MessageNode {
  kind: 'message';
  text: string;
  tooltip?: string;
}

interface ParamLeaf {
  kind: 'param';
  info: ParamInfo;
}

export class RoutesTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<Node | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private tree: TreeNode[] | undefined;
  private lastScan: ScanResult | undefined;
  private lastError: string | undefined;
  private output: vscode.OutputChannel;

  constructor(output: vscode.OutputChannel) {
    this.output = output;
  }

  refresh(): void {
    this.tree = undefined;
    this.lastScan = undefined;
    this.lastError = undefined;
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: Node): Promise<Node[]> {
    try {
      if (!element) {
        if (!this.tree) {
          this.output.appendLine(`[scan] starting scan (version ${VERSION})`);
          this.lastScan = await scanControllers();
          this.output.appendLine(
            `[scan] files=${this.lastScan.filesScanned} controllers=${this.lastScan.controllers.length} errors=${this.lastScan.errors.length}`,
          );
          this.tree = buildModuleTree(this.lastScan.controllers);
          this.output.appendLine(`[tree] top-level nodes=${this.tree.length}`);
        }
        if (this.tree.length === 0) return this.diagnosticNodes();
        return this.tree;
      }
      if (element.kind === 'folder') return element.children;
      if (element.kind === 'route' && element.params && element.params.length > 0) {
        return element.params.map((p) => ({ kind: 'param', info: p } as ParamLeaf));
      }
      return [];
    } catch (err) {
      const msg = (err as Error)?.stack || (err as Error)?.message || String(err);
      this.lastError = msg;
      this.output.appendLine(`[error] ${msg}`);
      return [
        { kind: 'message', text: `Extension error (see Output → Node Auto Routes)` },
        { kind: 'message', text: msg.split('\n')[0], tooltip: msg },
      ];
    }
  }

  private diagnosticNodes(): MessageNode[] {
    const s = this.lastScan!;
    const nodes: MessageNode[] = [];
    if (s.workspaceFolders.length === 0) {
      nodes.push({ kind: 'message', text: 'No workspace folder open.' });
      return nodes;
    }
    nodes.push({ kind: 'message', text: `No routes found. Scanned ${s.filesScanned} file(s).` });
    nodes.push({ kind: 'message', text: `Workspace: ${s.workspaceFolders.join(', ')}` });
    nodes.push({ kind: 'message', text: `Include: ${s.include}` });
    nodes.push({ kind: 'message', text: `Exclude: ${s.exclude}` });
    if (s.errors.length > 0) {
      nodes.push({ kind: 'message', text: `${s.errors.length} parse error(s):`, tooltip: s.errors.join('\n') });
      for (const e of s.errors.slice(0, 5)) nodes.push({ kind: 'message', text: `  ${e}` });
    }
    return nodes;
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'message') {
      const item = new vscode.TreeItem(node.text);
      item.iconPath = new vscode.ThemeIcon('info');
      if (node.tooltip) item.tooltip = node.tooltip;
      return item;
    }

    if (node.kind === 'folder') {
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.iconPath = new vscode.ThemeIcon('folder');
      item.contextValue = 'folder';
      item.description = `${countRoutes(node)}`;
      return item;
    }

    if (node.kind === 'param') {
      const p = node.info;
      const label = p.required ? p.name : `[${p.name}]`;
      const item = new vscode.TreeItem(label);
      item.description = p.type;
      item.iconPath = new vscode.ThemeIcon(
        'symbol-parameter',
        new vscode.ThemeColor(p.required ? 'charts.orange' : 'charts.foreground'),
      );
      const md = new vscode.MarkdownString();
      md.appendMarkdown(`**${label}** — \`${p.type}\`\n\n`);
      md.appendMarkdown(`_${p.required ? 'required' : 'optional'}_\n\n`);
      if (p.defaultValue) md.appendMarkdown(`Default: \`${p.defaultValue}\`\n\n`);
      if (p.description) md.appendMarkdown(p.description);
      item.tooltip = md;
      return item;
    }

    const hasParams = !!node.params && node.params.length > 0;
    const item = new vscode.TreeItem(
      `${node.method}  ${node.fullPath}`,
      hasParams ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    );
    item.iconPath = methodIcon(node.method);
    if (node.description) item.description = node.description;
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`\`${node.method}\` **${node.fullPath}**\n\n`);
    if (node.description) md.appendMarkdown(`${node.description}\n\n`);
    md.appendMarkdown(node.file.fsPath);
    item.tooltip = md;
    item.contextValue = 'route';
    item.command = {
      command: 'nodeAutoRoutes.openRoute',
      title: 'Open Route',
      arguments: [node.file, node.line],
    };
    return item;
  }
}

function countRoutes(node: TreeNode): number {
  if (node.kind === 'route') return 1;
  return node.children.reduce((n, c) => n + countRoutes(c), 0);
}

function methodIcon(method: string): vscode.ThemeIcon {
  const colors: Record<string, string> = {
    GET: 'charts.green',
    POST: 'charts.yellow',
    PUT: 'charts.blue',
    PATCH: 'charts.purple',
    DELETE: 'charts.red',
    ALL: 'charts.foreground',
    OPTIONS: 'charts.foreground',
    HEAD: 'charts.foreground',
  };
  return new vscode.ThemeIcon(
    'symbol-method',
    new vscode.ThemeColor(colors[method] ?? 'charts.foreground'),
  );
}
