import math

def calculate_kseb_bill(bi_monthly_units: int) -> dict:
    """
    Calculates the KSEB electricity bill for Domestic (LT-IA) consumers
    based on bi-monthly (60-day) consumption.

    This function implements the tariff structure derived from the provided
    JSON data from the KSEB online bill calculator.
    Note: Tariff rates and subsidies are subject to change by KSERC.

    Args:
        bi_monthly_units (int): Total units consumed in a bi-monthly period.

    Returns:
        dict: A dictionary containing the breakdown of the bill:
              'total_units', 'fixed_charge', 'energy_charge',
              'electricity_duty', 'fuel_surcharge', 'meter_rent',
              'fc_subsidy', 'ec_subsidy', 'total_bill'.
    """

    # --- Define Tariff Constants (Bi-monthly rates) ---

    # Fixed Charges (FC) based on consumption slab
    # Key: (lower_unit_bound, upper_unit_bound), Value: Fixed Charge amount
    FIXED_CHARGES = {
        (0, 100): 99.5,
        (101, 200): 169.0,
        (201, 300): 209.0,
        (301, 400): 279.0,
        (401, 500): 318.5,
        (501, 600): 437.0, # Based on 555 units data
        (601, 800): 517.5, # Based on 794 units data
        (801, math.inf): 568.0 # Based on 899/1000 units data
    }

    # Energy Charges (EC) - Telescopic slabs (up to 500 units bi-monthly)
    # Key: (slab_size, rate_per_unit)
    TELESCOPIC_SLABS = [
        (100, 3.35),   # First 100 units
        (100, 4.25),   # Next 100 units (101-200)
        (100, 5.35),   # Next 100 units (201-300)
        (100, 7.20),   # Next 100 units (301-400)
        (100, 8.50)    # Next 100 units (401-500)
    ]

    # Non-Telescopic Rates (if consumption exceeds 500 units bi-monthly)
    # Key: (lower_unit_bound, upper_unit_bound), Value: Non-telescopic rate per unit
    NON_TELESCOPIC_RATES = {
        (501, 600): 6.75, # Based on 555 units data
        (601, 800): 7.95, # Based on 794 units data
        (801, math.inf): 8.25 # Based on 899/1000 units data
    }

    # Subsidies (Approximated based on provided JSON data)
    # This is a complex part and might need more precise rules if available.
    FC_SUBSIDY = {
        (0, 300): -40.0, # Applies up to 300 units
        (301, math.inf): 0.0 # No FC subsidy above 300 units
    }

    EC_SUBSIDY = {
        (0, 44): -6.0,
        (45, 99): -37.5,
        (100, 111): -43.5, # Approx for 111 units
        (112, 123): -49.5, # Approx for 123 units
        (124, 180): -78.0, # Approx for 180 units and 289 units (anomaly, using higher value)
        (181, 222): -99.0, # Approx for 222 units
        (223, 233): -104.5, # Approx for 233 units
        (234, 240): -108.0, # Approx for 240 units
        (241, 289): -78.0, # Re-evaluating based on 289 units data, it seems to drop.
        (290, math.inf): 0.0 # No EC subsidy above this range (or very minimal/complex)
    }

    # Fuel Surcharge is applied directly per unit for the bi-monthly consumption
    FUEL_SURCHARGE_PER_UNIT = 0.08 # Rs. 0.08 per unit (derived from JSON data)
    METER_RENT_BI_MONTHLY = 12.0 # Rs. 12.0 bi-monthly (from JSON)
    ELECTRICITY_DUTY_PERCENTAGE = 0.10 # 10%

    fixed_charge = 0.0
    energy_charge = 0.0
    electricity_duty = 0.0
    fuel_surcharge = 0.0
    meter_rent = METER_RENT_BI_MONTHLY
    fc_subsidy = 0.0
    ec_subsidy = 0.0
    total_bill = 0.0

    # --- 1. Calculate Fixed Charge ---
    for (lower, upper), charge in FIXED_CHARGES.items():
        if lower <= bi_monthly_units <= upper:
            fixed_charge = charge
            break
    # Handle case for 0 units specifically
    if bi_monthly_units == 0:
        fixed_charge = FIXED_CHARGES.get((0, 100), 0) # Default for 0 units

    # --- 2. Calculate Energy Charge ---
    if bi_monthly_units > 500:
        # Non-telescopic billing if consumption exceeds 500 units
        rate_found = False
        for (lower, upper), rate in NON_TELESCOPIC_RATES.items():
            if lower <= bi_monthly_units <= upper:
                energy_charge = bi_monthly_units * rate
                rate_found = True
                break
        if not rate_found: # Fallback if units exceed defined non-telescopic ranges
            # If units exceed the highest defined non-telescopic range, use the highest known rate
            energy_charge = bi_monthly_units * NON_TELESCOPIC_RATES.get((801, math.inf), 8.25)
    else:
        # Telescopic billing for consumption up to 500 units
        remaining_units = bi_monthly_units
        for slab_units, rate in TELESCOPIC_SLABS:
            if remaining_units <= 0:
                break
            units_in_current_slab = min(remaining_units, slab_units)
            energy_charge += units_in_current_slab * rate
            remaining_units -= units_in_current_slab

    # --- 3. Calculate Electricity Duty ---
    electricity_duty = energy_charge * ELECTRICITY_DUTY_PERCENTAGE

    # --- 4. Calculate Fuel Surcharge (Bi-monthly) ---
    # Corrected: Applied directly per unit for bi-monthly consumption.
    fuel_surcharge = bi_monthly_units * FUEL_SURCHARGE_PER_UNIT

    # --- 5. Apply Subsidies ---
    for (lower, upper), subsidy in FC_SUBSIDY.items():
        if lower <= bi_monthly_units <= upper:
            fc_subsidy = subsidy
            break

    for (lower, upper), subsidy in EC_SUBSIDY.items():
        if lower <= bi_monthly_units <= upper:
            ec_subsidy = subsidy
            break

    # --- 6. Calculate Total Bill ---
    # Note: Rounding off from KSEB calculator is complex and applied at various steps.
    # We will apply final rounding for the total bill.
    total_bill = fixed_charge + energy_charge + electricity_duty + fuel_surcharge + meter_rent + fc_subsidy + ec_subsidy

    return {
        'total_units': bi_monthly_units,
        'fixed_charge': round(fixed_charge, 2),
        'energy_charge': round(energy_charge, 2),
        'electricity_duty': round(electricity_duty, 2),
        'fuel_surcharge': round(fuel_surcharge, 2),
        'meter_rent': round(meter_rent, 2),
        'fc_subsidy': round(fc_subsidy, 2),
        'ec_subsidy': round(ec_subsidy, 2),
        'total_bill': round(total_bill, 2)
    }

