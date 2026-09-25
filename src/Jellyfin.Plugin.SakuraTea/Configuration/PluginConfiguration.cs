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

    // UI Builder values are persisted now and will be applied to the live
    // Home header in the next wiring phase.
    public int BuilderHeaderHeight { get; set; } = 44;
    public int BuilderHeaderButtonSize { get; set; } = 34;
    public int BuilderHeaderIconSize { get; set; } = 17;
    public int BuilderHeaderAvatarSize { get; set; } = 30;
    public int BuilderHeaderSpacing { get; set; } = 7;
    public int BuilderHeaderOpacity { get; set; } = 68;
    public string BuilderHeaderPosition { get; set; } = "Left";

    public int BuilderHeroHeight { get; set; } = 76;
    public int BuilderHeroTitleSize { get; set; } = 100;
    public int BuilderHeroButtonSize { get; set; } = 90;
    public int BuilderBackdropDarkness { get; set; } = 48;
    public int BuilderPetalDensity { get; set; } = 55;
    public int BuilderAnimationSpeed { get; set; } = 100;

    public string BuilderPerformanceMode { get; set; } = "Balanced";
    public string BuilderHeaderItems { get; set; } = "sakura:flower|jellyfin:favorites|sakura:anime|sakura:not-safe|header:split|jellyfin:user-menu|jellyfin:cast|jellyfin:profile-avatar";
    public string BuilderNavOrder { get; set; } = "Favourites|Anime|Not Safe";
}
