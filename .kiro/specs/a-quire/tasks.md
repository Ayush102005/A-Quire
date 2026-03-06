# Implementation Plan: A-Quire AI-Powered Study Assistant

## Overview

This implementation plan breaks down the A-Quire system into discrete coding tasks across four architectural layers: Vision & Frontend Layer (React 19 + MediaPipe), Reasoning & Intelligence Layer (AWS Bedrock + Lambda), Infrastructure & Data Layer (AppSync + DynamoDB), and Analytics Layer (Teacher Dashboard). The plan follows an incremental approach where each task builds on previous work, with early integration points to validate core functionality.

The implementation prioritizes the critical path: gaze tracking → struggle detection → AI tutoring, ensuring the core value proposition is validated early. Testing tasks are marked as optional (*) to allow for faster MVP iteration while maintaining quality through property-based testing of universal correctness properties.

## Tasks

### 1. Project Setup and Infrastructure Foundation

- [x] 1.1 Initialize React 19 + Vite 6 frontend project with TypeScript 5.x
  - Configure Vite with React Compiler plugin for optimized rendering
  - Set up Tailwind CSS 4.0 and Shadcn UI component library
  - Configure ESLint and Prettier for code quality
  - Set up project structure: `/src/components`, `/src/hooks`, `/src/stores`, `/src/utils`
  - _Requirements: All (foundation for entire system)_

- [~] 1.2 Set up AWS infrastructure with Amplify Gen 2
  - Initialize AWS Amplify Gen 2 project with GitHub CI/CD integration
  - Configure AWS AppSync GraphQL API with WebSocket support
  - Set up DynamoDB tables with 24-hour TTL for gaze data
  - Configure S3 buckets for video transcripts and audio files
  - Set up Clerk authentication with OTP and Google OAuth
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [~] 1.3 Initialize AWS Lambda Python 3.12 backend
  - Create Lambda function structure with LangGraph dependencies
  - Configure AWS Bedrock Claude 4.6 Sonnet access with Extended Thinking
  - Set up Amazon Polly Kajal voice integration
  - Configure environment variables and secrets management
  - Set up local development environment with SAM CLI
  - _Requirements: 4.1, 4.2, 4.5_

- [~] 1.4 Set up development and testing tools
  - Configure Pytest for Python backend testing
  - Configure Vitest for React frontend testing
  - Set up Hypothesis for property-based testing
  - Configure Sentry for error tracking and performance monitoring
  - Set up LangSmith for Claude reasoning trace analysis
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


### 2. Vision Layer - MediaPipe Gaze Tracking (Client-Side)

- [ ] 2.1 Implement MediaPipe Iris WASM integration
  - [~] 2.1.1 Create MediaPipeIrisTracker class with 478-landmark detection
    - Initialize MediaPipe Vision with WASM runtime
    - Configure FaceLandmarker with GPU delegation and iris refinement
    - Implement detectLandmarks() method with confidence scoring
    - Handle FaceNotDetectedError with 2-second timeout
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  
  - [x] 2.1.2 Write property test for gaze processing latency
    - **Property 1: Gaze-triggered video control latency**
    - **Validates: Requirements 1.1, 1.2**
    - Test that gaze processing completes within 100ms for any valid video frame
    - _Requirements: 2.2, 7.1_

- [ ] 2.2 Implement TensorFlow.js coordinate regression
  - [~] 2.2.1 Create GazeCoordinateRegressor class
    - Load pre-trained gaze regression model from `/models/gaze_regression/model.json`
    - Implement predictScreenCoordinates() with calibration matrix transformation
    - Map 478 iris landmarks to screen (x,y) coordinates
    - Handle tensor memory cleanup to prevent leaks
    - _Requirements: 2.3, 7.1_
  
  - [~] 2.2.2 Implement 5-point calibration system
    - Create CalibrationSequence component with corner + center points
    - Build transformation matrix from calibration data
    - Validate calibration accuracy (>80% threshold)
    - Save calibration profiles per user to localStorage
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [-] 2.2.3 Write property test for gaze coordinate accuracy
    - **Property 5: Gaze coordinate accuracy**
    - **Validates: Requirements 2.3**
    - Test that predicted coordinates are within 50 pixels of ground truth
    - _Requirements: 2.3_

