$json = '{"url":"http://localhost:3000/dashboard/posts/new"}'
[System.IO.File]::WriteAllText('E:\FinancialMarket\tmp\nav3.txt', $json, [System.Text.UTF8Encoding]::new($false))
Get-Content 'E:\FinancialMarket\tmp\nav3.txt' -Raw
