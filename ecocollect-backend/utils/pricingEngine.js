/**
 * EcoCollect Dynamic Pricing Engine
 * 
 * Formulas:
 * 1. Base Processing Cost: P = Σ(Wi × Ri × Si) + F
 *    - Wi: Weight of waste category in kg
 *    - Ri: Municipal base processing rate per kg
 *    - Si: Segregation compliance factor (Si = 0.8 for clean segregated, Si = 1.5 for contaminated/mixed)
 *    - F: Fixed handling fee (F = 0 for routine household, F > 0 for bulk/commercial/e-waste)
 * 
 * 2. Resident Recyclable Buyback / Cashback: Rp = Σ(Wj × Vj)
 *    - Wj: Weight of recyclable stream j in kg
 *    - Vj: Resale buyback market rate per kg (e.g. plastics ₹18/kg, dry/metal ₹12/kg, e-waste ₹45/kg)
 * 
 * 3. Net Settlement: Net = Rp - P
 *    - If Net > 0: Payout cashback credited to resident via UPI
 *    - If Net < 0: Nominal municipal service fee payable by resident
 *    - If Net == 0 (routine segregated organic): Completely free routine doorstep collection
 */

// Base processing rates (Municipal operational cost Ri)
const BASE_PROCESSING_RATES = {
  biodegradable: 1.5,   // ₹1.5/kg composting
  dry_recyclable: 2.0,  // ₹2.0/kg sorting
  plastic: 3.5,         // ₹3.5/kg densifying & shredding
  e_waste: 8.0,         // ₹8.0/kg hazardous de-manufacturing
  mixed: 6.0            // ₹6.0/kg sorting & landfill levy
};

// Resale market buyback rates (Cashback value Vj paid to resident)
const RECYCLABLE_BUYBACK_RATES = {
  biodegradable: 0.0,   // Organic gives free pickup, no buyback
  dry_recyclable: 12.0, // ₹12/kg for paper, cardboard, scrap metal
  plastic: 18.0,        // ₹18/kg for sorted PET, HDPE
  e_waste: 45.0,        // ₹45/kg for circuit boards, batteries, appliances
  mixed: 0.0            // No buyback for mixed waste
};

// Fixed pickup surcharge fees F
const PICKUP_SURCHARGES = {
  routine: 0,           // Free doorstep routine pickup
  bulk: 150,            // ₹150 for large furniture/heavy loads (>25kg)
  commercial: 250,      // ₹250 for restaurant/office waste
  e_waste_special: 50,  // ₹50 hazardous transport protocol fee
  off_schedule: 100     // ₹100 instant/emergency on-demand slot
};

function calculatePricing({ category, weightKg, isSegregated = true, pickupType = 'routine' }) {
  const weight = Math.max(0, parseFloat(weightKg) || 0);

  // 1. Segregation Factor (Si)
  const segregationFactor = isSegregated && category !== 'mixed' ? 0.8 : 1.5;

  // 2. Base Municipal Processing Cost Ri
  const baseRatePerKg = BASE_PROCESSING_RATES[category] || 3.0;
  const rawProcessing = weight * baseRatePerKg * segregationFactor;

  // 3. Fixed Fee F
  const serviceFee = PICKUP_SURCHARGES[pickupType] ?? 0;

  // For routine household segregated organic/general waste, processing is subsidized by municipality
  let processingFeeTotal = 0;
  if (pickupType === 'routine') {
    if (category === 'mixed' || !isSegregated) {
      // Penalty for contaminated mixed waste
      processingFeeTotal = Math.round(rawProcessing);
    } else {
      processingFeeTotal = 0; // 100% free routine doorstep service
    }
  } else {
    processingFeeTotal = Math.round(rawProcessing + serviceFee);
  }

  // 4. Recyclables Buyback Value Rp = Σ(Wj × Vj)
  const resaleRatePerKg = RECYCLABLE_BUYBACK_RATES[category] || 0;
  let recyclablePayoutTotal = 0;

  if (resaleRatePerKg > 0 && isSegregated) {
    recyclablePayoutTotal = Math.round(weight * resaleRatePerKg);
  }

  // 5. Net Settlement Calculation
  // Net = Recyclable Payout (Rp) - Processing Fee (P)
  const net = recyclablePayoutTotal - processingFeeTotal;
  const isPayout = net > 0;
  const settlementAmount = Math.abs(net);

  let summaryText = '';
  if (isPayout) {
    summaryText = `Resident Cashback of ₹${settlementAmount} generated for ${weight}kg ${category.toUpperCase()}. Instant UPI payout triggered.`;
  } else if (settlementAmount === 0) {
    summaryText = `Free Routine Municipal Pickup (${weight}kg ${category.toUpperCase()}). Zero balance due.`;
  } else {
    summaryText = `Municipal Service Fee of ₹${settlementAmount} due (${pickupType.toUpperCase()} + processing).`;
  }

  return {
    totalWeight: weight,
    segregationFactor,
    serviceFee,
    baseRates: [
      {
        category,
        weightKg: weight,
        ratePerKg: baseRatePerKg,
        subtotal: parseFloat((weight * baseRatePerKg).toFixed(2))
      }
    ],
    processingFeeTotal,
    recyclablesPayoutBreakdown: [
      {
        category,
        weightKg: weight,
        resaleRatePerKg,
        subtotalPayout: recyclablePayoutTotal
      }
    ],
    recyclablePayoutTotal,
    netAmount: net,
    isPayout,
    settlementAmount,
    summaryText
  };
}

module.exports = {
  BASE_PROCESSING_RATES,
  RECYCLABLE_BUYBACK_RATES,
  PICKUP_SURCHARGES,
  calculatePricing
};
