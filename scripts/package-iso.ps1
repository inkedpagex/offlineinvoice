<#
.SYNOPSIS
    Automates packaging of a desktop application installer executable into a mountable ISO image.
.DESCRIPTION
    Creates a standard UDF/ISO9660/Joliet ISO image containing the installer executable and user instructions.
    Distributing installers inside an ISO prevents Windows Mark of the Web (MOTW) propagation on download,
    preventing Windows Defender SmartScreen unrecognized app warnings.
.PARAMETER SourceExe
    Path to the installer executable. If not specified, automatically detects the latest installer in dist-release or dist.
.PARAMETER OutputDir
    Destination directory for the output ISO file. Defaults to dist-release or dist.
.PARAMETER VolumeLabel
    Volume label for the ISO image (max 16-32 alphanumeric/underscore characters).
.PARAMETER IsoName
    Custom filename for the output ISO. Defaults to '<ProductName>_Setup_v<Version>.iso'.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$SourceExe,

    [Parameter(Mandatory = $false)]
    [string]$OutputDir,

    [Parameter(Mandatory = $false)]
    [string]$VolumeLabel,

    [Parameter(Mandatory = $false)]
    [string]$IsoName
)

$ErrorActionPreference = "Stop"

# Ensure .NET COM stream writer is available
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

public static class IsoStreamWriter {
    public static void SaveToFile(object comStream, string outputPath) {
        IStream stream = (IStream)comStream;
        using (FileStream fs = new FileStream(outputPath, FileMode.Create, FileAccess.Write, FileShare.None)) {
            byte[] buffer = new byte[1024 * 1024]; // 1MB buffer
            IntPtr pcbRead = Marshal.AllocHGlobal(sizeof(int));
            try {
                while (true) {
                    stream.Read(buffer, buffer.Length, pcbRead);
                    int bytesRead = Marshal.ReadInt32(pcbRead);
                    if (bytesRead <= 0) break;
                    fs.Write(buffer, 0, bytesRead);
                }
            } finally {
                Marshal.FreeHGlobal(pcbRead);
            }
        }
    }
}
"@

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Desktop App Installer -> ISO Packaging Automation   " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Read package.json if available to extract metadata
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    $projectRoot = Get-Location
}

$productName = "App"
$version = "1.0.0"
$packageJsonPath = Join-Path $projectRoot "package.json"

if (Test-Path $packageJsonPath) {
    try {
        $pkg = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        if ($pkg.build -and $pkg.build.productName) {
            $productName = $pkg.build.productName
        } elseif ($pkg.name) {
            $productName = $pkg.name
        }
        if ($pkg.version) {
            $version = $pkg.version
        }
        Write-Host "[INFO] Project metadata: $productName v$version" -ForegroundColor Gray
    } catch {
        Write-Warning "Could not parse package.json. Using default naming."
    }
}

# 2. Determine and resolve Target Installer Executable
if (-not $SourceExe) {
    $searchDirectories = @(
        (Join-Path $projectRoot "dist-release"),
        (Join-Path $projectRoot "dist"),
        (Join-Path $projectRoot "release"),
        (Join-Path $projectRoot "build")
    )

    $candidateFiles = @()
    foreach ($dir in $searchDirectories) {
        if (Test-Path $dir) {
            $files = Get-ChildItem -Path $dir -Filter "*.exe" -File | 
                     Where-Object { $_.Name -notmatch "blockmap" -and $_.FullName -notmatch "win-unpacked" }
            $candidateFiles += $files
        }
    }

    if ($candidateFiles.Count -eq 0) {
        throw "No installer executable (.exe) found in dist-release, dist, or release directories. Build the installer first (e.g. npm run dist:win)."
    }

    # Pick the most recently created/modified installer
    $latestExe = $candidateFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $SourceExe = $latestExe.FullName
}

if (-not (Test-Path $SourceExe)) {
    throw "Source executable does not exist: $SourceExe"
}

$sourceExeItem = Get-Item $SourceExe
Write-Host "[OK] Target Installer: $($sourceExeItem.FullName)" -ForegroundColor Green
Write-Host "     Size: $([Math]::Round($sourceExeItem.Length / 1MB, 2)) MB" -ForegroundColor Gray

