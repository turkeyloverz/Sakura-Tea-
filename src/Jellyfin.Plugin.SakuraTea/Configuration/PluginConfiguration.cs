using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.SakuraTea.Configuration;

public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool ThemeEnabled { get; set; } = true;
    public bool HeaderEnabled { get; set; } = true;
    public bool DetailsEnabled { get; set; } = false;
    public bool HeroEnabled { get; set; } = true;
    public bool PetalsEnabled { get; set; } = true;
    public string AnimeLibraryName { get; set; } = "Anime";
    public int HeroSlides { get; set; } = 10;
    public int HeroRotationSeconds { get; set; } = 9;

    // UI Builder values are persisted and applied to the live Home header.
    public int BuilderHeaderHeight { get; set; } = 44;
    public int BuilderHeaderButtonSize { get; set; } = 34;
    public int BuilderHeaderIconSize { get; set; } = 17;
    public int BuilderHeaderAvatarSize { get; set; } = 30;
    public int BuilderHeaderSpacing { get; set; } = 7;
    public int BuilderHeaderOpacity { get; set; } = 68;
    public string BuilderHeaderPosition { get; set; } = "Center";

    public int? BuilderHeaderX { get; set; }
    public int BuilderHeaderY { get; set; } = 0;
    public int BuilderLogoX { get; set; } = 0;
    public int BuilderLogoY { get; set; } = 0;
    public int BuilderNameX { get; set; } = 100;
    public int BuilderNameY { get; set; } = 0;

    public int BuilderHeaderPadding { get; set; } = 4;
    public string BuilderBrandDisplay { get; set; } = "Both";
    public string BuilderBrandPosition { get; set; } = "Left";
    public int BuilderLogoHeight { get; set; } = 30;
    public int BuilderBrandSpacing { get; set; } = 10;
    public string BuilderBrandColor { get; set; } = "#FFFFFF";
    public string BuilderItemColor { get; set; } = "#FFF8FC";
    public string BuilderItemBackground { get; set; } = "transparent";
    public string BuilderActiveColor { get; set; } = "#FFFFFF";
    public string BuilderActiveBackground { get; set; } = "#C76D91";
    public int BuilderHoverOpacity { get; set; } = 100;

    public int BuilderHeroHeight { get; set; } = 76;
    public int BuilderHeroTitleSize { get; set; } = 100;
    public int BuilderHeroButtonSize { get; set; } = 90;
    public int BuilderBackdropDarkness { get; set; } = 48;
    public int BuilderPetalDensity { get; set; } = 55;
    public int BuilderAnimationSpeed { get; set; } = 100;

    public string BuilderPerformanceMode { get; set; } = "Balanced";
    public string BuilderHeaderItems { get; set; } = "jellyfin:profile-avatar|sakura:anime|jellyfin:favorites";
    public string BuilderNavOrder { get; set; } = "Favourites|Anime|Not Safe";
}
