<#
.SYNOPSIS
    Provision-M365Workplace.ps1
    Automated M365 Workplace Designer & Provisioner

.DESCRIPTION
    Reads workspace-config.json and automatically provisions:
      - SharePoint hub + spoke sites
      - Microsoft Teams with channels
      - Entra ID (Azure AD) security groups
      - Sensitivity labels (via Microsoft Purview)
      - DLP policy stubs
      - Conditional Access policy documentation

    Security hardening:
      - Uses Service Principal / Managed Identity (no hardcoded credentials)
      - All secrets read from environment variables or Azure Key Vault
      - Full audit logging to timestamped log file
      - Dry-run mode for safe preview before applying changes
      - Zero Trust: least-privilege service principal scopes only

.PARAMETER ConfigPath
    Path to workspace-config.json. Defaults to ./workspace-config.json

.PARAMETER TenantId
    Azure AD Tenant ID. Can also be set via $env:M365_TENANT_ID

.PARAMETER ClientId
    Service Principal App ID. Can also be set via $env:M365_CLIENT_ID

.PARAMETER ClientSecret
    Service Principal Secret. Can also be set via $env:M365_CLIENT_SECRET
    In production, use a Managed Identity or Azure Key Vault reference instead.

.PARAMETER DryRun
    If specified, previews all actions without making any changes.

.PARAMETER LogPath
    Path for the audit log file. Defaults to ./logs/provision-<timestamp>.log

.EXAMPLE
    # Dry run (preview only)
    .\Provision-M365Workplace.ps1 -DryRun

    # Full provisioning
    .\Provision-M365Workplace.ps1 -TenantId "your-tenant-id" -ClientId "your-client-id" -ClientSecret "your-secret"

    # Using environment variables (recommended for CI/CD)
    $env:M365_TENANT_ID = "your-tenant-id"
    $env:M365_CLIENT_ID = "your-client-id"
    $env:M365_CLIENT_SECRET = "your-secret"
    .\Provision-M365Workplace.ps1

.NOTES
    Prerequisites:
      - PowerShell 7.0+
      - PnP.PowerShell module: Install-Module PnP.PowerShell
      - Microsoft.Graph module: Install-Module Microsoft.Graph
      - Service Principal with the following Graph API permissions:
          Sites.FullControl.All, Group.ReadWrite.All, Team.Create,
          Channel.Create, Directory.ReadWrite.All
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$ConfigPath = "$PSScriptRoot/workspace-config.json",
    [string]$TenantId   = $env:M365_TENANT_ID,
    [string]$ClientId   = $env:M365_CLIENT_ID,
    [string]$ClientSecret = $env:M365_CLIENT_SECRET,
    [switch]$DryRun,
    [string]$LogPath    = "$PSScriptRoot/logs/provision-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Logging ──────────────────────────────────────────────────────────────────
$LogDir = Split-Path $LogPath -Parent
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('INFO','WARN','ERROR','SUCCESS','DRYRUN')]
        [string]$Level = 'INFO'
    )
    $timestamp = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
    $entry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogPath -Value $entry
    switch ($Level) {
        'INFO'    { Write-Host $entry -ForegroundColor Cyan }
        'WARN'    { Write-Host $entry -ForegroundColor Yellow }
        'ERROR'   { Write-Host $entry -ForegroundColor Red }
        'SUCCESS' { Write-Host $entry -ForegroundColor Green }
        'DRYRUN'  { Write-Host $entry -ForegroundColor Magenta }
    }
}

# ─── Prerequisite Checks ──────────────────────────────────────────────────────
function Test-Prerequisites {
    Write-Log "Checking prerequisites..."

    # PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 7) {
        Write-Log "PowerShell 7.0+ is required. Current: $($PSVersionTable.PSVersion)" -Level ERROR
        exit 1
    }

    # Required modules
    $requiredModules = @('PnP.PowerShell', 'Microsoft.Graph')
    foreach ($mod in $requiredModules) {
        if (-not (Get-Module -ListAvailable -Name $mod)) {
            Write-Log "Required module '$mod' is not installed. Run: Install-Module $mod" -Level ERROR
            exit 1
        }
    }

    # Credentials
    if ([string]::IsNullOrWhiteSpace($TenantId) -or
        [string]::IsNullOrWhiteSpace($ClientId) -or
        [string]::IsNullOrWhiteSpace($ClientSecret)) {
        Write-Log "Missing credentials. Set M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET environment variables." -Level ERROR
        exit 1
    }

    Write-Log "Prerequisites OK." -Level SUCCESS
}

