[CmdletBinding()]
param(
    [string]$KoyebToken = $env:KOYEB_API_TOKEN,
    [string]$SupabaseToken = $(if ($env:SUPABASE_ACCESS_TOKEN) { $env:SUPABASE_ACCESS_TOKEN } else { $env:SUPABASE_MCP_ACCESS_TOKEN }),
    [string]$SupabaseOrganizationId = $(if ($env:SUPABASE_ORGANIZATION_ID) { $env:SUPABASE_ORGANIZATION_ID } else { "lxaeeqnqjgkfylipmack" }),
    [string]$SupabaseProjectName = "planifiweb-platform-prod",
    [string]$SupabaseRegion = "us-east-1",
    [string]$AdminEmail = "jarahuamanguido2002@gmail.com",
    [string]$SourceDatabaseUrl = "postgresql://db_iacdf1zy3u9o:uoVvakL9SQRSfij57hQx83f0@up-de-fra1-postgresql-2.db.run-on-seenode.com:11550/db_iacdf1zy3u9o",
    [string]$KoyebAppName = "planifiweb-platform",
    [string]$KoyebServiceName = "planifiweb-api",
    [string]$KoyebCliPath = ".local/koyeb-cli/koyeb.exe",
    [string]$BackendPath = "backend"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-SupabaseApi {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        $Body = $null
    )

    if (-not $SupabaseToken) {
        throw "Define SUPABASE_ACCESS_TOKEN o SUPABASE_MCP_ACCESS_TOKEN."
    }

    $headers = @{
        Authorization = "Bearer $SupabaseToken"
        apikey        = $SupabaseToken
    }

    if ($Body -ne $null) {
        $headers["Content-Type"] = "application/json"
    }

    Invoke-RestMethod -Method $Method -Uri "https://api.supabase.com$Path" -Headers $headers -Body $Body
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
    -join $chars
}

function Invoke-KoyebJson {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $output = & $KoyebCliPath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Koyeb CLI fallo: $output"
    }
    ($output -join "`n" | ConvertFrom-Json)
}

if (-not $KoyebToken) {
    throw "Define KOYEB_API_TOKEN."
}

if (-not (Test-Path $KoyebCliPath)) {
    throw "No se encontro Koyeb CLI en $KoyebCliPath"
}

$supabaseStateDir = Join-Path $PWD ".local\supabase"
$koyebStateDir = Join-Path $PWD ".local\koyeb"
$migrationStateDir = Join-Path $PWD ".local\db-migration"
New-Item -ItemType Directory -Path $supabaseStateDir -Force | Out-Null
New-Item -ItemType Directory -Path $koyebStateDir -Force | Out-Null
New-Item -ItemType Directory -Path $migrationStateDir -Force | Out-Null

$projects = Invoke-SupabaseApi -Method Get -Path "/v1/projects"
$supabaseProject = $projects | Where-Object { $_.name -eq $SupabaseProjectName } | Select-Object -First 1
$databasePasswordPath = Join-Path $supabaseStateDir "$SupabaseProjectName.db-password.txt"

if (-not $supabaseProject) {
    Write-Step "Creando proyecto Supabase '$SupabaseProjectName'"
    $databasePassword = "Db" + (New-RandomAlphaNumeric -Length 24) + "!"
    $body = @{
        organization_id = $SupabaseOrganizationId
        name            = $SupabaseProjectName
        region          = $SupabaseRegion
        db_pass         = $databasePassword
        plan            = "free"
    } | ConvertTo-Json
    $supabaseProject = Invoke-SupabaseApi -Method Post -Path "/v1/projects" -Body $body
    Set-Content -Path $databasePasswordPath -Value $databasePassword -NoNewline
} else {
    if (-not (Test-Path $databasePasswordPath)) {
        throw "El proyecto Supabase ya existe, pero falta la contraseña en $databasePasswordPath"
    }
    $databasePassword = (Get-Content $databasePasswordPath -Raw).Trim()
}

Write-Step "Esperando estado saludable de Supabase"
for ($i = 0; $i -lt 60; $i++) {
    $supabaseProject = Invoke-SupabaseApi -Method Get -Path "/v1/projects/$($supabaseProject.ref)"
    if ($supabaseProject.status -eq "ACTIVE_HEALTHY" -and $supabaseProject.database.host) {
        break
    }
    Start-Sleep -Seconds 10
}

