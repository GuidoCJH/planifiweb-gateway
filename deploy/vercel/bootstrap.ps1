[CmdletBinding()]
param(
    [string]$VercelToken = $env:VERCEL_TOKEN,
    [string]$VercelScope = $(if ($env:VERCEL_SCOPE) { $env:VERCEL_SCOPE } else { "guidocjhs-projects" }),
    [string]$VercelTeamId = $(if ($env:VERCEL_TEAM_ID) { $env:VERCEL_TEAM_ID } else { "team_jpUw1TTw5WVpCATjxuHY7g5F" }),
    [string]$GatewayProject = "planifiweb-gateway",
    [string]$AppProject = "planifiweb-app",
    [string]$GatewayDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\frontend")).Path,
    [string]$AppDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\PLANIFIWEB")).Path,
    [string]$GatewaySiteUrl = "https://planifiweb-gateway.vercel.app",
    [string]$AppSiteUrl = "https://planifiweb-app.vercel.app",
    [string]$ApiProxyTarget = "https://planifiweb-api.seenode.com",
    [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-VercelApi {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        $Body = $null
    )

    $headers = @{
        Authorization = "Bearer $VercelToken"
    }

    if ($Body -ne $null) {
        $headers["Content-Type"] = "application/json"
    }

    $uri = "https://api.vercel.com$Path"
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $Body
}

function Get-VercelProject([string]$Name) {
    $response = Invoke-VercelApi -Method Get -Path "/v9/projects?teamId=$VercelTeamId"
    return $response.projects | Where-Object { $_.name -eq $Name } | Select-Object -First 1
}

function Upsert-VercelEnv {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectId,
        [Parameter(Mandatory = $true)][string]$Key,
        [AllowEmptyString()][string]$Value
    )

    $body = @{
        key = $Key
        value = $Value
        type = "encrypted"
        target = @("production")
    } | ConvertTo-Json -Compress

    Invoke-VercelApi -Method Post -Path "/v10/projects/$ProjectId/env?teamId=$VercelTeamId&upsert=true" -Body $body | Out-Null
}

function Invoke-VercelCli {
    param(
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    Push-Location $WorkingDirectory
    try {
        & npx vercel @Arguments --token $VercelToken --scope $VercelScope
        if ($LASTEXITCODE -ne 0) {
            throw "El comando de Vercel fallo en $WorkingDirectory."
        }
    }
    finally {
        Pop-Location
    }
}

if (-not $VercelToken) {
    throw "Define VERCEL_TOKEN antes de ejecutar este script."
}

if (-not (Test-Path $GatewayDir)) {
    throw "No existe el directorio del gateway: $GatewayDir"
}

if (-not (Test-Path $AppDir)) {
    throw "No existe el directorio de PLANIFIWEB: $AppDir"
}

$gatewayEnv = [ordered]@{
    NEXT_PUBLIC_API_URL = "/api"
    NEXT_PUBLIC_SITE_URL = $GatewaySiteUrl
    NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS = ""
    API_PROXY_TARGET = $ApiProxyTarget
    APP_PROXY_TARGET = $AppSiteUrl
}

$appEnv = [ordered]@{
    VITE_API_BASE_URL = "/api"
    VITE_APP_PUBLIC_URL = "$GatewaySiteUrl/app"
}

Write-Step "Verificando proyectos Vercel"
$gateway = Get-VercelProject -Name $GatewayProject
$app = Get-VercelProject -Name $AppProject

if (-not $gateway) {
    throw "No existe el proyecto Vercel '$GatewayProject'. Crealo primero o importa el repo y vuelve a ejecutar el script."
}

if (-not $app) {
    throw "No existe el proyecto Vercel '$AppProject'. Crealo primero o importa el repo y vuelve a ejecutar el script."
}

Write-Step "Sincronizando variables del gateway"
foreach ($entry in $gatewayEnv.GetEnumerator()) {
    Upsert-VercelEnv -ProjectId $gateway.id -Key $entry.Key -Value $entry.Value
}

Write-Step "Sincronizando variables de PLANIFIWEB"
foreach ($entry in $appEnv.GetEnumerator()) {
    Upsert-VercelEnv -ProjectId $app.id -Key $entry.Key -Value $entry.Value
}

if (-not $SkipDeploy) {
    Write-Step "Vinculando y desplegando gateway"
    Invoke-VercelCli -WorkingDirectory $GatewayDir -Arguments @("link", "--yes", "--project", $GatewayProject)
    Invoke-VercelCli -WorkingDirectory $GatewayDir -Arguments @("deploy", "--prod", "--yes")

    Write-Step "Vinculando y desplegando PLANIFIWEB"
    Invoke-VercelCli -WorkingDirectory $AppDir -Arguments @("link", "--yes", "--project", $AppProject)
    Invoke-VercelCli -WorkingDirectory $AppDir -Arguments @("deploy", "--prod", "--yes")
}

Write-Step "Ejecutando smoke checks HTTP"
$checks = @(
    @{ Name = "Gateway /"; Url = $GatewaySiteUrl },
    @{ Name = "Gateway /app/dashboard"; Url = "$GatewaySiteUrl/app/dashboard" },
    @{ Name = "PLANIFIWEB standalone"; Url = "$AppSiteUrl/app/dashboard" }
)

$results = foreach ($check in $checks) {
    try {
        $response = Invoke-WebRequest -Uri $check.Url -MaximumRedirection 5
        [pscustomobject]@{
            name = $check.Name
            url = $check.Url
            status = [int]$response.StatusCode
        }
    }
    catch {
        [pscustomobject]@{
            name = $check.Name
            url = $check.Url
            status = "FAILED"
        }
    }
}

$apiStatus = $null
try {
    $apiResponse = Invoke-WebRequest -Uri "$GatewaySiteUrl/api/auth/me" -MaximumRedirection 0
    $apiStatus = [int]$apiResponse.StatusCode
}
catch {
    if ($_.Exception.Response) {
        $apiStatus = [int]$_.Exception.Response.StatusCode
    }
    else {
        $apiStatus = "FAILED"
    }
}

$stateDir = Join-Path $PWD ".local\vercel"
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

$state = [ordered]@{
    generated_at = (Get-Date).ToString("s")
    team_id = $VercelTeamId
    scope = $VercelScope
    gateway = @{
        project_id = $gateway.id
        site_url = $GatewaySiteUrl
        env = $gatewayEnv
    }
    app = @{
        project_id = $app.id
        site_url = $AppSiteUrl
        env = $appEnv
    }
    checks = $results
    api_auth_me_status = $apiStatus
}

$state | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $stateDir "bootstrap-state.json")

Write-Step "Bootstrap de Vercel finalizado"
$results | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "GET $GatewaySiteUrl/api/auth/me -> $apiStatus"
Write-Host "Estado guardado en .local\\vercel\\bootstrap-state.json"
