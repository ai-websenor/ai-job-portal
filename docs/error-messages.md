# Error Messages Reference

All errors return JSON: `{"detail": "error message"}`.

## /parse (Upload Resume)

| HTTP | Error Message | Cause | Resolution |
|------|--------------|-------|------------|
| 400 | `Unsupported file type: {type}. Only PDF and DOCX allowed.` | Non-PDF/DOCX uploaded | Upload .pdf or .docx file |
| 400 | `File too large. Max 10MB.` | File exceeds size limit | Reduce file size or compress |
| 422 | `Could not read PDF file: {detail}` | Corrupt or password-protected PDF | Upload a valid, unprotected PDF |
| 422 | `No text found in PDF` | Scanned/image-only PDF | Upload a text-based PDF (not scanned) |
| 422 | `Could not read DOCX file: {detail}` | Corrupt DOCX file | Upload a valid DOCX |
| 422 | `No text found in DOCX` | Empty DOCX | Upload DOCX with content |
| 422 | `Could not extract resume data. Try a different file or format.` | LLM failed to parse any data | Try a different resume format |
| 503 | `AI service timeout` | Model server took too long | Retry after 30s |
| 503 | `AI service busy` | Model server is overloaded | Retry after 10s |
| 503 | `AI service starting up` | Model server is warming or unavailable | Retry after 60s |
| 503 | `AI service returned empty response` | Model server returned no data | Retry |

**Note:** S3 upload failure does NOT return an error. Response includes `"s3_uploaded": false` to indicate S3 save failed.

## /parse-s3 (Parse from S3)

| HTTP | Error Message | Cause | Resolution |
|------|--------------|-------|------------|
| 400 | `Unsupported file type. S3 key must end with .pdf or .docx` | Wrong file extension | Use correct S3 key ending in .pdf or .docx |
| 404 | `File not found in storage: {key}` | S3 key doesn't exist | Verify S3 key exists |
| 422 | `s3_key must be 1-1024 characters` | Key too long or empty | Use valid S3 key |
| 422 | `s3_key must not contain path traversal` | Key contains `..` | Remove `..` from S3 key |
| 422 | `user_id must be a valid UUID` | Bad user_id format | Use UUID format (e.g. `d0000000-...`) |
| 422 | `resume_id must be a valid UUID` | Bad resume_id format | Use UUID format |
| 422 | `Could not read PDF file: {detail}` | Corrupt PDF in S3 | Re-upload valid file |
| 422 | `Could not extract resume data. Try a different file or format.` | LLM parse failure | Try different resume |
| 503 | `Storage access denied` | S3 IAM permission issue | Check IAM role/policy |
| 503 | `Storage unavailable` | S3 service error | Retry after 5s |
| 503 | `AI service timeout` | Model server timeout | Retry after 30s |
| 503 | `AI service busy` | Model server overloaded | Retry after 10s |

**Note:** DB save failure (when `save_to_db=true`) is logged but does NOT return an error. Parse result is still returned.

## /chat (Job Chatbot)

| HTTP | Error Message | Cause | Resolution |
|------|--------------|-------|------------|
| 422 | `job_id must be a valid UUID` | Invalid job_id format | Use UUID format |
| 422 | `message must not be empty` | Empty or whitespace message | Provide a message |
| 422 | `message must be under 2000 characters` | Message too long | Shorten to under 2000 chars |
| 422 | `session_id must be 1-128 characters` | Session ID too long or empty | Use 1-128 char session ID |
| 503 | `Service temporarily unavailable` | Database connection failed | Retry after 5s |
| 503 | `AI service timeout` | Model server timeout | Retry after 30s |
| 503 | `AI service busy` | Model server overloaded | Retry after 10s |

## /recommend (Job Recommendations)

| HTTP | Error Message | Cause | Resolution |
|------|--------------|-------|------------|
| 422 | `user_id must be a valid UUID` | Invalid or missing user_id | Pass valid UUID |
| 422 | `Maximum 50 skills allowed` | Too many skills in array | Reduce to 50 or fewer |
| 422 | `Each skill must be under 100 characters` | Skill string too long | Shorten skill names |
| 422 | `experience_years must be between 0 and 60` | Out of range | Use 0-60 |
| 422 | `location must be under 200 characters` | Location string too long | Shorten location |
| 503 | `Service temporarily unavailable` | Database connection failed | Retry after 5s |
| 503 | `AI service timeout` | Model server timeout | Retry after 30s |
| 503 | `AI service busy` | Model server overloaded | Retry after 10s |

## Retry Strategy

| HTTP | Wait | Max Retries |
|------|------|-------------|
| 503 (AI service starting up) | 60s | 3 |
| 503 (AI service timeout) | 30s | 2 |
| 503 (AI service busy) | 10s | 3 |
| 503 (DB/Storage) | 5s | 3 |
| 422 | Do not retry | - |
| 400 | Do not retry | - |
| 404 | Do not retry | - |
