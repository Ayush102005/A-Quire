# Requirements Document: A-Quire

## Introduction

A-Quire is an AI-powered study assistant designed to reduce cognitive load for students through real-time struggle detection. The system uses MediaPipe for privacy-first gaze tracking and AWS Bedrock (Claude 3.5) for proactive tutoring delivered in colloquial urban Hinglish. By detecting when students struggle with complex concepts and providing contextual help from their own study materials, A-Quire creates a supportive learning environment that adapts to individual needs.

## Project Vision

Reduce cognitive load for students through real-time struggle detection, enabling them to learn complex concepts more effectively by receiving timely, contextual assistance without disrupting their flow state.

## User Personas

### Primary Persona: Rohan - 3rd Year Engineering Student

- **Age**: 20-21 years
- **Background**: Studying Computer Science/Electronics Engineering
- **Learning Context**: Watches recorded lectures and online tutorials to understand complex concepts like Operating Systems, Digital Signal Processing, or Machine Learning
- **Challenges**: 
  - Gets stuck on difficult concepts but doesn't know when to seek help
  - Misses content when looking away to take notes
  - Prefers explanations in conversational Hinglish rather than formal English
  - Has limited time and needs efficient study sessions
- **Goals**:
  - Understand complex technical concepts thoroughly
  - Study efficiently without missing important content
  - Get help exactly when needed without breaking concentration
  - Use own notes and PDFs as reference material

## Glossary

- **A-Quire_System**: The complete AI-powered study assistant application
- **Gaze_Tracker**: The MediaPipe-based component that monitors eye position and blink patterns
- **Video_Player**: The component that displays educational video content
- **Struggle_Detector**: The component that analyzes gaze patterns to identify conceptual difficulty
- **AI_Tutor**: The AWS Bedrock Claude 3.5 component that generates contextual explanations
- **RAG_Engine**: The Retrieval-Augmented Generation system that searches local study materials
- **Nudge_UI**: The user interface component that displays proactive help messages
- **Physiological_Blink**: A natural eye blink lasting less than 0.3 seconds
- **Struggle_Fixation**: Extended gaze fixation on content lasting more than 10 seconds, indicating conceptual difficulty
- **Hinglish**: A colloquial blend of Hindi and English commonly used in urban India
- **Study_Materials**: Local PDF files and notes uploaded by the user
- **Gaze_Away_Event**: When the user's gaze moves away from the video content area
- **Processing_Latency**: Time between gaze event detection and system response

## Requirements

### Requirement 1: Video Playback Control

**User Story:** As a student, I want the video to pause automatically when I look away, so that I don't miss any content while taking notes or checking references.

#### Acceptance Criteria

1. WHEN the Gaze_Tracker detects a Gaze_Away_Event lasting more than 0.5 seconds, THE Video_Player SHALL pause playback within 100 milliseconds
2. WHEN the Gaze_Tracker detects the user's gaze returning to the video content area, THE Video_Player SHALL resume playback within 100 milliseconds
3. WHEN the Video_Player is paused due to gaze away, THE A-Quire_System SHALL display a subtle visual indicator showing the pause reason
4. WHEN a Physiological_Blink is detected, THE Video_Player SHALL continue playback without interruption
5. WHEN the user manually pauses the video, THE A-Quire_System SHALL disable automatic pause functionality until manual resume

### Requirement 2: Real-Time Gaze Tracking

**User Story:** As a student, I want my eye movements to be tracked accurately and privately, so that the system can respond to my learning needs without compromising my privacy.

#### Acceptance Criteria

1. THE Gaze_Tracker SHALL process eye-tracking data locally using MediaPipe without transmitting raw gaze data to external servers
2. WHEN the Gaze_Tracker processes a video frame, THE Processing_Latency SHALL be less than 100 milliseconds
3. WHEN the Gaze_Tracker detects eye position, THE A-Quire_System SHALL determine gaze coordinates relative to the video content area with accuracy within 50 pixels
4. WHEN the Gaze_Tracker initializes, THE A-Quire_System SHALL perform a calibration sequence to establish baseline gaze patterns
5. IF the Gaze_Tracker fails to detect eyes for more than 2 seconds, THEN THE A-Quire_System SHALL pause the video and display a reconnection message

### Requirement 3: Struggle Detection

**User Story:** As a student, I want the system to detect when I'm struggling with a concept, so that I can receive help at the right moment without having to ask.

#### Acceptance Criteria

