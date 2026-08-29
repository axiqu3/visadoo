param([int]$Port = 8099)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Visa Doo static server running on http://localhost:$Port/"

$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.js'='application/javascript; charset=utf-8'; '.json'='application/json';
  '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg';
  '.jpeg'='image/jpeg'; '.webp'='image/webp'; '.ico'='image/x-icon';
  '.woff2'='font/woff2'; '.txt'='text/plain'; '.mp4'='video/mp4'
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch { break }
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }
    if ($path -eq '/events' -or $path -eq '/events/') { $path = '/events/events.html' }
    if ($path -eq '/articles' -or $path -eq '/articles/') { $path = '/articles/articles.html' }
    if ($path -match '^/event/[^/]+/?$') { $path = '/events/event.html' }
    if ($path -match '^/article/[^/]+/?$') { $path = '/articles/article.html' }
    if ($path -match '^/country/[^/]+/?$') { $path = '/country.html' }
    if ($path -match '^/visa/[^/]+/?$') { $path = '/country.html' }
    $file = Join-Path $root ($path.TrimStart('/').Replace('/', '\'))
    if ((Test-Path $file) -and -not (Get-Item $file).PSIsContainer) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $res.ContentType = $ct
      $res.Headers.Add('Cache-Control','no-store')
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes('Not found: ' + $path)
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    try { $res.StatusCode = 500 } catch {}
  } finally {
    try { $res.OutputStream.Close() } catch {}
  }
}
