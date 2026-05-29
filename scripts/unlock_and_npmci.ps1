Stop-Process -Name node -Force -ErrorAction SilentlyContinue
try { takeown /f 'E:\NYX\node_modules\lightningcss-win32-x64-msvc\lightningcss.win32-x64-msvc.node' } catch {}
try { icacls 'E:\NYX\node_modules\lightningcss-win32-x64-msvc\lightningcss.win32-x64-msvc.node' /grant "$env:USERNAME:F" /C } catch {}
Remove-Item -Force -LiteralPath 'E:\NYX\node_modules\lightningcss-win32-x64-msvc\lightningcss.win32-x64-msvc.node' -ErrorAction SilentlyContinue
npm ci
