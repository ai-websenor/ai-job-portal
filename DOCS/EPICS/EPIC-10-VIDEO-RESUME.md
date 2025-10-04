# EPIC-10: Video Resume & Profile

## Epic Overview
Implement a comprehensive video resume feature that allows job seekers to record or upload video introductions, and enables employers to view these videos as part of candidate profiles, adding a personal dimension to applications.

---

## Business Value
- Differentiate platform with innovative feature
- Enable candidates to showcase personality and communication skills
- Help employers make better hiring decisions
- Increase candidate engagement and profile quality
- Support blue-collar workers who may prefer video over text
- Enhance employer-candidate connection

---

## User Stories

### US-10.1: Upload Pre-recorded Video Resume
**As a** job seeker
**I want to** upload my pre-recorded video resume
**So that** employers can see my presentation skills

**Acceptance Criteria:**
- Video upload interface in profile section
- Supported video formats:
  - MP4 (recommended)
  - MOV
  - AVI
  - WebM
  - MKV

- Video specifications:
  - Maximum duration: 2 minutes (recommended 60-90 seconds)
  - Maximum file size: 100MB
  - Minimum resolution: 480p
  - Recommended: 720p or 1080p
  - Aspect ratio: 16:9 or 4:3

- Upload process:
  - Drag-and-drop or file browser
  - Upload progress bar
  - File validation (format, size, duration)
  - Video thumbnail generation (auto or manual selection)
  - Video preview before saving

- Post-upload processing:
  - Video transcoding to standard format (MP4, H.264 codec)
  - Generate multiple resolutions (480p, 720p)
  - Create thumbnail image
  - Extract metadata (duration, resolution)
  - Virus/malware scan

- Replace/delete video option
- Video privacy settings (who can view)

---

### US-10.2: Record Video Resume (Web Browser)
**As a** job seeker
**I want to** record my video resume directly from my browser
**So that** I don't need external recording tools

**Acceptance Criteria:**
- In-browser video recording using WebRTC
- Recording interface:
  - Camera and microphone permissions request
  - Live camera preview (before recording)
  - Camera selection (if multiple cameras)
  - Microphone selection (if multiple)
  - Flip camera (front/back on mobile)

- Recording controls:
  - Record button (start recording)
  - Pause/Resume button
  - Stop button (end recording)
  - Timer display (elapsed time)
  - Maximum duration enforced (2 minutes)

- Recording tips displayed:
  - "Look at the camera"
  - "Speak clearly and confidently"
  - "Keep it under 90 seconds"
  - "Introduce yourself and highlight key skills"

- Post-recording:
  - Playback recorded video
  - Retake option (record again)
  - Use recording option (save to profile)
  - Countdown before recording starts (3-2-1)

- Handle browser compatibility:
  - Chrome, Firefox, Safari, Edge
  - Fallback for unsupported browsers (upload only)

- Handle permissions denial:
  - Clear error message
  - Instructions to enable permissions
  - Fallback to upload option

---

### US-10.3: Video Resume Recording (Mobile App)
**As a** job seeker
**I want to** record my video resume from my mobile app
**So that** I can easily create it on-the-go

**Acceptance Criteria:**
- Native mobile camera integration (iOS and Android)
- Recording interface:
  - Front camera default (selfie mode)
  - Switch to back camera option
  - Flash on/off toggle
  - Grid lines for framing
  - Focus and exposure controls

- Recording controls:
  - Record button
  - Pause/Resume
  - Stop button
  - Timer display
  - Maximum duration enforced

- Pre-recording features:
  - Camera preview
  - Orientation lock (portrait/landscape)
  - Microphone test (audio level indicator)

- Post-recording:
  - Preview recorded video
  - Trim video (optional)
  - Retake option
  - Save to profile
  - Share to other apps

- Handle permissions:
  - Camera permission
  - Microphone permission
  - Storage permission (to save)

- Quality settings:
  - Auto-select based on network (WiFi vs mobile data)
  - Manual quality selection (High/Medium/Low)

---

### US-10.4: Video Resume Guidelines & Tips
**As a** job seeker
**I want** guidance on creating a good video resume
**So that** I make a positive impression