- [ ] 2.3 Implement temporal buffer for gaze event analysis
  - [~] 2.3.1 Create TemporalBuffer class with 30-second circular buffer
    - Implement addEvent() with automatic pruning of old events
    - Store gaze events at 30 FPS (900 frames max)
    - Implement efficient spatial indexing for fixation detection
    - _Requirements: 3.1, 3.4, 7.1_
  
  - [~] 2.3.2 Implement fixation detection algorithm
    - Detect continuous gaze within 50px radius for >10 seconds
    - Calculate fixation point centroid
    - Return fixation status and coordinates
    - _Requirements: 3.1, 7.3_
  
  - [~] 2.3.3 Implement saccade detection algorithm
    - Calculate velocity between consecutive gaze points
    - Count rapid movements >300 px/s within 3-second window
    - Detect >5 saccades as confusion pattern
    - _Requirements: 3.4, 7.3_
  
  - [~] 2.3.4 Write property tests for struggle detection
    - **Property 3: Blink filtering**
    - **Validates: Requirements 1.4, 3.2**
    - Test that blinks <0.3s don't trigger struggle detection
    - **Property 7: Fixation classification**
    - **Validates: Requirements 3.1**
    - Test that 10s+ fixation in 50px radius triggers struggle
    - **Property 8: Saccade-based confusion detection**
    - **Validates: Requirements 3.4**
    - Test that >5 rapid saccades in 3s triggers confusion
    - _Requirements: 3.1, 3.2, 3.4_


### 3. Vision Layer - Zustand State Management

- [ ] 3.1 Create Zustand struggle state store
  - [~] 3.1.1 Implement useStruggleStore with gaze history management
    - Define StruggleState interface with gazeHistory, currentStruggle, lastNudgeTime
    - Implement addGazeEvent() with 30-second sliding window
    - Implement detectStruggle() calling fixation and saccade detectors
    - Implement shouldTriggerNudge() with 60-second cooldown
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 8.3_
  
  - [~] 3.1.2 Write property test for adaptive nudge frequency
    - **Property 11: Adaptive nudge frequency**
    - **Validates: Requirements 8.3**
    - Test that 3 dismissals in 5 minutes reduces frequency by 50% for 30 minutes
    - _Requirements: 8.3_

- [~] 3.2 Create video player state store
  - Implement useVideoStore with playback state, currentTime, isPaused
  - Implement pauseVideo() and resumeVideo() with latency tracking
  - Implement manual pause detection to disable auto-pause
  - Track gaze-away vs manual pause states separately
  - _Requirements: 1.1, 1.2, 1.5, 7.2_

- [~] 3.3 Create session management store
  - Implement useSessionStore with session history and bookmarks
  - Track struggle events with timestamps and video context
  - Implement bookmark creation for "Explain Later" actions
  - Store session summaries with struggle intensity data
  - _Requirements: 9.1, 9.2, 9.3, 9.5, 8.5_


### 4. Vision Layer - React UI Components

- [ ] 4.1 Implement video player component with gaze-triggered controls
  - [~] 4.1.1 Create VideoPlayer component using react-player
    - Integrate YouTube and Vimeo support with transcript synchronization
    - Connect to useVideoStore for playback state management
    - Implement auto-pause on gaze-away (>0.5s threshold)
    - Implement auto-resume on gaze-return
    - Display visual indicator for gaze-triggered pauses
    - _Requirements: 1.1, 1.2, 1.3, 7.2_
  
  - [~] 4.1.2 Write property tests for video control
    - **Property 2: Auto-pause visual feedback**
    - **Validates: Requirements 1.3**
    - Test that pause indicator displays for gaze-triggered pauses
    - **Property 4: Manual pause disables auto-pause**
    - **Validates: Requirements 1.5**
    - Test that manual pause disables auto-pause until manual resume
    - _Requirements: 1.3, 1.5_

- [~] 4.2 Implement calibration UI component
  - Create CalibrationScreen with 5-point sequence (corners + center)
  - Display visual targets for user to focus on
  - Show real-time feedback during calibration
  - Display accuracy results and retry option if <80%
  - Implement 30-second timeout for calibration completion
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 4.3 Implement Kiro Agent nudge overlay
  - [~] 4.3.1 Create NudgeOverlay component with Motion animations
    - Position overlay in corner without obstructing video or subtitles
    - Implement 300ms fade-in animation
    - Display Hinglish text with audio playback controls
    - Add "Dismiss", "Explain Later", and "Expand" action buttons
    - Track user actions (dismissed, bookmarked, expanded)
    - _Requirements: 4.3, 8.1, 8.2, 8.4, 8.5_
  
  - [~] 4.3.2 Write property test for nudge positioning
    - **Property 10: Nudge positioning**
    - **Validates: Requirements 4.3, 8.2**
    - Test that nudge overlay never obstructs video content or subtitle region
    - _Requirements: 4.3, 8.2_

