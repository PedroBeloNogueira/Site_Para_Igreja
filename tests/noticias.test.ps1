$ErrorActionPreference = 'Stop'
$testDir = Join-Path ([IO.Path]::GetTempPath()) ('emaus-news-' + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $testDir | Out-Null
$fixture = Join-Path $testDir 'feed.xml'
$output = Join-Path $testDir 'noticias.json'
$xml = @'
<rss xmlns:media="http://search.yahoo.com/mrss/"><channel>
<item><title><![CDATA[Fé &amp; esperança]]></title><description><![CDATA[<p>Resumo &amp; texto.</p><script>alert(1)</script><a href="x">Leia tudo</a>]]></description><link>https://www.vaticannews.va/pt/igreja/news/2026-10/a.html</link><pubDate>Thu, 01 Oct 2026 10:00:00 +0200</pubDate><media:content url="https://www.vaticannews.va/content/dam/a.jpg"/></item>
<item><title>Duplicada</title><link>https://www.vaticannews.va/pt/igreja/news/2026-10/a.html</link><pubDate>Thu, 01 Oct 2026 10:00:00 +0200</pubDate></item>
<item><title>Insegura</title><link>https://www.vaticannews.va.evil.test/pt/a.html</link><pubDate>Thu, 01 Oct 2026 10:00:00 +0200</pubDate></item>
<item><title>Mais recente</title><description>Outra notícia</description><link>https://www.vaticannews.va/pt/papa/news/2026-10/b.html</link><pubDate>Thu, 01 Oct 2026 12:00:00 +0200</pubDate><media:content url="javascript:alert(1)"/></item>
</channel></rss>
'@
Set-Content -LiteralPath $fixture -Value $xml
& "$PSScriptRoot/../scripts/atualizar-noticias.ps1" -FixturePath $fixture -OutputPath $output
$data = Get-Content -LiteralPath $output -Raw | ConvertFrom-Json
if ($data.noticias.Count -ne 2) { throw 'Falha em duplicados ou URLs inseguras' }
if ($data.noticias[0].titulo -ne 'Mais recente' -or $data.noticias[0].imagem) { throw 'Falha de ordenação ou imagem insegura' }
if ($data.noticias[1].titulo -ne 'Fé & esperança' -or $data.noticias[1].resumo -ne 'Resumo & texto.') { throw 'Falha de CDATA, entidades ou limpeza de HTML' }
$before = Get-Content -LiteralPath $output -Raw
foreach ($invalid in @('<rss><channel/></rss>', '<rss>', '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss><channel>&x;</channel></rss>')) {
    Set-Content -LiteralPath $fixture -Value $invalid
    $failed = $false
    try { & "$PSScriptRoot/../scripts/atualizar-noticias.ps1" -FixturePath $fixture -OutputPath $output } catch { $failed = $true }
    if (!$failed -or (Get-Content -LiteralPath $output -Raw) -ne $before) { throw 'Falha de preservação após feed inválido' }
}
Remove-Item -LiteralPath $fixture,$output
Remove-Item -LiteralPath $testDir
Write-Output 'PASS: RSS, CDATA, datas, links, imagens, duplicados, falhas e DTD.'
