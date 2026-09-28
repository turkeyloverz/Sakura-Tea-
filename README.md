# Sakura Tea

Sakura Tea is a Jellyfin 12 visual-customisation plugin focused on a cinematic anime-first home screen with Sakura styling.

> **Status:** `0.1.16` alpha for Jellyfin 12 (plugin version `0.1.16.0`).

## Features

- Sakura Tea theme foundation
- Anime-library hero
- Sakura petal divider
- Full-width divider with extra petals and two slowly spinning, glowing sakura flowers
- Compact pupil slider in the unified floating header
- Personal dark mode removes the hero, wallpaper, petals, glow, and blur
- UI builder with live preview, searchable controls, and keyboard reordering
- Clean enable/disable configuration
- Jellyfin SPA-safe runtime foundation

## Target

- Jellyfin Server: **12.0**
- .NET: **10.0**
- Frontend injection: **File Transformation** plugin

## Personal appearance

Move the pupil slider right for effects or left for dark mode. Use the arrow keys
when the slider has focus. Preferences are stored separately for each Jellyfin
server and user in the current browser, persist across reloads, and synchronize
between tabs. They do not change the administrator’s settings or other users’
appearance. If browser storage is blocked, the choice lasts for the current page.

## Build

```bash
dotnet build SakuraTea.slnx --configuration Release
```

See [frontend checks](tests/README.md) for runtime and browser validation.

## License

A project license will be chosen before the first public release.
