Save searches - Job alert
Job Alert — Frontend Integration Guide 
Overview
Job alerts work through Saved Searches. A candidate saves their current job search filters as a named alert. When an employer publishes a job that matches those filters, the system automatically notifies the candidate via push and/or email.
Frontend responsibility: Let candidates create, manage, and toggle their saved searches using the APIs below.
Alert Frequency — All Three Work
Frequency
When alert fires
instant
Immediately when a matching job is published
daily
Every day at 8:00 AM — digest of all matches from last 24h
weekly
Every Monday at 8:00 AM — digest of all matches from last 7 days
Show all three options in the UI. All are active.
API Reference
1. Create Saved Search
When to call: When candidate clicks "Save this search" or "Get Job Alerts" on the search results page.
POST /users/me/saved-searches
Request Body
{
  "name": "Full Stack Jobs · Remote",
  "searchCriteria": "{\"keyword\":\"React\",\"jobType\":[\"full_time\"],\"workMode\":[\"remote\",\"hybrid\"],\"salaryMin\":235000,\"salaryMax\":700000}",
  "alertEnabled": true,
  "alertFrequency": "instant",
  "alertChannels": "email,push"
}
Field Details
Field
Type
Required
Default
Description
name
string
Yes
—
User-defined label. Auto-generate from active filters
searchCriteria
string
Yes
—
JSON stringified object of filters. See full explanation below
alertEnabled
boolean
No
true
Enable or disable alerts
alertFrequency
string
No
"daily"
"instant" | "daily" | "weekly"
alertChannels
string
No
"email,push"
Comma-separated: "email,push" | "email" | "email,sms,push"
Understanding searchCriteria — The Most Important Part
Why stringify?
The backend stores searchCriteria as a plain text column (not JSON/JSONB). It expects a string, not an object. If you send a raw JavaScript object, the request will fail validation.
//  WRONG — sends an object
searchCriteria: { keyword: "React", jobType: ["full_time"] }

//  CORRECT — sends a string
searchCriteria: JSON.stringify({ keyword: "React", jobType: ["full_time"] })
// result: "{\"keyword\":\"React\",\"jobType\":[\"full_time\"]}"
What goes inside searchCriteria?
Only include fields that the backend actually uses for matching when a new job is published. The backend evaluates these fields against every new job to decide who gets notified.
Fields the backend matches against
searchCriteria key
Type
How it matches
keyword
string
Job title contains this word (case-insensitive)
location
string
Job location / city / state contains this (case-insensitive)
city
string
Job city contains this
state
string
Job state contains this
categoryId
string (UUID)
Job category ID must exactly match
jobType
string[]
At least one value must overlap with job's jobType
workMode
string[]
At least one value must overlap with job's workMode
skills
string[]
At least one skill name must match job's skills
salaryMin
number
Job's max salary must be ≥ this value
salaryMax
number
Job's min salary must be ≤ this value
Empty criteria "{}" matches every job — warn the user if no filters are active before saving.
Mapping Your Search URL to searchCriteria
Your current search URL:
/search/jobs?page=1&limit=10&company=Krish&postedWithin=all&sortBy=salary_desc
&salaryMin=235000&salaryMax=700000&industry=Information+Technology
&companyType=mnc&workModes=remote&experienceLevels=1,fresher,2,3
&payRate=monthly,weekly&jobType=full_time&locationType=remote,onsite,hybrid
&department=Full+Stack+Developer
Full Mapping Table
Search URL param
searchCriteria key
Action
Reason
query
keyword
 Rename
Matched against job title
location
location
 Keep
Matched against job location
categoryId
categoryId
 Keep
Matched against job category
jobType
jobType
 Keep as array
Matched against job's jobType array
workModes
workMode
 Rename + merge with locationType
Both map to the same job field
locationType
workMode
 Merge with workModes, deduplicate
Both map to the same job field
salaryMin
salaryMin
 Keep as number
Matched against job salary range
salaryMax
salaryMax
 Keep as number
Matched against job salary range
skillIds
skills
 Resolve to name strings first
Backend matches skill names not IDs
company
 Drop
Not matched by backend
companyType
 Drop
Not matched by backend
industry
 Drop
Not matched by backend
department
 Drop
Not matched by backend
experienceLevels
 Drop
Not matched by backend
payRate
 Drop
Not matched by backend
postedWithin
 Drop
Time filter — irrelevant for future alerts
sortBy, page, limit
 Drop
