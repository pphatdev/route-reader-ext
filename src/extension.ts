import * as vscode from 'vscode';
import { RoutesTreeProvider } from './routesTreeProvider';
import { detectProjectSettings } from './autoDetect';

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('Node Auto Routes');
  context.subscriptions.push(output);
  output.appendLine('[activate] extension loaded');
  const provider = new RoutesTreeProvider(output);

  const treeView = vscode.window.createTreeView('nodeAutoRoutes.routesView', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  context.subscriptions.push(
    vscode.commands.registerCommand('nodeAutoRoutes.refresh', () => provider.refresh()),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nodeAutoRoutes.showOutput', () => output.show(true)),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nodeAutoRoutes.autoDetect', async () => {
      await runAutoDetect(output, provider);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nodeAutoRoutes.openRoute',
      async (uri: vscode.Uri, line: number) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);
        const safeLine = Math.max(0, Math.min(line, doc.lineCount - 1));
        const lineText = doc.lineAt(safeLine).text;
        const startCol = lineText.length - lineText.trimStart().length;
        const range = new vscode.Range(safeLine, startCol, safeLine, lineText.length);
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
      },
    ),
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{controller,module,route,routes}.ts');
  watcher.onDidChange(() => provider.refresh());
  watcher.onDidCreate(() => provider.refresh());
  watcher.onDidDelete(() => provider.refresh());
  context.subscriptions.push(watcher);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('nodeAutoRoutes.include') ||
        e.affectsConfiguration('nodeAutoRoutes.exclude')
      ) {
        provider.refresh();
      }
    }),
  );
}

export function deactivate() {}

async function runAutoDetect(output: vscode.OutputChannel, provider: RoutesTreeProvider) {
  if (!vscode.workspace.workspaceFolders?.length) {
    vscode.window.showWarningMessage('Node Auto Routes: open a workspace folder first.');
    return;
  }

  const result = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Node Auto Routes: scanning…' },
    () => detectProjectSettings(),
  );

  output.appendLine(`[autoDetect] ${JSON.stringify(result, null, 2)}`);

  const summary =
    `Frameworks:  ${result.frameworks.join(', ') || '(none detected)'}\n` +
    `Files:       ${result.filesFound}\n` +
    `Routes:      ${result.routesFound}\n` +
    `Patterns:    ${result.filePatterns.join(', ') || '(none)'}\n` +
    (result.urlPrefix ? `URL prefix:  ${result.urlPrefix}\n` : '') +
    `\nSuggested include:\n  ${result.suggestedInclude}\n\n` +
    `Suggested exclude:\n  ${result.suggestedExclude}`;

  const choice = await vscode.window.showInformationMessage(
    summary,
    { modal: true },
    'Save to workspace settings',
  );

  if (choice !== 'Save to workspace settings') return;

  const cfg = vscode.workspace.getConfiguration('nodeAutoRoutes');
  await cfg.update('include', result.suggestedInclude, vscode.ConfigurationTarget.Workspace);
  await cfg.update('exclude', result.suggestedExclude, vscode.ConfigurationTarget.Workspace);

  vscode.window.showInformationMessage(
    `Saved to .vscode/settings.json — ${result.routesFound} routes across ${result.frameworks.join('+') || 'framework'}.`,
  );
  provider.refresh();
}
