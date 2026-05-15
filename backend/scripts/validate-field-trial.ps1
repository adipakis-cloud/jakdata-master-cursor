param(
  [string]$BaseUrl = "http://localhost:3001",
  [string]$FrontendUrl = "http://localhost:5173"
)

$pass = 0
$fail = 0

function Test-Check {
  param([string]$Label, [bool]$Condition, [string]$Detail = "")
  if ($Condition) {
    Write-Host "  [PASS] $Label" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  [FAIL] $Label $Detail" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  JAKDATA FIELD TRIAL VALIDATION" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "  BaseUrl: $BaseUrl" -ForegroundColor Cyan
Write-Host "  FrontendUrl (info only): $FrontendUrl" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── 1. HEALTH ──
Write-Host "[1] Health Check" -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod "$BaseUrl/api/health"
  Test-Check "Health endpoint responds" ($health.status -eq "ok")
  Test-Check "Version field present" ($null -ne $health.version)
} catch {
  Test-Check "Health endpoint responds" $false "-> $($_.Exception.Message)"
}

# ── 2. LOGIN MATRIX ──
Write-Host "`n[2] Login Matrix" -ForegroundColor Yellow

$accounts = @(
  @{ email = "admin@jakdata.id"; password = "admin123"; expectRole = "admin_pusat"; expectRedirect = "/admin" },
  @{ email = "koordinator.kecamatan@jakdata.id"; password = "admin123"; expectRole = "koordinator_kecamatan"; expectRedirect = "/field" },
  @{ email = "koordinator.kelurahan@jakdata.id"; password = "admin123"; expectRole = "koordinator_kelurahan"; expectRedirect = "/field" },
  @{ email = "koordinator.rw@jakdata.id"; password = "admin123"; expectRole = "koordinator_rw"; expectRedirect = "/field" },
  @{ email = "koordinator.rt@jakdata.id"; password = "admin123"; expectRole = "koordinator_rt"; expectRedirect = "/field" },
  @{ email = "petugas@jakdata.id"; password = "admin123"; expectRole = "petugas_lapangan"; expectRedirect = "/field" },
  @{ email = "warmindo@jakdata.id"; password = "admin123"; expectRole = "manager_warmindo"; expectRedirect = "/warmindo" }
)

$tokens = @{}

foreach ($acc in $accounts) {
  try {
    $body = @{ email = $acc.email; password = $acc.password } | ConvertTo-Json
    $res = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" `
      -ContentType "application/json; charset=utf-8" `
      -Body $body

    $roleOk = ($res.user.role -eq $acc.expectRole)
    $redirectOk = ($res.redirectTo -eq $acc.expectRedirect)
    $wilayahOk = ($acc.expectRole -eq "admin_pusat") -or ($null -ne $res.user.wilayahId)

    Test-Check "$($acc.email) -> role" $roleOk "got: $($res.user.role)"
    Test-Check "$($acc.email) -> redirectTo" $redirectOk "got: $($res.redirectTo)"
    Test-Check "$($acc.email) -> wilayahId" $wilayahOk "got: $($res.user.wilayahId)"

    $tokens[$acc.email] = $res.token
  } catch {
    Test-Check "$($acc.email) login" $false "-> $($_.Exception.Message)"
  }
}

# ── 3. TERRITORY SCOPE ──
Write-Host "`n[3] Territory Scope Audit" -ForegroundColor Yellow

$rtToken = $tokens["koordinator.rt@jakdata.id"]
$adminToken = $tokens["admin@jakdata.id"]

if ($rtToken) {
  try {
    $rtWarga = Invoke-RestMethod -Uri "$BaseUrl/api/warga?limit=5" `
      -Headers @{ Authorization = "Bearer $rtToken" }
    Test-Check "RT token: warga returns paginated shape" ($null -ne $rtWarga.total)
    Test-Check "RT token: warga scoped (total < 10000)" ($rtWarga.total -lt 10000)
  } catch {
    Test-Check "RT warga endpoint" $false "-> $($_.Exception.Message)"
  }

  try {
    $rtLaporan = Invoke-RestMethod -Uri "$BaseUrl/api/laporan?limit=5" `
      -Headers @{ Authorization = "Bearer $rtToken" }
    Test-Check "RT token: laporan returns paginated shape" ($null -ne $rtLaporan.total)
  } catch {
    Test-Check "RT laporan endpoint" $false "-> $($_.Exception.Message)"
  }

  try {
    $rtDash = Invoke-RestMethod -Uri "$BaseUrl/api/dashboard/summary" `
      -Headers @{ Authorization = "Bearer $rtToken" }
    Test-Check "RT token: dashboard summary responds" ($null -ne $rtDash.stats)
  } catch {
    Test-Check "RT dashboard/summary" $false "-> $($_.Exception.Message)"
  }
}

if ($adminToken) {
  try {
    $adminWarga = Invoke-RestMethod -Uri "$BaseUrl/api/warga?limit=5" `
      -Headers @{ Authorization = "Bearer $adminToken" }
    Test-Check "Admin token: warga responds" ($null -ne $adminWarga.total)
  } catch {
    Test-Check "Admin warga endpoint" $false "-> $($_.Exception.Message)"
  }
}

# ── 4. RATE LIMIT (use authenticated request; /api/health may bypass limits) ──
Write-Host "`n[4] Rate Limit Check" -ForegroundColor Yellow
if ($adminToken) {
  try {
    $rl = Invoke-WebRequest -Uri "$BaseUrl/api/warga?limit=1" -Headers @{ Authorization = "Bearer $adminToken" } -UseBasicParsing
    $remaining = $rl.Headers["x-ratelimit-remaining"]
    Test-Check "Rate limit header present on /api/warga" ($null -ne $remaining) "got: $remaining"
  } catch {
    Test-Check "Rate limit header" $false "-> $($_.Exception.Message)"
  }
} else {
  Test-Check "Rate limit header (skipped: no admin token)" $false "login failed"
}

# ── 5. SECURITY HEADERS ──
Write-Host "`n[5] Security Headers" -ForegroundColor Yellow
try {
  $sh = Invoke-WebRequest -Uri "$BaseUrl/api/health" -UseBasicParsing
  Test-Check "X-Content-Type-Options" ($sh.Headers["X-Content-Type-Options"] -eq "nosniff")
  Test-Check "X-Frame-Options" ($sh.Headers["X-Frame-Options"] -eq "DENY")
} catch {
  Test-Check "Security headers" $false "-> $($_.Exception.Message)"
}

# ── 6. UPLOAD ENDPOINT ──
Write-Host "`n[6] Upload Endpoint" -ForegroundColor Yellow
if ($rtToken) {
  try {
    Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/laporan/upload" `
      -Headers @{ Authorization = "Bearer $rtToken" } `
      -ErrorAction Stop
    Test-Check "Upload without file (unexpected 200)" $false
  } catch {
    $resp = $_.Exception.Response
    if ($null -eq $resp) {
      Test-Check "Upload endpoint reachable" $false "-> $($_.Exception.Message)"
    } else {
      $code = [int]$resp.StatusCode
      Test-Check "Upload endpoint exists (not 404)" ($code -ne 404) "HTTP $code"
    }
  }
} else {
  Test-Check "Upload endpoint (skipped: no RT token)" $false "login failed"
}

# ── SUMMARY ──
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESULT: $pass PASS / $fail FAIL" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "========================================`n" -ForegroundColor Cyan

if ($fail -gt 0) {
  exit 1
}
exit 0