# 3. Determine Output Directory and ISO File Name
if (-not $OutputDir) {
    $OutputDir = $sourceExeItem.DirectoryName
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

if (-not $IsoName) {
    # Clean filename sanitization
    $cleanProduct = $productName -replace '[\\/:*?"<>| ]', '_'
    $IsoName = "$($cleanProduct)_Setup_v$version.iso"
} elseif (-not $IsoName.EndsWith(".iso", [System.StringComparison]::OrdinalIgnoreCase)) {
    $IsoName = "$IsoName.iso"
}

$finalIsoPath = Join-Path $OutputDir $IsoName

if (-not $VolumeLabel) {
    # Volume label for ISO: max 16-32 chars alphanumeric/underscore
    $cleanLabel = ($productName -replace '[^a-zA-Z0-9_]', '_').ToUpper()
    if ($cleanLabel.Length -gt 16) { $cleanLabel = $cleanLabel.Substring(0, 16) }
    $VolumeLabel = $cleanLabel
}

# 4. Prepare Clean Staging Folder
$stagingDir = Join-Path ([System.IO.Path]::GetTempPath()) ("iso_stage_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
Write-Host "[INFO] Staging files in: $stagingDir" -ForegroundColor Gray

try {
    # Copy installer binary into staging
    $stagedExeName = $sourceExeItem.Name
    $destinationExe = Join-Path $stagingDir $stagedExeName
    Copy-Item -Path $SourceExe -Destination $destinationExe -Force

    # Add user-friendly README instruction file
    $readmeContent = @"
================================================================================
  $productName - Offline Installation Guide
================================================================================

How to Install:
1. Double-click '$stagedExeName' to start the installation wizard.
2. Follow the on-screen instructions to complete the setup.
3. Once installation completes, you can right-click the virtual drive in File
   Explorer and click 'Eject' (or unmount the ISO).

Data Persistence Notice:
- Your application database and settings are saved permanently on your local
  hard drive (in %APPDATA%\$productName).
- Unmounting or deleting this ISO file after installation will NOT affect your
  installed application or your saved invoices and customer data.

================================================================================
"@
    Set-Content -Path (Join-Path $stagingDir "How_To_Install.txt") -Value $readmeContent -Encoding UTF8

    # Add autorun.inf for Explorer volume branding (optional metadata)
    $autorunContent = @"
[AutoRun]
open=$stagedExeName
action=Install $productName
label=$productName Setup
"@
    Set-Content -Path (Join-Path $stagingDir "autorun.inf") -Value $autorunContent -Encoding ASCII

    # 5. Build ISO Image using Windows IMAPI2FS COM API
    Write-Host "[INFO] Initializing Windows IMAPI2FS Image Builder..." -ForegroundColor Gray
    $fsi = New-Object -ComObject IMAPI2FS.MsftFileSystemImage
    $fsi.FreeMediaBlocks = 0                       # Unlimited image size
    $fsi.FileSystemsToCreate = 7                    # 1 (ISO9660) + 2 (Joliet) + 4 (UDF)
    $fsi.VolumeName = $VolumeLabel
    $fsi.Root.AddTree($stagingDir, $false)          # Add staged files recursively

    Write-Host "[INFO] Generating ISO image stream with UDF/Joliet/ISO9660 compatibility..." -ForegroundColor Gray
    $resultImage = $fsi.CreateResultImage()

    if (Test-Path $finalIsoPath) {
        Remove-Item -Path $finalIsoPath -Force
    }

    Write-Host "[INFO] Streaming ISO image to disk: $finalIsoPath" -ForegroundColor Gray
    [IsoStreamWriter]::SaveToFile($resultImage.ImageStream, $finalIsoPath)

    # 6. Verify and Report Output Stats
    $isoItem = Get-Item $finalIsoPath
    $hash = try {
        $sha = [System.Security.Cryptography.SHA256]::Create()
        $stream = [System.IO.File]::OpenRead($finalIsoPath)
        $bytes = $sha.ComputeHash($stream)
        $stream.Close()
        [System.BitConverter]::ToString($bytes).Replace("-", "").ToUpper()
    } catch {
        "N/A"
    }

    Write-Host "------------------------------------------------------" -ForegroundColor Green
    Write-Host "[SUCCESS] ISO Image Built Successfully!" -ForegroundColor Green
    Write-Host "  File Path : $($isoItem.FullName)" -ForegroundColor White
    Write-Host "  File Size : $([Math]::Round($isoItem.Length / 1MB, 2)) MB ($($isoItem.Length) bytes)" -ForegroundColor White
    Write-Host "  Volume ID : $VolumeLabel" -ForegroundColor White
    Write-Host "  SHA-256   : $hash" -ForegroundColor White
    Write-Host "------------------------------------------------------" -ForegroundColor Green

} finally {
    # 7. Clean up staging directory
    if (Test-Path $stagingDir) {
        Remove-Item -Path $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
