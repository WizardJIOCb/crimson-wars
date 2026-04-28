param(
  [int]$LocalPort = 3308,
  [string]$Server = "root@82.146.42.213"
)

Write-Host "Opening Crimson Wars production MySQL tunnel on 127.0.0.1:$LocalPort"
Write-Host "Keep this window open while you use the database client."

ssh -N -L "$LocalPort`:127.0.0.1:3306" $Server
