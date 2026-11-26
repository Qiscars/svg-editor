import type { Document } from '../domain/Document.js';
import type { Shape } from '../domain/Shape.js';
import { RegistryError } from './RegistryError.js';
import type { TreeDecorator, TreeRowContext } from './TreeDecorator.js';

/**
 * 树标签注册表。
 *
 * 它同时是"标签生命周期"的转发点：宿主在编辑命令执行后调 `notifyChanged`，
 * 在保存成功后调 `notifySaved`，各标签据此维护自己的状态。
 */
export class TreeDecoratorRegistry {
  private readonly decorators: TreeDecorator[] = [];

  register(decorator: TreeDecorator): void {
    if (this.decorators.some((existing) => existing.name === decorator.name)) {
      throw RegistryError.duplicateRegistration(`decorators/${decorator.name}`);
    }
    this.decorators.push(decorator);
  }

  unregister(name: string): void {
    const index = this.decorators.findIndex((decorator) => decorator.name === name);
    if (index >= 0) {
      this.decorators.splice(index, 1);
    }
  }

  /** 按注册顺序拼接同一行的全部标签。 */
  labelFor(document: Document, shape: Shape, depth: number, isRoot: boolean): string {
    if (this.decorators.length === 0) {
      return '';
    }
    const row: TreeRowContext = { document, shape, depth, isRoot };
    const labels: string[] = [];
    for (const decorator of this.decorators) {
      const label = decorator.decorate(row);
      if (label !== undefined && label !== '') {
        labels.push(label);
      }
    }
    return labels.join(' ');
  }

  notifyChanged(document: Document): void {
    for (const decorator of this.decorators) {
      decorator.onDocumentChanged?.(document);
    }
  }

  notifySaved(document: Document): void {
    for (const decorator of this.decorators) {
      decorator.onDocumentSaved?.(document);
    }
  }

  list(): readonly TreeDecorator[] {
    return [...this.decorators];
  }
}