if (-not $supabaseProject.database.host) {
    throw "Supabase no entrego database.host para $SupabaseProjectName"
}
if ($supabaseProject.status -ne "ACTIVE_HEALTHY") {
    throw "Supabase no quedo saludable. Estado actual: $($supabaseProject.status)"
}

Write-Step "Resolviendo pooler de Supabase"
$poolers = Invoke-SupabaseApi -Method Get -Path "/v1/projects/$($supabaseProject.ref)/config/database/pooler"
$pooler = $poolers | Select-Object -First 1
if (-not $pooler -or -not $pooler.db_host -or -not $pooler.db_user) {
    throw "Supabase no devolvio configuracion util de pooler para $SupabaseProjectName"
}

$encodedPassword = [uri]::EscapeDataString($databasePassword)
# Usamos session mode en 5432 sobre el pooler para evitar el host directo IPv6 y no romper SQLAlchemy/Alembic.
$targetDatabaseUrl = "postgresql://$($pooler.db_user):$encodedPassword@$($pooler.db_host):5432/$($pooler.db_name)?sslmode=require"
$backupFile = Join-Path $migrationStateDir ("seenode-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
$rollbackPath = Join-Path $migrationStateDir "rollback-database-url.txt"
Set-Content -Path $rollbackPath -Value $SourceDatabaseUrl -NoNewline

Write-Step "Corriendo migraciones Alembic en Supabase"
$env:DATABASE_URL = $targetDatabaseUrl
Push-Location $BackendPath
try {
    & .\venv\Scripts\alembic.exe upgrade head
    if ($LASTEXITCODE -ne 0) {
        throw "Alembic fallo contra Supabase."
    }
}
finally {
    Pop-Location
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}

Write-Step "Migrando solo la cuenta admin y creando respaldo logico"
& .\backend\venv\Scripts\python.exe .\backend\scripts\migrate_admin_to_postgres.py `
    --source-url $SourceDatabaseUrl `
    --target-url $targetDatabaseUrl `
    --admin-email $AdminEmail `
    --backup-file $backupFile
if ($LASTEXITCODE -ne 0) {
    throw "La migracion admin-only fallo."
}

Write-Step "Repuntando Koyeb al nuevo DATABASE_URL"
& $KoyebCliPath services update "$KoyebAppName/$KoyebServiceName" --token $KoyebToken --env "DATABASE_URL=$targetDatabaseUrl" --wait --wait-timeout 15m
if ($LASTEXITCODE -ne 0) {
    throw "Koyeb no pudo actualizar DATABASE_URL."
}

$supabaseState = [ordered]@{
    generated_at     = (Get-Date).ToString("s")
    organization_id  = $SupabaseOrganizationId
    project_ref      = $supabaseProject.ref
    project_name     = $supabaseProject.name
    project_region   = $supabaseProject.region
    project_status   = $supabaseProject.status
    database_host    = $supabaseProject.database.host
    pooler_host      = $pooler.db_host
    pooler_user      = $pooler.db_user
    database_url     = $targetDatabaseUrl
    password_file    = $databasePasswordPath
    backup_file      = $backupFile
    rollback_db_file = $rollbackPath
}
$supabaseState | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $supabaseStateDir "bootstrap-state.json")

$koyebStatePath = Join-Path $koyebStateDir "bootstrap-state.json"
if (Test-Path $koyebStatePath) {
    $koyebState = Get-Content $koyebStatePath -Raw | ConvertFrom-Json
    $koyebState.database_url = $targetDatabaseUrl
    $koyebState.generated_at = (Get-Date).ToString("s")
    $koyebState | ConvertTo-Json -Depth 6 | Set-Content -Path $koyebStatePath
}

$envFilePath = Join-Path $koyebStateDir "planifiweb-api.env.generated"
if (Test-Path $envFilePath) {
    $lines = Get-Content $envFilePath
    $updated = $lines | ForEach-Object {
        if ($_ -match '^DATABASE_URL=') { "DATABASE_URL=$targetDatabaseUrl" } else { $_ }
    }
    Set-Content -Path $envFilePath -Value $updated
}

Write-Step "Corte de base de datos completado"
Write-Host "Supabase ref: $($supabaseProject.ref)" -ForegroundColor Green
Write-Host "Database URL activa actualizada en Koyeb." -ForegroundColor Green
Write-Host "Backup logico: $backupFile" -ForegroundColor Green
