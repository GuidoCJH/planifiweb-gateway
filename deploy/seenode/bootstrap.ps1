[CmdletBinding()]
param(
    [string]$SeenodeToken = $env:SEENODE_TOKEN,
    [string]$ProjectName = "planifiweb-platform",
    [string]$DatabaseName = "planifiweb-platform-db",
    [string]$AppName = "planifiweb-api",
    [string]$GatewayUrl = "https://planifiweb-gateway.vercel.app",
    [string]$PlanifiwebAppUrl = "https://planifiweb-app.vercel.app",
    [string]$ApiHost = "planifiweb-api.seenode.com",
    [string]$GitRepository = "GuidoCJH/planifiweb-gateway",
    [string]$GitBranch = "main",
    [string]$GitCommitSha = (git rev-parse HEAD).Trim(),
    [switch]$SkipAppCreation
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-SeenodeApi {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        $Body = $null
    )

    $headers = @{
        Authorization = "Bearer $SeenodeToken"
    }

    if ($Body -ne $null) {
        $headers["Content-Type"] = "application/json"
    }

    return Invoke-RestMethod -Method $Method -Uri "https://api.seenode.com$Path" -Headers $headers -Body $Body
}

function Convert-EnvLinesToSeenodePayload {
    param(
        [Parameter(Mandatory = $true)][object[]]$Lines
    )

    $variables = New-Object System.Collections.Generic.List[object]

    foreach ($line in $Lines) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $trimmed = $line.Trim()
        if ($trimmed.StartsWith("#")) {
            continue
        }

        $separatorIndex = $trimmed.IndexOf("=")
        if ($separatorIndex -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $separatorIndex).Trim()
        $value = $trimmed.Substring($separatorIndex + 1)

        if (-not [string]::IsNullOrWhiteSpace($key)) {
            $variables.Add([ordered]@{
                key = $key
                value = $value
            })
        }
    }

    return @{
        environmentVariables = $variables
    } | ConvertTo-Json -Depth 4 -Compress
}

function New-RandomSecret {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

if (-not $SeenodeToken) {
    throw "Define SEENODE_TOKEN antes de ejecutar este script."
}

Write-Step "Consultando workspace de SeeNode"
$teams = Invoke-SeenodeApi -Method Get -Path "/v1/teams"
$team = $teams.teams | Select-Object -First 1

if (-not $team) {
    throw "No se encontro ningun workspace en SeeNode."
}

Write-Step "Resolviendo proyecto y base PostgreSQL"
$projects = Invoke-SeenodeApi -Method Get -Path "/v1/projects"
$project = $projects.projects | Where-Object { $_.name -eq $ProjectName } | Select-Object -First 1
if (-not $project) {
    throw "No existe el proyecto '$ProjectName' en SeeNode. Crealo una vez en el dashboard y vuelve a ejecutar el script."
}

$databases = Invoke-SeenodeApi -Method Get -Path "/v1/databases"
$database = $databases.databases | Where-Object { $_.projectId -eq $project.id } | Select-Object -First 1
if (-not $database) {
    throw "No existe una base PostgreSQL asociada al proyecto '$ProjectName'. Creala una vez en el dashboard y vuelve a ejecutar el script."
}

$connection = Invoke-SeenodeApi -Method Get -Path "/v1/databases/$($database.id)/connection-details"
$dbUser = $connection.connectionDetails.user
$dbPassword = $connection.connectionDetails.password
$dbHost = $connection.connectionDetails.host
$dbPort = $connection.connectionDetails.port
$databaseUrl = "postgresql://$dbUser`:$dbPassword@$dbHost`:$dbPort/$dbUser"

$seenodeStateDir = Join-Path $PWD ".local\seenode"
New-Item -ItemType Directory -Path $seenodeStateDir -Force | Out-Null

$secretPath = Join-Path $seenodeStateDir "secret-key.txt"
if (Test-Path $secretPath) {
    $secretKey = (Get-Content $secretPath -Raw).Trim()
} else {
    $secretKey = New-RandomSecret
    Set-Content -Path $secretPath -Value $secretKey
}

Write-Step "Comprobando autorizacion GitHub del workspace"
$githubAuth = Invoke-SeenodeApi -Method Get -Path "/v1/github/authorized"
$oauth = Invoke-SeenodeApi -Method Get -Path "/v1/github/oauth/auth"
$applications = Invoke-SeenodeApi -Method Get -Path "/v1/applications"
$app = $applications.applications | Where-Object { $_.customName -eq $AppName -or $_.name -eq $AppName } | Select-Object -First 1

$state = [ordered]@{
    generated_at = (Get-Date).ToString("s")
    workspace = @{
        id = $team.id
        name = $team.name
    }
    project = @{
        id = $project.id
        name = $project.name
    }
    database = @{
        id = $database.id
        name = $database.name
        state = $database.state
        database_url = $databaseUrl
    }
    github = @{
        authorized = [bool]$githubAuth.authorized
        oauth_url = $oauth.auth_url
    }
    application = if ($app) {
        @{
            id = $app.id
            name = $app.customName
        }
    } else {
        $null
    }
}

$state | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $seenodeStateDir "bootstrap-state.json")

