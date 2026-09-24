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
}
