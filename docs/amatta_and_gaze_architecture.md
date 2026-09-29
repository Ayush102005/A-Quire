# AMATTA and Gaze Tracking Architecture

## 1. AMATTA (Adaptive Engine)
AMATTA is the core adaptive engine for A-Quire, primarily driven by a robust application of **Item Response Theory (IRT)**.

### Active Adaptive Model
The current implementation utilizes a 3-Parameter Logistic (3PL) model to determine the probability of a correct response and calculate Fisher Information. However, for updating the student's ability estimate ($\theta$), it uses an **online adaptive heuristic (stochastic gradient descent)** rather than Maximum Likelihood Estimation.

#### Equations
**Probability of correct response (3PL):**
$$ P(\theta) = c + \frac{1 - c}{1 + e^{-a(\theta - b)}} $$

**Fisher Information:**
$$ I(\theta) = \frac{a^2 (P(\theta) - c)^2 (1 - P(\theta))}{(1 - c)^2 P(\theta)} $$

#### Theta Update Heuristic
Instead of running complex numerical root-finding algorithms (like Newton-Raphson MLE) after every response, AMATTA updates $\theta$ using a constant learning rate gradient approach:
$$ \theta_{new} = \theta_{old} + \alpha (S_{actual} - P(\theta)) $$
Where:
- $\alpha = 0.5$ (Learning rate)
- $S_{actual}$ = 1.0 (Correct) or 0.0 (Incorrect)
- Max step size per response: $\Delta \theta_{max} = \pm 1.0$
- Absolute bounds: $\theta \in [-4.0, 4.0]$

### Next Question Selection
The engine selects the next question by filtering candidate questions to match the student's confidence-adjusted difficulty tier. It then calculates the Fisher Information for each candidate. The question providing the maximum information at the student's current $\theta$ is selected. If scores are tied, deterministic selection by `question_id` occurs.

## 2. Gaze Tracking & Reliability

A-Quire implements a fully client-side gaze tracking pipeline using MediaPipe FaceLandmarker, focusing strictly on privacy and reliability.

### Privacy Guarantees
- **No raw data leaves the browser**: Webcam frames ($F_t$) and raw $(x,y)$ gaze coordinates are never sent to the backend.
- **Derived signals only**: The engine computes scalar metrics indicating struggle (e.g., `fixation_duration_ms`, `gaze_off_screen_ms`, and `struggle_score`). Only these aggregates are transmitted.
- **Fail-safe fallback**: If camera permission is denied, MediaPipe fails to initialize, or WebGL is unavailable, the lesson gracefully continues. Gaze falls back to an `unavailable` state.

### Gaze Engine Architecture
1. **Feature Extraction**: Extracts 478 dense facial landmarks (focusing on eyes, nose tip).
2. **Gaze Prediction**: Uses a calibrated ridge regression model mapping facial features and head pose to screen coordinates.
3. **Layout Assignment**: Assigns the raw gaze coordinate to logical reading zones or lines of code using Gaussian likelihood functions.
4. **Intervention Decision**: Computes a normalized struggle score ($S_t$) based on continuous dwell time, revisits, regressions, and oscillations. If $S_t$ exceeds calibrated thresholds (e.g., 0.85), an automatic intervention (AI Mentor Hint) is triggered. To prevent spamming, automatic triggers are subjected to a 60-second cooldown.

### Limitations
Webcam-based gaze estimation is inherently noisy and dependent on ambient lighting and webcam quality. To mitigate this:
- **Outlier Rejection & EMA Smoothing**: Helps reject anomalous frames.
- **Quality Checks**: The engine periodically calculates laplacian variance (blur) and luminance. If frame quality drops below thresholds, tracking pauses.
- **Behavioral Context**: Gaze is not used as the sole source of truth; it is designed to complement existing signals like time-spent or wrong answers. Terminology reflects this by referring to "possible struggle signals".
