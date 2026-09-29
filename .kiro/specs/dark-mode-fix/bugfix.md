# Bugfix Requirements Document

## Introduction

The A-Quire frontend application has an inconsistent dark mode implementation that prevents users from accessing and using the theme toggle functionality across all pages. The app has the CSS infrastructure for dark mode (CSS custom properties with `.dark` class system in `index.css`) and a working `ThemeContext` for state management, but several critical issues prevent users from effectively using dark mode:

1. **No accessible theme toggle**: Most pages (StudentDashboard, Settings, Notifications, etc.) lack a visible theme toggle button, making it impossible for users to switch themes
2. **Inconsistent styling**: Many pages use hardcoded Tailwind colors (e.g., `bg-white`, `text-stone-900`) instead of the CSS custom properties (`var(--bg)`, `var(--text)`)
3. **Partial implementation**: Only 4 pages (ProgressAnalytics, MyCourses, LessonPlayer, CourseDetail) have theme toggle buttons, creating an inconsistent user experience

This affects the student experience by preventing users from accessing their preferred theme and creating visual inconsistency across the application.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user navigates to StudentDashboard, Settings, Notifications, or other pages without theme toggles THEN the system provides no visible way to switch between dark and light modes

1.2 WHEN a user views pages with hardcoded Tailwind color classes (e.g., StudentDashboard with `bg-white`, `text-stone-900`) THEN the system does not respond to theme changes even when the `.dark` class is added to the document root

1.3 WHEN a user toggles dark mode on one of the few pages that have the toggle (ProgressAnalytics, MyCourses, LessonPlayer, CourseDetail) THEN navigating to other pages shows inconsistent styling because those pages don't use the CSS custom properties

1.4 WHEN the document root has the `.dark` class applied THEN pages using hardcoded colors like `bg-white`, `border-stone-200`, `text-stone-900` remain in light mode colors instead of switching to dark mode variants

1.5 WHEN a user opens Settings page THEN the system shows no theme toggle despite Settings being the expected location for theme preferences

### Expected Behavior (Correct)

2.1 WHEN a user navigates to any page in the authenticated area THEN the system SHALL display a consistently positioned theme toggle button (in the header/topbar) allowing users to switch between dark and light modes

2.2 WHEN a user views any page while dark mode is active THEN the system SHALL apply dark mode colors using CSS custom properties (`var(--bg)`, `var(--text)`, `var(--card-bg)`, etc.) so all pages respond uniformly to theme changes

2.3 WHEN a user toggles dark mode on any page THEN the system SHALL persist the preference via ThemeContext and apply the theme consistently across all pages during navigation

2.4 WHEN the document root has the `.dark` class applied THEN all pages SHALL use the dark mode CSS custom property values defined in `:root.dark` in `index.css`

2.5 WHEN a user opens the Settings page THEN the system SHALL display a theme toggle control in a prominent location (either in the topbar or as a settings section)

2.6 WHEN a user views pages in dark mode THEN the system SHALL show proper contrast, readability, and visual hierarchy using the defined dark mode color tokens

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ThemeContext's `toggle()` function is called THEN the system SHALL CONTINUE TO update localStorage with the 'aq-theme' key and add/remove the `.dark` class on `document.documentElement`

3.2 WHEN the app loads and localStorage contains a theme preference THEN the system SHALL CONTINUE TO initialize with that preference

3.3 WHEN the app loads without a stored preference THEN the system SHALL CONTINUE TO honor the OS preference via `prefers-color-scheme: dark` media query

3.4 WHEN pages that already implement theme toggles correctly (ProgressAnalytics, MyCourses, LessonPlayer, CourseDetail) are viewed THEN the system SHALL CONTINUE TO function as they currently do with their existing toggle buttons

3.5 WHEN CSS classes defined in `index.css` (like `.premium-card`, `.app-card`, `.sidebar-nav-item`, `.btn-primary`) are used THEN the system SHALL CONTINUE TO apply theme-aware styles using CSS custom properties

3.6 WHEN public pages (Home, Features, Login, SignUp) are viewed THEN the system SHALL CONTINUE TO display their current styling without requiring dark mode support