# This part is for testing the script directly, not used by the web app
if __name__ == "__main__":
    print("--- KSEB Bi-monthly Bill Calculator (Interactive) ---")
    print("Note: Tariff rates and subsidies are derived from provided KSEB JSON data.")
    print("These rates are subject to change by KSERC. Fuel surcharge is variable.")
    print("Subsidy logic is approximated based on observed data and might require official rules for full accuracy.")

    while True:
        try:
            user_input = input("\nEnter bi-monthly units consumed (or 'q' to quit): ")
            if user_input.lower() == 'q':
                print("Exiting calculator. Goodbye!")
                break
            
            bi_monthly_units = int(user_input)
            if bi_monthly_units < 0:
                print("Units cannot be negative. Please enter a non-negative number.")
                continue

            bill_details = calculate_kseb_bill(bi_monthly_units)
            print(f"\n--- Consumption: {bill_details['total_units']} units ---")
            print(f"  Fixed Charge:      ₹{bill_details['fixed_charge']:.2f}")
            print(f"  Energy Charge:     ₹{bill_details['energy_charge']:.2f}")
            print(f"  Electricity Duty:  ₹{bill_details['electricity_duty']:.2f}")
            print(f"  Fuel Surcharge:    ₹{bill_details['fuel_surcharge']:.2f}")
            print(f"  Meter Rent:        ₹{bill_details['meter_rent']:.2f}")
            print(f"  FC Subsidy:        ₹{bill_details['fc_subsidy']:.2f}")
            print(f"  EC Subsidy:        ₹{bill_details['ec_subsidy']:.2f}")
            print(f"  ---------------------------------")
            print(f"  Total Bill:        ₹{bill_details['total_bill']:.2f}")

        except ValueError:
            print("Invalid input. Please enter a whole number for units, or 'q' to quit.")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")