# Publish Visualcheme to GitHub and enable GitHub Pages (GitHub Actions).
# Run from the project root after: gh auth login

$ErrorActionPreference = 'Stop'
$gh = "$env:ProgramFiles\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
  Write-Error 'GitHub CLI not found. Install: winget install GitHub.cli'
}

& $gh auth status | Out-Null

$repoName = 'visualcheme'
Write-Host "Creating public repo '$repoName' and pushing main..."
& $gh repo create $repoName --public --source=. --remote=origin --push

Write-Host 'Enabling GitHub Pages (workflow build)...'
$owner = (& $gh api user -q .login)
& $gh api -X POST "/repos/$owner/$repoName/pages" -f build_type=workflow | Out-Null

Write-Host ''
Write-Host "Repository: https://github.com/$owner/$repoName"
Write-Host "Live site (after Actions finishes): https://$owner.github.io/$repoName/"
Write-Host 'If the repo name is not visualcheme, set BASE_PATH in .github/workflows/deploy-pages.yml to match.'
