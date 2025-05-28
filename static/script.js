// Global variables for Firebase services
let db;
let currentUserUid;
let auth;

// Variables to store the latest reading data for validation
let latestReadingData = null; // Stores { date: 'YYYY-MM-DD', reading: number }

// --- Modal Control Functions ---
// These functions will show and hide our custom confirmation modal
function showConfirmationModal(title, message, onConfirm, onCancel) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;

    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

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

    document.getElementById('confirmation-modal').classList.remove('hidden');
}

function hideConfirmationModal() {
    document.getElementById('confirmation-modal').classList.add('hidden');
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
        document.getElementById('status-message').textContent = "Error: Could not load Firebase configuration.";
        return null;
    }
}

// Function to initialize Firebase and handle authentication
async function initializeFirebaseAndAuth() {
    const statusMessageElement = document.getElementById('status-message');
    statusMessageElement.textContent = "Connecting to Firebase...";

    const firebaseConfig = await getFirebaseConfig();

    if (!firebaseConfig) {
        console.error("Firebase config not available. Cannot initialize Firebase.");
        statusMessageElement.textContent = "Firebase config not available. Check server.";
        return;
    }

    try {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        console.log("Firebase initialized successfully!");

        // --- Anonymous Authentication ---
        await auth.signInAnonymously();
        currentUserUid = auth.currentUser.uid;
        console.log("Signed in anonymously to Firebase. User ID:", currentUserUid);

        // Update user document in Firestore (for tracking last access)
        const userDocRef = db.collection('users').doc(currentUserUid);
        await userDocRef.set({
            lastAccess: firebase.firestore.FieldValue.serverTimestamp(),
            appVersion: '0.1.0'
        }, { merge: true });

        console.log("User document created/updated in Firestore.");
        statusMessageElement.textContent = "Firebase connected and user authenticated! Ready for data entry.";

        // --- Set default date for daily reading input ---
        const today = new Date();
        // document.getElementById('reading-date').value = formatDateForFirestore(today); // Handled by Flatpickr now

        // --- Attach Event Listeners ---
        document.getElementById('save-reading-btn').addEventListener('click', saveDailyReading);
        document.getElementById('official-bill-header').addEventListener('click', toggleOfficialBillCard);
        document.getElementById('generate-official-bill-btn').addEventListener('click', confirmGenerateOfficialBill);

        // --- Initial data display and calculations ---
        await displayLatestReadingAndUnitsConsumed();
        await calculateAndDisplayEstimatedBill();

    } catch (error) {
        console.error("Error during Firebase initialization or anonymous sign-in:", error);
        statusMessageElement.textContent = "Failed to connect to Firebase. Please check your internet connection and Firebase project setup.";
    }
}

// Initialize Flatpickr for date inputs (added this block)
document.addEventListener('DOMContentLoaded', () => {
    flatpickr("#reading-date", {
        dateFormat: "d-m-Y", // Display and input as DD-MM-YYYY
        allowInput: true // Allows manual typing
    });
    flatpickr("#official-bill-end-date", {
        dateFormat: "d-m-Y", // Display and input as DD-MM-YYYY
        allowInput: true // Allows manual typing
    });

    // Set default date for daily reading input using Flatpickr instance
    const today = new Date();
    const readingDateFlatpickr = document.getElementById('reading-date')._flatpickr;
    if (readingDateFlatpickr) {
        readingDateFlatpickr.setDate(today, true); // Set today's date, true to trigger change event
    }
});