1. WHEN the Gaze_Tracker detects continuous fixation on the same video region for more than 10 seconds, THE Struggle_Detector SHALL classify this as a Struggle_Fixation
2. WHEN the Gaze_Tracker detects a Physiological_Blink, THE Struggle_Detector SHALL not interpret this as a struggle indicator
3. WHEN the Struggle_Detector identifies a Struggle_Fixation, THE A-Quire_System SHALL trigger the AI_Tutor to generate contextual help within 2 seconds
4. WHEN the user exhibits rapid gaze movement between video regions more than 5 times within 3 seconds, THE Struggle_Detector SHALL classify this as confusion and trigger help
5. WHEN the Struggle_Detector identifies struggle patterns, THE A-Quire_System SHALL log the video timestamp and context for later review

### Requirement 4: Proactive AI Tutoring

**User Story:** As a student who thinks in Hinglish, I want explanations delivered in conversational Hinglish, so that I can understand concepts more naturally and quickly.

#### Acceptance Criteria

1. WHEN the Struggle_Detector triggers help, THE AI_Tutor SHALL generate an explanation using AWS Bedrock Claude 3.5 within 3 seconds
2. WHEN the AI_Tutor generates explanations, THE A-Quire_System SHALL deliver content in colloquial urban Hinglish style
3. WHEN the AI_Tutor provides an explanation, THE Nudge_UI SHALL display the message in a non-intrusive overlay that does not block video content
4. WHEN the user dismisses a nudge, THE A-Quire_System SHALL record the dismissal and adjust future nudge timing to be less frequent
5. WHEN the AI_Tutor generates content, THE A-Quire_System SHALL include relevant context from the current video timestamp and transcript

### Requirement 5: RAG Integration with Study Materials

**User Story:** As a student, I want explanations to reference my own notes and PDFs, so that the help I receive is consistent with my study materials and course content.

#### Acceptance Criteria

1. WHEN the user uploads Study_Materials, THE RAG_Engine SHALL index the documents and make them searchable within 30 seconds per document
2. WHEN the AI_Tutor generates an explanation, THE RAG_Engine SHALL retrieve relevant passages from Study_Materials within 1 second
3. WHEN the RAG_Engine finds relevant content in Study_Materials, THE AI_Tutor SHALL incorporate direct quotes or references in the explanation
4. WHEN no relevant content is found in Study_Materials, THE AI_Tutor SHALL generate explanations based on general knowledge while indicating the source
5. THE RAG_Engine SHALL support PDF files up to 50MB in size and extract text content with formatting preserved

### Requirement 6: Privacy-First Architecture

**User Story:** As a student, I want my eye-tracking data to remain private, so that I can use the system without concerns about surveillance or data misuse.

#### Acceptance Criteria

1. THE Gaze_Tracker SHALL process all eye-tracking data locally on the user's device using MediaPipe
2. THE A-Quire_System SHALL not transmit raw gaze coordinates or eye images to external servers
3. WHEN the A-Quire_System sends data to AWS Bedrock, THE transmitted data SHALL only include anonymized struggle events and video context, not gaze data
4. THE A-Quire_System SHALL provide a privacy dashboard showing what data is processed locally versus remotely
5. WHEN the user closes the application, THE A-Quire_System SHALL delete all temporary gaze tracking data from memory

### Requirement 7: Low Latency Performance

**User Story:** As a student, I want the system to respond instantly to my gaze, so that the experience feels natural and doesn't distract me from learning.

#### Acceptance Criteria

1. WHEN the Gaze_Tracker detects a gaze event, THE Processing_Latency SHALL be less than 100 milliseconds
2. WHEN the Video_Player receives a pause command, THE video SHALL stop within 100 milliseconds
3. WHEN the Struggle_Detector identifies a struggle pattern, THE A-Quire_System SHALL trigger the AI_Tutor within 500 milliseconds
4. WHEN the AI_Tutor generates a response, THE complete end-to-end latency from struggle detection to nudge display SHALL be less than 5 seconds
5. THE A-Quire_System SHALL maintain frame rates above 24 FPS for video playback even while processing gaze data

### Requirement 8: Empathetic User Interface

**User Story:** As a student, I want help messages to feel supportive rather than annoying, so that I stay motivated and don't feel like I'm being watched by an intrusive assistant.

#### Acceptance Criteria

