namespace Jellyfin.Plugin.SakuraTea.Helpers;

public static class FrontendAssets
{
    public enum Feature { Always, Theme, Hero, Petals }

    public sealed record Asset(string FileName, string Folder, Feature RequiredFeature = Feature.Always)
    {
        public bool IsStyle => FileName.EndsWith(".css", StringComparison.OrdinalIgnoreCase);
        public string ContentType => FileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : IsStyle ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8";
        public string ResourceName => $"Jellyfin.Plugin.SakuraTea.Inject.{Folder}.{FileName}";
    }

    public static IReadOnlyList<Asset> Ordered { get; } =
    [
        new("sakura-tea-theme.css", "Theme", Feature.Theme),
        new("sakura-tea-hero.css", "Hero", Feature.Hero),
        new("sakura-tea-petals.css", "Petals", Feature.Petals),
        new("sakura-tea-appearance.css", "Theme"),
        new("sakura-tea-controls.css", "Theme"),
        new("sakura-tea-details.css", "Theme"),
        new("sakura-tea-details.js", "Build"),
        new("sakura-tea-appearance.js", "Build"),
        new("sakura-tea-header-core.js", "Build"),
        new("sakura-tea-header-runtime.js", "Build"),
        new("sakura-tea-runtime.js", "Build")
    ];

    public static IReadOnlyDictionary<string, Asset> ByFileName { get; } =
        Ordered.Append(new Asset("sakura-tea-logo-flower.png", "Brand"))
            .ToDictionary(asset => asset.FileName, StringComparer.Ordinal);
}
