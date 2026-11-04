# Lists contact-form messages stored in the ARN_INBOX KV namespace (newest first).
# Usage: powershell -File scripts/inbox.ps1 [-Last 20]
param([int]$Last = 20)
$ns = '964f14c99f6347e1b1b9bfeb31566df1'
$raw = cmd /c "wrangler kv key list --namespace-id $ns --prefix msg: --remote 2>nul" | Out-String
$i = $raw.IndexOf('[')
if ($i -lt 0) { Write-Host 'No messages or wrangler error.'; exit 1 }
$keys = ($raw.Substring($i) | ConvertFrom-Json) | Sort-Object name -Descending | Select-Object -First $Last
if (-not $keys) { Write-Host 'Inbox empty.'; exit 0 }
foreach ($k in $keys) {
    $v = cmd /c "wrangler kv key get `"$($k.name)`" --namespace-id $ns --remote 2>nul" | Out-String
    try { $m = $v | ConvertFrom-Json } catch { continue }
    Write-Host ('=' * 70)
    Write-Host "$($m.date) | $($m.name) <$($m.email)> | teslim: $($m.delivered)"
    Write-Host "Konu: $($m.subject)"
    Write-Host $m.message
}
