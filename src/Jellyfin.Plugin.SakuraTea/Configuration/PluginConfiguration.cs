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

    // UI Builder preview values. These are persisted for testing but remain
    // disconnected from the live Home runtime until the builder is approved.
    public int BuilderHeaderHeight { get; set; } = 40;
    public int BuilderHeaderButtonSize { get; set; } = 32;
    public int BuilderHeaderIconSize { get; set; } = 16;
    public int BuilderHeaderAvatarSize { get; set; } = 28;
    public int BuilderHeaderSpacing { get; set; } = 6;
    public int BuilderHeaderOpacity { get; set; } = 58;
    public string BuilderHeaderPosition { get; set; } = "Left";

    public int BuilderHeroHeight { get; set; } = 76;
    public int BuilderHeroTitleSize { get; set; } = 100;
    public int BuilderHeroButtonSize { get; set; } = 90;
    public int BuilderBackdropDarkness { get; set; } = 48;
    public int BuilderPetalDensity { get; set; } = 55;
    public int BuilderAnimationSpeed { get; set; } = 100;

    public string BuilderPerformanceMode { get; set; } = "Balanced";
    public string BuilderHeaderItems { get; set; } = "Favourites|Anime|Not Safe|Search|Cast|User Menu|Profile|Home|More";
    public string BuilderNavOrder { get; set; } = "Favourites|Anime|Not Safe";
}
