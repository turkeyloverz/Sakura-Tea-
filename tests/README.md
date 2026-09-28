# Frontend checks

Run from the repository root:

```sh
node --test tests/*.test.cjs
```

The browser harness requires Playwright on Node's module path. To use installed Brave:

```sh
BROWSER_PATH='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' node tests/builder.browser.cjs
BROWSER_PATH='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' node tests/divider.browser.cjs
BROWSER_PATH='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' node tests/appearance.browser.cjs
```

It checks configuration loading, unsaved edits, discard, control search/addition,
save/retry, keyboard removal, empty-header persistence, and desktop/mobile rendering.
It writes screenshots to `/tmp/sakura-builder-desktop.png` and
`/tmp/sakura-builder-mobile.png`.

The divider check covers full width, particle counts, flowers and reduced motion.
The appearance check uses the actual frontend modules to verify dark mode, reload
persistence, user/server isolation, cross-tab sync, cancellation of pending hero
requests, mobile drag, keyboard controls, empty layouts and blocked storage.

Jellyfin APIs are mocked and remote images are blocked. These checks do not replace
integration testing on a Jellyfin 12 server with File Transformation installed.
