import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { readSharedInput } from '../docs/shared-input.mjs';

const source = await readFile(new URL('../docs/share-video-embeds.user.js', import.meta.url), 'utf8');
const app = 'https://h4m4chi-ttr.github.io/share-video-embeds/';
const watch = 'https://www.youtube.com/watch?v=-OkrC6h2H5k';
const short = 'https://youtu.be/-OkrC6h2H5k';
const buttonClass = 'video-embeds-share-target';

class Element extends EventTarget {
  constructor(tag, textContent = '') {
    super();
    this.tag = tag;
    this.textContent = textContent;
    this.children = [];
    this.attributes = new Map();
    this.className = '';
  }
  append(...nodes) {
    for (const node of nodes) {
      node.remove();
      node.parentElement = this;
      this.children.push(node);
    }
  }
  after(node) {
    const parent = this.parentElement;
    node.remove();
    node.parentElement = parent;
    parent.children.splice(parent.children.indexOf(this) + 1, 0, node);
  }
  remove() {
    if (!this.parentElement) return;
    this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
    this.parentElement = null;
  }
  get nextElementSibling() {
    return this.parentElement?.children[this.parentElement.children.indexOf(this) + 1] ?? null;
  }
  matches(selector) { return selector.split(',').some(tag => tag.trim() === this.tag); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  querySelector() { return null; }
}

function mount({
  link = short, checked = true, timestamp = '1:02:03', language = 'ja-JP', current = watch,
  pageTitle = 'Sample title - YouTube', videoTitle,
} = {}) {
  const rail = new Element('div');
  const x = new Element('yt-share-target-renderer', 'X');
  rail.append(new Element('yt-share-target-renderer', 'Embed'), x, new Element('yt-share-target-renderer', 'WhatsApp'));
  const checkbox = new Element('tp-yt-paper-checkbox');
  checkbox.setAttribute('aria-checked', checked);
  const input = { value: link };
  const time = { value: timestamp };
  const button = () => rail.children.find(node => node.className === buttonClass);
  const panel = {
    querySelector(selector) {
      if (selector.includes('[role="toolbar"]')) return rail;
      if (selector === '.' + buttonClass) return button() ?? null;
      return {
        '#share-url': input,
        'input#share-url': input,
        '#start-at-checkbox': checkbox,
        '#start-at-timestamp input': time,
      }[selector] ?? null;
    },
  };
  let mutations;
  const opened = [];
  runInNewContext(source, {
    URL, URLSearchParams, location: new URL(current),
    navigator: { language },
    requestAnimationFrame: callback => callback(),
    MutationObserver: class {
      constructor(callback) { mutations = callback; }
      observe() {}
    },
    document: {
      body: new Element('body'),
      head: new Element('head'),
      title: pageTitle,
      querySelector: () => videoTitle ? { textContent: videoTitle } : null,
      documentElement: { lang: language },
      getElementById: () => null,
      createElement: tag => new Element(tag),
      createElementNS: (_namespace, tag) => new Element(tag),
      querySelectorAll: () => [panel],
    },
    window: { open: (...args) => opened.push(args) },
  });
  return {
    rail, x, button, checkbox, input, time, opened,
    click() { button().dispatchEvent(new Event('click', { bubbles: true })); },
    change() { mutations([{ target: { closest: () => panel }, addedNodes: [] }]); },
  };
}

test('userscript inserts one localized target immediately after the standard X target', () => {
  const ui = mount();
  assert.equal(ui.x.nextElementSibling, ui.button());
  assert.equal(ui.button().children.at(-1).textContent, 'X (埋め込み)');
  ui.change();
  ui.change();
  assert.equal(ui.rail.children.filter(node => node.className === buttonClass).length, 1);
  assert.deepEqual(ui.opened, []);

  const en = mount({ language: 'en-US' });
  assert.equal(en.button().children.at(-1).textContent, 'X (Embeds)');
});

test('userscript reads the latest time and hands off title and URL through the app fragment', () => {
  const ui = mount({
    link: short + '?t=75&si=keep&list=PLabc#label=Music%20Night',
    pageTitle: '(76) Sample title - YouTube',
    videoTitle: 'Sample title',
  });
  ui.click();
  const [href, target, features] = ui.opened[0];
  assert.equal(target, '_blank');
  assert.equal(features, 'noopener,noreferrer');
  assert.equal(new URL(href).search, '');
  assert.deepEqual(readSharedInput(href), {
    input: short + '?si=keep&list=PLabc&t=3723#label=Music%20Night',
    title: 'Sample title',
    hasText: true,
    cleanUrl: app,
  });
});

test('userscript follows the native checkbox and drops an unrelated page title', () => {
  const ui = mount({ link: short + '?t=75#t=60&label=kept', current: watch.replace('-OkrC6h2H5k', 'b7xXmTfcGMQ') });
  ui.checkbox.setAttribute('aria-checked', 'false');
  ui.click();
  const shared = readSharedInput(ui.opened[0][0]);
  assert.equal(shared.input, short + '#label=kept');
  assert.equal(shared.title, undefined);
});

test('userscript skips non-video share links and lets the native URL supply a time', () => {
  assert.equal(mount({ link: 'https://www.youtube.com/playlist?list=PLother' }).button(), undefined);
  assert.equal(mount({ link: 'https://youtu.be.example/-OkrC6h2H5k' }).button(), undefined);
  const ui = mount({ link: short + '?t=75', timestamp: 'unfinished:' });
  ui.click();
  assert.equal(readSharedInput(ui.opened[0][0]).input, short + '?t=75');
});
