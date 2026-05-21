$c = Get-Content 'D:\NYX\graphify-out\graph.html' -Raw
Write-Host "File size: $($c.Length) chars"
$lines = (Get-Content 'D:\NYX\graphify-out\graph.html').Count
Write-Host "Total lines: $lines"
# Count nodes
$nodeCount = ([regex]::Matches($c, '\{id:"')).Count
Write-Host "Node count (approx): $nodeCount"
# Count edges
$edgeCount = ([regex]::Matches($c, '\{from:"')).Count
Write-Host "Edge count (approx): $edgeCount"
# Find TIER comments
$tierLines = Select-String -Path 'D:\NYX\graphify-out\graph.html' -Pattern 'TIER \d'
Write-Host "`nTIER comments found: $($tierLines.Count)"
foreach ($line in $tierLines) {
    $text = $line.Line.Trim()
    if ($text.Length -gt 80) { $text = $text.Substring(0, 80) }
    Write-Host "  Line $($line.LineNumber): $text"
}
