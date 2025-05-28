param(
  [string]$Path = ".",
  [string[]]$Exclude = @("node_modules", ".git"),
  [string]$Prefix = ""
)

$items = Get-ChildItem -Path $Path -Force | Where-Object {
  $_.PSIsContainer -and ($Exclude -notcontains $_.Name)
}

for ($i = 0; $i -lt $items.Count; $i++) {
  $item = $items[$i]
  $isLast = $i -eq $items.Count - 1
  $connector = if ($isLast) { "└── " } else { "├── " }
  Write-Output "$Prefix$connector$item"

  $newPrefix = $Prefix + (if ($isLast) { "    " } else { "│   " })
  & $MyInvocation.MyCommand.Path -Path $item.FullName -Exclude $Exclude -Prefix $newPrefix
}
