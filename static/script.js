// Global variables for Firebase services
let db;
let currentUserUid;
let auth;
let isExplicitlySigningOut = false;

// Variables to store the latest reading data for validation
let latestReadingData = null; // Stores { date: 'YYYY-MM-DD', reading: number }

// --- Modal Control Functions ---
// These functions will show and hide our custom confirmation modal
function showConfirmationModal(title, message, onConfirm, onCancel) {
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const confirmationModal = document.getElementById('confirmation-modal');

    if (!modalTitle || !modalMessage || !confirmBtn || !cancelBtn || !confirmationModal) {
        console.error("Confirmation modal elements not found. Cannot show modal.");
        return;
    }

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Clear previous event listeners
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;

    // Set new event listeners
    confirmBtn.onclick = () => {
        hideConfirmationModal();
        if (onConfirm) onConfirm();
    };
    cancelBtn.onclick = () => {
        hideConfirmationModal();
        if (onCancel) onCancel();
    };

    confirmationModal.classList.remove('hidden');
}

function hideConfirmationModal() {
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal) {
        confirmationModal.classList.add('hidden');
    }
}

// Helper function to format date for display (DD-MM-YYYY)
function formatDateForDisplay(dateString) {
    if (!dateString) return '--/--/----';
    // Ensure dateString is actually a string before splitting
    dateString = String(dateString);
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
}

// Helper function to format date for Firestore (YYYY-MM-DD)
function formatDateForFirestore(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to parse DD-MM-YYYY date string to YYYY-MM-DD for Firestore
function parseDateFromDDMMYYYY(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-'); // Assumes DD-MM-YYYY format
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // Re-order to YYYY-MM-DD
    }
    return dateString; // Return original if format is unexpected
}


// Function to fetch Firebase configuration from your Flask backend
async function getFirebaseConfig() {
    try {
        const response = await fetch('/firebase-config');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();
        return config;
    } catch (error) {
        console.error("Error fetching Firebase config:", error);
        const statusMessageElement = document.getElementById('status-message'); // Temporarily get it here for error message
        if (statusMessageElement) {
            statusMessageElement.textContent = "Error: Could not load Firebase configuration.";
        }
        return null;
    }
}

// Function to initialize Firebase and handle authentication
// Now accepts DOM elements as arguments
async function initializeFirebaseAndAuth(elements) {
    const { statusMessageElement, authStatusElement, googleSignInBtn, anonymousSignInBtn, signOutBtn, mainAppContent } = elements;

    // Set initial UI state immediately
    mainAppContent.classList.add('hidden');
    googleSignInBtn.classList.remove('hidden');
    anonymousSignInBtn.classList.remove('hidden');
    signOutBtn.classList.add('hidden');
    authStatusElement.textContent = "Please sign in or continue anonymously.";
    statusMessageElement.textContent = "Connecting to Firebase...";


    const firebaseConfig = await getFirebaseConfig();

    if (!firebaseConfig) {
        console.error("Firebase config not available. Cannot initialize Firebase.");
        statusMessageElement.textContent = "Firebase config not available. Check server.";
        return;
    }

    try {
        // Initialize Firebase
        if (!firebase.apps.length) { // Prevent re-initialization
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();

        console.log("Firebase initialized successfully!");

        // --- Attach Authentication Button Event Listeners NOW ---
        // These are attached here AFTER firebase.auth() has been called and assigned to 'auth'
        googleSignInBtn.addEventListener('click', signInWithGoogle);
        anonymousSignInBtn.addEventListener('click', signInAnonymouslyExplicitly);
        signOutBtn.addEventListener('click', signOutUser);
        console.log("Authentication button listeners attached.");

        // --- Authentication State Listener ---
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in.
                currentUserUid = user.uid;
                console.log("Auth state changed. Current User ID:", currentUserUid);

                // Update user document in Firestore (for tracking last access)
                const userDocRef = db.collection('users').doc(currentUserUid);
                await userDocRef.set({
                    lastAccess: firebase.firestore.FieldValue.serverTimestamp(),
                    appVersion: '0.1.0',
                    email: user.email || null, // Store email if available (for Google Sign-In)
                    displayName: user.displayName || null // Store display name if available
                }, { merge: true });

                console.log("User document created/updated in Firestore.");

                // Update UI for signed-in user
                authStatusElement.textContent = `Signed in as: ${user.displayName || user.email || 'Anonymous'}`;
                googleSignInBtn.classList.add('hidden');
                anonymousSignInBtn.classList.add('hidden');
                signOutBtn.classList.remove('hidden');
                mainAppContent.classList.remove('hidden'); // Show main app content
                statusMessageElement.textContent = "Firebase connected and user authenticated! Ready for data entry.";

                if (localStorage.getItem('hasAnonymousData') === 'true' && !user.isAnonymous) {
                    console.log("Previously anonymous user now signed in with Google. Data migration (if necessary) would happen here.");
                    localStorage.removeItem('hasAnonymousData');
                }

                isExplicitlySigningOut = false;

                // Initial data display and calculations (after user is authenticated)
                await displayLatestReadingAndUnitsConsumed();
                await calculateAndDisplayEstimatedBill();

            } else {
                // User is signed out or not authenticated.
                currentUserUid = null;
                console.log("Auth state changed. No user signed in.");

                // Show authentication options and hide main app content
                mainAppContent.classList.add('hidden'); // Hide main app content
                googleSignInBtn.classList.remove('hidden');
                anonymousSignInBtn.classList.remove('hidden');
                signOutBtn.classList.add('hidden');
                authStatusElement.textContent = "Please sign in or continue anonymously.";
                statusMessageElement.textContent = "Firebase connected. Waiting for user sign-in.";

                // Reset the flag regardless
                isExplicitlySigningOut = false;
            }
        });

        // --- Attach Event Listeners for main app functionality ---
        // These are attached here because they rely on `db` and `currentUserUid` being available,
        // which are set after Firebase initialization and auth state is known.
        const saveReadingBtn = document.getElementById('save-reading-btn');
        if (saveReadingBtn) saveReadingBtn.addEventListener('click', saveDailyReading);

        const officialBillHeader = document.getElementById('official-bill-header');
        if (officialBillHeader) officialBillHeader.addEventListener('click', toggleOfficialBillCard);

        const generateOfficialBillBtn = document.getElementById('generate-official-bill-btn');
        if (generateOfficialBillBtn) generateOfficialBillBtn.addEventListener('click', confirmGenerateOfficialBill);

    } catch (error) {
        console.error("Error during Firebase initialization:", error);
        statusMessageElement.textContent = "Failed to connect to Firebase. Please check your internet connection and Firebase project setup.";
        // Ensure main app content remains hidden on initialization error
        mainAppContent.classList.add('hidden');
        googleSignInBtn.classList.remove('hidden');
        anonymousSignInBtn.classList.remove('hidden');
        signOutBtn.classList.add('hidden');
    }
}

