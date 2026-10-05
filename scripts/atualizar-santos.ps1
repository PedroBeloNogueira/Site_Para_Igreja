param(
    [string]$OutputPath = (Join-Path $PSScriptRoot '../data/santos.json'),
    [datetime]$DataInicial = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([datetime]::UtcNow, 'America/Sao_Paulo').Date,
    [ValidateRange(1, 31)][int]$Dias = 8,
    [string]$FixturePath
)
$ErrorActionPreference = 'Stop'
$baseUrl = 'https://www.a12.com'
function Get-OfficialUrl([string]$Value, [string]$Prefix) {
    $uri = [uri]::new([uri]$baseUrl, [Net.WebUtility]::HtmlDecode($Value))
    if ($uri.Scheme -ne 'https' -or $uri.Host -ne 'www.a12.com' -or !$uri.IsDefaultPort -or $uri.UserInfo -or !$uri.AbsolutePath.StartsWith($Prefix)) { throw 'URL do santo inválida.' }
    return $uri.AbsoluteUri
}
$santos = @{}
if (Test-Path -LiteralPath $OutputPath) {
    $anterior = Get-Content -LiteralPath $OutputPath -Raw | ConvertFrom-Json -AsHashtable
    if ($anterior.santos) { $santos = $anterior.santos }
}
$meses = @{}
$coletados = 0
for ($i = 0; $i -lt $Dias; $i++) {
    $data = $DataInicial.AddDays($i)
    $chave = $data.ToString('yyyy-MM-dd')
    try {
        $mes = $data.Month
        if (!$meses.ContainsKey($mes)) {
            $html = if ($FixturePath) { Get-Content -LiteralPath $FixturePath -Raw } else {
                (Invoke-WebRequest "$baseUrl/reze-no-santuario/santo-do-dia?search_type=date&search_value=$mes" -TimeoutSec 30 -MaximumRetryCount 2 -RetryIntervalSec 3).Content
            }
            $meses[$mes] = [regex]::Matches($html, '(?is)<a\b[^>]*href="([^"<>]*[?]saint_id=[^"<>]+)"[^>]*>(.*?)</a>')
        }
        $santo = $null
        foreach ($bloco in $meses[$mes]) {
            $url = Get-OfficialUrl $bloco.Groups[1].Value '/reze-no-santuario/santo-do-dia'
            $query = ([uri]$url).Query
            if ($query -notmatch ('[?&]day=' + $data.Day + '(?:&|$)') -or $query -notmatch ('[?&]month=' + $mes + '(?:&|$)')) { continue }
            $foto = [regex]::Match($bloco.Groups[2].Value, '(?is)<img\b[^>]*src="([^"]+)"')
            $textos = [regex]::Matches($bloco.Groups[2].Value, '(?is)<p\b[^>]*>(.*?)</p>')
            if (!$foto.Success -or $textos.Count -lt 2) { continue }
            $imagem = Get-OfficialUrl $foto.Groups[1].Value '/source/files/'
            $nome = [Net.WebUtility]::HtmlDecode([regex]::Replace($textos[1].Groups[1].Value, '<[^>]*>', '')).Trim()
            if (!$nome) { continue }
            $resumo = ''
            if (!$FixturePath) {
                try {
                    $historia = (Invoke-WebRequest $url -TimeoutSec 30).Content
                    $descricao = [regex]::Match($historia, '(?is)<meta\b[^>]*property="og:description"[^>]*content="([^"]+)"')
                    if ($descricao.Success) {
                        $frase = [Net.WebUtility]::HtmlDecode($descricao.Groups[1].Value)
                        $palavras = ([regex]::Replace($frase, '\s+', ' ').Trim() -split ' ')
                        $resumo = ($palavras | Select-Object -First 22) -join ' '
                        if ($palavras.Count -gt 22) { $resumo += '…' }
                    }
                } catch { Write-Warning "História indisponível para $nome; preservando resumo anterior." }
            }
            if (!$resumo -and $santos[$chave] -and $santos[$chave].url -eq $url) { $resumo = $santos[$chave].resumo }
            $santo = @{ data = $chave; nome = $nome; imagem = $imagem; url = $url; resumo = $resumo; fonte = 'A12 · Santuário de Aparecida' }
            break
        }
        if (!$santo) { throw 'Nenhuma homenagem com imagem foi encontrada.' }
        $santos[$chave] = $santo
        $coletados++
    } catch { Write-Warning "Não foi possível atualizar $chave. Preservando cadastro anterior. $($_.Exception.Message)" }
}
if (!$coletados) { throw 'Nenhum santo atualizado; arquivo anterior preservado.' }
foreach ($chave in @($santos.Keys)) {
    if ($chave -lt $DataInicial.AddDays(-2).ToString('yyyy-MM-dd')) { $santos.Remove($chave) }
}
$dados = @{ atualizadoEm = [datetime]::UtcNow.ToString('o'); fonte = $baseUrl; santos = $santos }
$temporario = "$OutputPath.tmp"
$dados | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $temporario -Encoding utf8
Move-Item -LiteralPath $temporario -Destination $OutputPath -Force
Write-Output "$coletados homenagens atualizadas."
