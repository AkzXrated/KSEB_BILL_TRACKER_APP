# CHANGELOG

## v0.2.0 - 2025-05-29

### Added
-   **User Authentication System:** Implemented Google Sign-in and Anonymous Sign-in for secure and flexible user access.
-   **Dedicated Landing Screen:** Introduced a clean, focused initial page for authentication, enhancing the user entry experience.
-   **Comprehensive Bill Comparison Features:**
    * Comparison against previous official bills.
    * Analysis of current usage against average consumption.
    * Calculation of deviation from the actual KSEB bill amount upon finalization.
-   **Dynamic User Feedback:** Integrated on-screen notifications and warnings for daily readings, bill estimations, and official bill finalization.

### Improved
-   **Refined Application Layout:** Successfully restored and optimized the two-column design for "Daily Meter Reading" and "Estimated Bill So Far" sections, while ensuring "Finalize Official KSEB Bill" and "Usage Analytics" remain full-width for clarity.
-   **Consistent UI Responsiveness:** Enhanced overall application responsiveness across different screen sizes.

### Fixed
-   Resolved critical DOM element access error (`status-message` not found) that prevented script initialization.
-   Corrected the footer positioning to consistently appear at the bottom of the page, occupying full width without conflicting with main content.
