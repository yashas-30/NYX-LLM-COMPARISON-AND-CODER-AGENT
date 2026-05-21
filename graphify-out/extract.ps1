$c = Get-Content 'D:\NYX\graphify-out\graph.html' -Raw
$i = $c.IndexOf('const RAW_EDGES')
Write-Host "RAW_EDGES starts at char: $i"
# Find end of RAW_EDGES array - look for ]; after RAW_EDGES
$j = $c.IndexOf('];', $i)
Write-Host "RAW_EDGES array ends at char: $($j+2)"
# Get everything after the data
$after = $c.Substring($j+2)
Write-Host "--- JS LOGIC AFTER DATA ---"
Write-Host $after
