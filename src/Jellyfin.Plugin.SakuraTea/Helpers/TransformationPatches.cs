using System.Text.RegularExpressions;
using Jellyfin.Plugin.SakuraTea.Configuration;
using Jellyfin.Plugin.SakuraTea.Model;

namespace Jellyfin.Plugin.SakuraTea.Helpers;

public static class TransformationPatches
{
    private static readonly Regex InjectedStyles = new(
        "<link\\b[^>]*\\bdata-sakura-tea-asset=\"[^\"]*\"[^>]*>",
        RegexOptions.CultureInvariant);

    private static readonly Regex InjectedScripts = new(
        "<script\\b[^>]*\\bdata-sakura-tea-asset=\"[^\"]*\"[^>]*>[\\s\\S]*?</script>",
        RegexOptions.CultureInvariant);

    public static string IndexHtml(PatchRequestPayload payload)
    {
        string contents = payload.Contents ?? string.Empty;
        if (string.IsNullOrWhiteSpace(contents)
            || !contents.Contains("</head>", StringComparison.Ordinal)
            || !contents.Contains("</body>", StringComparison.Ordinal))
        {
            return contents;
        }

        contents = InjectedStyles.Replace(contents, string.Empty);
        contents = InjectedScripts.Replace(contents, string.Empty);

        PluginConfiguration config = SakuraTeaPlugin.Instance.Configuration;
        string cacheQuery = $"?v={typeof(SakuraTeaPlugin).Assembly.GetName().Version}";

        foreach (FrontendAssets.Asset asset in FrontendAssets.Ordered)
        {
            if (!ShouldInject(asset, config)) continue;

            string url = $"../SakuraTea/{asset.FileName}{cacheQuery}";
            string element = asset.IsStyle
                ? $"<link rel=\"stylesheet\" href=\"{url}\" data-sakura-tea-asset=\"{asset.FileName}\" />"
                : $"<script defer src=\"{url}\" data-sakura-tea-asset=\"{asset.FileName}\"></script>";

            string closingTag = asset.IsStyle ? "</head>" : "</body>";
            contents = contents.Replace(closingTag, $"{element}{closingTag}", StringComparison.Ordinal);
        }

        return contents;
    }

    private static bool ShouldInject(FrontendAssets.Asset asset, PluginConfiguration c) =>
        asset.RequiredFeature switch
        {
            FrontendAssets.Feature.Theme => c.ThemeEnabled,
            FrontendAssets.Feature.Hero => c.HeroEnabled,
            FrontendAssets.Feature.Petals => c.PetalsEnabled,
            _ => true
        };
}
