$ErrorActionPreference = 'Stop'
$endpoint = 'http://127.0.0.1:8792/api/import-url'

function Test-Import($label, $url) {
    $body = (@{ url = $url } | ConvertTo-Json -Compress)
    $line = "===== $label =====`nURL: $url`n"
    try {
        $r = Invoke-WebRequest -Uri $endpoint -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
        $line += "STATUS=$($r.StatusCode)`n$($r.Content)`n"
    } catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $code = [int]$resp.StatusCode
            $stream = $resp.GetResponseStream()
            $sr = New-Object System.IO.StreamReader($stream)
            $txt = $sr.ReadToEnd()
            $sr.Close()
            $line += "STATUS=$code`n$txt`n"
        } else {
            $line += "ERR: $($_.Exception.Message)`n"
        }
    }
    return $line
}

$all = ""
$all += Test-Import "TAB (should reject UNSUPPORTED_TAB)" "https://tabs.ultimate-guitar.com/tab/led-zeppelin/stairway-to-heaven-tabs-9488"
$all += "`n"
$all += Test-Import "CHORDS (should import, key in meta)" "https://tabs.ultimate-guitar.com/tab/the-marias/no-one-noticed-chords-5718204"
$all += "`n"
Set-Content -Path import_test_results.txt -Value $all -Encoding utf8