- [~] 4.4 Implement session dashboard component
  - Create SessionDashboard with timeline and struggle heatmap
  - Display total study time, struggle points, and topics covered
  - Implement clickable struggle bookmarks for timestamp navigation
  - Add PDF export functionality for session summaries
  - Show struggle intensity visualization
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [~] 4.5 Implement privacy dashboard component
  - Display what data is processed locally vs remotely
  - Show real-time gaze processing status (local only)
  - Display data retention policy (24h TTL)
  - Provide manual data deletion controls
  - _Requirements: 6.4, 6.5_


### 5. Vision Layer - Integration and Wiring

- [~] 5.1 Wire gaze tracking pipeline to video controls
  - Connect MediaPipeIrisTracker output to TemporalBuffer
  - Connect TemporalBuffer struggle detection to useStruggleStore
  - Connect useStruggleStore to VideoPlayer auto-pause logic
  - Implement 100ms latency target for gaze-to-pause pipeline
  - Add performance monitoring for latency tracking
  - _Requirements: 1.1, 1.2, 2.2, 7.1, 7.2_

- [~] 5.2 Wire struggle detection to WebSocket communication
  - Connect useStruggleStore struggle events to AWS AppSync WebSocket
  - Implement struggle event payload: {x, y, timestamp, video_id, struggle_type}
  - Add retry logic with exponential backoff for failed transmissions
  - Implement <100ms WebSocket latency target
  - _Requirements: 3.3, 7.4_

- [~] 5.3 Wire AI responses to nudge display
  - Connect AppSync WebSocket responses to NudgeOverlay component
  - Implement audio playback for Amazon Polly synthesized voice
  - Handle nudge dismissal and "Explain Later" actions
  - Update useSessionStore with nudge interactions
  - _Requirements: 4.3, 8.5, 9.2_

- [~] 5.4 Checkpoint - Ensure frontend integration tests pass
  - Verify end-to-end gaze tracking to video pause flow
  - Verify struggle detection triggers WebSocket events
  - Verify nudge display and user interaction handling
  - Measure and validate latency targets (<100ms gaze, <5s end-to-end)
  - Ask user if questions arise


### 6. Reasoning Layer - AWS Lambda Orchestration

- [ ] 6.1 Implement Lambda handler for struggle events
  - [~] 6.1.1 Create lambda_handler() function with StruggleEvent processing
    - Parse incoming struggle event from AppSync WebSocket
    - Extract x, y, timestamp, video_id, struggle_type, student_id
    - Implement error handling for malformed events
    - Add structured logging for all events
    - _Requirements: 3.3, 7.4_
  
  - [~] 6.1.2 Write unit tests for Lambda handler
    - Test event parsing with valid and invalid payloads
    - Test error handling for missing required fields
    - Test logging output format
    - _Requirements: 3.3_

- [~] 6.2 Implement video transcript retrieval from S3
  - Create fetch_transcript_snippet() function
  - Retrieve JSON transcript from S3 based on video_id
  - Extract ±30 second snippet around struggle timestamp
  - Handle missing transcripts gracefully
  - Cache frequently accessed transcripts
  - _Requirements: 4.5, 5.1_

- [~] 6.3 Implement DynamoDB conversation memory retrieval
  - Create get_conversation_memory() function
  - Query DynamoDB for student's past struggle events
  - Filter events by video_id and time window
  - Return structured memory for LangGraph processing
  - _Requirements: 4.5, 9.2_

- [~] 6.4 Implement anonymized gaze data storage
  - Create store_struggle_event() function
  - Store only (x, y, duration, timestamp) tuples in DynamoDB
  - Set 24-hour TTL for automatic deletion
  - Ensure no raw gaze coordinates or biometric data stored
  - _Requirements: 6.2, 6.3, 6.5_

