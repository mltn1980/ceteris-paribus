# fetch-aduana.ps1 — Descarga datos de DNA Aduanas y genera data/comercio-exterior.json
#
# Uso:     .\fetch-aduana.ps1
# Parcial: .\fetch-aduana.ps1 -Anos 2025,2026
# Debug:   .\fetch-aduana.ps1 -Anos 2026 -Debug
# Lento:   .\fetch-aduana.ps1 -MesMes   (consulta mes a mes en vez de CrossJoin por año)

param(
    [int[]]$Anos      = @(2020, 2021, 2022, 2023, 2024, 2025, 2026),
    [string]$OutFile  = "$PSScriptRoot\data\comercio-exterior.json",
    [string]$RubrosFile = "$PSScriptRoot\data\aduana-rubros.json",
    [switch]$Debug,
    [switch]$MesMes   # fallback: consulta mes a mes (más lento, menos memoria)
)

Set-StrictMode -Off
$ErrorActionPreference = 'Stop'

# ── SSL bypass PS 5.1 ──────────────────────────────────────────────────────────
try {
    Add-Type -TypeDefinition @'
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class AllowAllCerts : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint sp, X509Certificate cert, WebRequest req, int problem) { return true; }
}
'@
} catch {}
[System.Net.ServicePointManager]::CertificatePolicy = New-Object AllowAllCerts
[System.Net.ServicePointManager]::SecurityProtocol  = [System.Net.SecurityProtocolType]::Tls12

$BASE = 'https://biestadisticas.aduanas.gub.uy:8443/pentaho'

# ── Helpers ───────────────────────────────────────────────────────────────────

function New-Session {
    $sv = $null
    $null = Invoke-WebRequest "$BASE/j_spring_security_check" `
        -Method POST `
        -Body 'j_username=internet&j_password=internet&locale=en' `
        -ContentType 'application/x-www-form-urlencoded' `
        -SessionVariable sv -UseBasicParsing `
        -TimeoutSec 30 -MaximumRedirection 0 -ErrorAction SilentlyContinue
    return $sv
}

function Invoke-Xmla {
    param(
        [Microsoft.PowerShell.Commands.WebRequestSession]$Sess,
        [string]$Stmt,
        [int]$Retry = 2
    )
    $env = @"
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body><Execute xmlns="urn:schemas-microsoft-com:xml-analysis">
<Command><Statement>$Stmt</Statement></Command>
<Properties><PropertyList><Catalog>INTERNET_DRES</Catalog><Format>Tabular</Format></PropertyList></Properties>
</Execute></soap:Body></soap:Envelope>
"@
    for ($i = 0; $i -le $Retry; $i++) {
        try {
            $r = Invoke-WebRequest "$BASE/Xmla" -Method POST -Body $env `
                -ContentType 'text/xml' -WebSession $Sess `
                -UseBasicParsing -TimeoutSec 300
            [xml]$x = $r.Content
            $fault = $x.Envelope.Body.Fault
            if ($fault) { throw "SOAP Fault: $($fault.faultstring)" }
            $rows = $x.Envelope.Body.ExecuteResponse.return.root.row
            return $rows
        } catch {
            if ($i -eq $Retry) { throw }
            $msg = $_.Exception.Message -replace "`n.*", ""
            Write-Warning "  Reintento $($i+1)/$Retry : $msg"
            Start-Sleep -Seconds 8
        }
    }
}

function Get-Num([object]$v) {
    $s = "$v".Trim()
    if ($s -eq '' -or $s -eq $null) { return 0.0 }
    return [double]$s
}

$MESES_SET = '{[FechaNumerado.Meses].[1],[FechaNumerado.Meses].[2],[FechaNumerado.Meses].[3],' +
             '[FechaNumerado.Meses].[4],[FechaNumerado.Meses].[5],[FechaNumerado.Meses].[6],' +
             '[FechaNumerado.Meses].[7],[FechaNumerado.Meses].[8],[FechaNumerado.Meses].[9],' +
             '[FechaNumerado.Meses].[10],[FechaNumerado.Meses].[11],[FechaNumerado.Meses].[12]}'

# ── Carga rubros ───────────────────────────────────────────────────────────────
Write-Host 'Cargando rubros...' -ForegroundColor Cyan
$rubros  = Get-Content $RubrosFile -Encoding UTF8 | ConvertFrom-Json
$expoMap = @{}; foreach ($e in $rubros.expo) { $expoMap[$e.partida] = $e }
$impoMap = @{}; foreach ($e in $rubros.impo) { $impoMap[$e.partida] = $e }

