# update-precios.ps1
# Descarga el ultimo archivo de Camara Mercantil, extrae precios y actualiza data/precios.json
# Ejecutar desde la raiz del proyecto: .\scripts\update-precios.ps1

$ErrorActionPreference = "Stop"
$rootDir = Split-Path $PSScriptRoot -Parent
$outputFile = Join-Path $rootDir "data\precios.json"
$tmpXlsx = Join-Path $env:TEMP "camaramercantil_latest.xlsx"

function Parse-Price($text) {
    if ($text -match "^(\d+)/(\d+)$") {
        return [int](([int]$Matches[1] + [int]$Matches[2]) / 2)
    } elseif ($text -match "^\d+$") {
        return [int]$text
    }
    return $null
}

# 1. Buscar el ultimo xlsx en la web de Camara Mercantil
Write-Host "Buscando ultimo archivo..."
$page = Invoke-WebRequest -Uri "https://www.camaramercantil.com.uy/cereales-y-oleaginosas/" -UseBasicParsing
$links = $page.Links | Where-Object { $_.href -match "\.xlsx$" } | Select-Object -ExpandProperty href
if (-not $links) { throw "No se encontraron archivos xlsx en la pagina" }

# Ordenar por nombre de archivo (fecha incluida en nombre) y tomar el ultimo
$latestUrl = $links | Sort-Object | Select-Object -Last 1
Write-Host "Archivo encontrado: $latestUrl"

# Extraer fecha del nombre del archivo (formato YYYY.MM.DD)
$dateMatch = [regex]::Match($latestUrl, "(\d{4})\.(\d{2})\.(\d{2})")
if ($dateMatch.Success) {
    $fecha = "$($dateMatch.Groups[1].Value)-$($dateMatch.Groups[2].Value)-$($dateMatch.Groups[3].Value)"
} else {
    $fecha = (Get-Date -Format "yyyy-MM-dd")
}

# 2. Descargar
Write-Host "Descargando..."
Invoke-WebRequest -Uri $latestUrl -OutFile $tmpXlsx

# 3. Leer precios con Excel COM
Write-Host "Leyendo precios..."
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $wb = $excel.Workbooks.Open($tmpXlsx)
    $ws = $wb.Sheets.Item(1)
    $lastCol = $ws.UsedRange.Columns.Count
    $lastRow = $ws.UsedRange.Rows.Count

    $precios = @{}

    for ($r = 1; $r -le $lastRow; $r++) {
        $desc = $ws.Cells.Item($r, 1).Text
        $val  = $ws.Cells.Item($r, $lastCol).Text
        $p    = Parse-Price $val
        if ($null -eq $p) { continue }

        if ($desc -like "*Industria_ZAFRA NUEVA*") {
            $precios["soja"] = @{ precio = $p; desc = "Industria zafra nueva - Mvd." }
        } elseif ($desc -like "*PAN*" -and $desc -like "*ZAFRA NUEVA*") {
            $precios["trigo"] = @{ precio = $p; desc = "Zafra nueva - Mvd." }
        } elseif ($desc -like "*Grado II*" -and $desc -like "*DISPONIBLE*") {
            $precios["maiz"] = @{ precio = $p; desc = "Grado II disponible - Mvd." }
        } elseif ($desc -like "*bonificaci*" -and $desc -like "*ZAFRA NUEVA*") {
            $precios["girasol"] = @{ precio = $p; desc = "Industria zafra nueva - Mvd." }
        } elseif ($desc -like "*Industria - Puesta*" -and $desc -like "*ZAFRA NUEVA*") {
            $precios["colza"] = @{ precio = $p; desc = "Industria zafra nueva - Mvd." }
        }
    }

    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}

if ($precios.Count -eq 0) { throw "No se pudieron extraer precios" }

# 4. Actualizar precios.json
Write-Host "Actualizando precios.json..."
$json = [ordered]@{
    fecha  = $fecha
    fuente = "Camara Mercantil de Productos del Pais"
    precios = $precios
} | ConvertTo-Json -Depth 5
$json | Out-File -FilePath $outputFile -Encoding utf8

Write-Host "Precios actualizados:"
$precios.GetEnumerator() | ForEach-Object { Write-Host "  $($_.Key): USD $($_.Value.precio)/tn" }

# 5. Git commit y push
Write-Host "Publicando..."
Set-Location $rootDir
git add data/precios.json
git commit -m "chore: precios Camara Mercantil actualizados $fecha"
git push origin main

Write-Host "Listo. Precios publicados al $fecha."
