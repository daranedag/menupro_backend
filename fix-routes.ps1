$content = Get-Content "src\routes\subscriptions.ts" -Raw
$content = $content -replace 'authenticateUser', 'authenticate'
$content = $content -replace 'successResponse\(', 'ApiResponseUtil.success('
$content = $content -replace 'errorResponse\(', 'ApiResponseUtil.error('
$content = $content -replace ', 404\)', ')'
$content = $content -replace ', 400\)', ')'
$content = $content -replace ', 500\)', ', 500)'
$content = $content -replace ', 201\)', ', 201)'
$content = $content -replace 'ApiResponseUtil\.error\(res, ([^,]+)\)', 'ApiResponseUtil.notFound(res, $1)'
Set-Content "src\routes\subscriptions.ts" -Value $content