# ── Estructuras de salida ─────────────────────────────────────────────────────
$expoMensual  = [System.Collections.Generic.List[object]]::new()
$impoMensual  = [System.Collections.Generic.List[object]]::new()
$expoPaisMes  = [System.Collections.Generic.List[object]]::new()
$expoRubroAcc = @{}   # "anio|mes|rubro" -> hashtable acumulado
$impoRubroAcc = @{}

function Add-Rubro($Acc, [int]$Ano, [int]$Mes, [string]$P4, $Map, [double]$Valor, [double]$Peso) {
    if (-not $Map.ContainsKey($P4)) { return }
    $r   = $Map[$P4]
    $key = "$Ano|$Mes|$($r.rubro)"
    if ($Acc.ContainsKey($key)) {
        $Acc[$key].valor += $Valor
        $Acc[$key].peso  += $Peso
    } else {
        $Acc[$key] = @{ anio=$Ano; mes=$Mes; rubro=$r.rubro; macro=$r.macro; ord=$r.ord; valor=$Valor; peso=$Peso }
    }
}

function Parse-Partida([string]$raw) {
    $s = $raw.Trim()
    if ($s.Length -ge 4) { return $s.Substring(0,4) }
    return $s.PadLeft(4,'0')
}

function Show-Debug($rows) {
    if (-not $Debug -or -not $rows) { return }
    $first = @($rows)[0]
    $cols  = ($first | Get-Member -MemberType Property).Name -join ', '
    Write-Host "    [cols] $cols" -ForegroundColor DarkGray
    Write-Host "    [row0] $($first.OuterXml)" -ForegroundColor DarkGray
}

# ── Autenticación ─────────────────────────────────────────────────────────────
Write-Host 'Autenticando...' -ForegroundColor Cyan
$sess    = New-Session
$loginAt = Get-Date

# ── Loop principal ────────────────────────────────────────────────────────────
foreach ($ano in $Anos) {

    if ((Get-Date) - $loginAt -gt [TimeSpan]::FromMinutes(18)) {
        Write-Host '  [re-login]' -ForegroundColor DarkCyan
        $sess = New-Session; $loginAt = Get-Date
    }

    Write-Host ""
    Write-Host "=== $ano ===" -ForegroundColor Yellow

    # ── 1. Totales mensuales EXPO ────────────────────────────────────────────
    Write-Host "  expo mensual..." -NoNewline
    $mdx = @"
SELECT {[Measures].[VALORENADUANAEXPO],[Measures].[PesoNetoExp]} ON COLUMNS,
NON EMPTY $MESES_SET ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[$ano],[Regimen.Regimen].[40 - Exportacion])
"@
    try {
        $rows = Invoke-Xmla -Sess $sess -Stmt $mdx
        Show-Debug $rows
        $cnt = 0
        foreach ($row in @($rows)) {
            $mes = [int](Get-Num $row.'FechaNumerado.Meses')
            if ($mes -lt 1 -or $mes -gt 12) { continue }
            $expoMensual.Add([PSCustomObject]@{
                anio  = $ano
                mes   = $mes
                valor = [long][math]::Round((Get-Num $row.VALORENADUANAEXPO) * 1000)
                peso  = [long][math]::Round(Get-Num $row.PesoNetoExp)
            }); $cnt++
        }
        Write-Host " $cnt meses" -ForegroundColor Green
    } catch { Write-Host '' ; Write-Warning "  ERROR: $($_.Exception.Message -replace '`n.*','')" }

    # ── 2. Totales mensuales IMPO ────────────────────────────────────────────
    Write-Host "  impo mensual..." -NoNewline
    $mdx = @"