// Initialize Flatpickr for date inputs and start Firebase initialization
document.addEventListener('DOMContentLoaded', () => {
    // Flatpickr initialization
    const readingDateFlatpickr = flatpickr("#reading-date", {
        dateFormat: "d-m-Y", // Display and input as DD-MM-YYYY
        allowInput: true // Allows manual typing
    });
    flatpickr("#official-bill-end-date", {
        dateFormat: "d-m-Y", // Display and input as DD-MM-YYYY
        allowInput: true // Allows manual typing
    });

    // Set default date for daily reading input using Flatpickr instance
    const today = new Date();
    if (readingDateFlatpickr) {
        readingDateFlatpickr.setDate(today, true); // Set today's date, true to trigger change event
    }

    // --- Get DOM element references for authentication/status ---
    const statusMessageElement = document.getElementById('status-message');
    const authStatusElement = document.getElementById('auth-status');
    const googleSignInBtn = document.getElementById('google-sign-in-btn');
    const anonymousSignInBtn = document.getElementById('anonymous-sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const mainAppContent = document.getElementById('main-app-content');

    // Check if all critical elements are found before proceeding
    if (!statusMessageElement || !authStatusElement || !googleSignInBtn || !anonymousSignInBtn || !signOutBtn || !mainAppContent) {
        console.error("CRITICAL ERROR: One or more required DOM elements for authentication/status not found. Please ensure all IDs are correct in index.html.");
        // Provide user feedback if possible, even if main elements are missing
        if (statusMessageElement) {
            statusMessageElement.textContent = "Error: UI elements missing. Check console.";
        }
        return; // Exit if critical elements are missing
    }

    // Now, initialize Firebase, passing the elements
    initializeFirebaseAndAuth({ statusMessageElement, authStatusElement, googleSignInBtn, anonymousSignInBtn, signOutBtn, mainAppContent });
});


// --- AUTHENTICATION FUNCTIONS ---

async function signInWithGoogle() {
    if (!auth) {
        console.error("Firebase Auth not initialized.");
        const authStatusElement = document.getElementById('auth-status'); // Get element again in case function is called standalone
        if (authStatusElement) authStatusElement.textContent = "Error: Firebase Auth not ready. Try refreshing.";
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        console.log("Signed in with Google successfully!");
        // onAuthStateChanged will handle UI updates and data migration
    } catch (error) {
        console.error("Error signing in with Google:", error);
        const authStatusElement = document.getElementById('auth-status');
        if (authStatusElement) authStatusElement.textContent = `Google Sign-In failed: ${error.message}`;
    }
}

// Function: Explicit Anonymous Sign-In
async function signInAnonymouslyExplicitly() {
    if (!auth) {
        console.error("Firebase Auth not initialized.");
        const authStatusElement = document.getElementById('auth-status');
        if (authStatusElement) authStatusElement.textContent = "Error: Firebase Auth not ready. Try refreshing.";
        return;
    }
    try {
        await auth.signInAnonymously();
        console.log("Explicitly signed in anonymously.");
        localStorage.setItem('hasAnonymousData', 'true'); // Mark that anonymous data exists
        // onAuthStateChanged will handle UI updates
    } catch (error) {
        console.error("Error signing in anonymously:", error);
        const authStatusElement = document.getElementById('auth-status');
        if (authStatusElement) authStatusElement.textContent = `Anonymous Sign-In failed: ${error.message}`;
    }
}

async function signOutUser() {
    if (!auth) {
        console.error("Firebase Auth not initialized.");
        const authStatusElement = document.getElementById('auth-status');
        if (authStatusElement) authStatusElement.textContent = "Error: Firebase Auth not ready. Try refreshing.";
        return;
    }
    isExplicitlySigningOut = true; // Set the flag before signing out
    try {
        await auth.signOut();
        console.log("User signed out successfully.");
        // onAuthStateChanged will handle UI updates and present options
    } catch (error) {
        console.error("Error signing out:", error);
        const authStatusElement = document.getElementById('auth-status');
        if (authStatusElement) authStatusElement.textContent = `Sign Out failed: ${error.message}`;
        isExplicitlySigningOut = false; // Reset if signOut fails
    }
}


// Toggle the visibility of the official bill card content
function toggleOfficialBillCard() {
    const content = document.getElementById('official-bill-content');
    const icon = document.getElementById('official-bill-toggle-icon');

    if (content && icon) {
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        } else {
            content.classList.add('hidden');
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        }
    } else {
        console.warn("Official bill card elements not found for toggling.");
    }
}