- [~] 6.5 Write property tests for privacy compliance
  - **Property 15: Privacy - no gaze data transmission**
  - **Validates: Requirements 6.2, 6.3**
  - Test that Lambda payloads never contain raw gaze coordinates or eye images
  - **Property 16: Memory cleanup on exit**
  - **Validates: Requirements 6.5**
  - Test that DynamoDB TTL is set correctly for all gaze data
  - _Requirements: 6.2, 6.3, 6.5_


### 7. Reasoning Layer - LangGraph Memory Management

- [ ] 7.1 Implement LangGraph reasoning workflow
  - [~] 7.1.1 Create ConversationState TypedDict and workflow graph
    - Define state with transcript, memory, struggle_type, coordinates, hint
    - Build StateGraph with analyze_memory, build_context, generate_hint nodes
    - Configure MemorySaver checkpointer for conversation persistence
    - Set up workflow edges and entry point
    - _Requirements: 4.5_
  
  - [~] 7.1.2 Implement analyze_recurring_struggles() node
    - Extract key concepts from past struggle events
    - Compare current struggle to historical patterns
    - Identify recurring struggles with >0.7 similarity threshold
    - Update state with recurring_struggles list
    - _Requirements: 4.5_
  
  - [~] 7.1.3 Implement build_contextual_prompt() node
    - Construct prompt with transcript, memory, and struggle type
    - Select appropriate template (fixation vs confusion)
    - Include recurring struggle context if applicable
    - Format prompt for Claude 4.6 Sonnet Extended Thinking
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [~] 7.1.4 Write unit tests for LangGraph workflow
    - Test state transitions through workflow nodes
    - Test recurring struggle detection accuracy
    - Test prompt construction for different struggle types
    - _Requirements: 4.5_


### 8. Reasoning Layer - Claude 4.6 Sonnet Integration

- [ ] 8.1 Implement Socratic Persona prompt with caching
  - [~] 8.1.1 Create SOCRATIC_PERSONA constant (2000 tokens)
    - Define Socratic method philosophy and question patterns
    - Specify Hinglish code-switching rules and language style
    - Include tone guidelines and personality traits
    - Add example good/bad responses for consistency
    - Configure as ephemeral cache_control for 90% cost reduction
    - _Requirements: 4.2_
  
  - [~] 8.1.2 Create prompt templates for fixation and confusion
    - Implement FIXATION_PROMPT_TEMPLATE with Extended Thinking instructions
    - Implement CONFUSION_PROMPT_TEMPLATE for rapid saccade patterns
    - Include placeholders for transcript, memory, coordinates, gaze_regions
    - Specify max 100-word response constraint
    - _Requirements: 4.1, 4.2_

- [ ] 8.2 Implement Claude API integration with Extended Thinking
  - [~] 8.2.1 Create generate_hint_with_extended_thinking() function
    - Configure Bedrock client for Claude 4.6 Sonnet model
    - Enable Extended Thinking with 1024-token budget
    - Set up prompt caching for SOCRATIC_PERSONA
    - Configure temperature=0.7, top_p=0.9, max_tokens=300
    - Parse response and extract hint text
    - _Requirements: 4.1, 4.2, 7.4_
  
  - [~] 8.2.2 Implement error handling and retry logic
    - Handle BedrockAPIError with exponential backoff (3 retries)
    - Handle RateLimitError with cooldown and queueing
    - Fall back to template-based explanations on failure
    - Log all API errors for monitoring
    - _Requirements: 4.1, 7.4_
  
  - [~] 8.2.3 Write property test for AI context inclusion
    - **Property 12: AI context inclusion**
    - **Validates: Requirements 4.5**
    - Test that all AI prompts include video timestamp and transcript context
    - _Requirements: 4.5_


### 9. Reasoning Layer - Amazon Polly Voice Synthesis

- [~] 9.1 Implement Hinglish voice synthesis
  - Create synthesize_hinglish_voice() function
  - Configure Amazon Polly with Kajal (Neural Hinglish) voice
  - Set engine='neural', LanguageCode='hi-IN'
  - Upload synthesized audio to S3 with unique keys
  - Generate presigned URLs with 1-hour expiration
  - _Requirements: 4.2_

- [~] 9.2 Integrate voice synthesis into Lambda workflow
  - Call synthesize_hinglish_voice() after Claude generates hint
  - Return both text and audio_url in Lambda response
  - Handle Polly API errors gracefully (fall back to text-only)
  - Add audio synthesis latency to performance monitoring
  - _Requirements: 4.2, 7.4_

