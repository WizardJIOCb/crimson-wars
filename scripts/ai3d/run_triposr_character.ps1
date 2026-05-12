param(
  [Parameter(Mandatory = $true)]
  [string]$Character,
  [int]$McResolution = 128,
  [int]$TextureResolution = 1024,
  [ValidateSet("obj", "glb")]
  [string]$ModelFormat = "obj"
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ConfigPath = Join-Path $Root "docs\ai3d\characters.production.json"
$Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$Spec = $Config.characters.$Character
if (-not $Spec) {
  throw "Unknown character '$Character'. Check docs\ai3d\characters.production.json."
}

$TripoRoot = "C:\Projects\_local-ai3d\TripoSR"
$Python = "C:\Projects\_local-ai3d\venvs\triposr\Scripts\python.exe"
$Prepare = Join-Path $Root "scripts\ai3d\prepare_ai3d_inputs.py"
$MakePbr = Join-Path $Root "scripts\ai3d\make_pbr_from_texture.py"
$LinkObj = Join-Path $Root "scripts\ai3d\link_obj_material.py"

if (!(Test-Path -LiteralPath $TripoRoot)) { throw "TripoSR repo not found: $TripoRoot" }
if (!(Test-Path -LiteralPath $Python)) { throw "TripoSR Python venv not found: $Python" }

& $Python $Prepare --character $Character
if ($LASTEXITCODE -ne 0) { throw "Input preparation failed." }

$InputPath = Join-Path $Root "public\assets\characters\ai3d\inputs\$Character-triposr-input.png"
$OutputDir = Join-Path $Root "public\assets\characters\ai3d\generated\triposr\$Character"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Push-Location $TripoRoot
try {
  & $Python "run.py" $InputPath `
    --output-dir $OutputDir `
    --model-save-format $ModelFormat `
    --mc-resolution $McResolution `
    --bake-texture `
    --texture-resolution $TextureResolution
  if ($LASTEXITCODE -ne 0) { throw "TripoSR generation failed." }
}
finally {
  Pop-Location
}

$TexturePath = Join-Path $OutputDir "0\texture.png"
if (Test-Path -LiteralPath $TexturePath) {
  & $Python $MakePbr --character $Character --texture $TexturePath --accent $Spec.accent
}

$MeshPath = Join-Path $OutputDir "0\mesh.obj"
if ($ModelFormat -eq "obj" -and (Test-Path -LiteralPath $MeshPath)) {
  & $Python $LinkObj --character $Character --mesh $MeshPath
}

Write-Host "Generated $Character in $OutputDir"