// Fetches the latest reading and the reading before it (ordered by date)
async function getLatestTwoReadings() {
    if (!db || !currentUserUid) {
        console.error("Firestore DB or User UID not available for fetching readings.");
        return { latest: null, previous: null };
    }
    try {
        const querySnapshot = await db.collection('users')
            .doc(currentUserUid)
            .collection('daily_readings')
            .orderBy('date', 'desc')
            .limit(2)
            .get();

        const readings = querySnapshot.docs.map(doc => doc.data());
        return {
            latest: readings.length > 0 ? readings[0] : null,
            previous: readings.length > 1 ? readings[1] : null
        };
    } catch (error) {
        console.error("Error fetching latest two daily readings:", error);
        return { latest: null, previous: null };
    }
}

// Function to save daily meter reading to Firestore
async function saveDailyReading() {
    const readingDateInput = document.getElementById('reading-date');
    const meterReadingInput = document.getElementById('meter-reading');
    const feedbackElement = document.getElementById('daily-reading-feedback');

    if (!readingDateInput || !meterReadingInput || !feedbackElement) {
        console.error("Daily reading input elements not found.");
        if (feedbackElement) feedbackElement.textContent = "Error: Missing input elements.";
        return;
    }

    const date = readingDateInput.value;
    const dateForFirestore = parseDateFromDDMMYYYY(date); // Convert input date to YYYY-MM-DD
    const reading = parseFloat(meterReadingInput.value);

    // Clear previous feedback and set default style
    feedbackElement.textContent = '';
    feedbackElement.className = 'text-red-400 text-sm mt-3 text-center bg-gray-700 p-2 rounded-md whitespace-normal'; // Default error style

    // --- 1. Basic Validation ---
    if (!date) {
        feedbackElement.textContent = 'Please select a date.';
        return;
    }
    if (isNaN(reading) || reading <= 0) {
        feedbackElement.textContent = 'Please enter a valid meter reading (positive number).';
        return;
    }

    if (!db || !currentUserUid) {
        feedbackElement.textContent = 'Firebase not initialized. Please refresh the page.';
        console.error("Firestore DB or User UID not available.");
        return;
    }

    // --- 2. Fetch latest reading for "lower reading" validation ---
    const { latest: currentLatestReading } = await getLatestTwoReadings();
    latestReadingData = currentLatestReading; // Update global variable

    // --- 3. "Lower than normal reading" error ---
    if (latestReadingData && dateForFirestore > latestReadingData.date && reading < latestReadingData.reading) {
        feedbackElement.textContent = `Error: New reading (${reading}) cannot be lower than the latest recorded reading (${latestReadingData.reading}) for a later date.`;
        return;
    }

    // --- 4. "Date already exists" warning ---
    const docRef = db.collection('users').doc(currentUserUid).collection('daily_readings').doc(dateForFirestore);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        const existingReading = docSnap.data().reading;
        const confirmOverwrite = await new Promise(resolve => {
            showConfirmationModal(
                'Overwrite Existing Data?',
                `A reading for ${formatDateForDisplay(dateForFirestore)} already exists (${existingReading} units). Do you want to overwrite it with ${reading} units?`,
                () => resolve(true), // On confirm
                () => resolve(false)  // On cancel
            );
        });

        if (!confirmOverwrite) {
            feedbackElement.textContent = 'Data entry cancelled.';
            feedbackElement.className = 'text-yellow-400 text-sm mt-3 text-center bg-gray-700 p-2 rounded-md whitespace-normal';
            return;
        }
    }

    // If all checks pass or overwrite confirmed, proceed to save
    try {
        await docRef.set({
            date: dateForFirestore, // Store in Firestore as YYYY-MM-DD
            reading: reading,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        feedbackElement.textContent = 'Daily reading saved successfully!';
        feedbackElement.className = 'text-green-400 text-sm mt-3 text-center bg-gray-700 p-2 rounded-md whitespace-normal';
        meterReadingInput.value = ''; // Clear input field after saving

        // Refresh all displays after saving
        await displayLatestReadingAndUnitsConsumed();
        await calculateAndDisplayEstimatedBill();

    } catch (error) {
        console.error("Error saving daily reading:", error);
        feedbackElement.textContent = 'Error saving reading. See console for details.';
        feedbackElement.className = 'text-red-400 text-sm mt-3 text-center bg-gray-700 p-2 rounded-md whitespace-normal';
    }
}

// Function: Fetch and display the latest daily reading AND units consumed
async function displayLatestReadingAndUnitsConsumed() {
    const latestReadingDateElement = document.getElementById('latest-reading-date');
    const latestReadingValueElement = document.getElementById('latest-reading-value');
    const unitsConsumedDailyElement = document.getElementById('units-consumed-daily');

    if (!latestReadingDateElement || !latestReadingValueElement || !unitsConsumedDailyElement) {
        console.warn("Elements for latest reading display not found.");
        return;
    }

    if (!db || !currentUserUid) {
        console.error("Firestore DB or User UID not available for fetching latest reading.");
        return;
    }

    const { latest, previous } = await getLatestTwoReadings();

    if (latest) {
        latestReadingDateElement.textContent = formatDateForDisplay(latest.date);
        latestReadingValueElement.textContent = latest.reading;
        console.log("Latest reading displayed:", latest);

        if (previous) {
            const unitsConsumed = latest.reading - previous.reading;
            unitsConsumedDailyElement.textContent = `${unitsConsumed} units`;
            console.log("Units consumed since last reading:", unitsConsumed);
        } else {
            unitsConsumedDailyElement.textContent = 'N/A (first reading)';
            console.log("Only one reading available. Cannot calculate units consumed yet.");
        }
    } else {
        latestReadingDateElement.textContent = 'No readings yet';
        latestReadingValueElement.textContent = '';
        unitsConsumedDailyElement.textContent = 'N/A';
        console.log("No daily readings found for this user.");
    }
}

// Function to display consumption warnings based on units in cycle
function displayConsumptionWarnings(unitsInCycle) {
    const warningElement = document.getElementById('consumption-warning');
    if (!warningElement) {
        console.warn("Consumption warning element not found.");
        return;
    }
    warningElement.textContent = ''; // Clear previous warnings
    warningElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center'; // Reset classes

    if (unitsInCycle <= 0) {
        warningElement.textContent = 'Start recording units to see consumption insights!';
        warningElement.classList.add('bg-gray-700', 'text-gray-300');
        return;
    }

    // New granular warning logic
    if (unitsInCycle >= 500) {
        warningElement.textContent = `CRITICAL ALERT: Your current cycle usage (${unitsInCycle} units) is at or above 500 units. Consumption beyond this point becomes very expensive!`;
        warningElement.classList.add('bg-red-700', 'text-red-100', 'font-bold');
    } else if (unitsInCycle >= 450) {
        warningElement.textContent = `VERY HIGH WARNING: Your current cycle usage (${unitsInCycle} units) is significantly high. You are very close to the 500+ unit slab!`;
        warningElement.classList.add('bg-red-600', 'text-red-100');
    } else if (unitsInCycle >= 400) {
        warningElement.textContent = `NOTABLE WARNING: Your current cycle usage (${unitsInCycle} units) is in the 400s. Be cautious, the next slab is costly.`;
        warningElement.classList.add('bg-orange-500', 'text-orange-100');
    } else if (unitsInCycle >= 380) { // Close to 400
        warningElement.textContent = `SIMPLE WARNING: Your current cycle usage (${unitsInCycle} units) is approaching 400 units. Keep an eye on it.`;
        warningElement.classList.add('bg-yellow-500', 'text-yellow-900');
    } else if (unitsInCycle >= 300) { // Early 300s
        warningElement.textContent = `MINIMAL WARNING: Your current cycle usage (${unitsInCycle} units) is in the 300s. Monitor your consumption.`;
        warningElement.classList.add('bg-yellow-400', 'text-yellow-900');
    } else {
        warningElement.textContent = `Your current cycle usage (${unitsInCycle} units) is within normal limits. Keep up the good work!`;
        warningElement.classList.add('bg-green-700', 'text-green-100');
    }
}


// Function: Determine billing cycle and calculate estimated bill
async function calculateAndDisplayEstimatedBill() {
    const billCycleDatesElement = document.getElementById('bill-cycle-dates');
    const estimatedUnitsInCycleElement = document.getElementById('estimated-units-in-cycle');
    const estimatedBillAmountElement = document.getElementById('estimated-bill-amount');
    const fixedChargeElement = document.getElementById('fixed-charge');
    const energyChargeElement = document.getElementById('energy-charge');
    const meterRentElement = document.getElementById('meter-rent');
    const billOtherChargesElement = document.getElementById('bill-other-charges');
    const estimatedBillFeedbackElement = document.getElementById('estimated-bill-feedback');

    const elements = [billCycleDatesElement, estimatedUnitsInCycleElement, estimatedBillAmountElement,
        fixedChargeElement, energyChargeElement, meterRentElement,
        billOtherChargesElement, estimatedBillFeedbackElement];

    if (elements.some(el => !el)) {
        console.error("One or more estimated bill display elements not found.");
        if (estimatedBillFeedbackElement) estimatedBillFeedbackElement.textContent = "Error: Missing display elements.";
        return;
    }

    estimatedBillFeedbackElement.textContent = '';
    estimatedBillFeedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100'; // Default error style

    console.log("\n--- Starting calculateAndDisplayEstimatedBill ---");

    if (!db || !currentUserUid) {
        console.error("Firestore DB or User UID not available for estimated bill calculation.");
        estimatedBillFeedbackElement.textContent = 'Firebase not initialized.';
        console.log("--- Exiting calculateAndDisplayEstimatedBill (Firebase not initialized) ---");
        return;
    }

    let estimatedCycleStartDateString; //YYYY-MM-DD format
    let startReadingForEstimatedCycle = 0; // The meter reading at the start of the estimated cycle
    let determinedStartSource = "default_fallback"; // For logging

    try {
        // 1. Try to get the last official bill's end date (Highest priority)
        console.log("Attempting to fetch last official bill...");
        const lastOfficialBillSnapshot = await db.collection('users')
            .doc(currentUserUid)
            .collection('official_bills')
            .orderBy('billing_cycle_end_date', 'desc')
            .limit(1)
            .get();

        if (!lastOfficialBillSnapshot.empty) {
            const lastOfficialBillData = lastOfficialBillSnapshot.docs[0].data();
            const lastOfficialBillEndDate = lastOfficialBillData.billing_cycle_end_date;

            const prevDate = new Date(lastOfficialBillEndDate);
            prevDate.setDate(prevDate.getDate() + 1); // Day after previous official bill ended
            estimatedCycleStartDateString = formatDateForFirestore(prevDate);
            startReadingForEstimatedCycle = lastOfficialBillData.end_meter_reading; // Use reading directly from official bill record
            determinedStartSource = "official_bill";
            console.log("SOURCE: Official Bill. Start Date:", estimatedCycleStartDateString, "Start Reading:", startReadingForEstimatedCycle);

            // Optional: Data integrity check for the daily reading. The official bill itself has the reading.
            const dailyReadingAtOfficialBillEnd = await db.collection('users')
                .doc(currentUserUid)
                .collection('daily_readings')
                .doc(lastOfficialBillEndDate)
                .get();
            if (!dailyReadingAtOfficialBillEnd.exists) {
                console.warn(`Daily reading for last official bill end date (${lastOfficialBillEndDate}) is missing in daily_readings. Using reading from official bill record.`);
            }

        } else {
            console.log("No official bills found. Attempting to fetch first daily reading as fallback...");
            // 2. If no official bill, fall back to the very first daily reading
            const firstDailyReadingSnapshot = await db.collection('users')
                .doc(currentUserUid)
                .collection('daily_readings')
                .orderBy('date', 'asc')
                .limit(1)
                .get();
            if (!firstDailyReadingSnapshot.empty) {
                estimatedCycleStartDateString = firstDailyReadingSnapshot.docs[0].data().date;
                startReadingForEstimatedCycle = firstDailyReadingSnapshot.docs[0].data().reading;
                determinedStartSource = "first_daily_reading";
                console.log("SOURCE: First Daily Reading. Start Date:", estimatedCycleStartDateString, "Start Reading:", startReadingForEstimatedCycle);
            } else {
                // 3. If no readings at all, use today's date as a fallback (no units yet)
                estimatedCycleStartDateString = formatDateForFirestore(new Date());
                startReadingForEstimatedCycle = 0;
                determinedStartSource = "today_default";
                console.log("SOURCE: Default to Today. Start Date:", estimatedCycleStartDateString, "Start Reading:", startReadingForEstimatedCycle);
            }
        }

        // --- Determine the end date for units calculation within the current estimated cycle ---
        // This should be the absolute latest reading available in the database.
        const absoluteLatestReadingSnapshot = await db.collection('users')
            .doc(currentUserUid)
            .collection('daily_readings')
            .orderBy('date', 'desc')
            .limit(1)
            .get();
        let endDateForUnitsCalculation = estimatedCycleStartDateString; // Default to cycle start if no readings at all
        let latestReadingValueForUnitsCalculation = startReadingForEstimatedCycle; // Default to start reading

        if (!absoluteLatestReadingSnapshot.empty) {
            const absLatestReadingData = absoluteLatestReadingSnapshot.docs[0].data();
            endDateForUnitsCalculation = absLatestReadingData.date;
            latestReadingValueForUnitsCalculation = absLatestReadingData.reading;
            console.log("Absolute latest reading found for units calculation:", absLatestReadingData);
        } else {
            console.log("No absolute latest reading found. Using estimated cycle start date for calculation end.");
        }


        // Calculate estimated end date for display: cycleStartDate + 2 months
        // This is purely for display, to give an idea of the expected end of the cycle.
        const cycleStartDateObj = new Date(estimatedCycleStartDateString);
        const estimatedEndDateObj = new Date(cycleStartDateObj);
        estimatedEndDateObj.setMonth(estimatedEndDateObj.getMonth() + 2);
        const formattedEstimatedEndDateForDisplay = formatDateForDisplay(formatDateForFirestore(estimatedEndDateObj));

        billCycleDatesElement.textContent = `${formatDateForDisplay(estimatedCycleStartDateString)} to ${formattedEstimatedEndDateForDisplay}`;
        console.log("Displayed Bill Cycle Dates:", billCycleDatesElement.textContent);


        // --- Fetch the last reading up to endDateForUnitsCalculation within the current estimated cycle ---
        console.log(`Fetching latest reading from ${estimatedCycleStartDateString} to ${endDateForUnitsCalculation} for total units calculation...`);
        const lastReadingInEstimatedCycleSnapshot = await db.collection('users')
            .doc(currentUserUid)
            .collection('daily_readings')
            .where('date', '>=', estimatedCycleStartDateString)
            .where('date', '<=', endDateForUnitsCalculation)
            .orderBy('date', 'desc')
            .limit(1)
            .get();

        let lastReadingInEstimatedCycle = null;
        if (!lastReadingInEstimatedCycleSnapshot.empty) {
            lastReadingInEstimatedCycle = lastReadingInEstimatedCycleSnapshot.docs[0].data();
            console.log("Last reading in estimated cycle found:", lastReadingInEstimatedCycle);
        } else {
            console.log("No readings found in the current estimated cycle up to the calculated end date.");
            totalUnitsInCycle = 0; // Set to 0 if no readings within the current cycle
            estimatedUnitsInCycleElement.textContent = '0';
            estimatedBillAmountElement.textContent = '0.00';
            fixedChargeElement.textContent = '0.00';
            energyChargeElement.textContent = '0.00';
            meterRentElement.textContent = '0.00';
            billOtherChargesElement.textContent = 'Other Charges: ₹0.00';
            estimatedBillFeedbackElement.textContent = 'No units recorded in current cycle yet.';
            estimatedBillFeedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-yellow-800 text-yellow-100';
            displayConsumptionWarnings(0);
            console.log("--- Exiting calculateAndDisplayEstimatedBill (No readings in current cycle for calculation) ---");
            return;
        }

        let totalUnitsInCycle = 0;
        if (lastReadingInEstimatedCycle) {
            totalUnitsInCycle = lastReadingInEstimatedCycle.reading - startReadingForEstimatedCycle;
            if (totalUnitsInCycle < 0) {
                console.warn(`Negative units calculated (${totalUnitsInCycle}). This might indicate data entry error (current reading ${lastReadingInEstimatedCycle.reading} is less than start reading ${startReadingForEstimatedCycle}). Resetting to 0.`);
                totalUnitsInCycle = 0;
            }
            console.log(`Calculated totalUnitsInCycle: ${lastReadingInEstimatedCycle.reading} (last reading) - ${startReadingForEstimatedCycle} (start reading) = ${totalUnitsInCycle}`);
        }

        estimatedUnitsInCycleElement.textContent = totalUnitsInCycle;
        displayConsumptionWarnings(totalUnitsInCycle);

        // --- Send units to Flask backend for calculation ---
        console.log("Sending units to Flask for calculation:", totalUnitsInCycle);
        const response = await fetch('/api/calculate_estimated_bill', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ units: totalUnitsInCycle }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const billCalculationResult = await response.json();
        console.log("Bill calculation result from Flask:", billCalculationResult);

        // --- Display results ---
        estimatedBillAmountElement.textContent = billCalculationResult.total_bill.toFixed(2);
        fixedChargeElement.textContent = billCalculationResult.fixed_charge.toFixed(2);
        energyChargeElement.textContent = billCalculationResult.energy_charge.toFixed(2);
        meterRentElement.textContent = billCalculationResult.meter_rent.toFixed(2);

        const otherCharges = billCalculationResult.electricity_duty +
            billCalculationResult.fuel_surcharge +
            billCalculationResult.fc_subsidy +
            billCalculationResult.ec_subsidy;
        billOtherChargesElement.textContent = `Other Charges: ₹${otherCharges.toFixed(2)}`;


        estimatedBillFeedbackElement.textContent = 'Estimated bill updated.';
        estimatedBillFeedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-green-800 text-green-100';
        console.log("--- Finished calculateAndDisplayEstimatedBill successfully ---");

    } catch (error) {
        console.error("Error calculating or displaying estimated bill:", error);
        estimatedBillFeedbackElement.textContent = `Error calculating bill: ${error.message}`;
        estimatedBillFeedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100';
        estimatedUnitsInCycleElement.textContent = '--';
        estimatedBillAmountElement.textContent = '0.00';
        fixedChargeElement.textContent = '0.00';
        energyChargeElement.textContent = '0.00';
        meterRentElement.textContent = '0.00';
        billOtherChargesElement.textContent = 'Other Charges: ₹0.00';
        displayConsumptionWarnings(0);
        console.log("--- Exiting calculateAndDisplayEstimatedBill (with error) ---");
    }
}

// --- NEW FUNCTIONS FOR OFFICIAL BILL FINALIZATION ---

// Function to confirm before generating official bill
async function confirmGenerateOfficialBill() {
    const feedbackElement = document.getElementById('official-bill-feedback');
    const officialBillEndDateInput = document.getElementById('official-bill-end-date');
    const actualBillAmountInput = document.getElementById('actual-bill-amount');
    const userCommentInput = document.getElementById('user-comment');

    if (!feedbackElement || !officialBillEndDateInput || !actualBillAmountInput || !userCommentInput) {
        console.error("Official bill input/feedback elements not found.");
        if (feedbackElement) feedbackElement.textContent = "Error: Missing input/feedback elements.";
        return;
    }

    feedbackElement.textContent = '';
    feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100';

    const billEndDate = officialBillEndDateInput.value;
    const billEndDateForFirestore = parseDateFromDDMMYYYY(billEndDate);
    const actualAmount = parseFloat(actualBillAmountInput.value);
    const userComment = userCommentInput.value || '';

    // Basic validation for official bill inputs
    if (!billEndDate) {
        feedbackElement.textContent = 'Please select the official bill cycle end date.';
        return;
    }
    if (isNaN(actualAmount) || actualAmount <= 0) {
        feedbackElement.textContent = 'Please enter a valid actual bill amount.';
        return;
    }

    // Strict warning message
    showConfirmationModal(
        'Finalize Official Bill?',
        'This will finalize the bi-monthly bill record. DO NOT proceed if the KSEB bill has not been received. If a bill already exists for this date, it will be overwritten. Are you sure you want to continue?',
        async () => {
            await generateOfficialBill(billEndDateForFirestore, actualAmount, userComment, officialBillEndDateInput, actualBillAmountInput, userCommentInput);
        },
        () => {
            feedbackElement.textContent = 'Official bill finalization cancelled.';
            feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-yellow-800 text-yellow-100';
        }
    );
}


// Function to generate and save official bill
async function generateOfficialBill(billEndDate, actualAmount, userComment, officialBillEndDateInput, actualBillAmountInput, userCommentInput) {
    const feedbackElement = document.getElementById('official-bill-feedback');
    const estimatedBillAmountElement = document.getElementById('estimated-bill-amount'); // Ensure this is available for comparison
    const estimatedVsActualElement = document.getElementById('estimated-vs-actual');
    const previousBillComparisonElement = document.getElementById('previous-bill-comparison');
    const averageBillComparisonElement = document.getElementById('average-bill-comparison');

    if (!feedbackElement || !estimatedBillAmountElement || !estimatedVsActualElement || !previousBillComparisonElement || !averageBillComparisonElement) {
        console.error("One or more official bill comparison/feedback elements not found.");
        if (feedbackElement) feedbackElement.textContent = "Error: Missing display elements for official bill comparison.";
        return;
    }

    feedbackElement.textContent = 'Calculating and saving official bill...';
    feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-blue-800 text-blue-100';
    console.log("\n--- Starting generateOfficialBill ---");
    console.log(`Attempting to finalize bill for date: ${billEndDate}, Actual Amount: ${actualAmount}`);

    try {
        // 1. Get the last official bill's end date to determine current cycle start
        let previousOfficialBillEndDate = null;
        const previousOfficialBillSnapshot = await db.collection('users')
            .doc(currentUserUid)
            .collection('official_bills')
            .orderBy('billing_cycle_end_date', 'desc')
            .limit(1)
            .get();
        if (!previousOfficialBillSnapshot.empty) {
            const lastOfficialBillData = previousOfficialBillSnapshot.docs[0].data();
            previousOfficialBillEndDate = lastOfficialBillData.billing_cycle_end_date;
            console.log("Previous official bill end date found:", previousOfficialBillEndDate);
        } else {
            console.log("No previous official bills found.");
        }

        // Determine the start date of the current official billing cycle
        let currentCycleStartDate;
        let startMeterReading = 0;

        if (previousOfficialBillEndDate) {
            const prevDate = new Date(previousOfficialBillEndDate);
            prevDate.setDate(prevDate.getDate() + 1);
            currentCycleStartDate = formatDateForFirestore(prevDate);
            console.log("Official Bill Cycle Start Date (from previous bill):", currentCycleStartDate);

            const prevBillEndReadingDoc = await db.collection('users')
                .doc(currentUserUid)
                .collection('daily_readings')
                .doc(previousOfficialBillEndDate)
                .get();
            if (prevBillEndReadingDoc.exists) {
                startMeterReading = prevBillEndReadingDoc.data().reading;
                console.log("Start Meter Reading (from prev bill end date):", startMeterReading);
            } else {
                feedbackElement.textContent = 'Error: Could not find meter reading for previous official bill end date. Please ensure you have a reading for that date.';
                feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100';
                console.error("Missing daily reading for previous official bill end date:", previousOfficialBillEndDate);
                console.log("--- Exiting generateOfficialBill (Missing prev reading) ---");
                return;
            }

        } else {
            const firstDailyReadingSnapshot = await db.collection('users')
                .doc(currentUserUid)
                .collection('daily_readings')
                .orderBy('date', 'asc')
                .limit(1)
                .get();
            if (!firstDailyReadingSnapshot.empty) {
                currentCycleStartDate = firstDailyReadingSnapshot.docs[0].data().date;
                startMeterReading = firstDailyReadingSnapshot.docs[0].data().reading;
                console.log("Official Bill Cycle Start Date (from first daily reading):", currentCycleStartDate);
                console.log("Start Meter Reading (from first daily reading):", startMeterReading);
            } else {
                feedbackElement.textContent = 'Error: No daily readings found to finalize bill. Please add some daily readings first.';
                feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100';
                console.error("No daily readings found for initial bill finalization.");
                console.log("--- Exiting generateOfficialBill (No daily readings) ---");
                return;
            }
        }

        // 2. Get the meter reading for the current official bill's end date
        console.log("Fetching meter reading for current bill end date:", billEndDate);
        const endMeterReadingDoc = await db.collection('users')
            .doc(currentUserUid)
            .collection('daily_readings')
            .doc(billEndDate)
            .get();

        if (!endMeterReadingDoc.exists) {
            feedbackElement.textContent = `Error: No daily reading found for official bill end date (${formatDateForDisplay(billEndDate)}). Please record it.`;
            feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100';
            console.error("Missing daily reading for current official bill end date:", billEndDate);
            console.log("--- Exiting generateOfficialBill (Missing current reading) ---");
            return;
        }
        const endMeterReading = endMeterReadingDoc.data().reading;
        console.log("End Meter Reading:", endMeterReading);

        // 3. Calculate units consumed for this official cycle
        const unitsConsumedOfficial = endMeterReading - startMeterReading;
        console.log(`Units Consumed for Official Bill: ${endMeterReading} (end) - ${startMeterReading} (start) = ${unitsConsumedOfficial}`);

        if (unitsConsumedOfficial < 0) {
            feedbackElement.textContent = 'Error: Units consumed for official bill is negative. Check meter readings or bill end date.';
            feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100';
            console.error("Negative units calculated for official bill.");
            console.log("--- Exiting generateOfficialBill (Negative units) ---");
            return;
        }

        // 4. Send units to Flask backend for KSEB calculation
        console.log("Sending official units to Flask backend:", unitsConsumedOfficial);
        const response = await fetch('/api/calculate_estimated_bill', { // Reusing this endpoint, it takes units
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ units: unitsConsumedOfficial }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const calculatedBillDetails = await response.json();
        console.log("Calculated bill details from Flask:", calculatedBillDetails);

        // 5. Save the official bill record to Firestore
        console.log("Saving official bill to Firestore for date:", billEndDate);
        const officialBillDocRef = db.collection('users')
            .doc(currentUserUid)
            .collection('official_bills')
            .doc(billEndDate);

        await officialBillDocRef.set({
            billing_cycle_start_date: currentCycleStartDate,
            billing_cycle_end_date: billEndDate,
            start_meter_reading: startMeterReading,
            end_meter_reading: endMeterReading,
            units_consumed_bi_monthly: unitsConsumedOfficial,
            calculated_fixed_charge: calculatedBillDetails.fixed_charge,
            calculated_energy_charge: calculatedBillDetails.energy_charge,
            calculated_electricity_duty: calculatedBillDetails.electricity_duty,
            calculated_fuel_surcharge: calculatedBillDetails.fuel_surcharge,
            calculated_meter_rent: calculatedBillDetails.meter_rent,
            calculated_fc_subsidy: calculatedBillDetails.fc_subsidy,
            calculated_ec_subsidy: calculatedBillDetails.ec_subsidy,
            total_calculated_bill: calculatedBillDetails.total_bill,
            kseb_bill_amount: actualAmount,
            user_comment: userComment,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Official bill saved successfully.");

        // 6. Perform Comparisons and Display Results
        const estimatedBillAmount = parseFloat(estimatedBillAmountElement.textContent);
        const actualBillAmount = actualAmount;
        console.log(`Comparing Estimated Bill (from display): ₹${estimatedBillAmount} with Actual Bill: ₹${actualBillAmount}`);

        // Comparison 1: Estimated vs Actual
        let estimatedVsActualText = '';
        if (estimatedBillAmount === 0) {
            if (actualBillAmount === 0) {
                estimatedVsActualText = `Your actual bill (₹${actualBillAmount.toFixed(2)}) was 0.00, matching the estimated ₹0.00.`;
            } else {
                estimatedVsActualText = `Your actual bill (₹${actualBillAmount.toFixed(2)}) was higher than the estimated ₹0.00.`;
            }
        } else if (!isNaN(estimatedBillAmount)) {
            const diff = actualBillAmount - estimatedBillAmount;
            const percentageDiff = (diff / estimatedBillAmount) * 100;
            if (Math.abs(percentageDiff) < 5) {
                estimatedVsActualText = `Yay! Your actual bill (₹${actualBillAmount.toFixed(2)}) was almost correct compared to estimate (₹${estimatedBillAmount.toFixed(2)})!`;
            } else if (diff > 0) {
                estimatedVsActualText = `Your actual bill (₹${actualBillAmount.toFixed(2)}) was ${Math.abs(percentageDiff).toFixed(2)}% HIGHER than estimated (₹${estimatedBillAmount.toFixed(2)}).`;
            } else {
                estimatedVsActualText = `Your actual bill (₹${actualBillAmount.toFixed(2)}) was ${Math.abs(percentageDiff).toFixed(2)}% LOWER than estimated (₹${estimatedBillAmount.toFixed(2)}).`;
            }
        }
        estimatedVsActualElement.textContent = estimatedVsActualText;

        // Comparison 2: Current vs Previous Official Bill
        let previousBillComparisonText = '';
        if (previousOfficialBillEndDate) {
            console.log("Fetching previous bill for comparison:", previousOfficialBillEndDate);
            const previousBillDoc = await db.collection('users')
                .doc(currentUserUid)
                .collection('official_bills')
                .doc(previousOfficialBillEndDate)
                .get();
            if (previousBillDoc.exists) {
                const prevBillData = previousBillDoc.data();
                const prevBillAmount = prevBillData.kseb_bill_amount || prevBillData.total_calculated_bill;

                if (prevBillAmount === 0) {
                    previousBillComparisonText = `Last month's bill was ₹0.00. This bill is ₹${actualBillAmount.toFixed(2)}.`;
                } else {
                    const diff = actualBillAmount - prevBillAmount;
                    const percentageDiff = (diff / prevBillAmount) * 100;
                    if (diff > 0) {
                        previousBillComparisonText = `This bill is ${Math.abs(percentageDiff).toFixed(2)}% HIGHER than your last bill (₹${prevBillAmount.toFixed(2)}).`;
                    } else {
                        previousBillComparisonText = `This bill is ${Math.abs(percentageDiff).toFixed(2)}% LOWER than your last bill (₹${prevBillAmount.toFixed(2)}).`;
                    }
                }
            }
        } else {
            previousBillComparisonText = 'No previous official bill record found for comparison.';
        }
        previousBillComparisonElement.textContent = previousBillComparisonText;
        previousBillComparisonElement.classList.add('whitespace-normal');

        // Comparison 3: Current vs Bi-monthly Average
        let averageBillComparisonText = '';
        console.log("Calculating average bill for comparison...");
        const allOfficialBillsSnapshot = await db.collection('users')
            .doc(currentUserUid)
            .collection('official_bills')
            .get();
        if (!allOfficialBillsSnapshot.empty) {
            let totalSum = 0;
            let count = 0;
            allOfficialBillsSnapshot.docs.forEach(doc => {
                const bill = doc.data();
                totalSum += bill.kseb_bill_amount || bill.total_calculated_bill;
                count++;
            });
            const averageBill = totalSum / count;
            const diff = actualBillAmount - averageBill;
            const percentageDiff = (diff / averageBill) * 100;

            if (averageBill === 0) {
                averageBillComparisonText = `Bi-monthly average is ₹0.00. This bill is ₹${actualBillAmount.toFixed(2)}.`;
            } else if (Math.abs(percentageDiff) < 5) {
                averageBillComparisonText = `This bill (₹${actualBillAmount.toFixed(2)}) is close to your bi-monthly average (₹${averageBill.toFixed(2)}).`;
            } else if (diff > 0) {
                averageBillComparisonText = `This bill is ${Math.abs(percentageDiff).toFixed(2)}% ABOVE your bi-monthly average (₹${averageBill.toFixed(2)}).`;
            } else {
                averageBillComparisonText = `This bill is ${Math.abs(percentageDiff).toFixed(2)}% BELOW your bi-monthly average (₹${averageBill.toFixed(2)}).`;
            }
            console.log(`Average bill: ${averageBill.toFixed(2)}. Comparison with current: ${averageBillComparisonText}`);
        } else {
            averageBillComparisonText = 'No official bills yet to calculate average.';
        }
        averageBillComparisonElement.textContent = averageBillComparisonText;
        averageBillComparisonElement.classList.add('whitespace-normal');


        feedbackElement.textContent = 'Official bill record saved successfully!';
        feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-green-800 text-green-100';

        // Clear inputs after successful save
        officialBillEndDateInput.value = '';
        actualBillAmountInput.value = '';
        userCommentInput.value = '';

        // Trigger re-calculation of estimated bill after finalizing an official bill
        await calculateAndDisplayEstimatedBill();
        console.log("--- Finished generateOfficialBill successfully ---");

    } catch (error) {
        console.error("Error generating or saving official bill:", error);
        feedbackElement.textContent = `Error finalizing bill: ${error.message}`;
        feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100';
        // Reset relevant elements on error, if they exist
        const estimatedUnitsInCycleElement = document.getElementById('estimated-units-in-cycle');
        const estimatedBillAmountElement = document.getElementById('estimated-bill-amount');
        const fixedChargeElement = document.getElementById('fixed-charge');
        const energyChargeElement = document.getElementById('energy-charge');
        const meterRentElement = document.getElementById('meter-rent');
        const billOtherChargesElement = document.getElementById('bill-other-charges');

        if (estimatedUnitsInCycleElement) estimatedUnitsInCycleElement.textContent = '--';
        if (estimatedBillAmountElement) estimatedBillAmountElement.textContent = '0.00';
        if (fixedChargeElement) fixedChargeElement.textContent = '0.00';
        if (energyChargeElement) energyChargeElement.textContent = '0.00';
        if (meterRentElement) meterRentElement.textContent = '0.00';
        if (billOtherChargesElement) billOtherChargesElement.textContent = 'Other Charges: ₹0.00';

        displayConsumptionWarnings(0); // Reset warnings
        console.log("--- Exiting generateOfficialBill (with error) ---");
    }
}