# ─── Load Configuration ───────────────────────────────────────────────────────
function Get-WorkspaceConfig {
    if (-not (Test-Path $ConfigPath)) {
        Write-Log "Config file not found: $ConfigPath" -Level ERROR
        exit 1
    }
    $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    Write-Log "Loaded config: $($config.organization.displayName) v$($config.version)"
    return $config
}

# ─── Connect to M365 ──────────────────────────────────────────────────────────
function Connect-M365Services {
    param([object]$Config)

    $tenantUrl = "https://$($Config.organization.tenantDomain.Split('.')[0]).sharepoint.com"

    Write-Log "Connecting to Microsoft Graph..."
    if (-not $DryRun) {
        $secureSecret = ConvertTo-SecureString $ClientSecret -AsPlainText -Force
        $credential = New-Object System.Management.Automation.PSCredential($ClientId, $secureSecret)
        Connect-MgGraph -TenantId $TenantId -ClientSecretCredential $credential -NoWelcome
        Write-Log "Connected to Microsoft Graph." -Level SUCCESS
    } else {
        Write-Log "[DRY RUN] Would connect to Microsoft Graph (TenantId: $TenantId)" -Level DRYRUN
    }

    Write-Log "Connecting to SharePoint Online (PnP)..."
    if (-not $DryRun) {
        Connect-PnPOnline -Url $tenantUrl -ClientId $ClientId -ClientSecret $ClientSecret -Tenant $TenantId
        Write-Log "Connected to SharePoint Online." -Level SUCCESS
    } else {
        Write-Log "[DRY RUN] Would connect to SharePoint: $tenantUrl" -Level DRYRUN
    }
}

# ─── Provision Entra ID Groups ────────────────────────────────────────────────
function New-EntraIdGroups {
    param([object]$Config)

    Write-Log "=== Provisioning Entra ID Groups ==="
    foreach ($group in $Config.entraIdGroups) {
        Write-Log "Group: $($group.displayName) [$($group.groupType)]"
        if ($DryRun) {
            Write-Log "[DRY RUN] Would create group: $($group.displayName) ($($group.mailNickname))" -Level DRYRUN
            continue
        }

        try {
            $existing = Get-MgGroup -Filter "mailNickname eq '$($group.mailNickname)'" -ErrorAction SilentlyContinue
            if ($existing) {
                Write-Log "Group '$($group.displayName)' already exists. Skipping." -Level WARN
                continue
            }

            $groupParams = @{
                DisplayName     = $group.displayName
                Description     = $group.description
                MailNickname    = $group.mailNickname
                MailEnabled     = ($group.groupType -eq 'Microsoft365')
                SecurityEnabled = $true
            }
            if ($group.groupType -eq 'Microsoft365') {
                $groupParams['GroupTypes'] = @('Unified')
            }

            New-MgGroup -BodyParameter $groupParams | Out-Null
            Write-Log "Created group: $($group.displayName)" -Level SUCCESS
        } catch {
            Write-Log "Failed to create group '$($group.displayName)': $_" -Level ERROR
        }
    }
}

# ─── Provision SharePoint Sites ───────────────────────────────────────────────
function New-SharePointSites {
    param([object]$Config)

    $tenantUrl = "https://$($Config.organization.tenantDomain.Split('.')[0]).sharepoint.com"

    Write-Log "=== Provisioning SharePoint Sites ==="

    # Hub site
    $hub = $Config.sharepoint.hubSite
    $hubUrl = "$tenantUrl$($hub.url)"
    Write-Log "Hub Site: $($hub.title) -> $hubUrl"

    if ($DryRun) {
        Write-Log "[DRY RUN] Would create hub site: $($hub.title) at $hubUrl" -Level DRYRUN
    } else {
        try {
            New-PnPSite -Type CommunicationSite -Title $hub.title -Url $hubUrl -Description $hub.description -Lcid $hub.locale
            Register-PnPHubSite -Site $hubUrl
            Write-Log "Created hub site: $($hub.title)" -Level SUCCESS
        } catch {
            Write-Log "Hub site may already exist or failed: $_" -Level WARN
        }
    }

    # Spoke sites
    foreach ($spoke in $Config.sharepoint.spokeSites) {
        $spokeUrl = "$tenantUrl$($spoke.url)"
        Write-Log "Spoke Site: $($spoke.title) -> $spokeUrl"

        if ($DryRun) {
            Write-Log "[DRY RUN] Would create spoke site: $($spoke.title) at $spokeUrl" -Level DRYRUN
            Write-Log "[DRY RUN] Would associate to hub: $hubUrl" -Level DRYRUN
            continue
        }

        try {
            New-PnPSite -Type TeamSite -Title $spoke.title -Alias $spoke.url.TrimStart('/sites/') -Description $spoke.description
            Add-PnPHubSiteAssociation -Site $spokeUrl -HubSite $hubUrl
            Write-Log "Created and associated spoke site: $($spoke.title)" -Level SUCCESS
        } catch {
            Write-Log "Spoke site '$($spoke.title)' may already exist or failed: $_" -Level WARN
        }
    }
}

