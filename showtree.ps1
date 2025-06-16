<#
  showtree.ps1 – ASCII tree (folder + file)
  ----------------------------------------
  Contoh:
      .\showtree.ps1                       # tree lengkap direktori kerja
      .\showtree.ps1 -Path src             # mulai di ./src
      .\showtree.ps1 -Exclude node_modules # lewati folder tertentu
#>

[CmdletBinding()]
param(
    [string]      $Path    = ".",
    [string[]]    $Exclude = @("node_modules", ".git"),
    [string]      $Prefix  = ""
)

function Show-Tree {
    param(
        [string]   $Root,
        [string[]] $Excl,
        [string]   $Pre
    )

    # ▸ Ambil daftar isi     (folder dulu → file) dan abaikan yang di-exclude
    $entries = Get-ChildItem -LiteralPath $Root -Force |
               Where-Object { $Excl -notcontains $_.Name } |
               Sort-Object @{e={-not $_.PSIsContainer}}, Name

    for ($i = 0; $i -lt $entries.Count; $i++) {
        $entry   = $entries[$i]
        $isLast  = $i -eq ($entries.Count - 1)
        $branch  = if ($isLast) { '└── ' } else { '├── ' }

        Write-Output "$Pre$branch$($entry.Name)"

        # Kalau masih folder → rekursi lebih dalam
        if ($entry.PSIsContainer) {
            $newPre = $Pre + $( if ($isLast) { '    ' } else { '│   ' } )
            Show-Tree -Root $entry.FullName -Excl $Excl -Pre $newPre
        }
    }
}

# Kick-off
Show-Tree -Root (Resolve-Path $Path) -Excl $Exclude -Pre $Prefix