- [~] 9.3 Checkpoint - Ensure reasoning layer integration tests pass
  - Verify Lambda receives struggle events and retrieves context
  - Verify LangGraph workflow executes correctly
  - Verify Claude generates Hinglish hints with Extended Thinking
  - Verify Polly synthesizes audio and returns URLs
  - Measure end-to-end latency from struggle to hint (<5s target)
  - Ask user if questions arise


### 10. Infrastructure Layer - RAG Integration with Study Materials

- [ ] 10.1 Implement document upload and indexing
  - [~] 10.1.1 Create document processing pipeline
    - Accept PDF files up to 50MB via file upload UI
    - Extract text content using PyPDF2 or pdfplumber
    - Preserve formatting (headings, lists, code blocks)
    - Handle extraction errors gracefully
    - _Requirements: 5.5_
  
  - [~] 10.1.2 Implement document chunking strategy
    - Split documents into 500-token chunks with 50-token overlap
    - Maintain document metadata (filename, page number, section)
    - Create StudyMaterialChunk dataclass instances
    - _Requirements: 5.1_
  
  - [~] 10.1.3 Implement embedding generation and vector storage
    - Use all-MiniLM-L6-v2 model for lightweight embeddings
    - Batch embed chunks for efficiency
    - Store embeddings in ChromaDB with HNSW index
    - Complete indexing within 30 seconds per document
    - _Requirements: 5.1_
  
  - [~] 10.1.4 Write property test for PDF processing
    - **Property 14: PDF processing capability**
    - **Validates: Requirements 5.5**
    - Test that PDFs up to 50MB are successfully processed with formatting preserved
    - _Requirements: 5.5_

- [ ] 10.2 Implement RAG retrieval engine
  - [~] 10.2.1 Create RAG_Engine class with semantic search
    - Implement retrieve() method with query embedding
    - Use ChromaDB similarity search (top 3 results)
    - Return relevant passages with source metadata
    - Complete retrieval within 1 second
    - _Requirements: 5.2_
  
  - [~] 10.2.2 Integrate RAG with Claude prompt construction
    - Retrieve relevant passages based on struggle context
    - Include retrieved content in Claude prompt
    - Add source citations to AI-generated hints
    - Handle cases where no relevant content is found
    - _Requirements: 5.3, 5.4_
  
  - [~] 10.2.3 Write property test for RAG content incorporation
    - **Property 13: RAG content incorporation**
    - **Validates: Requirements 5.3**
    - Test that hints include quotes/references when RAG retrieves relevant passages
    - _Requirements: 5.3_


### 11. Infrastructure Layer - AWS AppSync GraphQL API

- [~] 11.1 Define GraphQL schema for real-time communication
  - Create schema with Mutation for struggle events
  - Create Subscription for AI hint responses
  - Define StruggleEvent and HintResponse types
  - Configure WebSocket connection settings
  - _Requirements: 7.4_

- [~] 11.2 Implement AppSync resolvers
  - Create Lambda resolver for submitStruggleEvent mutation
  - Create subscription resolver for onHintGenerated
  - Configure request/response mapping templates
  - Set up authorization with Clerk JWT validation
  - _Requirements: 7.4_

- [~] 11.3 Implement frontend GraphQL client
  - Set up AWS Amplify GraphQL client with WebSocket support
  - Implement submitStruggleEvent() mutation hook
  - Implement useHintSubscription() hook for real-time updates
  - Add connection state management and reconnection logic
  - _Requirements: 7.4_

- [~] 11.4 Write integration tests for WebSocket communication
  - Test struggle event submission and acknowledgment
  - Test hint subscription receives responses
  - Test reconnection on connection loss
  - Measure WebSocket latency (<100ms target)
  - _Requirements: 7.4_


### 12. Infrastructure Layer - Authentication and Data Storage

- [~] 12.1 Implement Clerk authentication
  - Set up Clerk project with OTP for Indian mobile numbers
  - Configure Google OAuth provider
  - Integrate Clerk React SDK into frontend
  - Implement protected routes for authenticated users
  - Store user calibration profiles in localStorage keyed by Clerk user ID
  - _Requirements: 10.5_