// Toggle the visibility of the official bill card content
function toggleOfficialBillCard() {
    const content = document.getElementById('official-bill-content');
    const icon = document.getElementById('official-bill-toggle-icon');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        content.classList.add('hidden');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
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

    if (!db || !currentUserUid) {
        console.error("Firestore DB or User UID not available for fetching latest reading.");
        return;
    }

    const { latest, previous } = await getLatestTwoReadings();

    if (latest) {
        latestReadingDateElement.textContent = formatDateForDisplay(latest.date); // Use new format function
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
    warningElement.textContent = ''; // Clear previous warnings
    warningElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center'; // Reset classes

    if (unitsInCycle <= 0) {
        warningElement.textContent = 'Start recording units to see consumption insights!';
        warningElement.classList.add('bg-gray-700', 'text-gray-300');
        return;
    }

    if (unitsInCycle >= 500) {
        warningElement.textContent = `CRITICAL WARNING: Your current cycle usage (${unitsInCycle} units) is at or above 500 units! Consumption beyond this point becomes very expensive.`;
        warningElement.classList.add('bg-red-800', 'text-red-100', 'font-bold');
    } else if (unitsInCycle >= 400) {
        warningElement.textContent = `MAJOR WARNING: Your current cycle usage (${unitsInCycle} units) is approaching 500 units. Be mindful, as the next slab is significantly more expensive.`;
        warningElement.classList.add('bg-orange-600', 'text-orange-100');
    } else if (unitsInCycle >= 300) {
        warningElement.textContent = `WARNING: Your current cycle usage (${unitsInCycle} units) is above 300. Keep an eye on your consumption!`;
        warningElement.classList.add('bg-yellow-600', 'text-yellow-100');
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
            .where('date', '<=', endDateForUnitsCalculation) // Use the dynamic end date
            .orderBy('date', 'desc') // Get the latest reading in this period
            .limit(1)
            .get();

        let lastReadingInEstimatedCycle = null;
        if (!lastReadingInEstimatedCycleSnapshot.empty) {
            lastReadingInEstimatedCycle = lastReadingInEstimatedCycleSnapshot.docs[0].data();
            console.log("Last reading in estimated cycle found:", lastReadingInEstimatedCycle);
        } else {
            console.log("No readings found in the current estimated cycle up to the calculated end date.");
            // If no readings are found between start and end, it means either no readings at all,
            // or all readings are before the estimatedCycleStartDateString.
            // In this case, totalUnitsInCycle should be 0.
            estimatedUnitsInCycleElement.textContent = '0';
            estimatedBillAmountElement.textContent = '0.00';
            fixedChargeElement.textContent = '0.00';
            energyChargeElement.textContent = '0.00';
            meterRentElement.textContent = '0.00';
            billOtherChargesElement.textContent = 'Other Charges: ₹0.00';
            estimatedBillFeedbackElement.textContent = 'No units recorded in current cycle yet.';
            estimatedBillFeedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-yellow-800 text-yellow-100'; // Warning style
            displayConsumptionWarnings(0); // Display warning for 0 units
            console.log("--- Exiting calculateAndDisplayEstimatedBill (No readings in current cycle for calculation) ---");
            return;
        }

        let totalUnitsInCycle = 0;
        // Calculate units only if we have a valid start reading and a latest reading in the cycle
        if (lastReadingInEstimatedCycle) {
            totalUnitsInCycle = lastReadingInEstimatedCycle.reading - startReadingForEstimatedCycle;

            // Ensure units are not negative if data entry error occurs or initial reading is higher than start reading
            if (totalUnitsInCycle < 0) {
                console.warn(`Negative units calculated (${totalUnitsInCycle}). This might indicate data entry error (current reading ${lastReadingInEstimatedCycle.reading} is less than start reading ${startReadingForEstimatedCycle}). Resetting to 0.`);
                totalUnitsInCycle = 0;
            }
            console.log(`Calculated totalUnitsInCycle: ${lastReadingInEstimatedCycle.reading} (last reading) - ${startReadingForEstimatedCycle} (start reading) = ${totalUnitsInCycle}`);
        }

        estimatedUnitsInCycleElement.textContent = totalUnitsInCycle;
        displayConsumptionWarnings(totalUnitsInCycle); // Call warning display with units in cycle

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

        // Calculate other charges by summing up remaining components
        const otherCharges = billCalculationResult.electricity_duty +
            billCalculationResult.fuel_surcharge +
            billCalculationResult.fc_subsidy +
            billCalculationResult.ec_subsidy;
        billOtherChargesElement.textContent = `Other Charges: ₹${otherCharges.toFixed(2)}`;


        estimatedBillFeedbackElement.textContent = 'Estimated bill updated.';
        estimatedBillFeedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-green-800 text-green-100'; // Success style
        console.log("--- Finished calculateAndDisplayEstimatedBill successfully ---");

    } catch (error) {
        console.error("Error calculating or displaying estimated bill:", error);
        estimatedBillFeedbackElement.textContent = `Error calculating bill: ${error.message}`;
        estimatedBillFeedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100'; // Error style
        // Reset fields on error
        estimatedUnitsInCycleElement.textContent = '--';
        estimatedBillAmountElement.textContent = '0.00';
        fixedChargeElement.textContent = '0.00';
        energyChargeElement.textContent = '0.00';
        meterRentElement.textContent = '0.00';
        billOtherChargesElement.textContent = 'Other Charges: ₹0.00';
        displayConsumptionWarnings(0); // Display default warning on error
        console.log("--- Exiting calculateAndDisplayEstimatedBill (with error) ---");
    }
}

// --- NEW FUNCTIONS FOR OFFICIAL BILL FINALIZATION ---

// Function to confirm before generating official bill
async function confirmGenerateOfficialBill() {
    const feedbackElement = document.getElementById('official-bill-feedback');
    feedbackElement.textContent = '';
    feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100'; // Default error style

    const officialBillEndDateInput = document.getElementById('official-bill-end-date');
    const actualBillAmountInput = document.getElementById('actual-bill-amount');
    const userCommentInput = document.getElementById('user-comment'); // Get comment input here

    const billEndDate = officialBillEndDateInput.value;
    const billEndDateForFirestore = parseDateFromDDMMYYYY(billEndDate); // Convert input date to YYYY-MM-DD
    const actualAmount = parseFloat(actualBillAmountInput.value);
    const userComment = userCommentInput.value || ''; // Get comment value here

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
        async () => { // On Confirm (Yes)
            // Pass the input elements for clearing later
            await generateOfficialBill(billEndDateForFirestore, actualAmount, userComment, officialBillEndDateInput, actualBillAmountInput, userCommentInput);
        },
        () => { // On Cancel (Go Back)
            feedbackElement.textContent = 'Official bill finalization cancelled.';
            feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-yellow-800 text-yellow-100'; // Cancellation style
        }
    );
}


