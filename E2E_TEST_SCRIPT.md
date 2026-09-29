# E2E Test Script: A-Quire Learning Platform

This script provides step-by-step manual test cases to verify the core Student and Mentor flows, role-based access, and error handling.

---

## 1. Role-Based Routing & Guards

### 1.1 Instructor Guard Check
1. Log in as a **Student**.
2. Navigate to `/instructor`.
3. **Verify:** You are immediately redirected to `/dashboard` (Student Dashboard).
4. Navigate to `/instructor/questions/create`.
5. **Verify:** You are immediately redirected to `/dashboard`.

### 1.2 Student Onboarding Guard Check
1. Log in as an **Instructor**.
2. Navigate to `/onboarding`.
3. **Verify:** You are immediately redirected to `/instructor` (Instructor Dashboard) because `/onboarding` is restricted to the student role.

---

## 2. Parameter Validation & Error States

### 2.1 Lesson Player Validation
1. Log in as a Student.
2. Manually change the URL to `/lesson` (without `id` or `course_id`).
3. **Verify:** You see an error state "No lesson selected" with a button to go back.
4. Manually change the URL to `/lesson?id=99999` (non-existent).
5. **Verify:** You see an error state "Lesson not found" (or similar API error).

### 2.2 DSA / Practice Page Validation
1. Log in as a Student.
2. Manually change the URL to `/dsa/99999`.
3. **Verify:** You see an error state "We couldn't find the requested problem."
4. Manually change the URL to `/question/99999`.
5. **Verify:** You see an error state "Question not found."

---

## 3. Student E2E Flow

1. **Sign Up:** Go to `/signup`. Create a new student account.
2. **Onboarding:** Complete the onboarding flow (choose Student).
3. **Dashboard:** You should land on `/dashboard`.
   - **Verify:** "No enrolled courses" empty state is displayed if you have no courses.
4. **Browse Courses:** Click "Browse Courses" (goes to `/courses`).
5. **Enroll:** Click on a course and click "Enroll".
6. **Start Lesson:** Start the first lesson.
   - **Verify:** Video player loads. Wait 30 seconds for gaze/struggle tracking to trigger an AI mentor hint.
7. **Practice (DSA/MCQ):** Navigate to a practice question or DSA problem.
   - **Verify:** Gaze tracking is active (pill shown). Timer is active. Submit a solution and observe the confidence selector and feedback.

---

## 4. Instructor E2E Flow

1. **Sign Up / Login:** Log in as an instructor.
2. **Dashboard:** You should land on `/instructor`.
   - **Verify:** If you have no courses, you see "No courses yet" empty state.
3. **Create Course:** Click "Create Course", fill details.
4. **Add Module/Lesson:** Add a module, then add a video lesson and a DSA problem.
5. **Publish:** Publish the course.
6. **Analytics:** Navigate to `/struggle-analytics`.
   - **Verify:** If no students have taken the lesson, you see "No struggle data yet" empty state. Otherwise, you see the detailed charts.

---

## 5. DSA Test Case Methodology

The A-Quire platform uses a robust, automated methodology for testing student solutions against DSA problems, inspired by platforms like LeetCode. 

Test cases are securely stored in `problems/testcases/{problem_slug}.json` and are categorized into two types:

1. **Automated Generator Programs (Generated Test Cases)**
   - Problem setters can run the script `scripts/generate_testcases.py <problem_slug> --count <N>` to automatically generate hundreds or thousands of randomized test cases bounded by problem constraints.
   - These are used to stress-test algorithmic time and memory limits under large loads.

2. **Hand-Crafted Edge Cases**
   - 10 to 30 targeted test cases specifically designed by creators to break flawed logic.
   - These target extremes like empty inputs, single-element arrays, negative numbers, overflow conditions, or maximum constraints.

3. **Community Contributions (Planned)**
   - Future scope involves allowing students to flag missing edge cases or contribute new test cases via feedback channels which, once vetted, are added to the official system suite.

### Running Test Case Generators
```bash
# Generate 100 random test cases for two-sum
python scripts/generate_testcases.py two-sum --count 100

# Generate 50 random test cases for reverse-linked-list
python scripts/generate_testcases.py reverse-linked-list --count 50
```
