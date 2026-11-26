/**
 * VSCode 适配层（本包唯一 import 'vscode' 的文件）。
 *
 * 它只做三件事：
 * 1. 把 `isSvgPath` 包装成 Explorer 的文件装饰提供者；
 * 2. 把纯逻辑的 `OutlineNode` 翻译成 VSCode 的 `DocumentSymbol`；
 * 3. 在文档变化时重新解析并触发 `onDidChangeDocumentSymbols`。
 *
 * 所有解析规则都在 `OutlineBuilder.ts`，这里不出现 XML 细节。
 */

import * as vscode from 'vscode';

import { OutlineBuilder, type OutlineNode, type OutlineRange } from './OutlineBuilder.js';
import { SVG_FILE_BADGE, isSvgPath } from './fileBadge.js';

const SVG_LANGUAGE_ID = 'svg';
const FOCUS_OUTLINE_COMMAND = 'svgframe.focusOutline';

/** 在 Explorer 中给 `.svg` 文件加 `[]` 徽标（不重命名、不改内容）。 */
class SvgFileDecorationProvider implements vscode.FileDecorationProvider {
  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (uri.scheme !== 'file' || !isSvgPath(uri.path)) {
      return undefined;
    }
    return new vscode.FileDecoration(SVG_FILE_BADGE);
  }
}

/** 把纯逻辑大纲桥接到 VSCode 原生 Outline。 */
class SvgDocumentSymbolProvider implements vscode.DocumentSymbolProvider, vscode.Disposable {
  private readonly builder = new OutlineBuilder();
  private readonly changed = new vscode.EventEmitter<vscode.Uri>();

  /** VSCode 通过这个事件知道「该重新拉取这个文档的大纲了」。 */
  readonly onDidChangeDocumentSymbols = this.changed.event;

  provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const nodes = this.builder.build(document.getText());
    return nodes.map(toDocumentSymbol);
  }

  /** 文档变化：先重新解析（异常已在 Builder 内吞掉），再通知 VSCode 刷新。 */
  refresh(document: vscode.TextDocument): void {
    this.builder.build(document.getText());
    this.changed.fire(document.uri);
  }

  dispose(): void {
    this.changed.dispose();
  }
}

function toDocumentSymbol(node: OutlineNode): vscode.DocumentSymbol {
  const symbol = new vscode.DocumentSymbol(
    node.name,
    '',
    symbolKindFor(node.tagName),
    toRange(node.range),
    toRange(node.selectionRange),
  );
  symbol.children = node.children.map(toDocumentSymbol);
  return symbol;
}

function toRange(range: OutlineRange): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character,
  );
}

function symbolKindFor(tagName: string): vscode.SymbolKind {
  switch (tagName.toLowerCase()) {
    case 'svg':
      return vscode.SymbolKind.Module;
    case 'g':
    case 'defs':
    case 'symbol':
      return vscode.SymbolKind.Namespace;
    case 'text':
    case 'tspan':
      return vscode.SymbolKind.String;
    case 'image':
      return vscode.SymbolKind.File;
    case 'use':
      return vscode.SymbolKind.Variable;
    default:
      return vscode.SymbolKind.Object;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const symbols = new SvgDocumentSymbolProvider();

  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(new SvgFileDecorationProvider()),
    vscode.languages.registerDocumentSymbolProvider(
      { language: SVG_LANGUAGE_ID },
      symbols,
      { label: 'SVG Outline' },
    ),
    symbols,
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === SVG_LANGUAGE_ID) {
        symbols.refresh(event.document);
      }
    }),
    vscode.commands.registerCommand(FOCUS_OUTLINE_COMMAND, () =>
      vscode.commands.executeCommand('outline.focus'),
    ),
  );
}

export function deactivate(): void {
  // 所有资源都通过 context.subscriptions 释放，这里没有额外清理。
}