// Function to generate and save official bill
async function generateOfficialBill(billEndDate, actualAmount, userComment, officialBillEndDateInput, actualBillAmountInput, userCommentInput) {
    const feedbackElement = document.getElementById('official-bill-feedback');
    feedbackElement.textContent = 'Calculating and saving official bill...';
    feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-blue-800 text-blue-100'; // Info style
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
            previousOfficialBillEndDate = previousOfficialBillSnapshot.docs[0].data().billing_cycle_end_date;
            console.log("Previous official bill end date found:", previousOfficialBillEndDate);
        } else {
            console.log("No previous official bills found.");
        }

        // Determine the start date of the current official billing cycle
        // If no previous bill, assume readings from the very first recorded daily reading.
        // Otherwise, it's the day after the previous official bill's end date.
        let currentCycleStartDate;
        let startMeterReading = 0; // Will be updated if readings found

        if (previousOfficialBillEndDate) {
            const prevDate = new Date(previousOfficialBillEndDate);
            prevDate.setDate(prevDate.getDate() + 1); // Day after previous bill ended
            currentCycleStartDate = formatDateForFirestore(prevDate);
            console.log("Official Bill Cycle Start Date (from previous bill):", currentCycleStartDate);

            // Get the meter reading for the previous official bill's end date
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
                feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100'; // Error style
                console.error("Missing daily reading for previous official bill end date:", previousOfficialBillEndDate);
                console.log("--- Exiting generateOfficialBill (Missing prev reading) ---");
                return;
            }

        } else {
            // No previous official bill, find the very first daily reading
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
                feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100'; // Error style
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
            feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100'; // Error style
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
            feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100'; // Error style
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
        // Using doc(billEndDate).set({ merge: true }) allows overwriting existing records for that date.
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
            kseb_bill_amount: actualAmount, // Actual amount from user input
            user_comment: userComment,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Official bill saved successfully.");

        // 6. Perform Comparisons and Display Results
        const estimatedBillAmount = parseFloat(document.getElementById('estimated-bill-amount').textContent); // From "Estimated Bill So Far" card
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
            if (Math.abs(percentageDiff) < 5) { // Within 5%
                estimatedVsActualText = `Yay! Your actual bill (₹${actualBillAmount.toFixed(2)}) was almost correct compared to estimate (₹${estimatedBillAmount.toFixed(2)})!`;
            } else if (diff > 0) {
                estimatedVsActualText = `Your actual bill (₹${actualBillAmount.toFixed(2)}) was ${Math.abs(percentageDiff).toFixed(2)}% HIGHER than estimated (₹${estimatedBillAmount.toFixed(2)}).`;
            } else {
                estimatedVsActualText = `Your actual bill (₹${actualBillAmount.toFixed(2)}) was ${Math.abs(percentageDiff).toFixed(2)}% LOWER than estimated (₹${estimatedBillAmount.toFixed(2)}).`;
            }
        }
        document.getElementById('estimated-vs-actual').textContent = estimatedVsActualText;

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
        document.getElementById('previous-bill-comparison').textContent = previousBillComparisonText;
        document.getElementById('previous-bill-comparison').classList.add('whitespace-normal'); // Ensure wrapping

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
        document.getElementById('average-bill-comparison').textContent = averageBillComparisonText;
        document.getElementById('average-bill-comparison').classList.add('whitespace-normal'); // Ensure wrapping


        feedbackElement.textContent = 'Official bill record saved successfully!';
        feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-green-800 text-green-100'; // Success style

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
        feedbackElement.className = 'text-sm mt-4 p-2 rounded-md whitespace-normal text-center bg-red-800 text-red-100'; // Error style
        console.log("--- Exiting generateOfficialBill (with error) ---");
    }
}


// Run the initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeFirebaseAndAuth);