if (-not $githubAuth.authorized) {
    Write-Warning "SeeNode aun no puede leer GitHub en este workspace. Abre esta URL, autoriza y luego vuelve a ejecutar el script:"
    Write-Host $oauth.auth_url -ForegroundColor Yellow
    Write-Host "Se genero el archivo $envOutputPath con el entorno productivo del backend."
    return
}

if ($SkipAppCreation) {
    Write-Host "GitHub ya esta autorizado. Se omitio la creacion de la app por el flag -SkipAppCreation."
    return
}

if (-not $app) {
    Write-Step "Creando la aplicacion FastAPI en SeeNode"
    $body = @{
        projectId = $project.id
        packageId = 12
        runtime = "python"
        customName = $AppName
        buildCommand = "cd backend && pip install -r requirements.txt"
        runCommand = "cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 80"
        gitProvider = "github"
        gitRepository = $GitRepository
        gitBranch = $GitBranch
        gitCommitSha = $GitCommitSha
    } | ConvertTo-Json -Compress

    try {
        $app = Invoke-SeenodeApi -Method Post -Path "/v1/applications" -Body $body
    }
    catch {
        Write-Warning "La aplicacion no pudo crearse automaticamente. Revisa bootstrap-state.json y usa el mismo payload cuando GitHub quede totalmente enlazado en SeeNode."
        throw
    }
}

$defaultAppHost = $null
if ($app.PSObject.Properties.Name -contains "name" -and $app.PSObject.Properties.Name -contains "platform" -and $app.platform.host) {
    $defaultAppHost = "$($app.name).$($app.platform.host)"
}

$trustedHosts = @($ApiHost)
if ($defaultAppHost) {
    $trustedHosts += $defaultAppHost
}
$trustedHosts = $trustedHosts | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique

$envLines = @(
    "APP_ENV=production"
    "SECRET_KEY=$secretKey"
    "DATABASE_URL=$databaseUrl"
    "CORS_ORIGINS=$GatewayUrl,$PlanifiwebAppUrl"
    "TRUSTED_HOSTS=$($trustedHosts -join ',')"
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
    "LEGAL_TERMS_VERSION=2026-03-14"
    "LEGAL_PRIVACY_VERSION=2026-03-14"
    ""
    "MAX_RECEIPT_FILE_MB=5"
    "ALLOWED_RECEIPT_CONTENT_TYPES=image/jpeg,image/png,image/webp"
    "LOCAL_UPLOAD_DIR=uploads/receipts"
    "RECEIPT_URL_TTL_SECONDS=300"
    ""
    "PAYMENT_PRECHECK_ENABLED=true"
    "PAYMENT_VISION_PROVIDER=openrouter"
    "PAYMENT_VISION_MODEL=google/gemini-2.0-flash-001"
    "PAYMENT_VISION_API_KEY="
    "PAYMENT_VISION_BASE_URL=https://openrouter.ai/api/v1"
    "PAYMENT_VISION_TIMEOUT_SECONDS=25"
    "PAYMENT_YAPE_DESTINATION_NAME_MASKED=Guido Jar*"
    "PAYMENT_YAPE_PHONE_LAST3=929"
    "PAYMENT_AMOUNT_TOLERANCE=0.01"
    ""
    "S3_ENDPOINT_URL="
    "S3_REGION=us-east-1"
    "S3_BUCKET=planifiweb-receipts"
    "S3_ACCESS_KEY_ID="
    "S3_SECRET_ACCESS_KEY="
    "S3_PUBLIC_BASE_URL="
    ""
    "AI_PROVIDER=groq"
    "AI_PROVIDER_CHAIN=groq,openrouter"
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

$envOutputPath = Join-Path $seenodeStateDir "planifiweb-api.env.generated"
$envLines | Set-Content -Path $envOutputPath
$environmentVariablesBody = Convert-EnvLinesToSeenodePayload -Lines $envLines

Write-Step "Sincronizando variables de entorno de la aplicacion"
try {
    Invoke-SeenodeApi -Method Put -Path "/v1/applications/$($app.id)/environment-variables" -Body $environmentVariablesBody | Out-Null
}
catch {
    Write-Warning "No se pudieron sincronizar automaticamente las variables de entorno en SeeNode."
    Write-Warning "Carga manualmente el archivo generado en: $envOutputPath"
    throw
}

Write-Step "Bootstrap de SeeNode preparado"
Write-Host "Proyecto: $($project.name) ($($project.id))"
Write-Host "Base: $($database.name) ($($database.id))"
$appDisplayName = if ($app.PSObject.Properties.Name -contains "customName" -and $app.customName) { $app.customName } else { $app.name }
Write-Host "Aplicacion: $appDisplayName ($($app.id))"
Write-Host "Archivo de entorno generado: $envOutputPath"
