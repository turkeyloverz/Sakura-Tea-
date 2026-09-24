using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.SakuraTea.Configuration;

public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool ThemeEnabled { get; set; } = true;
    public bool HeroEnabled { get; set; } = true;
    public bool PetalsEnabled { get; set; } = true;
    public string AnimeLibraryName { get; set; } = "Anime";
    public int HeroSlides { get; set; } = 10;
    public int HeroRotationSeconds { get; set; } = 9;

    // UI Builder test values. They are persisted now and will be wired into
    // the live Home runtime as the builder graduates from preview to production.
    public int BuilderHeaderScale { get; set; } = 86;
    public int BuilderHeaderOpacity { get; set; } = 58;
    public string BuilderHeaderPosition { get; set; } = "Left";
    public int BuilderHeroHeight { get; set; } = 76;
    public int BuilderHeroButtonScale { get; set; } = 88;
    public int BuilderBackdropDarkness { get; set; } = 48;
    public int BuilderPetalDensity { get; set; } = 55;
    public string BuilderPerformanceMode { get; set; } = "Balanced";
}
