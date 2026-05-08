# Registers the two nightly Questerix tasks in Windows Task Scheduler.
# Run once from an elevated PowerShell prompt:
#   powershell -ExecutionPolicy Bypass -File scripts/schedule-nightly.ps1
#
# To remove both tasks later:
#   Unregister-ScheduledTask -TaskName "Questerix — Nightly Test" -Confirm:$false
#   Unregister-ScheduledTask -TaskName "Questerix — Nightly Fix"  -Confirm:$false

$ErrorActionPreference = "Stop"

# ── Resolve paths ─────────────────────────────────────────────────────────────
$ProjectRoot = (git rev-parse --show-toplevel) -replace '/', '\'
$GitBash     = "C:\Program Files\Git\bin\bash.exe"

if (-not (Test-Path $GitBash)) {
    # Fallback: Git installed to user directory
    $GitBash = "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe"
    if (-not (Test-Path $GitBash)) {
        Write-Error "Git Bash not found. Adjust `$GitBash path in this script."
        exit 1
    }
}

Write-Host "Project root : $ProjectRoot"
Write-Host "Git Bash     : $GitBash"
Write-Host ""

# ── Helper: build a scheduled task ───────────────────────────────────────────
function Register-NightlyTask {
    param(
        [string]$TaskName,
        [string]$Script,
        [string]$Time,
        [string]$Description,
        [int]   $MaxHours
    )

    $unixRoot = ($ProjectRoot -replace '\\', '/') -replace '^([A-Z]):', { "/$(($_.Value[0]).ToString().ToLower())" }
    $arg = "-c 'cd ""$unixRoot"" && bash $Script >> .claude/logs/$(Split-Path $Script -Leaf .sh).log 2>&1'"

    $action   = New-ScheduledTaskAction -Execute $GitBash -Argument $arg -WorkingDirectory $ProjectRoot
    $trigger  = New-ScheduledTaskTrigger -Daily -At $Time
    $settings = New-ScheduledTaskSettingsSet `
        -ExecutionTimeLimit (New-TimeSpan -Hours $MaxHours) `
        -StartWhenAvailable `
        -WakeToRun $false `
        -MultipleInstances IgnoreNew

    # Run as current user (interactive — required for toast notifications)
    $principal = New-ScheduledTaskPrincipal `
        -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
        -LogonType Interactive `
        -RunLevel Limited

    Register-ScheduledTask `
        -TaskName    $TaskName `
        -Action      $action `
        -Trigger     $trigger `
        -Settings    $settings `
        -Principal   $principal `
        -Description $Description `
        -Force | Out-Null

    Write-Host "✅  Registered: $TaskName ($Time daily)"
}

# ── Task 1: Nightly Test — 10:00 PM ──────────────────────────────────────────
Register-NightlyTask `
    -TaskName    "Questerix — Nightly Test" `
    -Script      "scripts/nightly-test.sh" `
    -Time        "22:00" `
    -Description "Inspects fractions.questerix.com, writes PLANS/nightly/YYYY-MM-DD.md, auto-commits." `
    -MaxHours    1

# ── Task 2: Nightly Fix — 11:30 PM ───────────────────────────────────────────
Register-NightlyTask `
    -TaskName    "Questerix — Nightly Fix" `
    -Script      "scripts/nightly-fix.sh" `
    -Time        "23:30" `
    -Description "Reads nightly report, fixes clear code issues, opens a PR for morning review." `
    -MaxHours    2

Write-Host ""
Write-Host "Both tasks registered. Verify in:"
Write-Host "  Task Scheduler > Task Scheduler Library > Questerix*"
Write-Host ""
Write-Host "Logs land in: $ProjectRoot\.claude\logs\"
Write-Host "Reports land in: $ProjectRoot\PLANS\nightly\"
Write-Host ""
Write-Host "To run manually right now:"
Write-Host "  Start-ScheduledTask -TaskName 'Questerix — Nightly Test'"
Write-Host "  Start-ScheduledTask -TaskName 'Questerix — Nightly Fix'"
