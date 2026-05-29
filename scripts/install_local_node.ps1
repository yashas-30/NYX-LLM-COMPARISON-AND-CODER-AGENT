$ErrorActionPreference='Stop'
$zipUrl='https://nodejs.org/dist/v24.16.0/node-v24.16.0-win-x64.zip'
$localDir='E:\NYX\local-node'
New-Item -ItemType Directory -Force -Path $localDir | Out-Null
$zipPath = Join-Path $localDir 'node.zip'
Write-Host "Downloading $zipUrl to $zipPath"
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
Write-Host "Extracting $zipPath"
Expand-Archive -Path $zipPath -DestinationPath $localDir -Force
Remove-Item -Force $zipPath
$nodeBin = Join-Path $localDir 'node-v24.16.0-win-x64'
$env:Path = $nodeBin + ';' + $env:Path
Write-Host "Node version:"; node -v
Write-Host "NPM version:"; npm -v
Set-Location 'E:\NYX'
Write-Host "Removing problematic node_modules folders if present"
Remove-Item -Force -LiteralPath 'E:\NYX\node_modules\lightningcss-win32-x64-msvc' -Recurse -ErrorAction SilentlyContinue
Remove-Item -Force -LiteralPath 'E:\NYX\node_modules\better-sqlite3' -Recurse -ErrorAction SilentlyContinue
Write-Host "Running npm ci"
npm ci
Write-Host "Script finished"