Display/pagination only
Your URL Converted
From this URL, the resulting searchCriteria object (before stringify):
{
  "salaryMin": 235000,
  "salaryMax": 700000,
  "jobType": ["full_time"],
  "workMode": ["remote", "onsite", "hybrid"]
}
workModes=remote + locationType=remote,onsite,hybrid → merged and deduplicated into workMode: ["remote", "onsite", "hybrid"]
Full request body for your URL:
{
  "name": "Full Stack Jobs · Remote",
  "searchCriteria": "{\"salaryMin\":235000,\"salaryMax\":700000,\"jobType\":[\"full_time\"],\"workMode\":[\"remote\",\"onsite\",\"hybrid\"]}",
  "alertEnabled": true,
  "alertFrequency": "instant",
  "alertChannels": "email,push"
}
Conversion Function (JavaScript/TypeScript)
function buildSearchCriteria(urlParams) {
  const criteria = {};

  // keyword (from query param "query")
  if (urlParams.query?.trim())
    criteria.keyword = urlParams.query.trim();

  // location
  if (urlParams.location?.trim())
    criteria.location = urlParams.location.trim();

  if (urlParams.city?.trim())
    criteria.city = urlParams.city.trim();

  if (urlParams.state?.trim())
    criteria.state = urlParams.state.trim();

  // category
  if (urlParams.categoryId)
    criteria.categoryId = urlParams.categoryId;

  // jobType — keep as array
  if (urlParams.jobType?.length)
    criteria.jobType = urlParams.jobType;

  // workMode — merge workModes + locationType, deduplicate
  const workModeSet = new Set([
    ...(urlParams.workModes    || []),
    ...(urlParams.locationType || []),
  ]);
  if (workModeSet.size)
    criteria.workMode = [...workModeSet];

  // salary — cast to number
  if (urlParams.salaryMin != null)
    criteria.salaryMin = Number(urlParams.salaryMin);

  if (urlParams.salaryMax != null)
    criteria.salaryMax = Number(urlParams.salaryMax);

  // skills — must be NAME strings, not IDs
  // resolve skillIds → names from your local skill list first
  if (urlParams.skills?.length)
    criteria.skills = urlParams.skills;

  //  Must stringify — backend expects a string, not an object
  return JSON.stringify(criteria);
}

function generateAlertName(urlParams) {
  const parts = [];
  if (urlParams.query)    parts.push(urlParams.query);
  if (urlParams.location) parts.push(urlParams.location);
  if (urlParams.jobType?.includes('full_time')) parts.push('Full-time');
  if (!parts.length)      parts.push('All Jobs');
  return parts.join(' · ').slice(0, 80);
}
Usage:
const body = {
  name: generateAlertName(urlParams),
  searchCriteria: buildSearchCriteria(urlParams),  // already stringified
  alertEnabled: true,
  alertFrequency: 'instant',
  alertChannels: 'email,push',
};

await api.post('/users/me/saved-searches', body);
Success Response 201
{
  "message": "Search saved successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "user-uuid",
    "name": "Full Stack Jobs · Remote",
    "searchCriteria": "{\"salaryMin\":235000,\"salaryMax\":700000,\"jobType\":[\"full_time\"],\"workMode\":[\"remote\",\"onsite\",\"hybrid\"]}",
    "alertEnabled": true,
    "alertFrequency": "instant",
    "alertChannels": "email,push",
    "alertCount": 0,
    "lastAlertSent": null,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
Error 400 — limit reached
{
  "message": "You can have a maximum of 5 saved searches"
}
2. List Saved Searches
When to call: On the job alerts management page or dashboard widget load.
GET /users/me/saved-searches
Query Params (all optional)
Param
Type
Example
Description
isActive
boolean
?isActive=true
Filter by active status
alertEnabled
boolean
?alertEnabled=true
Filter alerts-enabled only
Success Response 200
{
  "message": "Saved searches fetched successfully",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Full Stack Jobs · Remote",
      "searchCriteria": "{\"salaryMin\":235000,\"salaryMax\":700000,\"jobType\":[\"full_time\"],\"workMode\":[\"remote\",\"onsite\",\"hybrid\"]}",
      "alertEnabled": true,
      "alertFrequency": "instant",
      "alertChannels": "email,push",
      "alertCount": 12,
      "lastAlertSent": "2024-03-10T08:00:00Z",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-03-10T08:00:00Z"
    }
  ]
}
Display tips:
Parse searchCriteria with JSON.parse() to show human-readable filter summary
Show alertCount as "12 alerts sent"
Show lastAlertSent as "Last match: Mar 10"
Show slot usage: "1 / 5 alerts used" using data.length
alertEnabled drives the toggle switch initial state
3. Get Single Saved Search
When to call: Opening the edit screen for a specific alert.
GET /users/me/saved-searches/:id
Success Response 200: Same shape as a single item from the list above.
Error 404: Not found or belongs to another user.
4. Update Saved Search
When to call: Candidate edits name, frequency, channels, or re-saves with updated filters.
PUT /users/me/saved-searches/:id
Request Body (all fields optional — only send what changed):
{
  "name": "Senior React Jobs · Remote",
  "alertFrequency": "daily",
  "alertChannels": "email",
  "searchCriteria": "{\"keyword\":\"Senior React\",\"workMode\":[\"remote\"],\"salaryMin\":1000000}"
}
When re-saving after filter changes, run the same buildSearchCriteria() function and send the updated stringified value.
Success Response 200: Returns the full updated saved search object.
5. Delete Saved Search
When to call: Candidate removes an alert. Frees up one slot from the 5-alert limit.
DELETE /users/me/saved-searches/:id
Success Response 200:
{
  "message": "Saved search deleted successfully",
  "data": {}
}
6. Toggle Alerts On/Off
When to call: Candidate flips the alert toggle switch. No request body needed.
PUT /users/me/saved-searches/:id/toggle-alerts
Each call flips the current state — if alertEnabled was true it becomes false and vice versa.
Do not use PUT /:id with alertEnabled field for toggling — use this dedicated endpoint. It guarantees an atomic flip.
Success Response 200:
{
  "message": "Alerts toggled successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "alertEnabled": false,
    "updatedAt": "2024-03-15T00:00:00Z"
  }
}
UX Flow
Flow 1 — Search Page → Save Alert
Candidate applies filters → sees job results
           ↓
