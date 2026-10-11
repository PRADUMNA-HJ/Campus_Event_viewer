$loginRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method POST -Body (@{ email = 'admin@campuspulse.edu'; password = 'AdminPassword123!' } | ConvertTo-Json) -ContentType 'application/json'
$headers = @{ Authorization = "Bearer $($loginRes.token)" }

$event1 = @{
  title = 'Campus Hackathon 2026'
  description = '48-hour competitive campus hackathon for innovative students across all engineering branches.'
  eventType = 'HACKATHON'
  status = 'PUBLISHED'
  location = 'Main Campus Tech Arena'
  startDateTime = '2026-11-20T09:00:00'
  endDateTime = '2026-11-22T18:00:00'
  registrationDeadline = '2026-11-18T23:59:59'
  maxCapacity = 120
  organizerName = 'Campus Coding Club'
  contactEmail = 'hack@campuspulse.edu'
  whatsappNumber = '+919876543210'
} | ConvertTo-Json

$event2 = @{
  title = 'Spring Web Development Workshop'
  description = 'Hands-on full stack workshop covering modern React and Spring Boot integration patterns.'
  eventType = 'WORKSHOP'
  status = 'PUBLISHED'
  location = 'Computer Science Building Lab 2'
  startDateTime = '2026-11-28T10:00:00'
  endDateTime = '2026-11-28T16:00:00'
  registrationDeadline = '2026-11-26T23:59:59'
  maxCapacity = 60
  organizerName = 'Web Development Guild'
  contactEmail = 'webguild@campuspulse.edu'
} | ConvertTo-Json

$c1 = Invoke-RestMethod -Uri 'http://localhost:8080/api/events' -Method POST -Body $event1 -ContentType 'application/json' -Headers $headers
$c2 = Invoke-RestMethod -Uri 'http://localhost:8080/api/events' -Method POST -Body $event2 -ContentType 'application/json' -Headers $headers

Write-Host "Created event 1: $($c1.id) - $($c1.title)"
Write-Host "Created event 2: $($c2.id) - $($c2.title)"