**Acceptance Criteria:**
- Video resume tips page/modal:
  - **Content Tips:**
    - Introduce yourself (name, current role)
    - Highlight 2-3 key skills or achievements
    - Explain why you're a good fit
    - Express enthusiasm
    - Keep it professional yet personable
    - End with a call-to-action

  - **Technical Tips:**
    - Use good lighting (face the light source)
    - Quiet environment (no background noise)
    - Stable camera (use tripod or prop)
    - Clean background (professional setting)
    - Dress professionally
    - Look at the camera (not the screen)
    - Speak clearly and at moderate pace

  - **Duration:**
    - Optimal length: 60-90 seconds
    - Maximum: 2 minutes
    - Practice before recording

- Sample video resumes:
  - "Good example" videos
  - "What not to do" videos
  - Different roles and industries

- Pre-recording checklist:
  - ☐ Good lighting
  - ☐ Quiet location
  - ☐ Professional attire
  - ☐ Prepared script/talking points
  - ☐ Camera at eye level

- Script template (optional):
  - "Hi, I'm [Name], a [Role] with [X] years of experience in [Industry]..."
  - "My key strengths are [Skill 1], [Skill 2], and [Skill 3]..."
  - "I'm excited about this opportunity because..."

---

### US-10.5: Video Resume Player (Employer View)
**As an** employer
**I want to** view candidate video resumes
**So that** I can assess their communication skills and personality

**Acceptance Criteria:**
- Video player in candidate profile
- Player features:
  - Play/Pause button
  - Volume control
  - Mute/Unmute
  - Fullscreen mode
  - Playback speed (0.5x, 1x, 1.25x, 1.5x, 2x)
  - Seek bar (timeline)
  - Current time / Total duration
  - Quality selector (if multiple resolutions)

- Player UI:
  - Responsive design (desktop and mobile)
  - Custom controls (branded)
  - Loading indicator
  - Error handling (video unavailable)

- Video thumbnail:
  - Display before playing
  - Play button overlay
  - Candidate photo fallback (if no video)

- Video analytics (track for candidate):
  - Number of views
  - Watch duration (average)
  - Completion rate (% who watched till end)
  - Unique viewers

- Download video option (for employers):
  - Download for offline viewing
  - Track downloads

- Video visibility:
  - Only visible to employers viewing application
  - Respect candidate's privacy settings

---

### US-10.6: Video Resume Moderation
**As a** platform administrator
**I want to** moderate video resumes
**So that** inappropriate content is removed

**Acceptance Criteria:**
- Admin moderation dashboard:
  - List of newly uploaded videos (pending review)
  - Video player for preview
  - Approve/Reject buttons
  - Rejection reason (dropdown)

- Automated moderation (AI):
  - Content moderation API (AWS Rekognition, Google Video Intelligence)
  - Detect inappropriate content:
    - Nudity or sexual content
    - Violence or graphic content
    - Hate symbols or gestures
    - Spam or promotional content
  - Flag for manual review if confidence low

- Manual moderation:
  - Admin reviews flagged videos
  - Approve, reject, or request re-upload
  - Send notification to user

- Rejection reasons:
  - Inappropriate content
  - Poor audio/video quality
  - Not a video resume (promotional content)
  - Contains personal information that shouldn't be public
  - Other (specify)

- Auto-approve for verified users (optional)
- Moderation queue prioritization (newest first)
- Moderation SLA (review within 24 hours)

---

### US-10.7: Video Resume Analytics (Candidate View)
**As a** job seeker
**I want to** see analytics for my video resume
**So that** I know how effective it is

**Acceptance Criteria:**
- Video analytics dashboard in profile:
  - **View Metrics:**
    - Total views
    - Unique viewers
    - Views over time (chart)

  - **Engagement Metrics:**
    - Average watch time
    - Completion rate (% watched entire video)
    - Replay rate (% who watched more than once)

  - **Viewer Insights:**
    - Number of employers viewed
    - Companies that viewed (if not anonymous)
    - Applications after video view

  - **Conversion Metrics:**
    - Shortlist rate (after viewing video)
    - Interview invitation rate