Clicks "Save Search" / "Get Job Alerts"
           ↓
Modal / Bottom sheet opens:
  ┌─────────────────────────────────┐
  │ Alert name  [Full Stack · Remote]│
  │ Frequency   ○ Instant            │
  │             ○ Daily              │
  │             ○ Weekly             │
  │ Channels     Email   Push      │
  │                   [Save Alert]   │
  └─────────────────────────────────┘
           ↓
On "Save Alert":
  name           = generateAlertName(activeFilters)
  searchCriteria = buildSearchCriteria(activeFilters)  // JSON.stringify'd
  alertFrequency = selected value
  alertChannels  = selected channels joined by comma
           ↓
POST /users/me/saved-searches
           ↓
201 → "Job alert saved!" toast
400 → "You've reached the 5 alert limit.
       Delete one to add a new one."
Flow 2 — Manage Alerts Page
Page loads
  ↓
GET /users/me/saved-searches
  ↓
Render each saved search:
  ┌──────────────────────────────────────────┐
  │ Full Stack Jobs · Remote          [ ● ]  │  ← alertEnabled toggle
  │ Full-time · Remote · ₹2.35L–₹7L         │  ← parsed from searchCriteria
  │ Instant · Email + Push                   │
  │ 12 alerts sent · Last match: Mar 10      │  ← alertCount + lastAlertSent
  │                          [Edit] [Delete] │
  └──────────────────────────────────────────┘
  "1 / 5 alerts used"                         ← data.length / 5

Toggle flipped   → PUT /:id/toggle-alerts
Edit tapped      → load GET /:id → edit form → PUT /:id on save
Delete tapped    → DELETE /:id → remove from list
Flow 3 — Receiving Notifications
Instant alert (fires when job is published):
Push: Title: "New Job Match" · Body: "React Developer at Acme Corp — Bangalore"
Email: Single job email with "View Job" button
Daily / Weekly digest (fires at 8 AM):
Push: Title: "5 new jobs for you" · Body: "Full Stack Jobs · Remote — 5 new matches today"
Email: All matching jobs listed in one email (up to 10 shown)
On push tap — navigate to:
Push data payload
Navigate to
{ type: "JOB_ALERT", jobId: "uuid" }
Job detail screen /jobs/:jobId
{ type: "JOB_ALERT_DIGEST", savedSearchId: "uuid", count: 5 }
Job alerts list or search results page
Key Rules Summary
Rule
Detail
Max saved searches
5 per user — show (X / 5) in UI, disable "Save" when at limit
searchCriteria must be stringified
Always JSON.stringify(filtersObject) — never send a raw object
alertChannels is a string
"email,push" — comma-separated, not an array
Skills must be name strings
Resolve skillIds → names before calling buildSearchCriteria()
workModes + locationType
Merge both into one workMode array, deduplicate
Drop these params
company, companyType, industry, department, experienceLevels, payRate, postedWithin, sortBy, page, limit
Toggle switch
Read alertEnabled from list response for initial state, call toggle endpoint on flip
Empty criteria
"{}" matches all jobs — warn user if no filters are active
Parse on display
JSON.parse(searchCriteria) to show human-readable filter summary in UI
Push tap — instant
Navigate to /jobs/:jobId
Push tap — digest
Navigate to saved searches list or search results
Error Handling
Status
Meaning
Show to user
201
Alert created
"Job alert saved!" toast
200
Success
Silent or "Saved"
400
Max 5 limit
"You've reached the 5 alert limit. Delete one to add a new one."
401
Not logged in
Redirect to login
404
Alert not found
Refresh the list
