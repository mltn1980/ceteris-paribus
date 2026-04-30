$url   = "https://dgrn.mgap.gub.uy/arcgis/rest/services/CONEAT/IndicesConeat/MapServer/0/query"
$out   = "$PSScriptRoot\data\coneat-dept-dist.json"

$depts = @(
  'ARTIGAS','CANELONES','CERRO LARGO','COLONIA','DURAZNO','FLORES','FLORIDA',
  'LAVALLEJA','MALDONADO','MONTEVIDEO','PAYSANDU','RIO NEGRO','RIVERA',
  'ROCHA','SALTO','SAN JOSE','SORIANO','TACUAREMBO','TREINTA Y TRES'
)

$result = @{}

foreach ($dept in $depts) {
    Write-Host "Consultando $dept..."
    $offset   = 0
    $dist     = @{}
    $totalArea = 0

    do {
        $body = @{
            where             = "DEPTO='$dept'"
            outFields         = "IND_CONEAT,AREAHA"
            returnGeometry    = "false"
            resultOffset      = $offset
            resultRecordCount = 2000
            f                 = "json"
        }
        try {
            $r = Invoke-RestMethod $url -Method Post -Body $body -TimeoutSec 60
        } catch {
            Write-Host "  Error: $_"; break
        }

        foreach ($f in $r.features) {
            $idx  = [string]$f.attributes.IND_CONEAT
            $area = [double]$f.attributes.AREAHA
            if ($area -le 0) { $area = 1 }   # fallback: 1 ha si no tiene dato

            if (-not $dist.ContainsKey($idx)) { $dist[$idx] = 0.0 }
            $dist[$idx] += $area
            $totalArea  += $area
        }

        $offset += $r.features.Count
        if ($r.features.Count -lt 2000) { break }

    } while ($true)

    Write-Host "  $($dist.Count) grupos CONEAT, $([math]::Round($totalArea)) ha totales"
    $result[$dept] = $dist
}

$json = $result | ConvertTo-Json -Depth 5 -Compress
[IO.File]::WriteAllText($out, $json, [Text.Encoding]::UTF8)
Write-Host "Guardado en $out"