- Comparison with profile views:
  - "Employers who viewed your video are 2x more likely to shortlist you"

- Tips to improve:
  - If low watch time: "Consider making your video more engaging in the first 10 seconds"
  - If low completion rate: "Reduce video length or improve content"

---

### US-10.8: Video Resume Transcription
**As a** job seeker
**I want** my video resume transcribed to text
**So that** it's searchable and accessible

**Acceptance Criteria:**
- Automatic speech-to-text transcription:
  - Use speech recognition API (Google Speech-to-Text, AWS Transcribe)
  - Support multiple languages
  - Generate time-stamped transcript

- Transcript display:
  - Shown below video player
  - Searchable text
  - Clickable timestamps (jump to that point in video)

- Transcript editing:
  - User can review and edit transcript
  - Fix inaccuracies
  - Add punctuation

- Accessibility:
  - Closed captions/subtitles in video player
  - Toggle captions on/off
  - Adjustable caption size and color

- SEO benefits:
  - Transcript indexed for search
  - Keywords extracted from transcript
  - Improve profile searchability

---

### US-10.9: Video Resume Privacy Controls
**As a** job seeker
**I want to** control who can see my video resume
**So that** I maintain my privacy

**Acceptance Criteria:**
- Privacy settings:
  - **Public:** Anyone can view (searchable by recruiters)
  - **Employers Only:** Only when I apply to a job
  - **Specific Companies:** Whitelist companies
  - **Private:** Only I can view

- Default setting: Employers Only
- Privacy settings easily accessible and editable
- Clear explanation of each privacy level
- Warning before making video public

- Employer view based on settings:
  - If "Employers Only": Visible when candidate applies
  - If "Private": Not visible to employers
  - If "Public": Visible in profile search

- Video removal:
  - Delete video anytime
  - Remove from all employer views
  - Confirm deletion

---

### US-10.10: Video Resume Optimization
**As a** platform
**I want** videos optimized for web delivery
**So that** playback is smooth and fast

**Acceptance Criteria:**
- Video processing pipeline:
  - Upload to cloud storage (AWS S3, Azure Blob)
  - Transcode to multiple formats and resolutions:
    - 1080p (high quality)
    - 720p (standard quality)
    - 480p (low quality for slow connections)
  - Generate HLS (HTTP Live Streaming) playlist
  - Adaptive bitrate streaming

- CDN delivery:
  - Serve videos from CDN (CloudFront, Cloudflare)
  - Geo-distributed for low latency
  - Cache videos at edge locations

- Compression:
  - H.264 codec (widely supported)
  - Optimize compression ratio (quality vs size)
  - Target bitrate: 500-1000 kbps

- Thumbnail generation:
  - Auto-generate from first frame or mid-point
  - Multiple thumbnail options for user to choose
  - High-quality image (JPG or PNG)

- Performance:
  - Video load time < 3 seconds
  - No buffering for decent connections
  - Progressive download (start playing before fully downloaded)

---

### US-10.11: Video Resume Expiry & Updates
**As a** job seeker
**I want to** update or replace my video resume
**So that** it stays current

**Acceptance Criteria:**
- Replace video option:
  - Upload/record new video
  - Replaces existing video
  - Old video deleted from storage
  - Maintain video analytics history

- Expiry reminder:
  - Suggest updating video after 12 months
  - "Your video resume is 1 year old. Consider updating it."

- Version history (optional):
  - Keep previous video versions
  - Compare analytics
  - Restore old version

- Video freshness indicator:
  - "Video uploaded 2 months ago"
  - Employers see when video was created

---

### US-10.12: Video Resume for Mobile Applicants
**As an** employer
**I want to** view video resumes on mobile
**So that** I can review candidates anywhere

**Acceptance Criteria:**
- Mobile-optimized video player:
  - Responsive design
  - Touch controls (tap to play/pause)
  - Swipe for volume/brightness (optional)
  - Rotate to fullscreen

- Mobile network optimization:
  - Adaptive quality based on connection
  - Lower quality for 3G/4G
  - Higher quality for WiFi
  - Option to download for offline viewing

- Mobile notifications:
  - "New candidate with video resume applied"
  - Tap to view video

