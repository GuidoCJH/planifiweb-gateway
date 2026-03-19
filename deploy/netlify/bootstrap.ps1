[CmdletBinding()]
param(
    [string]$NetlifyToken = $env:NETLIFY_AUTH_TOKEN,
    [string]$AccountSlug = "guidocjh",
    [string]$HubSiteName = "guidojh-root",
    [string]$GatewaySiteName = "planifiweb-gateway",
    [string]$AppSiteName = "planifiweb-app"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-NetlifyJson {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $output = & npx netlify @Arguments --auth $NetlifyToken 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Netlify CLI fallo: $($output -join [Environment]::NewLine)"
    }

    return ($output -join [Environment]::NewLine) | ConvertFrom-Json
}

function Get-OrCreateSite {
    param(
        [Parameter(Mandatory = $true)][string]$SiteName
    )

    $existing = $script:Sites | Where-Object { $_.name -eq $SiteName } | Select-Object -First 1
    if ($existing) {
        return $existing
    }

    Write-Step "Creando site Netlify '$SiteName'"
    & npx netlify sites:create `
        --disable-linking `
        --account-slug $AccountSlug `
        --name $SiteName `
        --auth $NetlifyToken | Out-Host

    if ($LASTEXITCODE -ne 0) {
        throw "Netlify CLI fallo creando el site '$SiteName'."
    }

    $script:Sites = Invoke-NetlifyJson -Arguments @("sites:list", "--json")
    $created = $script:Sites | Where-Object { $_.name -eq $SiteName } | Select-Object -First 1
    if (-not $created) {
        throw "No se pudo recuperar el site '$SiteName' despues de crearlo."
    }

    return $created
}

if (-not $NetlifyToken) {
    throw "Define NETLIFY_AUTH_TOKEN antes de ejecutar este script."
}

Write-Step "Leyendo sites actuales de Netlify"
$script:Sites = Invoke-NetlifyJson -Arguments @("sites:list", "--json")

$hub = Get-OrCreateSite -SiteName $HubSiteName
$gateway = Get-OrCreateSite -SiteName $GatewaySiteName
$app = Get-OrCreateSite -SiteName $AppSiteName

$stateDir = Join-Path $PWD ".local\netlify"
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

$state = [ordered]@{
    generated_at = (Get-Date).ToString("s")
    account_slug = $AccountSlug
    sites = @(
        [ordered]@{ role = "hub"; name = $hub.name; id = $hub.id; default_domain = $hub.default_domain; admin_url = $hub.admin_url },
        [ordered]@{ role = "gateway"; name = $gateway.name; id = $gateway.id; default_domain = $gateway.default_domain; admin_url = $gateway.admin_url },
        [ordered]@{ role = "app"; name = $app.name; id = $app.id; default_domain = $app.default_domain; admin_url = $app.admin_url }
    )
    porkbun_records = @(
        [ordered]@{ type = "ALIAS"; host = "@"; target = "apex-loadbalancer.netlify.com"; purpose = "guidojh.pro" },
        [ordered]@{ type = "CNAME"; host = "www"; target = $hub.default_domain; purpose = "www.guidojh.pro" },
        [ordered]@{ type = "CNAME"; host = "planifiweb"; target = $gateway.default_domain; purpose = "planifiweb.guidojh.pro" },
        [ordered]@{ type = "CNAME"; host = "app.planifiweb"; target = $app.default_domain; purpose = "app.planifiweb.guidojh.pro" }
    )
} 

$statePath = Join-Path $stateDir "bootstrap-state.json"
$state | ConvertTo-Json -Depth 6 | Set-Content -Path $statePath

Write-Step "Sites listos"
$state.sites | Format-Table role, name, default_domain, admin_url -AutoSize

Write-Host ""
Write-Host "DNS para Porkbun:" -ForegroundColor Yellow
$state.porkbun_records | Format-Table type, host, target, purpose -AutoSize

Write-Host ""
Write-Host "Estado guardado en .local\\netlify\\bootstrap-state.json" -ForegroundColor Green
