$url   = "https://dgrn.mgap.gub.uy/arcgis/rest/services/CONEAT/IndicesConeat/MapServer/0/query"
$out   = "$PSScriptRoot\data\coneat-dept-dist.json"

$depts = @(
  'ARTIGAS','CANELONES','CERRO LARGO','COLONIA','DURAZNO','FLORES','FLORIDA',
  'LAVALLEJA','MALDONADO','MONTEVIDEO','PAYSANDU','RIO NEGRO','RIVERA',
  'ROCHA','SALTO','SAN JOSE','SORIANO','TACUAREMBO','TREINTA Y TRES'
)

$batchSize = 1000   # maxRecordCount del servicio

$result = @{}

foreach ($dept in $depts) {
    Write-Host "Consultando $dept..."
    $offset    = 0
    $dist      = @{}
    $totalArea = 0

    do {
        $body = @{
            where             = "DEPTO='$dept'"
            outFields         = "IND_CONEAT,AREAHA"
            returnGeometry    = "false"
            resultOffset      = $offset
            resultRecordCount = $batchSize
            f                 = "json"
        }
        $attempt = 0
        $r = $null
        while ($attempt -lt 3 -and $r -eq $null) {
            try {
                $r = Invoke-RestMethod $url -Method Post -Body $body -TimeoutSec 60
            } catch {
                $attempt++
                Write-Host "  Reintento $attempt (offset $offset)..."
                Start-Sleep -Seconds 3
            }
        }
        if ($r -eq $null) { Write-Host "  FALLO en offset $offset, saltando."; break }

        foreach ($f in $r.features) {
            $idx  = [string]$f.attributes.IND_CONEAT
            $area = [double]$f.attributes.AREAHA
            if ($area -le 0) { continue }   # ignorar padrones sin area

            if (-not $dist.ContainsKey($idx)) { $dist[$idx] = 0.0 }
            $dist[$idx] += $area
            $totalArea  += $area
        }

        $count   = $r.features.Count
        $offset += $count
        Write-Host "  Offset $offset — $count registros — $([math]::Round($totalArea)) ha acumuladas"

        if ($count -lt $batchSize) { break }

    } while ($true)

    $totalRound = [math]::Round($totalArea)
    $idxCount = $dist.Count
    Write-Host "  TOTAL ${dept}: $idxCount indices CONEAT, $totalRound ha"
    $result[$dept] = $dist
}

$json = $result | ConvertTo-Json -Depth 5 -Compress
[IO.File]::WriteAllText($out, $json, [Text.Encoding]::UTF8)
Write-Host "Guardado en $out"
