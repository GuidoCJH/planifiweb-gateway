[CmdletBinding()]
param(
    [string]$KoyebToken = $env:KOYEB_API_TOKEN,
    [string]$SupabaseToken = $env:SUPABASE_ACCESS_TOKEN,
    [string]$SupabaseOrganizationId = $env:SUPABASE_ORGANIZATION_ID,
    [string]$SupabaseProjectName = "planifiweb-platform",
    [string]$SupabaseRegion = "us-east-1",
    [string]$DatabasePassword = $env:SUPABASE_DATABASE_PASSWORD,
    [string]$KoyebAppName = "planifiweb-platform",
    [string]$KoyebServiceName = "planifiweb-api",
    [string]$KoyebRegion = "was",
    [string]$GatewayUrl = "https://planifiweb.guidojh.pro",
    [string]$PlanifiwebAppUrl = "https://app.planifiweb.guidojh.pro",
    [string]$BackendPath = "backend",
    [string]$KoyebCliPath = ".local/koyeb-cli/koyeb.exe"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$PSNativeCommandUseErrorActionPreference = $false

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function New-RandomAlphaNumeric([int]$Length) {
    $alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    $chars = New-Object char[] $Length
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()

    for ($i = 0; $i -lt $Length; $i++) {
        $chars[$i] = $alphabet[$bytes[$i] % $alphabet.Length]
    }

    return -join $chars
}

function New-RandomSecret {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Invoke-SupabaseApi {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        $Body = $null
    )

    if (-not $SupabaseToken) {
        throw "Define SUPABASE_ACCESS_TOKEN antes de ejecutar este script."
    }

    $headers = @{
        Authorization = "Bearer $SupabaseToken"
        apikey        = $SupabaseToken
    }

    if ($Body -ne $null) {
        $headers["Content-Type"] = "application/json"
    }

    return Invoke-RestMethod -Method $Method -Uri "https://api.supabase.com$Path" -Headers $headers -Body $Body
}

function Ensure-KoyebCli {
    param([Parameter(Mandatory = $true)][string]$CliPath)

    if (Test-Path $CliPath) {
        return (Resolve-Path $CliPath).Path
    }

    Write-Step "Descargando Koyeb CLI"
    $cliDir = Split-Path -Parent $CliPath
    New-Item -ItemType Directory -Path $cliDir -Force | Out-Null
    $zipPath = Join-Path $cliDir "koyeb-cli.zip"

    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/koyeb/koyeb-cli/releases/latest" -Headers @{ "User-Agent" = "codex" }
    $asset = $release.assets | Where-Object { $_.name -like "*windows_amd64.zip" } | Select-Object -First 1
    if (-not $asset) {
        throw "No se encontro un binario Windows de Koyeb CLI."
    }

    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $cliDir -Force
    if (-not (Test-Path $CliPath)) {
        throw "No se pudo instalar Koyeb CLI en $CliPath"
    }

    return (Resolve-Path $CliPath).Path
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $stdoutPath = Join-Path $koyebStateDir "native.stdout.log"
    $stderrPath = Join-Path $koyebStateDir "native.stderr.log"
    if (Test-Path $stdoutPath) { Remove-Item $stdoutPath -Force }
    if (Test-Path $stderrPath) { Remove-Item $stderrPath -Force }

    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $FilePath
    $psi.Arguments = ($Arguments | ForEach-Object {
        if ($_ -match '[\s"]') {
            '"' + ($_.Replace('"', '\"')) + '"'
        } else {
            $_
        }
    }) -join ' '
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    return [pscustomobject]@{
        ExitCode = $process.ExitCode
        StdOut   = $stdout
        StdErr   = $stderr
    }
}

function Invoke-KoyebJson {
    param(
        [Parameter(Mandatory = $true)][string]$CliPath,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $result = Invoke-NativeCommand -FilePath $CliPath -Arguments $Arguments
    if ($result.ExitCode -ne 0) {
        throw "Koyeb CLI fallo: $($result.StdOut)$($result.StdErr)"
    }

    return $result.StdOut | ConvertFrom-Json
}

function Get-HostFromUrl([Parameter(Mandatory = $true)][string]$Url) {
    return ([Uri]$Url).Host
}

if (-not $KoyebToken) {
    throw "Define KOYEB_API_TOKEN antes de ejecutar este script."
}

$koyebCli = Ensure-KoyebCli -CliPath $KoyebCliPath

$supabaseStateDir = Join-Path $PWD ".local\supabase"
$koyebStateDir = Join-Path $PWD ".local\koyeb"
New-Item -ItemType Directory -Path $supabaseStateDir -Force | Out-Null
New-Item -ItemType Directory -Path $koyebStateDir -Force | Out-Null

Write-Step "Resolviendo organizacion de Supabase"
if (-not $SupabaseOrganizationId) {
    $organizations = Invoke-SupabaseApi -Method Get -Path "/v1/organizations"
    $organization = $organizations | Select-Object -First 1
    if (-not $organization) {
        throw "No se encontro ninguna organizacion en Supabase."
    }
    $SupabaseOrganizationId = $organization.id
}

$passwordPath = Join-Path $supabaseStateDir "$SupabaseProjectName.db-password.txt"
$supabaseProjects = Invoke-SupabaseApi -Method Get -Path "/v1/projects"
$supabaseProject = $supabaseProjects | Where-Object { $_.name -eq $SupabaseProjectName } | Select-Object -First 1

if (-not $supabaseProject) {
    Write-Step "Creando proyecto Supabase '$SupabaseProjectName'"
    if (-not $DatabasePassword) {
        $DatabasePassword = New-RandomAlphaNumeric -Length 24
    }

    $supabaseCreateBody = @{
        organization_id = $SupabaseOrganizationId
        name            = $SupabaseProjectName
        db_pass         = $DatabasePassword
        region          = $SupabaseRegion
        plan            = "free"
    } | ConvertTo-Json -Compress

    $supabaseProject = Invoke-SupabaseApi -Method Post -Path "/v1/projects" -Body $supabaseCreateBody
    Set-Content -Path $passwordPath -Value $DatabasePassword
} elseif (-not $DatabasePassword) {
    if (Test-Path $passwordPath) {
        $DatabasePassword = (Get-Content $passwordPath -Raw).Trim()
    } else {
        throw "Existe el proyecto Supabase '$SupabaseProjectName', pero falta la contraseña. Define SUPABASE_DATABASE_PASSWORD o restaura $passwordPath."
    }
}

if (-not (Test-Path $passwordPath)) {
    Set-Content -Path $passwordPath -Value $DatabasePassword
}

Write-Step "Cargando metadata del proyecto Supabase"
$supabaseProject = Invoke-SupabaseApi -Method Get -Path "/v1/projects/$($supabaseProject.ref)"
$databasePasswordEncoded = [System.Uri]::EscapeDataString($DatabasePassword)
$databaseHost = $supabaseProject.database.host
$databaseUrl = "postgresql://postgres:${databasePasswordEncoded}@${databaseHost}:5432/postgres?sslmode=require"

$supabaseState = [ordered]@{
    generated_at     = (Get-Date).ToString("s")
    organization_id  = $SupabaseOrganizationId
    project_ref      = $supabaseProject.ref
    project_name     = $supabaseProject.name
    project_region   = $supabaseProject.region
    project_status   = $supabaseProject.status
    database_host    = $databaseHost
    database_url     = $databaseUrl
    password_file    = $passwordPath
}
$supabaseStatePath = Join-Path $supabaseStateDir "bootstrap-state.json"
$supabaseState | ConvertTo-Json -Depth 6 | Set-Content -Path $supabaseStatePath

$secretPath = Join-Path $koyebStateDir "secret-key.txt"
if (Test-Path $secretPath) {
    $secretKey = (Get-Content $secretPath -Raw).Trim()
} else {
    $secretKey = New-RandomSecret
    Set-Content -Path $secretPath -Value $secretKey
}

$gatewayHost = Get-HostFromUrl -Url $GatewayUrl

$envLines = @(
    "APP_ENV=production"
    "SECRET_KEY=$secretKey"
    "DATABASE_URL=$databaseUrl"
    "CORS_ORIGINS=$GatewayUrl;$PlanifiwebAppUrl"
    "TRUSTED_HOSTS=$gatewayHost;{{ KOYEB_PUBLIC_DOMAIN }}"
    "API_DOCS_ENABLED=false"
    "ACCESS_TOKEN_EXPIRE_MINUTES=1440"
    "SQL_ECHO=false"
    "REDIS_URL="
    "ALLOWED_EMAIL_DOMAINS="
    ""
    "SESSION_COOKIE_NAME=planifiweb_session"
    "SESSION_COOKIE_SECURE=true"
    "SESSION_COOKIE_SAMESITE=lax"
    "SESSION_COOKIE_DOMAIN="
    ""
    "LEGAL_TERMS_VERSION=2026-03-19"
    "LEGAL_PRIVACY_VERSION=2026-03-19"
    ""
    "MAX_RECEIPT_FILE_MB=5"
    "ALLOWED_RECEIPT_CONTENT_TYPES=image/jpeg;image/png;image/webp"
    "LOCAL_UPLOAD_DIR=uploads/receipts"
    "RECEIPT_URL_TTL_SECONDS=300"
    ""
    "PAYMENT_PRECHECK_ENABLED=false"
    "PAYMENT_VISION_PROVIDER=disabled"
    "PAYMENT_VISION_MODEL="
    "PAYMENT_VISION_API_KEY="
    "PAYMENT_VISION_BASE_URL="
    "PAYMENT_VISION_TIMEOUT_SECONDS=25"
    "PAYMENT_YAPE_DESTINATION_NAME_MASKED=Guido Jar*"
    "PAYMENT_YAPE_PHONE_LAST3=929"
    "PAYMENT_AMOUNT_TOLERANCE=0.01"
    ""
    "S3_ENDPOINT_URL="
    "S3_REGION=us-east-1"
    "S3_BUCKET="
    "S3_ACCESS_KEY_ID="
    "S3_SECRET_ACCESS_KEY="
    "S3_PUBLIC_BASE_URL="
    ""
    "AI_PROVIDER=groq"
    "AI_PROVIDER_CHAIN=groq;openrouter"
    "AI_TIMEOUT_SECONDS=60"
    "PUBLIC_APP_URL=$GatewayUrl"
    ""
    "AI_MODEL="
    "AI_API_KEY="
    "AI_BASE_URL="
    ""
    "GROQ_API_KEY="
    "GROQ_MODEL=llama-3.1-8b-instant"
    "GROQ_BASE_URL=https://api.groq.com/openai/v1"
    ""
    "OPENROUTER_API_KEYS="
    "OPENROUTER_MODEL=openrouter/free"
    "OPENROUTER_BASE_URL=https://openrouter.ai/api/v1"
)

$envOutputPath = Join-Path $koyebStateDir "planifiweb-api.env.generated"
$envLines | Set-Content -Path $envOutputPath

Write-Step "Preparando staging limpio del backend"
$backendSourcePath = Join-Path $PWD $BackendPath
$backendDeployPath = Join-Path $koyebStateDir "backend-deploy"
if (Test-Path $backendDeployPath) {
    cmd /c rd /s /q "$backendDeployPath" | Out-Null
}
New-Item -ItemType Directory -Path $backendDeployPath -Force | Out-Null
$excludedDirectories = @("venv", "uploads", ".pytest_cache", ".pytest-tmp")
$excludedFiles = @(".env", "app.db", "app.db.pre_integration.bak")

Get-ChildItem -Force $backendSourcePath | ForEach-Object {
    if ($_.PSIsContainer) {
        if ($excludedDirectories -contains $_.Name) {
            return
        }
    } elseif ($excludedFiles -contains $_.Name) {
        return
    }

    Copy-Item -Path $_.FullName -Destination (Join-Path $backendDeployPath $_.Name) -Recurse -Force
}

Write-Step "Creando app Koyeb si hace falta"
$apps = Invoke-KoyebJson -CliPath $koyebCli -Arguments @("apps", "list", "--token", $KoyebToken, "-o", "json")
$app = $apps.apps | Where-Object { $_.name -eq $KoyebAppName } | Select-Object -First 1
if (-not $app) {
    $app = Invoke-KoyebJson -CliPath $koyebCli -Arguments @("apps", "create", $KoyebAppName, "--delete-when-empty", "--token", $KoyebToken, "-o", "json")
}

Write-Step "Desplegando backend en Koyeb"
$deployArgs = @(
    "deploy", $backendDeployPath, "$KoyebAppName/$KoyebServiceName",
    "--token", $KoyebToken,
    "--archive-builder", "buildpack",
    "--archive-buildpack-run-command", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port `$PORT",
    "--instance-type", "nano",
    "--regions", $KoyebRegion,
    "--ports", "8000:http",
    "--routes", "/:8000",
    "--checks", "8000:tcp",
    "--checks-grace-period", "8000=90",
    "--env", "APP_ENV=production",
    "--env", "SECRET_KEY=$secretKey",
    "--env", "DATABASE_URL=$databaseUrl",
    "--env", "CORS_ORIGINS=$GatewayUrl;$PlanifiwebAppUrl",
    "--env", "TRUSTED_HOSTS=$gatewayHost;{{ KOYEB_PUBLIC_DOMAIN }}",
    "--env", "API_DOCS_ENABLED=false",
    "--env", "ACCESS_TOKEN_EXPIRE_MINUTES=1440",
    "--env", "SQL_ECHO=false",
    "--env", "REDIS_URL=",
    "--env", "ALLOWED_EMAIL_DOMAINS=",
    "--env", "SESSION_COOKIE_NAME=planifiweb_session",
    "--env", "SESSION_COOKIE_SECURE=true",
    "--env", "SESSION_COOKIE_SAMESITE=lax",
    "--env", "SESSION_COOKIE_DOMAIN=",
    "--env", "LEGAL_TERMS_VERSION=2026-03-19",
    "--env", "LEGAL_PRIVACY_VERSION=2026-03-19",
    "--env", "MAX_RECEIPT_FILE_MB=5",
    "--env", "ALLOWED_RECEIPT_CONTENT_TYPES=image/jpeg;image/png;image/webp",
    "--env", "LOCAL_UPLOAD_DIR=uploads/receipts",
    "--env", "RECEIPT_URL_TTL_SECONDS=300",
    "--env", "PAYMENT_PRECHECK_ENABLED=false",
    "--env", "PAYMENT_VISION_PROVIDER=disabled",
    "--env", "PAYMENT_VISION_MODEL=",
    "--env", "PAYMENT_VISION_API_KEY=",
    "--env", "PAYMENT_VISION_BASE_URL=",
    "--env", "PAYMENT_VISION_TIMEOUT_SECONDS=25",
    "--env", "PAYMENT_YAPE_DESTINATION_NAME_MASKED=Guido Jar*",
    "--env", "PAYMENT_YAPE_PHONE_LAST3=929",
    "--env", "PAYMENT_AMOUNT_TOLERANCE=0.01",
    "--env", "S3_ENDPOINT_URL=",
    "--env", "S3_REGION=us-east-1",
    "--env", "S3_BUCKET=",
    "--env", "S3_ACCESS_KEY_ID=",
    "--env", "S3_SECRET_ACCESS_KEY=",
    "--env", "S3_PUBLIC_BASE_URL=",
    "--env", "AI_PROVIDER=groq",
    "--env", "AI_PROVIDER_CHAIN=groq;openrouter",
    "--env", "AI_TIMEOUT_SECONDS=60",
    "--env", "PUBLIC_APP_URL=$GatewayUrl",
    "--env", "AI_MODEL=",
    "--env", "AI_API_KEY=",
    "--env", "AI_BASE_URL=",
    "--env", "GROQ_API_KEY=",
    "--env", "GROQ_MODEL=llama-3.1-8b-instant",
    "--env", "GROQ_BASE_URL=https://api.groq.com/openai/v1",
    "--env", "OPENROUTER_API_KEYS=",
    "--env", "OPENROUTER_MODEL=openrouter/free",
    "--env", "OPENROUTER_BASE_URL=https://openrouter.ai/api/v1",
    "--wait",
    "--wait-timeout", "15m"
)

$deployResult = Invoke-NativeCommand -FilePath $koyebCli -Arguments $deployArgs
if ($deployResult.ExitCode -ne 0) {
    throw "Koyeb deploy fallo: $($deployResult.StdOut)$($deployResult.StdErr)"
}

$service = Invoke-KoyebJson -CliPath $koyebCli -Arguments @("services", "get", $KoyebServiceName, "--app", $KoyebAppName, "--token", $KoyebToken, "-o", "json")
$publicDomain = $null
if ($service.PSObject.Properties.Name -contains "domains" -and $service.domains) {
    $publicDomain = ($service.domains | Select-Object -First 1).domain
} else {
    $apps = Invoke-KoyebJson -CliPath $koyebCli -Arguments @("apps", "list", "--token", $KoyebToken, "-o", "json")
    $app = $apps.apps | Where-Object { $_.name -eq $KoyebAppName } | Select-Object -First 1
    if ($app -and $app.domains) {
        $publicDomain = ($app.domains | Select-Object -First 1).name
    }
}

$koyebState = [ordered]@{
    generated_at   = (Get-Date).ToString("s")
    app_name       = $KoyebAppName
    service_name   = $KoyebServiceName
    public_domain  = $publicDomain
    backend_url    = if ($publicDomain) { "https://$publicDomain" } else { $null }
    database_url   = $databaseUrl
    env_file       = $envOutputPath
    secret_key_file = $secretPath
}
$koyebStatePath = Join-Path $koyebStateDir "bootstrap-state.json"
$koyebState | ConvertTo-Json -Depth 6 | Set-Content -Path $koyebStatePath

Write-Step "Bootstrap de Koyeb listo"
Write-Host "Supabase: $($supabaseProject.ref)" -ForegroundColor Green
Write-Host "Koyeb app: $KoyebAppName" -ForegroundColor Green
Write-Host "Koyeb service: $KoyebServiceName" -ForegroundColor Green
if ($publicDomain) {
    Write-Host "Backend URL: https://$publicDomain" -ForegroundColor Green
}
Write-Host "Entorno generado: $envOutputPath" -ForegroundColor Green
