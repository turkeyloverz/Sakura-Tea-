# Sakura Tea

Sakura Tea is a Jellyfin 12 visual-customisation plugin focused on a cinematic anime-first home screen with Sakura styling.

> **Status:** early development scaffold for `0.1.0-alpha.1`. This repository is not ready for normal installation yet.

## Planned 0.1.0-alpha.1 scope

- Sakura Tea theme foundation
- Anime-library hero
- Sakura petal divider
- Floating background petals and flowers
- Clean enable/disable configuration
- Jellyfin SPA-safe runtime foundation

## Target

- Jellyfin Server: **12.0**
- .NET: **10.0**
- Frontend injection: **File Transformation** plugin

## Project layout

```text
src/Jellyfin.Plugin.SakuraTea/
├── Configuration/
├── Controllers/
├── Helpers/
├── Model/
├── Services/
└── Inject/
    ├── Theme/
    ├── Hero/
    ├── Petals/
    └── Build/
```

## Development

Build with:

```bash
dotnet build SakuraTea.slnx --configuration Release
```

The plugin currently contains the server/plugin foundation and frontend module boundaries. The approved Sakura Tea preview will be wired into the Hero and Petal modules next.

## License

A project license will be chosen before the first public release.