- [ ] 12.2 Configure DynamoDB tables
  - [~] 12.2.1 Create struggle_events table
    - Define schema: student_id (PK), timestamp (SK), x, y, duration, video_id
    - Configure 24-hour TTL attribute for automatic deletion
    - Set up GSI for querying by video_id
    - _Requirements: 6.2, 6.3, 6.5_
  
  - [~] 12.2.2 Create session_history table
    - Define schema: student_id (PK), session_id (SK), start_time, end_time, bookmarks
    - Store session summaries with struggle timestamps
    - No TTL (persistent session history)
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [~] 12.2.3 Create conversation_memory table
    - Define schema: student_id (PK), video_id (SK), struggle_history
    - Store past struggle events for recurring pattern detection
    - Configure 7-day TTL for memory cleanup
    - _Requirements: 4.5_

- [~] 12.3 Configure S3 buckets
  - Create video_transcripts bucket for JSON transcript storage
  - Create audio_hints bucket for Polly synthesized audio
  - Configure lifecycle policies for automatic cleanup (7 days)
  - Set up CORS for frontend access
  - _Requirements: 4.5, 4.2_


### 13. Analytics Layer - Teacher Dashboard

- [~] 13.1 Implement anonymized gaze data aggregation
  - Create batch processing script for DynamoDB struggle_events
  - Aggregate (x, y, duration) tuples by video_id
  - Remove all student identifiers for anonymization
  - Export aggregated data to CSV for analysis
  - _Requirements: 9.1_

- [~] 13.2 Implement struggle heatmap visualization
  - Use Pandas to process aggregated gaze data
  - Create hexbin heatmap with Matplotlib/Seaborn
  - Overlay heatmap on video frame thumbnails
  - Identify "hot zones" where multiple students struggle (>10s)
  - _Requirements: 9.3_

- [~] 13.3 Create teacher dashboard UI
  - Build dashboard component showing video-level analytics
  - Display struggle heatmaps for each video
  - Show aggregate metrics: avg struggle time, common struggle points
  - Provide filtering by date range and video
  - _Requirements: 9.1, 9.3_

- [~] 13.4 Write unit tests for analytics pipeline
  - Test data anonymization removes all PII
  - Test heatmap generation with sample data
  - Test hot zone detection algorithm
  - _Requirements: 9.1_


### 14. Session Management and User Experience

- [ ] 14.1 Implement session lifecycle management
  - [~] 14.1.1 Create session start/end handlers
    - Initialize session with video_id, start_time, student_id
    - Track struggle events during session
    - Generate session summary on end
    - Store session data in DynamoDB session_history table
    - _Requirements: 9.1, 9.2_
  
  - [~] 14.1.2 Implement bookmark functionality
    - Create bookmark on "Explain Later" action
    - Store bookmark with timestamp, video_id, hint_text
    - Implement bookmark navigation to video timestamp
    - Display associated AI explanation on bookmark click
    - _Requirements: 8.5, 9.5_
  
  - [~] 14.1.3 Write property tests for session management
    - **Property 9: Struggle event logging**
    - **Validates: Requirements 3.5, 9.2**
    - Test that all struggle patterns create timestamped bookmarks
    - **Property 17: Bookmark creation for "Explain Later"**
    - **Validates: Requirements 8.5**
    - Test that "Explain Later" creates bookmark without interrupting playback
    - **Property 18: Session summary generation**
    - **Validates: Requirements 9.1**
    - Test that session end generates complete summary
    - **Property 20: Bookmark navigation**
    - **Validates: Requirements 9.5**
    - Test that bookmark click navigates to correct timestamp with explanation
    - _Requirements: 3.5, 8.5, 9.1, 9.2, 9.5_

- [~] 14.2 Implement session export functionality
  - Create PDF export using jsPDF or similar library
  - Include session summary, struggle timeline, bookmarks
  - Add struggle intensity heatmap visualization
  - Format for readability and printing
  - _Requirements: 9.4_

- [~] 14.3 Write property test for session export
  - **Property 19: Session export functionality**
  - **Validates: Requirements 9.4**
  - Test that any session can be exported as valid PDF with all data
  - _Requirements: 9.4_


### 15. Error Handling and Resilience

- [~] 15.1 Implement gaze tracking error handling
  - Handle CameraNotFoundError with user-friendly message
  - Handle FaceNotDetectedError with 2-second timeout and reconnection
  - Handle CalibrationFailedError with retry logic (3 attempts)
  - Implement fallback to manual video controls on tracking failure
  - _Requirements: 2.5_