---

### US-10.13: Video Resume Integration with Applications
**As an** employer
**I want** video resumes prominently displayed
**So that** I don't miss this valuable information

**Acceptance Criteria:**
- Video resume in applicant list:
  - Video icon/badge on applicant card
  - "Has video resume" indicator

- Video resume in applicant profile:
  - Prominently placed (top section)
  - Auto-play on page load (muted, optional)
  - Larger player on click

- Video resume in emails:
  - Email notifications include video thumbnail
  - Click to view in browser

- Sorting by video:
  - Filter/sort applicants: "Has video resume"
  - Prioritize candidates with video (optional)

---

### US-10.14: Video Resume Cost & Limits
**As a** platform
**I want to** manage video storage costs
**So that** the feature remains sustainable

**Acceptance Criteria:**
- Free tier limits:
  - 1 video resume per user
  - Maximum 2 minutes duration
  - Standard quality (720p)

- Premium tier benefits:
  - Multiple video resumes (up to 3)
  - Longer duration (up to 5 minutes)
  - Higher quality (1080p)
  - Priority video processing
  - Advanced analytics

- Storage management:
  - Delete videos from inactive accounts (6+ months)
  - Compress older videos more aggressively
  - Archive rarely viewed videos

- Bandwidth optimization:
  - Adaptive streaming
  - CDN caching
  - Progressive loading

---

### US-10.15: Video Resume Best Practices (Admin)
**As a** platform administrator
**I want to** provide best practices and examples
**So that** users create high-quality video resumes

**Acceptance Criteria:**
- Best practices guide:
  - Written guide with tips
  - Video tutorial (how to record)
  - Example scripts

- Sample video resumes:
  - Curated collection of excellent examples
  - Different industries and roles
  - Annotated with what makes them good

- Templates/prompts:
  - Intro template: "Hi, I'm [Name]..."
  - Skills highlight: "My top 3 skills are..."
  - Closing: "I look forward to contributing..."

- In-app tips:
  - Show tips before recording
  - Contextual help during recording
  - Post-recording feedback

---

## Technical Requirements

### Video Processing Stack
- **Video Upload:** Multipart upload, resumable uploads
- **Video Storage:** AWS S3, Azure Blob Storage, Google Cloud Storage
- **Video Transcoding:** AWS MediaConvert, FFmpeg, HandBrake
- **CDN:** CloudFront, Cloudflare, Fastly
- **Streaming:** HLS (HTTP Live Streaming), MPEG-DASH
- **Player:** Video.js, Plyr, Custom HTML5 player

### AI/ML for Moderation
- **Content Moderation:** AWS Rekognition, Google Video Intelligence API
- **Speech-to-Text:** Google Speech-to-Text, AWS Transcribe
- **Language Detection:** For transcription

### Database Schema

**Video Resumes Table:**
```sql
video_resumes (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  file_name: VARCHAR(255),
  original_url: VARCHAR(500),
  processed_urls: JSONB,
  thumbnail_url: VARCHAR(500),
  duration_seconds: INTEGER,
  file_size_mb: DECIMAL(10,2),
  resolution: VARCHAR(20),
  format: VARCHAR(20),
  transcription: TEXT,
  status: ENUM('uploading', 'processing', 'approved', 'rejected', 'active'),
  privacy_setting: ENUM('public', 'employers_only', 'private'),
  moderation_status: ENUM('pending', 'approved', 'rejected'),
  moderation_notes: TEXT,
  uploaded_at: TIMESTAMP,
  processed_at: TIMESTAMP,
  approved_at: TIMESTAMP
)
```

**Video Analytics Table:**
```sql
video_analytics (
  id: UUID PRIMARY KEY,
  video_id: UUID FOREIGN KEY REFERENCES video_resumes(id),
  viewer_id: UUID FOREIGN KEY REFERENCES users(id),
  view_duration_seconds: INTEGER,
  completed: BOOLEAN,
  viewed_at: TIMESTAMP,
  ip_address: VARCHAR(45),
  user_agent: TEXT
)
```

---

## API Endpoints

