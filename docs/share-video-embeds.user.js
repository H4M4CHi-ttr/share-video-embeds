// ==UserScript==
// @name         Share Video Embeds - Share Menu
// @name:ja      Share Video Embeds - 共有メニュー
// @namespace    https://github.com/H4M4CHi-ttr/share-video-embeds
// @version      1.0.0
// @description  Adds X (Embeds) to YouTube's share menu and opens Share Video Embeds with the video link and start time.
// @description:ja YouTubeの共有メニューに「X (埋め込み)」を追加し、動画URLと開始位置をShare Video Embedsに渡します。
// @author       H4M4CHi-ttr
// @license      MIT
// @match        https://www.youtube.com/*
// @run-at       document-idle
// @grant        none
// @noframes
// @icon         https://h4m4chi-ttr.github.io/share-video-embeds/icons/icon-192.png
// @homepageURL  https://github.com/H4M4CHi-ttr/share-video-embeds
// @supportURL   https://github.com/H4M4CHi-ttr/share-video-embeds/issues
// ==/UserScript==

/*
MIT License

Copyright (c) 2026 H4M4CHi-ttr

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(() => {
  'use strict';

  const app = 'https://h4m4chi-ttr.github.io/share-video-embeds/';
  const panelSelector = 'yt-unified-share-panel-renderer, ytd-unified-share-panel-renderer';
  const nativeTargetSelector = 'yt-share-target-renderer, ytd-share-target-renderer';
  const buttonClass = 'video-embeds-share-target';
  const styleId = 'video-embeds-share-style';
  const startParameters = ['t', 'start', 'time_continue'];
  const videoId = /^[A-Za-z0-9_-]{11}$/u;
  const svgNamespace = 'http://www.w3.org/2000/svg';

  if (!document.body || document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .video-embeds-share-target {
      /* The share toolbar keeps its targets in a single inline row. */
      box-sizing: border-box;
      display: inline-flex;
      vertical-align: top;
      flex: 0 0 auto;
      flex-direction: column;
      align-items: center;
      min-width: 70px;
      margin: 0 8px 0 0;
      padding: 6px 1px 3px;
      background: none;
      border: 0;
      color: var(--yt-sys-color-baseline--text-primary, var(--yt-spec-text-primary, #0f0f0f));
      font: inherit;
      text-align: center;
      cursor: pointer;
    }
    .video-embeds-share-target:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: -2px;
      border-radius: 8px;
    }
    .video-embeds-share-icon {
      position: relative;
      display: block;
      width: 60px;
      height: 60px;
    }
    .video-embeds-share-icon svg { display: block; width: 100%; height: 100%; }
    .video-embeds-share-badge {
      position: absolute;
      right: -2px;
      bottom: -2px;
      padding: 2px 4px;
      border: 1px solid #c4e0ff;
      border-radius: 6px;
      background: #fff;
      color: #174a99;
      font: 700 9px/1.2 system-ui, sans-serif;
    }
    .video-embeds-share-label {
      margin-top: 8px;
      white-space: nowrap;
      font: 400 1.2rem/1.8rem Roboto, Arial, sans-serif;
    }
  `;
  document.head.append(style);

  function readVideo(value) {
    if (!value) return null;
    let url;
    try { url = new URL(value); } catch { return null; }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;

    let id;
    if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') {
      id = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/u)?.[1];
    } else if (/^(?:(?:www|m|music)\.)?youtube\.com$/u.test(url.hostname)) {
      if (/^\/watch\/?$/u.test(url.pathname)) {
        const ids = url.searchParams.getAll('v');
        if (ids.length === 1) id = ids[0];
      } else {
        id = url.pathname.match(/^\/(?:live|shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/u)?.[1];
      }
    }
    return id && videoId.test(id) ? { url, id } : null;
  }

  function readClock(value) {
    const parts = (value ?? '').normalize('NFKC').trim().split(':');
    if (parts.length > 3 || parts.some(part => !/^\d+$/u.test(part))
        || parts.slice(1).some(part => Number(part) >= 60)) return null;
    const seconds = parts.reduce((total, part) => total * 60 + Number(part), 0);
    return Number.isSafeInteger(seconds) && seconds <= 2147483647 ? seconds : null;
  }

  function usePanelStartTime(panel, url) {
    const checkbox = panel.querySelector('#start-at-checkbox');
    if (!checkbox) return;
    const checked = checkbox.checked === true || checkbox.getAttribute('aria-checked') === 'true';
    const seconds = checked ? readClock(panel.querySelector('#start-at-timestamp input')?.value) : null;

    // The native link may still contain the old time while the timestamp field is being edited.
    if (checked && seconds === null) return;
    for (const key of startParameters) url.searchParams.delete(key);
    url.hash = url.hash.slice(1).split('&').filter(field => {
      const key = new URLSearchParams(field).keys().next().value;
      return !startParameters.includes(key);
    }).join('&');
    if (checked) url.searchParams.set('t', String(seconds));
  }

  function makeIcon() {
    const icon = document.createElement('span');
    icon.className = 'video-embeds-share-icon';
    icon.setAttribute('aria-hidden', 'true');

    const svg = document.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    // Draw the app favicon inline so opening the share dialog makes no asset request.
    for (const [name, attributes] of [
      ['rect', { width: 64, height: 64, rx: 15, fill: '#1758d6' }],
      ['path', { d: 'M12 18v28l21-14z', fill: '#fff' }],
      ['path', { d: 'm34 22 17 20m0-20L34 42', fill: 'none', stroke: '#c4e0ff', 'stroke-width': 5.5, 'stroke-linecap': 'round' }],
    ]) {
      const shape = document.createElementNS(svgNamespace, name);
      for (const [attribute, value] of Object.entries(attributes)) shape.setAttribute(attribute, value);
      svg.append(shape);
    }

    const badge = document.createElement('span');
    badge.className = 'video-embeds-share-badge';
    badge.textContent = 'JS';
    icon.append(svg, badge);
    return icon;
  }

  function createTarget(panel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = buttonClass;
    const label = document.createElement('span');
    label.className = 'video-embeds-share-label';
    button.append(makeIcon(), label);
    button.addEventListener('click', event => {
      event.stopPropagation();
      const share = readVideo(panel.querySelector('input#share-url')?.value);
      if (!share) {
        button.remove();
        return;
      }
      usePanelStartTime(panel, share.url);
      const fields = new URLSearchParams({ text: share.url.href });
      if (readVideo(location.href)?.id === share.id) {
        const heading = document.querySelector(`ytd-watch-flexy[video-id="${share.id}"] ytd-watch-metadata h1`);
        const title = heading?.textContent.trim() || document.title.replace(/\s+-\s+YouTube\s*$/iu, '').trim();
        if (title) fields.set('title', title);
      }
      window.open(app + '#' + fields, '_blank', 'noopener,noreferrer');
    });
    return button;
  }

  function updateTarget(panel) {
    const rail = panel.querySelector('#share-targets [role="toolbar"]');
    const existing = panel.querySelector('.' + buttonClass);
    if (!rail || !readVideo(panel.querySelector('input#share-url')?.value)) {
      existing?.remove();
      return;
    }

    const nativeTargets = Array.from(rail.children).filter(target => target.matches(nativeTargetSelector));
    const nativeX = nativeTargets.find(target => {
      const label = (target.querySelector('#title')?.textContent ?? target.textContent).trim();
      return /^(?:X|Twitter)$/iu.test(label);
    });
    const anchor = nativeX ?? nativeTargets[0];
    if (!anchor) {
      existing?.remove();
      return;
    }

    const button = existing ?? createTarget(panel);
    const japanese = /^ja\b/iu.test(document.documentElement.lang || navigator.language);
    const label = japanese ? 'X (埋め込み)' : 'X (Embeds)';
    button.title = japanese ? 'Share Video Embedsで開く（ユーザースクリプト）' : 'Open in Share Video Embeds (User Script)';
    button.setAttribute('aria-label', label + ' — ' + button.title);
    if (button.children[1].textContent !== label) button.children[1].textContent = label;
    if (anchor.nextElementSibling !== button) anchor.after(button);
  }

  function updatePanels() {
    for (const panel of document.querySelectorAll(panelSelector)) updateTarget(panel);
  }

  let pending = false;
  const observer = new MutationObserver(records => {
    if (pending || !records.some(record => record.target.closest?.(panelSelector)
      || (record.type === 'attributes' && record.target.matches?.('tp-yt-paper-dialog')
        && record.target.querySelector(panelSelector))
      || Array.from(record.addedNodes).some(node => node.matches?.(panelSelector) || node.querySelector?.(panelSelector)))) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      updatePanels();
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'opened', 'aria-hidden', 'value'],
  });
  updatePanels();
})();