- [~] 15.2 Write property test for eye detection failure handling
  - **Property 6: Eye detection failure handling**
  - **Validates: Requirements 2.5**
  - Test that >2s detection failure pauses video and shows reconnection message
  - _Requirements: 2.5_

- [~] 15.3 Implement AI service error handling
  - Handle BedrockAPIError with exponential backoff (3 retries)
  - Handle RateLimitError with queueing and cooldown
  - Implement fallback to template-based explanations
  - Log all errors to Sentry for monitoring
  - _Requirements: 4.1, 7.4_

- [~] 15.4 Implement RAG pipeline error handling
  - Handle DocumentIndexingError with user notification
  - Handle RetrievalError with fallback to AI-only generation
  - Continue with successfully indexed documents on partial failure
  - _Requirements: 5.1, 5.2_

- [~] 15.5 Implement video player error handling
  - Handle VideoLoadError with format/codec suggestions
  - Handle PlaybackError with resume from last position
  - Preserve session data and bookmarks on errors
  - _Requirements: 1.1_


### 16. Performance Optimization

- [~] 16.1 Optimize gaze processing pipeline
  - Implement frame rate adaptation based on CPU load (15-30 FPS)
  - Cache MediaPipe face mesh results for consecutive frames
  - Skip processing if face hasn't moved significantly
  - Implement efficient circular buffer for temporal data
  - _Requirements: 7.1, 7.5_

- [~] 16.2 Optimize RAG retrieval performance
  - Pre-compute embeddings during document indexing
  - Implement query caching for repeated searches
  - Use HNSW index in ChromaDB for fast similarity search
  - Limit retrieval to top 3 results for speed
  - _Requirements: 5.2, 7.4_

- [~] 16.3 Optimize AI generation with caching
  - Implement semantic similarity check before API calls
  - Cache AI responses for similar struggle patterns
  - Reuse explanations for identical video timestamps
  - Configure prompt caching for 90% cost reduction
  - _Requirements: 4.1, 7.4_

- [~] 16.4 Implement performance monitoring
  - Track gaze processing latency (p50, p95, p99)
  - Track video pause/resume latency
  - Track RAG retrieval time
  - Track AI generation time
  - Track end-to-end struggle-to-nudge latency
  - Send metrics to Sentry for analysis
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [~] 16.5 Write performance benchmark tests
  - Benchmark gaze processing at 30 FPS (<100ms per frame)
  - Benchmark video control latency (<100ms)
  - Benchmark RAG retrieval (<1s)
  - Benchmark end-to-end pipeline (<5s)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


### 17. Calibration System Implementation

- [~] 17.1 Implement calibration accuracy validation
  - Test gaze detection on known calibration points
  - Calculate accuracy percentage (distance from expected)
  - Require >80% accuracy to proceed
  - _Requirements: 10.3, 10.4_

- [~] 17.2 Implement calibration profile persistence
  - Save calibration matrix to localStorage
  - Key profiles by Clerk user_id
  - Auto-load saved profile on subsequent sessions
  - Provide manual recalibration option
  - _Requirements: 10.5_

- [~] 17.3 Write property tests for calibration system
  - **Property 21: Calibration validation**
  - **Validates: Requirements 10.3**
  - Test that calibration validates accuracy on known points
  - **Property 22: Calibration retry on low accuracy**
  - **Validates: Requirements 10.4**
  - Test that <80% accuracy triggers retry prompt
  - **Property 23: Calibration profile persistence**
  - **Validates: Requirements 10.5**
  - Test that calibration profiles are saved and loaded correctly
  - _Requirements: 10.3, 10.4, 10.5_


### 18. End-to-End Integration and Testing

- [~] 18.1 Implement complete user flow integration
  - Wire authentication → calibration → video selection → study session → summary
  - Ensure seamless transitions between all components
  - Validate data flow through all architectural layers
  - Test with real video content and study materials
  - _Requirements: All_

- [~] 18.2 Implement comprehensive error recovery testing
  - Test camera disconnection during active session
  - Test network interruption during AI generation
  - Test AWS service failures with fallback mechanisms
  - Verify graceful degradation in all scenarios
  - _Requirements: 2.5, 4.1, 5.1, 5.2_

