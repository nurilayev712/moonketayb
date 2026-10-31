# Avtomatik fayllarni kuzatuvchi va GitHub'ga yuboruvchi skript
$folder = "c:\Users\user\OneDrive\Desktop\moonketayb"
Set-Location $folder

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " MoonKeyType: Avtomatik GitHub Sync Ishga Tushdi!" -ForegroundColor Green
Write-Host " Har qanday fayl o'zgarganda avtomatik GitHub'ga yuboriladi." -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $folder
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    
    # .git ichidagi o'zgarishlarni e'tiborsiz qoldirish
    if ($path -like "*\.git\*") { return }

    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] O'zgarish aniqlandi: $path ($changeType)" -ForegroundColor Magenta
    Start-Sleep -Seconds 2

    git add .
    $status = git status --porcelain
    if ($status) {
        $msg = "Avtomatik yangilanish: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git commit -m $msg
        git push origin main
        Write-Host "✅ Sayt GitHub'ga muvaffaqiyatli yangilandi!" -ForegroundColor Green
    }
}

Register-ObjectEvent $watcher 'Changed' -Action $action | Out-Null
Register-ObjectEvent $watcher 'Created' -Action $action | Out-Null
Register-ObjectEvent $watcher 'Deleted' -Action $action | Out-Null

while ($true) {
    Start-Sleep -Seconds 5
}
