$c = Get-Content 'D:\NYX\graphify-out\graph.html' -Raw
$i = $c.IndexOf('const LEGEND')
$j = $c.IndexOf('];', $i)
$legend = $c.Substring($i, $j - $i + 2)
Write-Host $legend
