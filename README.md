# Sakura Tea

Sakura Tea is a Jellyfin 12 visual-customisation plugin focused on a cinematic anime-first home screen with Sakura styling.

> **Status:** `0.1.19.0` alpha for Jellyfin 12 (plugin version `0.1.19.0`).

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

## Home background correction (0.1.19.0)

The selected sakura wallpaper is applied directly to Home in light/effects mode,
with a lighter readability overlay. Dark mode stays plain, and other pages keep
their own backgrounds. This corrected package keeps plugin version `0.1.19.0`;
reinstall it if the earlier package with that version is already installed.

## Clean flower logo (0.1.19)

The header, branding preview, and builder title use the cleaned transparent flower
logo bundled in the plugin. It is served by Jellyfin and works without an external
image host. Independent logo size and position controls still apply.

## Server icon fix (0.1.18)

The live header and UI Builder use the custom Sakura Tea server icon. Its size
and independent position controls continue to apply.

## Header and detail-page upgrades (0.1.17)

- The custom header can be switched independently of the theme. The pupil switch
  stays available in the native header when the custom header is off.
- Layout controls include padding and wider size/spacing ranges. Collapsible
  Branding and Colours groups offer logo/server-name display, colour pickers,
  transparent backgrounds, and hover opacity. Independent horizontal and vertical
  sliders position the server icon, server name, and hotbar across the top area.
  Overlapping elements stack, keeping controls inside narrow screens.
- The default hotbar is Profile picture (native settings dropdown), Anime, and
  Favourites. Navigation buttons use text only; the profile picture stays visible.
  Saved custom orders remain editable, and Reset section restores the new defaults.
  The builder and live header share placement logic; slider layout work is batched
  into one animation frame.
- Narrow screens move surplus controls into a keyboard-accessible More menu.
  User, cast and sync popups are anchored to their visible button.
- Header controls are detected from Jellyfin, Jellyfin Enhanced and SeerrFin.
  Undetected items remain saved but are omitted from the live bar. The builder
  labels them as undetected rather than claiming the provider is disabled.
  Detection caches are separated by account and server.
- **Enable cinematic detail pages** in Overview to opt into the new movie,
  series, season and episode layout. It moves the original title, overview and
  action controls into a cinematic header, preserving native handlers and
  permissions. Episode selection, cast and recommendations remain native.
  Turning the feature off or choosing dark mode restores the original layout.
- The details feature stays off by default and falls back to Jellyfin for
  unsupported layouts or metadata failures. Live Jellyfin 12 validation is still
  required; browser tests use representative DOM and mocked APIs.

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