- [~] 18.3 Write end-to-end integration tests
  - Test complete study session from start to finish
  - Test struggle detection triggers AI hints correctly
  - Test RAG integration with uploaded study materials
  - Test session summary generation and export
  - Measure end-to-end latency targets
  - _Requirements: All_

- [~] 18.4 Checkpoint - Ensure all integration tests pass
  - Verify all architectural layers communicate correctly
  - Verify all latency targets are met (<100ms gaze, <5s end-to-end)
  - Verify privacy compliance (no gaze data transmission)
  - Verify error handling and recovery mechanisms
  - Ask user if questions arise


### 19. Deployment and CI/CD

- [~] 19.1 Configure AWS Amplify Gen 2 deployment pipeline
  - Connect GitHub repository to Amplify
  - Configure build settings for React frontend
  - Set up environment variables for production
  - Configure custom domain (if applicable)
  - _Requirements: All_

- [~] 19.2 Configure Lambda deployment
  - Package Lambda function with dependencies
  - Configure Lambda layers for large dependencies (TensorFlow, LangGraph)
  - Set up environment variables and secrets
  - Configure Lambda timeout and memory settings
  - Deploy to production environment
  - _Requirements: 4.1, 4.2, 4.5_

- [~] 19.3 Set up monitoring and alerting
  - Configure Sentry for error tracking
  - Set up CloudWatch alarms for Lambda errors and latency
  - Configure LangSmith for Claude reasoning trace analysis
  - Set up performance dashboards
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [~] 19.4 Create deployment documentation
  - Document AWS infrastructure setup steps
  - Document environment variable configuration
  - Document deployment process for frontend and backend
  - Create troubleshooting guide for common issues
  - _Requirements: All_


### 20. User Documentation and Polish

- [~] 20.1 Create user onboarding flow
  - Design welcome screen explaining A-Quire features
  - Create interactive tutorial for calibration process
  - Add tooltips for key UI elements
  - Implement first-time user guidance
  - _Requirements: 10.1_

- [~] 20.2 Create user documentation
  - Write user guide for getting started
  - Document calibration best practices (lighting, camera position)
  - Explain privacy features and data handling
  - Create FAQ for common questions
  - Document study material upload process
  - _Requirements: 2.4, 5.1, 6.4_

- [~] 20.3 Implement accessibility features
  - Ensure keyboard navigation for all UI elements
  - Add ARIA labels for screen readers
  - Implement high contrast mode option
  - Test with accessibility tools
  - _Requirements: 8.1, 8.2_

- [~] 20.4 Polish UI/UX
  - Refine animations and transitions
  - Optimize loading states and feedback
  - Improve error messages for clarity
  - Conduct usability testing with target users
  - _Requirements: 8.1, 8.2, 8.4_

- [~] 20.5 Final checkpoint - Production readiness review
  - Verify all requirements are implemented and tested
  - Verify all latency targets are consistently met
  - Verify privacy compliance and data handling
  - Verify error handling covers all edge cases
  - Conduct final user acceptance testing
  - Ask user if ready for production deployment


## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP iteration
- Each task references specific requirements for traceability to the requirements document
- Checkpoints ensure incremental validation at key integration points
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific implementations and edge cases
- The implementation follows a layer-by-layer approach: Vision → Reasoning → Infrastructure → Analytics
- Early integration checkpoints validate the critical path: gaze tracking → struggle detection → AI tutoring
- Performance targets are validated throughout: <100ms gaze latency, <5s end-to-end latency
- Privacy compliance is enforced through architecture: local gaze processing, 24h TTL, no biometric transmission
- Error handling ensures graceful degradation when services fail
- The plan assumes all context documents (requirements, design) are available during implementation

## Implementation Strategy

The tasks are organized to enable incremental progress with early validation:

1. Foundation (Tasks 1-4): Set up infrastructure and development environment
2. Vision Layer (Tasks 2-5): Implement gaze tracking and struggle detection with immediate feedback
3. Reasoning Layer (Tasks 6-9): Implement AI tutoring with Claude and Polly
4. Infrastructure Layer (Tasks 10-12): Implement RAG, authentication, and data storage
5. Analytics Layer (Task 13): Implement teacher dashboard for research insights
6. Polish (Tasks 14-20): Session management, error handling, optimization, deployment, documentation

Each checkpoint validates integration between layers before proceeding to the next phase.
