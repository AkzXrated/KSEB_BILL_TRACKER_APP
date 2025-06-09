# 📦 CHANGELOG

---

## v0.2.1 - 2025-06-09

### 🆕 Added

- **Interactive Daily Usage Chart:**
  - Implemented `spanGaps` to smoothly connect data points across missing daily readings.
  - Changed the average daily consumption line to a solid, modern orange.
- **Zoom and Pan Functionality:**  
  Added interactive zoom (mouse wheel, pinch-to-zoom on mobile) and pan (drag) for detailed analysis of daily consumption trends.
- **Reset Zoom Button:**  
  Introduced a dedicated button to easily reset the daily chart's zoom level.
- **Bi-Monthly Bill Summary Chart:**  
  Added a new bar chart to visualize historical bi-monthly units consumed and actual KSEB bill amounts.

### 🔧 Improved

- **Daily Chart Display Logic:**  
  Relaxed the condition for rendering the daily usage chart, allowing it to display correctly even with zero consumption entries or only a few initial data points.

### 🐛 Fixed

- **Syntax Error in `script.js`:**  
  Resolved a `SyntaxError` caused by an extra parenthesis.

---

## v0.2.0 - 2025-05-29

### 🆕 Added

- **User Authentication System:**  
  Implemented **Google Sign-in** and **Anonymous Sign-in** for secure and flexible user access.
- **Dedicated Landing Screen:**  
  Introduced a clean, focused initial page for authentication, enhancing the user entry experience.
- **Comprehensive Bill Comparison Features:**
  - Comparison against previous official bills.
  - Analysis of current usage against average consumption.
  - Calculation of deviation from the actual KSEB bill amount upon finalization.
- **Dynamic User Feedback:**  
  Integrated on-screen notifications and warnings for daily readings, bill estimations, and official bill finalization.

### 🔧 Improved

- **Refined Application Layout:**  
  Successfully restored and optimized the two-column design for "Daily Meter Reading" and "Estimated Bill So Far" sections, while ensuring "Finalize Official KSEB Bill" and "Usage Analytics" remain full-width for clarity.
- **Consistent UI Responsiveness:**  
  Enhanced overall application responsiveness across different screen sizes.

### 🐛 Fixed

- **DOM Element Access Error:**  
  Resolved critical `status-message not found` error that prevented script initialization.
- **Footer Positioning:**  
  Corrected the footer to consistently appear at the bottom of the page and occupy full width without layout conflicts.

---

