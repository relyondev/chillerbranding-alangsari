# Run from the repository root AFTER reviewing/committing your current work.
# This only removes generated/local artifacts and old root apply notes.
$ErrorActionPreference = "Stop"

$removeDirs = @("dist", ".astro")
foreach ($dir in $removeDirs) {
  if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
}

if (Test-Path "er.name") { Remove-Item -Force "er.name" }

$oldRootDocs = @(
  "APPLY_HOTFIX.md",
  "APPLY_V1.7.0.md",
  "APPLY_V1.7.1.md",
  "APPLY_V1.7.2.md",
  "APPLY_V1.7.3.md",
  "DEPLOYMENT_CHECKLIST.md"
)
foreach ($file in $oldRootDocs) {
  if (Test-Path $file) { Remove-Item -Force $file }
}

Write-Host "Local generated/root clutter cleanup complete. node_modules was intentionally preserved for speed."
Write-Host "Run: git status"
