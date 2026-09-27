# Frontend checks

Run from the repository root:

```sh
node --test tests/runtime.test.cjs
```

The browser harness requires Playwright on Node's module path. To use installed Brave:

```sh
BROWSER_PATH='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' node tests/builder.browser.cjs
```

It checks configuration loading, unsaved edits, discard, control search/addition,
save/retry, keyboard removal, empty-header persistence, and desktop/mobile rendering.
It writes screenshots to `/tmp/sakura-builder-desktop.png` and
`/tmp/sakura-builder-mobile.png`.

Jellyfin APIs are mocked and remote images are blocked. These checks do not replace
integration testing on a Jellyfin 12 server with File Transformation installed.
