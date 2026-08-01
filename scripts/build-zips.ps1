Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function New-ExtensionZip {
    param([string]$DestPath)

    if (Test-Path $DestPath) { Remove-Item $DestPath -Force }

    $items = @('manifest.json', 'background', 'content', 'lib', 'options', 'popup', 'icons', '_locales')
    $root = (Get-Location).Path
    $sep = [System.IO.Path]::DirectorySeparatorChar

    $zip = [System.IO.Compression.ZipFile]::Open($DestPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($item in $items) {
            $fullPath = Join-Path $root $item
            if (Test-Path $fullPath -PathType Leaf) {
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $item, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
            } else {
                Get-ChildItem -Path $fullPath -Recurse -File | ForEach-Object {
                    $relative = $_.FullName.Substring($root.Length + 1).Replace($sep, '/')
                    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
                }
            }
        }
    } finally {
        $zip.Dispose()
    }
}

New-Item -ItemType Directory -Force -Path dist | Out-Null
New-ExtensionZip -DestPath "dist/video-fast-chrome.zip"
New-ExtensionZip -DestPath "dist/video-fast-firefox.zip"
Get-ChildItem dist | Select-Object Name, Length
