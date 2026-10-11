# Live API and End-to-End Verification Script
$ErrorActionPreference = 'Stop'

Write-Host "=========================================================="
Write-Host "CampusPulse Live API & Security Verification Suite"
Write-Host "=========================================================="

# 1. Public Event Discovery
Write-Host "`n[Step 1] GET /api/events (Public Discovery)"
$events = Invoke-RestMethod -Uri 'http://localhost:8080/api/events' -Method GET
Write-Host " -> Public event count returned: $($events.Count)"

# 2. Access Control: Unauthorized Event Creation without Token
Write-Host "`n[Step 2] POST /api/events (Unauthorized Check)"
try {
    $res = Invoke-RestMethod -Uri 'http://localhost:8080/api/events' -Method POST -Body '{}' -ContentType 'application/json'
    Write-Error "FAIL: Unauthorized creation was allowed!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host " -> Correctly blocked with HTTP status: $statusCode (Unauthorized)"
    if ($statusCode -ne 401) { throw "Expected 401 but got $statusCode" }
}

# 3. Authentication: Invalid Credentials
Write-Host "`n[Step 3] POST /api/auth/login (Invalid Credentials Check)"
try {
    $badLogin = @{ email = 'admin@campuspulse.edu'; password = 'WrongPassword!' } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method POST -Body $badLogin -ContentType 'application/json'
    Write-Error "FAIL: Invalid credentials were accepted!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host " -> Correctly rejected with HTTP status: $statusCode (Unauthorized)"
    if ($statusCode -ne 401) { throw "Expected 401 but got $statusCode" }
}

# 4. Authentication: Valid Admin Login
Write-Host "`n[Step 4] POST /api/auth/login (Valid Admin Login)"
$goodLogin = @{ email = 'admin@campuspulse.edu'; password = 'AdminPassword123!' } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method POST -Body $goodLogin -ContentType 'application/json'
$token = $loginRes.token
Write-Host " -> Login successful. Token received: $(($token -ne $null)) | Role: $($loginRes.admin.role)"
if (-not $token) { throw "Token was null" }

# 5. Session Verification: /api/auth/me
Write-Host "`n[Step 5] GET /api/auth/me (Authenticated Session Check)"
$authHeader = @{ Authorization = "Bearer $token" }
$meRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/me' -Method GET -Headers $authHeader
Write-Host " -> Session verified. Admin Email: $($meRes.email) | ID: $($meRes.id)"

# 6. Admin Operation: Create New Event
Write-Host "`n[Step 6] POST /api/events (Create Event)"
$newEvent = @{
    title = 'Live Integration Hackathon 2026'
    description = 'Real-time end-to-end integration test hackathon for CampusPulse verification.'
    eventType = 'HACKATHON'
    status = 'PUBLISHED'
    location = 'Main Campus Auditorium & Lab 4'
    startDateTime = '2026-11-25T09:00:00'
    endDateTime = '2026-11-27T18:00:00'
    registrationDeadline = '2026-11-20T23:59:59'
    maxCapacity = 200
    organizerName = 'Hackathon Society'
    contactEmail = 'hack@campuspulse.edu'
    whatsappNumber = '+919876543210'
} | ConvertTo-Json

$createdEvt = Invoke-RestMethod -Uri 'http://localhost:8080/api/events' -Method POST -Body $newEvent -ContentType 'application/json' -Headers $authHeader
Write-Host " -> Event created successfully. ID: $($createdEvt.id) | Title: '$($createdEvt.title)'"

# 7. Public Visibility Verification
Write-Host "`n[Step 7] GET /api/events/$($createdEvt.id) (Public Detail Fetch)"
$fetchedEvt = Invoke-RestMethod -Uri "http://localhost:8080/api/events/$($createdEvt.id)" -Method GET
Write-Host " -> Public event retrieved: '$($fetchedEvt.title)' | Status: $($fetchedEvt.status) | Venue: $($fetchedEvt.location)"

# 8. Admin Operation: Update Event
Write-Host "`n[Step 8] PUT /api/events/$($createdEvt.id) (Update Event)"
$updatePayload = @{
    title = 'Live Integration Hackathon 2026 (Updated)'
    description = 'Updated description for live verification test.'
    eventType = 'HACKATHON'
    status = 'PUBLISHED'
    location = 'Main Campus Auditorium & Innovation Hall'
    startDateTime = '2026-11-25T09:00:00'
    endDateTime = '2026-11-27T18:00:00'
    registrationDeadline = '2026-11-20T23:59:59'
    maxCapacity = 250
    organizerName = 'Hackathon Society'
    contactEmail = 'hack@campuspulse.edu'
} | ConvertTo-Json

$updatedEvt = Invoke-RestMethod -Uri "http://localhost:8080/api/events/$($createdEvt.id)" -Method PUT -Body $updatePayload -ContentType 'application/json' -Headers $authHeader
Write-Host " -> Event updated. New Title: '$($updatedEvt.title)' | Capacity: $($updatedEvt.maxCapacity)"

# 9. Validation Enforcement: Invalid Dates & Fields
Write-Host "`n[Step 9] POST /api/events (Invalid Payload 400 Validation Check)"
try {
    $invalidPayload = @{
        title = ''
        description = ''
        eventType = 'HACKATHON'
        location = ''
        startDateTime = '2026-11-25T09:00:00'
        endDateTime = '2026-11-20T09:00:00' # end before start
        registrationDeadline = '2026-11-26T09:00:00' # deadline after start
        organizerName = ''
        contactEmail = 'invalid-email'
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri 'http://localhost:8080/api/events' -Method POST -Body $invalidPayload -ContentType 'application/json' -Headers $authHeader
    Write-Error "FAIL: Invalid payload was accepted!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host " -> Correctly rejected with HTTP status: $statusCode (Bad Request)"
    if ($statusCode -ne 400) { throw "Expected 400 but got $statusCode" }
}

# 10. Admin Operation: Delete Event
Write-Host "`n[Step 10] DELETE /api/events/$($createdEvt.id) (Delete Event)"
$deleteRes = Invoke-RestMethod -Uri "http://localhost:8080/api/events/$($createdEvt.id)" -Method DELETE -Headers $authHeader
Write-Host " -> Event deleted successfully via DELETE /api/events/$($createdEvt.id)"

# 11. Verify Event is Deleted (404)
Write-Host "`n[Step 11] GET /api/events/$($createdEvt.id) (Post-deletion 404 Check)"
try {
    $res = Invoke-RestMethod -Uri "http://localhost:8080/api/events/$($createdEvt.id)" -Method GET
    Write-Error "FAIL: Deleted event is still returned!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host " -> Correctly returned HTTP status: $statusCode (Not Found)"
    if ($statusCode -ne 404) { throw "Expected 404 but got $statusCode" }
}

# 12. Unauthorized Access After Token Invalidation / Tampering
Write-Host "`n[Step 12] GET /api/auth/me with Tampered Token (401 Check)"
try {
    $tamperedHeader = @{ Authorization = "Bearer invalid.jwt.token" }
    $res = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/me' -Method GET -Headers $tamperedHeader
    Write-Error "FAIL: Tampered token was accepted!"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host " -> Correctly rejected tampered token with HTTP status: $statusCode (Unauthorized)"
    if ($statusCode -ne 401) { throw "Expected 401 but got $statusCode" }
}

Write-Host "`n=========================================================="
Write-Host "VERIFICATION RESULT: ALL 12 LIVE BACKEND API CHECKS PASSED!"
Write-Host "=========================================================="