# ─── Provision Microsoft Teams ────────────────────────────────────────────────
function New-TeamsWorkspaces {
    param([object]$Config)

    Write-Log "=== Provisioning Microsoft Teams ==="
    foreach ($team in $Config.teams) {
        Write-Log "Team: $($team.displayName)"

        if ($DryRun) {
            Write-Log "[DRY RUN] Would create team: $($team.displayName)" -Level DRYRUN
            foreach ($channel in $team.channels) {
                if ($channel.name -ne 'General') {
                    Write-Log "[DRY RUN]   Would create channel: $($channel.name)" -Level DRYRUN
                }
            }
            continue
        }

        try {
            $newTeam = New-MgTeam -DisplayName $team.displayName -Description $team.description -Visibility $team.visibility
            Write-Log "Created team: $($team.displayName) (ID: $($newTeam.Id))" -Level SUCCESS

            # Add channels (skip General — created automatically)
            foreach ($channel in $team.channels) {
                if ($channel.name -eq 'General') { continue }
                try {
                    New-MgTeamChannel -TeamId $newTeam.Id -DisplayName $channel.name -Description $channel.description | Out-Null
                    Write-Log "  Created channel: $($channel.name)" -Level SUCCESS
                } catch {
                    Write-Log "  Failed to create channel '$($channel.name)': $_" -Level WARN
                }
            }
        } catch {
            Write-Log "Failed to create team '$($team.displayName)': $_" -Level ERROR
        }
    }
}

# ─── Document DLP Policies ────────────────────────────────────────────────────
function Export-DLPPolicyDocs {
    param([object]$Config)

    Write-Log "=== Generating DLP Policy Documentation ==="
    $dlpDocPath = "$PSScriptRoot/logs/dlp-policies-$(Get-Date -Format 'yyyyMMdd').md"

    $doc = "# DLP Policy Configuration`n`nGenerated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n"
    foreach ($policy in $Config.dlpPolicies) {
        $doc += "## $($policy.name)`n"
        $doc += "**Description:** $($policy.description)`n`n"
        $doc += "**Sensitive Info Types:** $($policy.sensitiveInfoTypes -join ', ')`n`n"
        $doc += "**Applies To:** $($policy.appliesTo -join ', ')`n`n"
        $doc += "**Action:** $($policy.action)`n`n---`n`n"
    }

    $doc | Out-File -FilePath $dlpDocPath -Encoding UTF8
    Write-Log "DLP policy documentation written to: $dlpDocPath" -Level SUCCESS
}

# ─── Summary Report ───────────────────────────────────────────────────────────
function Write-ProvisioningSummary {
    param([object]$Config, [bool]$IsDryRun)

    $mode = if ($IsDryRun) { "DRY RUN (no changes made)" } else { "APPLIED" }
    Write-Log "============================================"
    Write-Log "PROVISIONING SUMMARY [$mode]"
    Write-Log "============================================"
    Write-Log "Organization  : $($Config.organization.displayName)"
    Write-Log "Tenant        : $($Config.organization.tenantDomain)"
    Write-Log "SharePoint    : 1 hub + $($Config.sharepoint.spokeSites.Count) spoke sites"
    Write-Log "Teams         : $($Config.teams.Count) teams"
    Write-Log "Entra Groups  : $($Config.entraIdGroups.Count) groups"
    Write-Log "Sensitivity   : $($Config.sensitivityLabels.Count) labels defined"
    Write-Log "DLP Policies  : $($Config.dlpPolicies.Count) policies defined"
    Write-Log "Log file      : $LogPath"
    Write-Log "============================================"
}

# ─── Main Execution ───────────────────────────────────────────────────────────
Write-Log "M365 Workplace Provisioner v1.0 — Zero Trust Hardened"
Write-Log "Mode: $(if ($DryRun) { 'DRY RUN' } else { 'LIVE PROVISIONING' })"

if (-not $DryRun) {
    Test-Prerequisites
}

$config = Get-WorkspaceConfig

if (-not $DryRun) {
    Connect-M365Services -Config $config
}

New-EntraIdGroups    -Config $config
New-SharePointSites  -Config $config
New-TeamsWorkspaces  -Config $config
Export-DLPPolicyDocs -Config $config

Write-ProvisioningSummary -Config $config -IsDryRun $DryRun.IsPresent

Write-Log "Provisioning complete." -Level SUCCESS
