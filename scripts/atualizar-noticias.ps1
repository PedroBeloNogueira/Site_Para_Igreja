param(
    [string]$OutputPath = (Join-Path $PSScriptRoot '../data/noticias.json'),
    [string]$FixturePath
)
$ErrorActionPreference = 'Stop'
$feedUrl = 'https://www.vaticannews.va/pt.rss.xml'

function Get-SafeUrl([string]$Value, [string]$Prefix) {
    $uri = $null
    if ([Uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$uri) -and
        $uri.Scheme -eq 'https' -and $uri.Host -eq 'www.vaticannews.va' -and
        $uri.IsDefaultPort -and !$uri.UserInfo -and $uri.AbsolutePath.StartsWith($Prefix)) {
        return $uri.AbsoluteUri
    }
    return ''
}
function Get-PlainText([string]$Value) {
    $value = [regex]::Replace($Value, '(?is)<(script|style)\b[^>]*>.*?</\1>', '')
    $value = [regex]::Replace($value, '(?is)<a\b[^>]*>.*?</a>', '')
    $value = [regex]::Replace($value, '<[^>]*>', ' ')
    return [regex]::Replace([Net.WebUtility]::HtmlDecode($value), '\s+', ' ').Trim()
}

# Parse XML with external entities and DTDs disabled.
$xml = if ($FixturePath) { Get-Content -LiteralPath $FixturePath -Raw } else {
    (Invoke-WebRequest -Uri $feedUrl -TimeoutSec 30 -MaximumRetryCount 2 -RetryIntervalSec 5).Content
}
$settings = [System.Xml.XmlReaderSettings]::new()
$settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
$settings.XmlResolver = $null
$settings.MaxCharactersInDocument = 5000000
$reader = [System.Xml.XmlReader]::Create([System.IO.StringReader]::new($xml), $settings)
$document = [System.Xml.XmlDocument]::new()
$document.XmlResolver = $null
try { $document.Load($reader) } finally { $reader.Dispose() }
$seen = [Collections.Generic.HashSet[string]]::new()
$items = @(
    foreach ($item in $document.SelectNodes('/rss/channel/item')) {
        $url = Get-SafeUrl $item.link '/pt/'
        $title = Get-PlainText $item.SelectSingleNode('title').InnerText
        $date = [DateTimeOffset]::MinValue
        if (!$url -or !$title -or ![DateTimeOffset]::TryParse([string]$item.pubDate, [ref]$date)) { continue }
        if (!$seen.Add($url)) { continue }
        $description = Get-PlainText $item.SelectSingleNode('description').InnerText
        if ($description.Length -gt 260) { $description = [regex]::Replace($description.Substring(0, 257), '\s+\S*$', '') + '…' }
        $media = $item.SelectSingleNode('*[local-name()="content" and namespace-uri()="http://search.yahoo.com/mrss/"]')
        $image = if ($media) { Get-SafeUrl $media.GetAttribute('url') '/content/dam/' } else { '' }
        [ordered]@{ titulo = $title; resumo = $description; url = $url; imagem = $image; publicadaEm = $date.ToUniversalTime().ToString('o') }
    }
) | Sort-Object { $_.publicadaEm } -Descending | Select-Object -First 3
if (@($items).Count -eq 0) { throw 'RSS sem notícias válidas. Último arquivo preservado.' }
$result = [ordered]@{
    fonte = 'Vatican News'; feed = $feedUrl
    atualizadoEm = [DateTimeOffset]::UtcNow.ToString('o')
    noticias = @($items)
}
# Replace only after a complete, valid response has been collected.
$target = [IO.Path]::GetFullPath($OutputPath)
$temp = $target + '.tmp'
try {
    [IO.File]::WriteAllText($temp, ($result | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
    [IO.File]::Move($temp, $target, $true)
} finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp } }
Write-Output "Notícias atualizadas: $(@($items).Count)."
