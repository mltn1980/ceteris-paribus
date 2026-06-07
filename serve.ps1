$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:3000/")
$listener.Start()
Write-Host "Serving on http://localhost:3000/"
$root = $PSScriptRoot

$mimes = @{
  '.html'=  'text/html; charset=utf-8'
  '.css' =  'text/css'
  '.js'  =  'application/javascript'
  '.json'=  'application/json'
  '.png' =  'image/png'
  '.jpg' =  'image/jpeg'
  '.svg' =  'image/svg+xml'
  '.ico' =  'image/x-icon'
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  $path = $req.Url.LocalPath -replace '/','\'
  if ($path -eq '\') { $path = '\index.html' }
  $file = Join-Path $root $path
  if (Test-Path $file -PathType Leaf) {
    $ext = [IO.Path]::GetExtension($file)
    $ct = if ($mimes[$ext]) { $mimes[$ext] } else { 'application/octet-stream' }
    $res.ContentType = $ct
    $bytes = [IO.File]::ReadAllBytes($file)
    $res.ContentLength64 = [long]$bytes.Length
    $bufSize = 65536
    $offset  = 0
    try {
      while ($offset -lt $bytes.Length) {
        $count = [Math]::Min($bufSize, $bytes.Length - $offset)
        $res.OutputStream.Write($bytes, [int]$offset, [int]$count)
        $offset += $count
      }
      $res.OutputStream.Flush()
    } catch { }
  } else {
    $res.StatusCode = 404
  }
  try { $res.Close() } catch { }
}