1. WHEN the Nudge_UI displays a message, THE overlay SHALL appear with a gentle fade-in animation lasting 300 milliseconds
2. WHEN a nudge is displayed, THE Nudge_UI SHALL position the overlay in a corner that does not obstruct video content or subtitles
3. WHEN the user dismisses 3 consecutive nudges within 5 minutes, THE A-Quire_System SHALL reduce nudge frequency by 50 percent for the next 30 minutes
4. THE Nudge_UI SHALL use warm, encouraging language and avoid condescending phrases like "You seem confused" or "Let me help you"
5. WHEN a nudge appears, THE A-Quire_System SHALL provide a one-click option to "Explain Later" that bookmarks the timestamp without interrupting flow

### Requirement 9: Study Session Management

**User Story:** As a student, I want to review my study sessions and see where I struggled, so that I can focus my revision efforts on difficult topics.

#### Acceptance Criteria

1. WHEN a study session ends, THE A-Quire_System SHALL generate a summary showing total study time, struggle points, and topics covered
2. WHEN the Struggle_Detector identifies struggle patterns, THE A-Quire_System SHALL create timestamped bookmarks in the session history
3. WHEN the user views session history, THE A-Quire_System SHALL display a timeline with struggle intensity heatmap
4. THE A-Quire_System SHALL allow users to export session summaries as PDF reports
5. WHEN the user clicks on a struggle bookmark, THE A-Quire_System SHALL navigate to that video timestamp and display the AI-generated explanation

### Requirement 10: System Initialization and Calibration

**User Story:** As a student, I want to quickly set up the system before studying, so that I can start learning without lengthy configuration.

#### Acceptance Criteria

1. WHEN the A-Quire_System starts, THE Gaze_Tracker SHALL complete initialization and calibration within 30 seconds
2. WHEN calibration begins, THE A-Quire_System SHALL guide the user through a 5-point gaze calibration sequence
3. WHEN calibration completes, THE A-Quire_System SHALL validate accuracy by testing gaze detection on known points
4. IF calibration accuracy is below 80 percent, THEN THE A-Quire_System SHALL prompt the user to adjust camera position and recalibrate
5. THE A-Quire_System SHALL save calibration profiles per user to avoid repeated calibration in future sessions

## Requirements Traceability Matrix

| Requirement ID | User Story | Priority | Acceptance Criteria Count | Dependencies |
|---------------|------------|----------|--------------------------|--------------|
| REQ-1 | Video Playback Control | High | 5 | REQ-2 |
| REQ-2 | Real-Time Gaze Tracking | Critical | 5 | None |
| REQ-3 | Struggle Detection | Critical | 5 | REQ-2 |
| REQ-4 | Proactive AI Tutoring | High | 5 | REQ-3, REQ-5 |
| REQ-5 | RAG Integration | High | 5 | None |
| REQ-6 | Privacy-First Architecture | Critical | 5 | REQ-2 |
| REQ-7 | Low Latency Performance | High | 5 | REQ-2, REQ-3 |
| REQ-8 | Empathetic UI | Medium | 5 | REQ-4 |
| REQ-9 | Study Session Management | Medium | 5 | REQ-3 |
| REQ-10 | System Initialization | High | 5 | REQ-2 |

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Gaze Processing Latency | < 100ms | System performance logs |
| Struggle Detection Accuracy | > 85% | User feedback and manual validation |
| AI Response Time | < 5s end-to-end | System performance logs |
| User Satisfaction with Hinglish | > 4/5 rating | Post-session surveys |
| Privacy Compliance | 100% local processing | Architecture review |
| Video Pause Accuracy | > 95% | Automated testing |
| Nudge Dismissal Rate | < 30% | Usage analytics |
| Session Completion Rate | > 80% | Usage analytics |

## Constraints and Assumptions

### Technical Constraints
- MediaPipe must run on user's local hardware (CPU/GPU)
- AWS Bedrock API rate limits apply to AI Tutor requests
- Video player must support standard formats (MP4, WebM)
- Minimum hardware: Webcam (720p), 8GB RAM, modern CPU

### Assumptions
- Users have stable internet connection for AWS Bedrock API calls
- Users are comfortable with webcam-based eye tracking
- Study materials are primarily in English or Hinglish
- Users study in environments with adequate lighting for gaze tracking
- Target users are familiar with colloquial urban Hinglish

## Out of Scope

The following items are explicitly out of scope for the initial release:
- Mobile device support (focus on desktop/laptop)
- Live lecture integration (focus on recorded videos)
- Multi-user collaborative study sessions
- Voice-based interaction or speech recognition
- Automatic video content generation or curation
- Integration with Learning Management Systems (LMS)
- Gamification features (points, badges, leaderboards)
