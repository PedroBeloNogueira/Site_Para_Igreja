$ErrorActionPreference = 'Stop'
$pastaTeste = Join-Path ([IO.Path]::GetTempPath()) ('emaus-santos-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $pastaTeste | Out-Null
$fixture = Join-Path $pastaTeste 'calendario.html'
$saida = Join-Path $pastaTeste 'santos.json'
$coletor = Join-Path $PSScriptRoot '../scripts/atualizar-santos.ps1'
@'
<a href="https://www.a12.com/reze-no-santuario/santo-do-dia?saint_id=702&amp;day=2&amp;month=10"><img src="/source/files/originals/anjos.jpg"><div><p>2 de Outubro</p><p>Santos Anjos da Guarda</p></div></a>
<a href="https://www.a12.com/reze-no-santuario/santo-do-dia?saint_id=700&amp;day=3&amp;month=10"><img src="/source/files/originals/martires.jpg"><div><p>3 de Outubro</p><p>Santos Mártires</p></div></a>
'@ | Set-Content -LiteralPath $fixture -Encoding utf8
& $coletor -FixturePath $fixture -OutputPath $saida -DataInicial '2026-10-02' -Dias 2
$dados = Get-Content -LiteralPath $saida -Raw | ConvertFrom-Json -AsHashtable
if ($dados.santos.Count -ne 2 -or $dados.santos['2026-10-02'].nome -ne 'Santos Anjos da Guarda' -or $dados.santos['2026-10-03'].imagem -notlike 'https://www.a12.com/source/files/*') { throw 'Falha na coleta das datas e imagens.' }
$anterior = Get-Content -LiteralPath $saida -Raw
(Get-Content -LiteralPath $fixture -Raw).Replace('/source/files/originals/anjos.jpg', 'https://exemplo.com/anjos.jpg') | Set-Content -LiteralPath $fixture -Encoding utf8
$falhou = $false
try { & $coletor -FixturePath $fixture -OutputPath $saida -DataInicial '2026-10-02' -Dias 1 } catch { $falhou = $true }
if (!$falhou -or (Get-Content -LiteralPath $saida -Raw) -ne $anterior) { throw 'Cadastro anterior não foi preservado.' }
Remove-Item -LiteralPath $fixture, $saida
Remove-Item -LiteralPath $pastaTeste
Write-Output 'PASS: datas, imagens, entidades HTML, fonte oficial e preservação em falha.'
