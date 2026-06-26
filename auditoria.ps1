$OutputFile = "auditoria-completa.txt"

"================ ESTRUCTURA SRC ================" | Out-File $OutputFile -Encoding UTF8
tree src /F | Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ PACKAGE.JSON ================" | Out-File $OutputFile -Append -Encoding UTF8
Get-Content package.json | Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ MAIN.JSX ================" | Out-File $OutputFile -Append -Encoding UTF8
Get-Content src\main.jsx | Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ APP.JSX ================" | Out-File $OutputFile -Append -Encoding UTF8
Get-Content src\App.jsx | Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ FIREBASE CONFIG ================" | Out-File $OutputFile -Append -Encoding UTF8
Get-Content src\infra\firebase.config.js | Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ AUTH SERVICE ================" | Out-File $OutputFile -Append -Encoding UTF8
Get-Content src\infra\auth\auth.service.js | Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ PASSKEY SERVICE ================" | Out-File $OutputFile -Append -Encoding UTF8
Get-Content src\infra\auth\passkey.service.js | Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ LOGIN ================" | Out-File $OutputFile -Append -Encoding UTF8
Get-Content src\components\auth\Login.jsx | Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ HOOK PASSKEY ================" | Out-File $OutputFile -Append -Encoding UTF8
Get-Content src\hooks\usePasskey.js | Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ BUSQUEDA FIREBASE AUTH ================" | Out-File $OutputFile -Append -Encoding UTF8
Get-ChildItem src -Recurse -Include *.js,*.jsx |
Select-String "createUserWithEmailAndPassword|signInWithEmailAndPassword|signInWithCustomToken|signInAnonymously|onAuthStateChanged|getAuth|currentUser" |
Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ BUSQUEDA PASSKEY ================" | Out-File $OutputFile -Append -Encoding UTF8
Get-ChildItem src -Recurse -Include *.js,*.jsx |
Select-String "registerPasskey|authenticateWithPasskey|hasPasskey|removePasskey|PublicKeyCredential|navigator.credentials" |
Out-File $OutputFile -Append -Encoding UTF8

"`r`n================ ENV (SIN SECRETOS) ================" | Out-File $OutputFile -Append -Encoding UTF8

if (Test-Path ".env.local") {
Get-Content .env.local |
ForEach-Object {
if ($_ -match "=") {
$name = $*.Split("=")[0]
"$name=***"
}
else {
$*
}
} | Out-File $OutputFile -Append -Encoding UTF8
}

Write-Host ""
Write-Host "Generado: auditoria-completa.txt"
Write-Host ""
