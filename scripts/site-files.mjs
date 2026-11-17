export const GENERATED_FILES = ['en.html'];

export const SHELL_FILES = [
  ...GENERATED_FILES,
  'index.html', 'privacy.html', 'app.mjs', 'youtube.mjs', 'player.mjs', 'settings.mjs',
  'shared-input.mjs', 'bookmarklet.mjs', 'i18n.mjs', 'styles.css', 'favicon.svg', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

export const SITE_FILES = [...SHELL_FILES, 'social-card.jpg', 'share-video-embeds.user.js', 'sitemap.xml', 'LICENSE', 'sw.js', '.nojekyll'];
