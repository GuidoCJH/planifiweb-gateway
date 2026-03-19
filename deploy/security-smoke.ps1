param(
    [string]$GatewayUrl = "https://planifiweb.guidojh.pro",
    [string]$AppUrl = "https://app.planifiweb.guidojh.pro",
    [string]$BackendUrl = $(if ($env:PLANIFIWEB_BACKEND_URL) { $env:PLANIFIWEB_BACKEND_URL } else { "https://planifiweb-platform-guidojh-de66ea4f.koyeb.app" })
)

$ErrorActionPreference = "Stop"

function Assert-Status {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus
    )

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method Get
        $status = [int]$response.StatusCode
        $headers = $response.Headers
    }
    catch {
        if (-not $_.Exception.Response) {
            throw
        }

        $status = [int]$_.Exception.Response.StatusCode
        $headers = $_.Exception.Response.Headers
    }

    if ($status -ne $ExpectedStatus) {
        throw "$Name fallo: esperado $ExpectedStatus y se obtuvo $status en $Url"
    }

    [PSCustomObject]@{
        Name    = $Name
        Url     = $Url
        Status  = $status
        Headers = $headers
    }
}

$gatewayRoot = Assert-Status -Name "Gateway root" -Url $GatewayUrl -ExpectedStatus 200
$appRoot = Assert-Status -Name "App root" -Url $AppUrl -ExpectedStatus 200
$backendHealth = Assert-Status -Name "Backend /health" -Url "$BackendUrl/health" -ExpectedStatus 200
$backendReady = Assert-Status -Name "Backend /ready" -Url "$BackendUrl/ready" -ExpectedStatus 200
$docsCheck = Assert-Status -Name "Backend /docs" -Url "$BackendUrl/docs" -ExpectedStatus 404

$requiredGatewayHeaders = @(
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy"
)

foreach ($headerName in $requiredGatewayHeaders) {
    if (-not $gatewayRoot.Headers[$headerName]) {
        throw "Falta el header $headerName en $GatewayUrl"
    }
}

if ($gatewayRoot.Headers["x-powered-by"]) {
    throw "El gateway sigue exponiendo X-Powered-By"
}

if (-not $backendHealth.Headers["strict-transport-security"]) {
    throw "Falta Strict-Transport-Security en $BackendUrl/health"
}

Write-Host "Smoke de seguridad OK" -ForegroundColor Green
$gatewayRoot, $appRoot, $backendHealth, $backendReady, $docsCheck | Select-Object Name, Url, Status | Format-Table -AutoSize