```
# Video Resume Upload
POST   /api/v1/video-resumes/upload              - Upload video file
POST   /api/v1/video-resumes/record              - Save recorded video (from browser)
GET    /api/v1/video-resumes                     - Get user's video resumes
GET    /api/v1/video-resumes/:id                 - Get video details
DELETE /api/v1/video-resumes/:id                 - Delete video
PUT    /api/v1/video-resumes/:id/privacy         - Update privacy settings

# Video Processing
GET    /api/v1/video-resumes/:id/status          - Check processing status
POST   /api/v1/video-resumes/:id/thumbnail       - Set custom thumbnail

# Video Analytics
GET    /api/v1/video-resumes/:id/analytics       - Get video analytics
POST   /api/v1/video-resumes/:id/view            - Track video view

# Admin Moderation
GET    /api/v1/admin/video-resumes/pending       - List videos pending moderation
PUT    /api/v1/admin/video-resumes/:id/approve   - Approve video
PUT    /api/v1/admin/video-resumes/:id/reject    - Reject video
```

---

## UI/UX Requirements

### Upload/Record Interface
- Large upload zone (drag-and-drop)
- Record button (prominent)
- Live camera preview
- Recording controls (intuitive)
- Progress indicators

### Video Player
- Modern, clean design
- Custom controls (branded)
- Responsive layout
- Accessibility features

### Mobile Interface
- Optimized for touch
- Vertical and horizontal orientation
- Simplified controls

---

## Testing Requirements

### Unit Tests
- Video upload validation
- File format conversion
- Thumbnail generation

### Integration Tests
- End-to-end upload flow
- Video processing pipeline
- CDN delivery

### Performance Tests
- Upload speed (large files)
- Video streaming quality
- CDN response time

### Browser/Device Testing
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- Mobile devices (iOS, Android)
- Different network conditions (WiFi, 4G, 3G)

---

## Success Metrics

- Video resume adoption rate > 30%
- Video completion rate (employers) > 70%
- Candidates with video get shortlisted 20% more
- User satisfaction with video feature > 4.2/5
- Average video quality score > 8/10
- Video load time < 3 seconds
- Zero moderation issues (inappropriate content)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| High storage and bandwidth costs | High | Implement compression, CDN caching, free tier limits |
| Inappropriate content uploaded | High | AI moderation, manual review, user reporting |
| Poor video quality by users | Medium | Provide guidelines, examples, quality checks |
| Browser compatibility issues | Medium | Test thoroughly, provide fallbacks, upload option |
| Privacy concerns | High | Clear privacy controls, secure storage, user consent |
| Slow video processing | Medium | Asynchronous processing, queue management, status updates |

---

## Acceptance Criteria (Epic Level)

- [ ] Video upload functional for all supported formats
- [ ] In-browser recording working (WebRTC)
- [ ] Mobile app recording integrated
- [ ] Video processing pipeline established
- [ ] Video player working on all platforms
- [ ] Transcription and captions generated
- [ ] Privacy controls functional
- [ ] Moderation system in place
- [ ] Analytics tracked and displayed
- [ ] CDN delivery optimized
- [ ] Guidelines and best practices available
- [ ] All APIs tested and documented
- [ ] Performance benchmarks met

---

## Timeline Estimate
**Duration:** 3-4 weeks

### Week 1: Upload & Storage
- Video upload interface
- File validation
- Cloud storage integration
- Video processing basics

### Week 2: Recording & Player
- Browser recording (WebRTC)
- Mobile recording
- Video player implementation
- Streaming setup

### Week 3: Advanced Features
- Transcription
- Moderation system
- Analytics
- Privacy controls

### Week 4: Testing & Optimization
- Cross-browser testing
- Performance optimization
- CDN configuration
- Documentation

---

## Related Epics
- EPIC-02: Job Seeker Profile (video resume in profile)
- EPIC-04: Employer Job Posting (employers view videos)
- EPIC-13: Mobile Applications (mobile recording and viewing)

---

**Epic Owner:** Full-Stack Team Lead
**Stakeholders:** Product Manager, Frontend Team, Backend Team, DevOps, UX Designer
**Priority:** Medium (Differentiator feature)
