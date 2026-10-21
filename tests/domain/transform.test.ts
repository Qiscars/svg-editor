import { describe, expect, it } from 'vitest';

import { Canvas } from '../../src/domain/Canvas.js';
import { Container } from '../../src/domain/Container.js';
import { Document } from '../../src/domain/Document.js';
import { Circle } from '../../src/domain/leaf/Circle.js';
import { Ellipse } from '../../src/domain/leaf/Ellipse.js';
import { Line } from '../../src/domain/leaf/Line.js';
import { Rect } from '../../src/domain/leaf/Rect.js';
import { TextShape } from '../../src/domain/leaf/TextShape.js';

/** 建一份与作业 §5.1 结构相同的文档：svg → bg / title / g#markers → c1 / box */
function sampleDocument(): Document {
  const document = new Document(800, 600);
  const bg = new Rect('bg', 0, 0, 800, 600);
  bg.setAttribute('fill', '#ffffff');
  const title = new TextShape('title', 20, 40, 'My Diagram');
  const c1 = new Circle('c1', 100, 100, 20);
  c1.setAttribute('fill', 'red');
  const box = new Rect('box', 200, 80, 60, 60);
  const markers = new Container('markers');

  document.attach(document.canvas, bg);
  document.attach(document.canvas, title);
  document.attach(document.canvas, markers);
  document.attach(markers, c1);
  document.attach(markers, box);
  return document;
}

describe('叶子的几何变换', () => {
  it('rect 的 move 只改位置，scale 位置与尺寸同乘', () => {
    const rect = new Rect('r1', 10, 20, 100, 50);
    rect.move(5, -5);
    expect([rect.x, rect.y, rect.width, rect.height]).toEqual([15, 15, 100, 50]);
    rect.scale(2);
    expect([rect.x, rect.y, rect.width, rect.height]).toEqual([30, 30, 200, 100]);
  });

  it('circle / ellipse 缩放圆心与半径', () => {
    const circle = new Circle('c1', 10, 20, 5);
    circle.move(1, 2);
    circle.scale(3);
    expect([circle.cx, circle.cy, circle.r]).toEqual([33, 66, 15]);

    const ellipse = new Ellipse('e1', 1, 2, 3, 4);
    ellipse.scale(2);
    expect([ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry]).toEqual([2, 4, 6, 8]);
  });

  it('line 的两个端点一起移动与缩放', () => {
    const line = new Line('l1', 0, 0, 10, 20);
    line.move(5, 5);
    expect([line.x1, line.y1, line.x2, line.y2]).toEqual([5, 5, 15, 25]);
    line.scale(2);
    expect([line.x1, line.y1, line.x2, line.y2]).toEqual([10, 10, 30, 50]);
  });

  it('text 的插入点跟随变换，文本内容不变', () => {
    const text = new TextShape('t1', 20, 40, 'My Diagram');
    text.move(10, 10);
    text.scale(2);
    expect([text.x, text.y]).toEqual([60, 100]);
    expect(text.content).toBe('My Diagram');
  });
});

describe('Composite：容器把变换递归到每个子孙', () => {
  it('move 一个容器，全部子孙一起平移', () => {
    const document = sampleDocument();
    const markers = document.require('markers');

    markers.move(30, -10);

    expect(document.require('c1').describeInline()).toBe('cx=130 cy=90 r=20 fill=red');
    expect(document.require('box').describeInline()).toBe('x=230 y=70 w=60 h=60');
    // 容器外的元素不受影响
    expect(document.require('title').describeInline()).toBe('(20,40) "My Diagram"');
  });

  it('scale 一个容器，子孙的位置与尺寸全部同乘', () => {
    const document = sampleDocument();

    document.require('markers').scale(2);

    expect(document.require('c1').describeInline()).toBe('cx=200 cy=200 r=40 fill=red');
    expect(document.require('box').describeInline()).toBe('x=400 y=160 w=120 h=120');
  });

  it('嵌套容器逐层递归，叶子只被缩放一次', () => {
    const document = new Document(400, 300);
    const outer = new Container('outer');
    const inner = new Container('inner');
    const leaf = new Rect('leaf', 1, 2, 3, 4);

    document.attach(document.canvas, outer);
    document.attach(outer, inner);
    document.attach(inner, leaf);

    outer.scale(2);

    // 若某层重复递归，这里会变成 4 倍甚至 8 倍
    expect(document.require('leaf').describeInline()).toBe('x=2 y=4 w=6 h=8');
  });

  it('空容器变换不报错', () => {
    const empty = new Container('empty');
    expect(() => empty.move(1, 1)).not.toThrow();
    expect(() => empty.scale(2)).not.toThrow();
  });

  it('画布根的尺寸不参与变换', () => {
    const canvas = new Canvas(800, 600);
    canvas.move(100, 100);
    canvas.scale(2);
    expect([canvas.width, canvas.height]).toEqual([800, 600]);
  });
});

describe('clone 是深拷贝', () => {
  it('改克隆体的子孙不影响原树', () => {
    const document = sampleDocument();
    const clone = document.require('markers').clone();

    clone.move(1000, 1000);

    expect(document.require('c1').describeInline()).toBe('cx=100 cy=100 r=20 fill=red');
    expect(clone.children[0]?.describeInline()).toBe('cx=1100 cy=1100 r=20 fill=red');
  });

  it('克隆体的父指针指向克隆出来的容器，而不是原容器', () => {
    const document = sampleDocument();
    const original = document.require('markers');
    const clone = original.clone();

    expect(clone.children[0]?.parent).toBe(clone);
    expect(original.children[0]?.parent).toBe(original);
  });

  it('克隆体保留样式属性', () => {
    const document = sampleDocument();
    const clone = document.require('c1').clone();
    expect(clone.getAttribute('fill')).toBe('red');
  });
});
