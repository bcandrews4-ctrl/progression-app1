param(
  [Parameter(Mandatory)][string]$SyncToken
)

$url = "http://127.0.0.1:54321/functions/v1/ingest-health"

$today = [datetime]::Today
$metrics = @()
for ($i = 6; $i -ge 0; $i--) {
  $date = $today.AddDays(-$i).ToString("yyyy-MM-dd")
  $metrics += @{
    dateISO        = $date
    steps          = Get-Random -Minimum 6000 -Maximum 12000
    sleepHours     = [math]::Round((Get-Random -Minimum 60 -Maximum 90) / 10.0, 1)
    avgBPM         = Get-Random -Minimum 58 -Maximum 72
    caloriesBurned = Get-Random -Minimum 1800 -Maximum 2400
    activeMinutes  = Get-Random -Minimum 30 -Maximum 90
    sleepStages    = @(
      @{ stage = "Core";  minutes = 245 }
      @{ stage = "Deep";  minutes = 98  }
      @{ stage = "REM";   minutes = 122 }
      @{ stage = "Awake"; minutes = 15  }
    )
  }
}

$body = @{ metrics = $metrics } | ConvertTo-Json -Depth 5

Write-Host "POSTing 7-day mock payload to $url ..."
$response = Invoke-RestMethod `
  -Uri $url `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $SyncToken"; "Content-Type" = "application/json" } `
  -Body $body

Write-Host "Response: $($response | ConvertTo-Json)"
