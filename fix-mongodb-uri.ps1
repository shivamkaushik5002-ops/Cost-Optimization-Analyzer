# Fix MongoDB URI in backend/.env file

Write-Host "Fixing MongoDB URI in backend\.env..." -ForegroundColor Yellow

$envFile = "backend\.env"

if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    
    # Remove the Python-style connection string and variables
    $content = $content -replace '(?s)host = "bytexldb\.com".*?# Construct connection string\s+', ''
    $content = $content -replace 'MONGODB_URI= f"mongodb://\{username\}:\{password\}@\{host\}:\{port\}/\{database\}"', ''
    
    # Add the correct MongoDB URI
    $correctUri = "MONGODB_URI=mongodb://user_44456xres:p44456xres@bytexldb.com:5050/db_44456xres"
    
    # Find where to insert it (after NODE_ENV or at the MongoDB Configuration section)
    if ($content -match '# MongoDB Configuration') {
        $content = $content -replace '(# MongoDB Configuration\s+)', "`$1$correctUri`r`n"
    } else {
        # Insert after NODE_ENV
        $content = $content -replace '(NODE_ENV=development\s+)', "`$1`r`n# MongoDB Configuration`r`n$correctUri`r`n"
    }
    
    # Clean up any duplicate MongoDB Configuration sections
    $content = $content -replace '(# MongoDB Configuration\s+.*?)(# MongoDB Configuration)', '$1'
    
    $content | Set-Content $envFile -Encoding utf8
    
    Write-Host "MongoDB URI fixed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Updated MONGODB_URI: mongodb://user_44456xres:p44456xres@bytexldb.com:5050/db_44456xres" -ForegroundColor Cyan
} else {
    Write-Host "Error: backend\.env file not found!" -ForegroundColor Red
}