SELECT {[Measures].[PrecioCIFImp],[Measures].[PesoNetoImp]} ON COLUMNS,
NON EMPTY $MESES_SET ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[$ano],[Regimen.Regimen].[10 - Importacion])
"@
    try {
        $rows = Invoke-Xmla -Sess $sess -Stmt $mdx
        $cnt = 0
        foreach ($row in @($rows)) {
            $mes = [int](Get-Num $row.'FechaNumerado.Meses')
            if ($mes -lt 1 -or $mes -gt 12) { continue }
            $impoMensual.Add([PSCustomObject]@{
                anio  = $ano
                mes   = $mes
                valor = [long][math]::Round((Get-Num $row.PrecioCIFImp) * 1000)
                peso  = [long][math]::Round(Get-Num $row.PesoNetoImp)
            }); $cnt++
        }
        Write-Host " $cnt meses" -ForegroundColor Green
    } catch { Write-Host '' ; Write-Warning "  ERROR: $($_.Exception.Message -replace '`n.*','')" }

    # ── 3. EXPO por partida × mes → rubros ───────────────────────────────────
    if ($MesMes) {
        # Modo lento: consulta mes a mes
        Write-Host "  expo rubros (mes a mes)..." -NoNewline
        $ok = 0
        for ($mes = 1; $mes -le 12; $mes++) {
            $mdx = @"
SELECT {[Measures].[VALORENADUANAEXPO],[Measures].[PesoNetoExp]} ON COLUMNS,
NON EMPTY [CodigoArancelario.Partidas].[Partida].Members ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[$ano],[FechaNumerado.Meses].[$mes],[Regimen.Regimen].[40 - Exportacion])
"@
            try {
                $rows = Invoke-Xmla -Sess $sess -Stmt $mdx
                if ($mes -eq 1) { Show-Debug $rows }
                foreach ($row in @($rows)) {
                    $p4 = Parse-Partida "$($row.'CodigoArancelario.Partidas')"
                    Add-Rubro $expoRubroAcc $ano $mes $p4 $expoMap `
                        ((Get-Num $row.VALORENADUANAEXPO) * 1000) (Get-Num $row.PesoNetoExp)
                }
                $ok++
            } catch { Write-Warning "  expo rubros $ano/$mes : $($_.Exception.Message -replace '`n.*','')" }
        }
        Write-Host " $ok/12 meses OK" -ForegroundColor Green
    } else {
        # Modo normal: CrossJoin año completo
        Write-Host "  expo rubros (CrossJoin)..." -NoNewline
        $mdx = @"
SELECT {[Measures].[VALORENADUANAEXPO],[Measures].[PesoNetoExp]} ON COLUMNS,
NON EMPTY CrossJoin($MESES_SET,[CodigoArancelario.Partidas].[Partida].Members) ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[$ano],[Regimen.Regimen].[40 - Exportacion])
"@
        try {
            $rows = Invoke-Xmla -Sess $sess -Stmt $mdx
            Show-Debug $rows
            $cnt = 0
            foreach ($row in @($rows)) {
                $mes = [int](Get-Num $row.'FechaNumerado.Meses')
                if ($mes -lt 1 -or $mes -gt 12) { continue }
                $p4 = Parse-Partida "$($row.'CodigoArancelario.Partidas')"
                Add-Rubro $expoRubroAcc $ano $mes $p4 $expoMap `
                    ((Get-Num $row.VALORENADUANAEXPO) * 1000) (Get-Num $row.PesoNetoExp)
                $cnt++
            }
            Write-Host " $cnt filas" -ForegroundColor Green
        } catch {
            Write-Host '' ; Write-Warning "  ERROR CrossJoin: $($_.Exception.Message -replace '`n.*','') — reintentando mes a mes"
            for ($mes = 1; $mes -le 12; $mes++) {
                $mdx2 = @"
SELECT {[Measures].[VALORENADUANAEXPO],[Measures].[PesoNetoExp]} ON COLUMNS,
NON EMPTY [CodigoArancelario.Partidas].[Partida].Members ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[$ano],[FechaNumerado.Meses].[$mes],[Regimen.Regimen].[40 - Exportacion])
"@
                try {
                    $rows = Invoke-Xmla -Sess $sess -Stmt $mdx2
                    foreach ($row in @($rows)) {
                        $p4 = Parse-Partida "$($row.'CodigoArancelario.Partidas')"
                        Add-Rubro $expoRubroAcc $ano $mes $p4 $expoMap `
                            ((Get-Num $row.VALORANADUANAEXPO) * 1000) (Get-Num $row.PesoNetoExp)
                    }
                } catch { Write-Warning "  expo rubros $ano/$mes : $($_.Exception.Message -replace '`n.*','')" }
            }
        }
    }

    # ── 4. IMPO por partida × mes → rubros ───────────────────────────────────
    if ($MesMes) {
        Write-Host "  impo rubros (mes a mes)..." -NoNewline
        $ok = 0
        for ($mes = 1; $mes -le 12; $mes++) {
            $mdx = @"
SELECT {[Measures].[PrecioCIFImp],[Measures].[PesoNetoImp]} ON COLUMNS,
NON EMPTY [CodigoArancelario.Partidas].[Partida].Members ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[$ano],[FechaNumerado.Meses].[$mes],[Regimen.Regimen].[10 - Importacion])
"@
            try {
                $rows = Invoke-Xmla -Sess $sess -Stmt $mdx
                foreach ($row in @($rows)) {
                    $p4 = Parse-Partida "$($row.'CodigoArancelario.Partidas')"
                    Add-Rubro $impoRubroAcc $ano $mes $p4 $impoMap `
                        ((Get-Num $row.PrecioCIFImp) * 1000) (Get-Num $row.PesoNetoImp)
                }
                $ok++
            } catch { Write-Warning "  impo rubros $ano/$mes : $($_.Exception.Message -replace '`n.*','')" }
        }
        Write-Host " $ok/12 meses OK" -ForegroundColor Green
    } else {
        Write-Host "  impo rubros (CrossJoin)..." -NoNewline
        $mdx = @"
SELECT {[Measures].[PrecioCIFImp],[Measures].[PesoNetoImp]} ON COLUMNS,
NON EMPTY CrossJoin($MESES_SET,[CodigoArancelario.Partidas].[Partida].Members) ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[$ano],[Regimen.Regimen].[10 - Importacion])
"@
        try {
            $rows = Invoke-Xmla -Sess $sess -Stmt $mdx
            $cnt = 0
            foreach ($row in @($rows)) {
                $mes = [int](Get-Num $row.'FechaNumerado.Meses')
                if ($mes -lt 1 -or $mes -gt 12) { continue }
                $p4 = Parse-Partida "$($row.'CodigoArancelario.Partidas')"
                Add-Rubro $impoRubroAcc $ano $mes $p4 $impoMap `
                    ((Get-Num $row.PrecioCIFImp) * 1000) (Get-Num $row.PesoNetoImp)
                $cnt++
            }
            Write-Host " $cnt filas" -ForegroundColor Green
        } catch {
            Write-Host '' ; Write-Warning "  ERROR CrossJoin impo: $($_.Exception.Message -replace '`n.*','') — reintentando mes a mes"
            for ($mes = 1; $mes -le 12; $mes++) {
                $mdx2 = @"
SELECT {[Measures].[PrecioCIFImp],[Measures].[PesoNetoImp]} ON COLUMNS,
NON EMPTY [CodigoArancelario.Partidas].[Partida].Members ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[$ano],[FechaNumerado.Meses].[$mes],[Regimen.Regimen].[10 - Importacion])
"@
                try {
                    $rows = Invoke-Xmla -Sess $sess -Stmt $mdx2
                    foreach ($row in @($rows)) {
                        $p4 = Parse-Partida "$($row.'CodigoArancelario.Partidas')"
                        Add-Rubro $impoRubroAcc $ano $mes $p4 $impoMap `
                            ((Get-Num $row.PrecioCIFImp) * 1000) (Get-Num $row.PesoNetoImp)
                    }
                } catch { Write-Warning "  impo rubros $ano/$mes : $($_.Exception.Message -replace '`n.*','')" }
            }
        }
    }

    # ── 5. EXPO por país ─────────────────────────────────────────────────────
    Write-Host "  expo x pais..." -NoNewline
    $mdx = @"
SELECT {[Measures].[VALORENADUANAEXPO]} ON COLUMNS,
NON EMPTY CrossJoin($MESES_SET,[PaisOrigenDestino.Paises].[Pais].Members) ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[$ano],[Regimen.Regimen].[40 - Exportacion])
"@
    try {
        $rows = Invoke-Xmla -Sess $sess -Stmt $mdx
        $cnt = 0
        foreach ($row in @($rows)) {
            $mes  = [int](Get-Num $row.'FechaNumerado.Meses')
            $pais = "$($row.'PaisOrigenDestino.Paises')".Trim()
            if ($mes -lt 1 -or $mes -gt 12 -or $pais -eq '') { continue }
            $expoPaisMes.Add([PSCustomObject]@{
                anio  = $ano
                mes   = $mes
                pais  = $pais
                valor = [long][math]::Round((Get-Num $row.VALORENADUANAEXPO) * 1000)
            }); $cnt++
        }
        Write-Host " $cnt filas" -ForegroundColor Green
    } catch { Write-Host '' ; Write-Warning "  ERROR expo pais $ano: $($_.Exception.Message -replace '`n.*','')" }
}

# ── Convertir acumuladores ────────────────────────────────────────────────────
Write-Host ''
Write-Host 'Consolidando rubros...' -ForegroundColor Cyan

$expoRubroMes = $expoRubroAcc.Values |
    ForEach-Object { [PSCustomObject]@{
        anio  = $_.anio; mes=$_.mes; rubro=$_.rubro; macro=$_.macro
        valor = [long][math]::Round($_.valor)
        peso  = [long][math]::Round($_.peso)
    }} | Sort-Object anio, mes, macro, { $_.rubro }

$impoRubroMes = $impoRubroAcc.Values |
    ForEach-Object { [PSCustomObject]@{
        anio  = $_.anio; mes=$_.mes; rubro=$_.rubro; macro=$_.macro
        valor = [long][math]::Round($_.valor)
        peso  = [long][math]::Round($_.peso)
    }} | Sort-Object anio, mes, macro, { $_.rubro }

# ── Armar JSON ────────────────────────────────────────────────────────────────
Write-Host 'Generando JSON...' -ForegroundColor Cyan

$out = [ordered]@{
    meta = [ordered]@{
        generado     = (Get-Date -Format 'yyyy-MM-dd')
        fuente       = 'DNA Aduanas Uruguay'
        unidades_val = 'USD corrientes'
        peso_unidad  = 'kg'
        notas        = 'FOB para expo; CIF para impo. Sin unidades comerciales (no disponible en cubo ResumenDuas).'
        anos         = $Anos
    }
    expo = [ordered]@{
        mensual  = @($expoMensual  | Sort-Object anio, mes)
        porRubro = @($expoRubroMes)
        porPais  = @($expoPaisMes  | Sort-Object anio, mes, { -$_.valor })
    }
    impo = [ordered]@{
        mensual  = @($impoMensual  | Sort-Object anio, mes)
        porRubro = @($impoRubroMes)
    }
    rubros = [ordered]@{
        macro_expo = $rubros.macro_expo
        macro_impo = $rubros.macro_impo
    }
}

$json = $out | ConvertTo-Json -Depth 8 -Compress
[System.IO.File]::WriteAllText($OutFile, $json, [System.Text.Encoding]::UTF8)

# ── Resumen ───────────────────────────────────────────────────────────────────
$sz = [math]::Round((Get-Item $OutFile).Length / 1KB, 1)
Write-Host ''
Write-Host "Guardado: $OutFile ($sz KB)" -ForegroundColor Green
Write-Host "  expo.mensual  : $($expoMensual.Count) filas"
Write-Host "  expo.porRubro : $($expoRubroMes.Count) filas"
Write-Host "  expo.porPais  : $($expoPaisMes.Count) filas"
Write-Host "  impo.mensual  : $($impoMensual.Count) filas"
Write-Host "  impo.porRubro : $($impoRubroMes.Count) filas"
Write-Host ''
Write-Host 'NOTA: Unidades comerciales no disponibles en DNA Aduanas online (cubo ResumenDuas).' -ForegroundColor DarkYellow
Write-Host '      Solo Peso Neto (kg) disponible como medida de volumen.' -ForegroundColor DarkYellow

# ── Git: commit + push del JSON → dispara el workflow de generación HTML ──────
Write-Host ''
Write-Host 'Commiteando y pusheando JSON a GitHub...' -ForegroundColor Cyan
Push-Location $PSScriptRoot
try {
    git add data/comercio-exterior.json
    $status = git status --porcelain data/comercio-exterior.json
    if ($status) {
        $fecha = Get-Date -Format 'dd/MM/yyyy HH:mm'
        git commit -m "🛃 Comercio exterior: datos actualizados $fecha"
        git push
        Write-Host "✅ JSON pusheado. GitHub Actions generará el HTML automáticamente." -ForegroundColor Green
        Write-Host "   Revisá: https://github.com/mltn1980/ceteris-paribus/actions" -ForegroundColor Cyan
    } else {
        Write-Host "Sin cambios en el JSON — no se hace commit." -ForegroundColor DarkYellow
    }
} catch {
    Write-Warning "No se pudo hacer git push: $($_.Exception.Message)"
    Write-Host "Hacé el push manualmente: git add data/comercio-exterior.json && git commit -m 'datos' && git push"
} finally {
    Pop-Location
}
