import { 
  WasteCategory, 
  PickupType, 
  DynamicPricingResult, 
  User, 
  Pickup, 
  WeightLog, 
  WasteCategoryConfig,
  EnvironmentalImpact,
  AppNotification
} from '../types';

// Multi-Waste Categories Configuration Registry
export const WASTE_CATEGORIES_REGISTRY: WasteCategoryConfig[] = [
  {
    id: 'organic',
    name: 'Organic / Wet Waste',
    tagline: 'Compostable food scraps, kitchen & garden bio-matter',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
    colorHex: '#10b981',
    iconName: 'Apple',
    baseProcessingRate: 1.5,
    buybackRate: 0.0,
    isSubsidized: true,
    recyclingFacility: 'Municipal Biomethanation & Aerobic Composting Unit 4',
    environmentalBenefit: 'Generates organic compost and bio-CNG, preventing methane generation in landfills.',
    acceptedItems: [
      'Vegetable & fruit peels',
      'Leftover cooked & raw food',
      'Coffee grounds & tea leaves',
      'Eggshells & nut shells',
      'Garden leaves, flowers & grass cuttings'
    ],
    fieldDefinitions: [
      {
        key: 'organicType',
        label: 'Organic Waste Type',
        type: 'select',
        options: ['Kitchen food scraps', 'Garden & leaf waste', 'Cooked food leftover', 'Mixed organic matter'],
        required: true
      },
      {
        key: 'frequency',
        label: 'Collection Schedule',
        type: 'select',
        options: ['One-time on demand', 'Daily morning slot', 'Alternate days'],
        required: true
      },
      {
        key: 'approxWeight',
        label: 'Approximate Weight (KG)',
        type: 'number',
        unit: 'kg',
        required: true,
        placeholder: 'e.g. 3.5'
      },
      {
        key: 'containerType',
        label: 'Disposal Bin / Bag Type',
        type: 'select',
        options: ['Compostable green bin', 'Biodegradable bag', 'Stainless steel bucket']
      }
    ]
  },
  {
    id: 'plastic',
    name: 'Plastic Waste',
    tagline: 'PET bottles, HDPE containers, LDPE films & rigid polymers',
    badgeClass: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
    colorHex: '#06b6d4',
    iconName: 'Sparkles',
    baseProcessingRate: 3.5,
    buybackRate: 18.0,
    recyclingFacility: 'Polymer Washing, Flaking & Pelletizing Plant (Zone North)',
    environmentalBenefit: 'Conserves petroleum crude and prevents microplastic contamination in water bodies.',
    acceptedItems: [
      'PET beverage bottles (#1)',
      'HDPE detergent & milk bottles (#2)',
      'LDPE clean packaging films (#4)',
      'PP takeout containers & bottle caps (#5)',
      'Clean rigid plastic crates & buckets'
    ],
    fieldDefinitions: [
      {
        key: 'plasticType',
        label: 'Primary Plastic Grade',
        type: 'select',
        options: ['PET Water/Soda Bottles (#1)', 'HDPE Milk/Detergent Jugs (#2)', 'LDPE Packaging Films/Bags (#4)', 'PP Containers (#5)', 'Mixed Rigid Polymers'],
        required: true
      },
      {
        key: 'approxWeight',
        label: 'Approximate Weight (KG)',
        type: 'number',
        unit: 'kg',
        required: true,
        placeholder: 'e.g. 4.5'
      },
      {
        key: 'condition',
        label: 'Cleanliness Condition',
        type: 'select',
        options: ['Clean, rinsed and dry', 'Lightly soiled', 'Mixed unrinsed'],
        required: true
      },
      {
        key: 'itemCount',
        label: 'Estimated Item Count',
        type: 'number',
        placeholder: 'e.g. 20 bottles'
      }
    ]
  },
  {
    id: 'paper_cardboard',
    name: 'Paper & Cardboard',
    tagline: 'Corrugated cartons, newspapers, white office reams & books',
    badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
    colorHex: '#3b82f6',
    iconName: 'FileText',
    baseProcessingRate: 2.0,
    buybackRate: 12.0,
    recyclingFacility: 'Pulp Recycling & Recycled Kraft Board Mill (Peenya)',
    environmentalBenefit: 'Saves mature trees and conserves up to 4,000 gallons of water per ton of recycled paper.',
    acceptedItems: [
      'Corrugated shipping & e-commerce cartons',
      'Newspapers & periodicals',
      'White office print paper & notebooks',
      'Brown kraft bags & cereal boxes',
      'Paperback books & manuals'
    ],
    fieldDefinitions: [
      {
        key: 'paperType',
        label: 'Paper Material Category',
        type: 'select',
        options: ['Corrugated Cardboard Boxes', 'Newspapers & Magazines', 'White Office/Book Paper', 'Kraft Paper & Thin Cartons', 'Shredded Documents'],
        required: true
      },
      {
        key: 'approxWeight',
        label: 'Approximate Weight (KG)',
        type: 'number',
        unit: 'kg',
        required: true,
        placeholder: 'e.g. 6.0'
      },
      {
        key: 'isBundled',
        label: 'Is the paper bundled/flattened?',
        type: 'select',
        options: ['Yes - Tied with rope / flattened', 'No - Loose in bags']
      }
    ]
  },
  {
    id: 'glass',
    name: 'Glass Waste',
    tagline: 'Whole bottles, food jars, cullet & flat window glass',
    badgeClass: 'bg-teal-500/10 text-teal-700 border-teal-500/30',
    colorHex: '#14b8a6',
    iconName: 'GlassWater',
    baseProcessingRate: 2.5,
    buybackRate: 4.0,
    recyclingFacility: 'Cullet Smelting & Secondary Container Glass Foundry',
    environmentalBenefit: 'Glass is 100% recyclable indefinitely with zero loss in chemical purity.',
    acceptedItems: [
      'Beverage & soda bottles',
      'Food & jam jars (rinsed)',
      'Broken glass cullet (safe containment)',
      'Clear window sheet offcuts'
    ],
    fieldDefinitions: [
      {
        key: 'glassType',
        label: 'Glass Container Type',
        type: 'select',
        options: ['Beverage & soda bottles', 'Food & pickle jars', 'Broken glass cullet', 'Flat window glass'],
        required: true
      },
      {
        key: 'color',
        label: 'Color Segregation',
        type: 'select',
        options: ['Clear (Flint)', 'Amber (Brown)', 'Green', 'Mixed Colors'],
        required: true
      },
      {
        key: 'approxWeight',
        label: 'Approximate Weight (KG)',
        type: 'number',
        unit: 'kg',
        required: true,
        placeholder: 'e.g. 5.0'
      },
      {
        key: 'isSafePackaged',
        label: 'Properly Cushioned / Boxed for Safety?',
        type: 'select',
        options: ['Yes, securely packed in cardboard box', 'In plastic crate', 'Unboxed']
      }
    ]
  },
  {
    id: 'metal',
    name: 'Metal Scrap',
    tagline: 'Aluminum beverage cans, iron scrap, copper & brass fittings',
    badgeClass: 'bg-slate-600/10 text-slate-800 border-slate-600/30',
    colorHex: '#475569',
    iconName: 'Layers',
    baseProcessingRate: 3.0,
    buybackRate: 32.0,
    recyclingFacility: 'Scrap Metal Induction Smelting & Secondary Refining Unit',
    environmentalBenefit: 'Recycling aluminum saves 95% of the energy required to smelt virgin bauxite ore.',
    acceptedItems: [
      'Aluminum beverage cans & foil',
      'Iron rods, nails & structural steel scrap',
      'Brass & copper plumbing or electrical fittings',
      'Stainless steel utensils & pots',
      'Tin cans (rinsed food cans)'
    ],
    fieldDefinitions: [
      {
        key: 'metalType',
        label: 'Dominant Metal Type',
        type: 'select',
        options: ['Aluminum Cans & Foil', 'Iron & Mild Steel Scrap', 'Copper & Brass Wires/Fittings', 'Stainless Steel Utensils', 'Mixed Metal Scrap'],
        required: true
      },
      {
        key: 'approxWeight',
        label: 'Approximate Weight (KG)',
        type: 'number',
        unit: 'kg',
        required: true,
        placeholder: 'e.g. 3.0'
      },
      {
        key: 'condition',
        label: 'Material Condition',
        type: 'select',
        options: ['Clean sorted scrap', 'Light surface rust', 'Heavy oxidized scrap']
      }
    ]
  },
  {
    id: 'e_waste',
    name: 'E-Waste',
    tagline: 'Laptops, phones, printed circuit boards, cables & appliances',
    badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
    colorHex: '#a855f7',
    iconName: 'Cpu',
    baseProcessingRate: 8.0,
    buybackRate: 45.0,
    recyclingFacility: 'CPCB Authorized WEEE Dismantler & Precious Metal Refining Facility',
    environmentalBenefit: 'Prevents lead, mercury and cadmium leaching into groundwater aquifers.',
    acceptedItems: [
      'Smartphones, tablets & feature phones',
      'Laptops, desktops, motherboards & RAM',
      'Chargers, power adapters & copper cables',
      'Small home appliances (microwaves, toasters, irons)',
      'Lithium power banks & electronic accessories'
    ],
    fieldDefinitions: [
      {
        key: 'deviceType',
        label: 'Electronic Device Category',
        type: 'select',
        options: ['Smartphones & Tablets', 'Laptops & Desktop Components', 'Power Adapters & Cables', 'Printed Circuit Boards (PCBs)', 'Small Household Appliances'],
        required: true
      },
      {
        key: 'condition',
        label: 'Functional State',
        type: 'select',
        options: ['Working / Intact condition', 'Damaged screen / Repairable', 'Dead / Scrap parts only'],
        required: true
      },
      {
        key: 'approxWeight',
        label: 'Approximate Weight (KG)',
        type: 'number',
        unit: 'kg',
        required: true,
        placeholder: 'e.g. 2.0'
      },
      {
        key: 'hasLithiumBattery',
        label: 'Contains Removable or Built-in Li-ion Battery?',
        type: 'select',
        options: ['Yes - Battery present', 'No - Battery removed / dry electronics']
      }
    ]
  },
  {
    id: 'textile',
    name: 'Textile Waste',
    tagline: 'Wearable clothes, tailor scraps, linens & fiber cuttings',
    badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
    colorHex: '#f43f5e',
    iconName: 'Shirt',
    baseProcessingRate: 2.5,
    buybackRate: 8.0,
    recyclingFacility: 'Mechanical Garnetting & Reclaimed Fiber Yarn Spinning Mill',
    environmentalBenefit: 'Diverts non-biodegradable synthetic fibers and saves thousands of liters of dye water.',
    acceptedItems: [
      'Clean wearable clothing for charity upcycling',
      'Torn cotton, denim & linen garments',
      'Bed linen, towels & curtains',
      'Tailoring cut pieces & fabric rolls',
      'Fabric bags & cloth shoes'
    ],
    fieldDefinitions: [
      {
        key: 'textileType',
        label: 'Textile Classification',
        type: 'select',
        options: ['Wearable clothes (Donation / Resale)', 'Cotton & Denim scrap garments', 'Household linens & curtains', 'Tailor shop cutting waste'],
        required: true
      },
      {
        key: 'condition',
        label: 'Fabric Hygiene Condition',
        type: 'select',
        options: ['Clean, washed and dry', 'Unwashed but dry', 'Stained / Industrial scrap'],
        required: true
      },
      {
        key: 'approxWeight',
        label: 'Approximate Weight (KG)',
        type: 'number',
        unit: 'kg',
        required: true,
        placeholder: 'e.g. 5.0'
      }
    ]
  },
  {
    id: 'hazardous',
    name: 'Hazardous / Special Waste',
    tagline: 'Dry batteries, CFL tubes, chemical paints, solvents & meds',
    badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    colorHex: '#f59e0b',
    iconName: 'AlertTriangle',
    baseProcessingRate: 12.0,
    buybackRate: 0.0,
    requiresSpecialHandling: true,
    recyclingFacility: 'State Pollution Control Board TSDF Secured Landfill & Incinerator',
    environmentalBenefit: 'Guarantees neutralization of corrosive acids, toxic heavy metals and biocides.',
    acceptedItems: [
      'Household alkaline & lithium dry-cell batteries',
      'CFL bulbs & fluorescent mercury tubes',
      'Leftover paints, varnishes, thinners & solvents',
      'Pesticide & insecticide spray containers',
      'Expired pharmaceutical tablets & bottles'
    ],
    fieldDefinitions: [
      {
        key: 'hazardType',
        label: 'Hazardous Waste Type',
        type: 'select',
        options: ['Household Dry Batteries', 'CFL Bulbs & Mercury Tubes', 'Paints & Solvent Cans', 'Expired Medicines & Blister Packs', 'Chemical Cleaners'],
        required: true
      },
      {
        key: 'packagingStatus',
        label: 'Containment Safety Status',
        type: 'select',
        options: ['Sealed in leak-proof container', 'Original manufacturer container', 'Wrapped securely'],
        required: true
      },
      {
        key: 'approxQuantity',
        label: 'Approximate Quantity / Units',
        type: 'text',
        required: true,
        placeholder: 'e.g. 12 AA batteries, 2 paint cans'
      },
      {
        key: 'specialInstructions',
        label: 'Safety Precaution Notes',
        type: 'text',
        placeholder: 'e.g. Broken mercury bulb contained in bubble wrap'
      }
    ]
  },
  {
    id: 'other_recyclable',
    name: 'Other Recyclables',
    tagline: 'Composite materials, rubber tires, cork & multi-laminates',
    badgeClass: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30',
    colorHex: '#6366f1',
    iconName: 'PackageCheck',
    baseProcessingRate: 3.0,
    buybackRate: 6.0,
    recyclingFacility: 'Integrated Material Recovery Facility & Co-Processing Kiln',
    environmentalBenefit: 'Ensures zero waste to landfill through co-processing in cement kilns.',
    acceptedItems: [
      'Clean rubber tires & tubes',
      'Wine bottle natural corks',
      'Multi-layer beverage cartons (Tetra Pak)',
      'Composite materials & acoustic panels'
    ],
    fieldDefinitions: [
      {
        key: 'materialName',
        label: 'Material Description',
        type: 'text',
        required: true,
        placeholder: 'e.g. Tetra Pak juice cartons, rubber bike tubes'
      },
      {
        key: 'approxWeight',
        label: 'Approximate Weight (KG)',
        type: 'number',
        unit: 'kg',
        required: true,
        placeholder: 'e.g. 3.0'
      }
    ]
  }
];

// Ri: Base processing fee per KG in INR
export const BASE_PROCESSING_RATES: Record<WasteCategory, number> = {
  organic: 1.5,
  biodegradable: 1.5,
  plastic: 3.5,
  paper_cardboard: 2.0,
  dry_recyclable: 2.0,
  glass: 2.5,
  metal: 3.0,
  e_waste: 8.0,
  textile: 2.5,
  hazardous: 12.0,
  other_recyclable: 3.0,
  mixed: 12.0
};

// Vj: Recyclable buyback resale payout per KG in INR
export const RECYCLABLE_BUYBACK_RATES: Record<WasteCategory, number> = {
  plastic: 18.0,
  paper_cardboard: 12.0,
  dry_recyclable: 12.0,
  glass: 4.0,
  metal: 32.0,
  e_waste: 45.0,
  textile: 8.0,
  organic: 0.0,
  biodegradable: 0.0,
  hazardous: 0.0,
  other_recyclable: 6.0,
  mixed: 0.0
};

// F: Fixed surcharge based on pickup type in INR
export const PICKUP_SURCHARGES: Record<PickupType, number> = {
  routine: 0,
  bulk: 150,
  commercial: 250,
  e_waste_special: 50,
  off_schedule: 100
};

/**
 * Dynamic Pricing Engine Formulation
 * P = Σ (Wi * Ri * Si) + F
 * Rp = Σ (Wj * Vj)
 * Net = Rp - P
 */
export function calculateDynamicPricing({
  category,
  pickupType = 'routine',
  weightKg = 0,
  isSegregated = true,
  segregationFactorOverride
}: {
  category: WasteCategory;
  pickupType?: PickupType;
  weightKg: number;
  isSegregated?: boolean;
  segregationFactorOverride?: number;
}): DynamicPricingResult {
  const Si = segregationFactorOverride !== undefined ? segregationFactorOverride : (isSegregated ? 0.8 : 1.5);
  const Ri = BASE_PROCESSING_RATES[category] || 3.5;
  const F = PICKUP_SURCHARGES[pickupType] || 0;
  const Vj = RECYCLABLE_BUYBACK_RATES[category] || 0;

  let P = 0;
  // Routine municipal bio/organic waste is subsidized
  if (pickupType === 'routine' && (category === 'biodegradable' || category === 'organic')) {
    P = 0;
  } else {
    P = (weightKg * Ri * Si) + F;
  }

  const Rp = weightKg * Vj;
  const net = Rp - P;

  return {
    weightKg: Math.round(weightKg * 100) / 100,
    category,
    pickupType,
    isSegregated,
    baseProcessingRate: Ri,
    segregationFactor: Si,
    fixedSurcharge: F,
    processingFee: Math.round(P * 100) / 100,
    buybackRate: Vj,
    recyclablePayout: Math.round(Rp * 100) / 100,
    netSettlement: Math.round(net * 100) / 100,
    isNetPayout: net > 0,
    settlementAmount: Math.abs(Math.round(net * 100) / 100)
  };
}

/**
 * Calculate Environmental Impact metrics from completed pickups
 */
export function calculateEnvironmentalImpact(pickups: Pickup[]): EnvironmentalImpact {
  const completed = pickups.filter(p => p.status === 'completed' || p.status === 'verified' || p.status === 'recycling_processing');
  
  let totalDiverted = 0;
  let totalRecyclables = 0;

  completed.forEach(p => {
    const w = p.weightKg || 0;
    totalDiverted += w;
    if (p.category !== 'hazardous' && p.category !== 'mixed') {
      totalRecyclables += w;
    }
  });

  // Standard EPA WARM model conversion approximations
  // 1 kg recycled plastic/paper/metal saves ~1.8 kg CO2 eq
  const co2PreventedKg = Math.round(totalRecyclables * 1.8 * 10) / 10;
  // 1 tree saved per ~60 kg paper/cardboard
  const treesSavedEquivalent = Math.round((totalDiverted / 60) * 10) / 10;
  // ~25 liters water conserved per kg recycled materials
  const waterSavedLiters = Math.round(totalRecyclables * 25);
  // Score: 10 points per kg + 50 points per completed pickup
  const recyclingScore = Math.round(totalDiverted * 10 + completed.length * 50);

  return {
    wasteDivertedKg: Math.round(totalDiverted * 10) / 10,
    recyclablesCollectedKg: Math.round(totalRecyclables * 10) / 10,
    co2PreventedKg,
    treesSavedEquivalent,
    waterSavedLiters,
    recyclingScore
  };
}

// Initial Demo Users
export const INITIAL_USERS: User[] = [
  {
    id: 'usr_res_1',
    username: 'resident',
    name: 'Priya Sharma',
    email: 'resident@ecocollect.demo',
    role: 'resident',
    phone: '+91 98450 11223',
    address: {
      street: 'Flat 402, Green Glen Layout, 12th Main',
      area: 'Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
      lat: 12.9716,
      lng: 77.6412
    },
    savedAddresses: [
      {
        id: 'addr_1',
        label: 'Home (Primary)',
        street: 'Flat 402, Green Glen Layout, 12th Main',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
        isDefault: true
      },
      {
        id: 'addr_2',
        label: 'Office Workspace',
        street: 'Suite 204, Tech Park, Outer Ring Road',
        area: 'Marathahalli',
        city: 'Bengaluru',
        pincode: '560037',
        isDefault: false
      }
    ],
    upiId: 'priya@okhdfcbank',
    rewardPoints: 480,
    walletBalance: 562.50
  },
  {
    id: 'usr_res_2',
    username: 'rahul',
    name: 'Rahul Verma',
    email: 'rahul@ecocollect.demo',
    role: 'resident',
    phone: '+91 99887 76655',
    address: {
      street: 'House #88, 4th Cross, Koramangala 4th Block',
      area: 'Koramangala',
      city: 'Bengaluru',
      pincode: '560034',
      lat: 12.9352,
      lng: 77.6245
    },
    savedAddresses: [
      {
        id: 'addr_3',
        label: 'Home',
        street: 'House #88, 4th Cross, Koramangala 4th Block',
        area: 'Koramangala',
        city: 'Bengaluru',
        pincode: '560034',
        isDefault: true
      }
    ],
    upiId: 'rahul@icici',
    rewardPoints: 195,
    walletBalance: 210.00
  },
  {
    id: 'usr_agent_1',
    username: 'agent',
    name: 'Rajesh Kumar',
    email: 'agent@ecocollect.demo',
    role: 'agent',
    phone: '+91 97410 88990',
    address: {
      street: 'Municipal Transfer Depot Ward 84',
      area: 'Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
      lat: 12.9720,
      lng: 77.6418
    },
    agentDetails: {
      agentCode: 'AGT-409',
      vehicleNumber: 'KA-01-EQ-1002 (Electric Cargo Van)',
      vehicleType: 'EV Three-Wheeler Container',
      assignedArea: 'Indiranagar & Koramangala Zone',
      isOnline: true,
      rating: 4.9,
      totalPickupsCompleted: 142,
      todayPickupsCount: 6,
      monthlyEarnings: 18450
    },
    rewardPoints: 1250,
    walletBalance: 0
  },
  {
    id: 'usr_admin_1',
    username: 'admin',
    name: 'Dr. Ramesh Rao',
    email: 'admin@ecocollect.demo',
    role: 'admin',
    phone: '+91 80 2222 5555',
    address: {
      street: 'Solid Waste Management Division, Corporation Circle',
      area: 'Shivajinagar',
      city: 'Bengaluru',
      pincode: '560002',
      lat: 12.9698,
      lng: 77.5855
    },
    rewardPoints: 0,
    walletBalance: 0
  }
];

// Initial Demo Pickups showcasing multiple waste categories
export const INITIAL_PICKUPS: Pickup[] = [
  {
    id: 'pku_101',
    pickupCode: 'ECO-842910',
    residentId: 'usr_res_1',
    residentName: 'Priya Sharma',
    residentPhone: '+91 98450 11223',
    residentAddress: 'Flat 402, Green Glen Layout, Indiranagar, Bengaluru',
    residentCoordinates: { lat: 12.9716, lng: 77.6412 },
    agentId: 'usr_agent_1',
    agentName: 'Rajesh Kumar',
    agentPhone: '+91 97410 88990',
    agentVehicle: 'KA-01-EQ-1002',
    category: 'plastic',
    pickupType: 'routine',
    scheduledDate: '2026-09-07',
    timeSlot: '09:00 AM - 11:00 AM',
    status: 'en_route',
    isSegregated: true,
    segregationFactor: 0.8,
    weightKg: 4.85,
    weightSource: 'iot_loadcell',
    rawAdcReading: 842100,
    wastePhotoUrl: 'https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=600&q=80',
    cnnCategory: 'plastic',
    cnnConfidence: 0.96,
    mismatchFlagged: false,
    itemDetails: {
      plasticType: 'PET Water/Soda Bottles (#1)',
      condition: 'Clean, rinsed and dry',
      itemCount: 24,
      approxWeight: 4.85
    },
    processingFee: 13.58,
    recyclablePayout: 87.30,
    netSettlement: 73.72,
    paymentStatus: 'pending',
    createdAt: '2026-09-07T07:15:00Z',
    notes: 'Segregated washed PET water bottles and HDPE containers'
  },
  {
    id: 'pku_102',
    pickupCode: 'ECO-791044',
    residentId: 'usr_res_2',
    residentName: 'Rahul Verma',
    residentPhone: '+91 99887 76655',
    residentAddress: 'House #88, 4th Cross, Koramangala 4th Block, Bengaluru',
    residentCoordinates: { lat: 12.9352, lng: 77.6245 },
    agentId: 'usr_agent_1',
    agentName: 'Rajesh Kumar',
    agentPhone: '+91 97410 88990',
    agentVehicle: 'KA-01-EQ-1002',
    category: 'e_waste',
    pickupType: 'e_waste_special',
    scheduledDate: '2026-09-07',
    timeSlot: '02:00 PM - 04:00 PM',
    status: 'assigned',
    isSegregated: true,
    segregationFactor: 0.8,
    weightKg: 2.10,
    weightSource: 'pending',
    wastePhotoUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=600&q=80',
    cnnCategory: 'e_waste',
    cnnConfidence: 0.94,
    mismatchFlagged: false,
    itemDetails: {
      deviceType: 'Smartphones & Tablets',
      condition: 'Damaged screen / Repairable',
      hasLithiumBattery: 'Yes - Battery present',
      approxWeight: 2.10
    },
    processingFee: 63.44, // (2.1 * 8 * 0.8) + 50
    recyclablePayout: 94.50, // 2.1 * 45
    netSettlement: 31.06,
    paymentStatus: 'pending',
    createdAt: '2026-09-07T08:30:00Z',
    notes: 'Old broken smartphone, charger cables, and dead lithium powerbank'
  },
  {
    id: 'pku_103',
    pickupCode: 'ECO-654120',
    residentId: 'usr_res_1',
    residentName: 'Priya Sharma',
    residentPhone: '+91 98450 11223',
    residentAddress: 'Flat 402, Green Glen Layout, Indiranagar, Bengaluru',
    residentCoordinates: { lat: 12.9716, lng: 77.6412 },
    agentId: 'usr_agent_1',
    agentName: 'Rajesh Kumar',
    agentPhone: '+91 97410 88990',
    category: 'paper_cardboard',
    pickupType: 'routine',
    scheduledDate: '2026-09-06',
    timeSlot: '11:00 AM - 01:00 PM',
    status: 'recycling_processing',
    isSegregated: true,
    segregationFactor: 0.8,
    weightKg: 6.40,
    weightSource: 'iot_loadcell',
    rawAdcReading: 1125000,
    wastePhotoUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
    cnnCategory: 'paper_cardboard',
    cnnConfidence: 0.98,
    mismatchFlagged: false,
    itemDetails: {
      paperType: 'Corrugated Cardboard Boxes',
      isBundled: 'Yes - Tied with rope / flattened',
      approxWeight: 6.40
    },
    recyclingDestinationFacility: 'Pulp Recycling & Recycled Kraft Board Mill (Peenya)',
    processingFee: 10.24,
    recyclablePayout: 76.80,
    netSettlement: 66.56,
    paymentStatus: 'payout_credited',
    upiTxnId: 'UPI-202609068712',
    createdAt: '2026-09-06T10:00:00Z',
    completedAt: '2026-09-06T12:20:00Z',
    notes: 'Clean corrugated cardboard and old newspapers sent for pulping.'
  },
  {
    id: 'pku_104',
    pickupCode: 'ECO-552319',
    residentId: 'usr_res_2',
    residentName: 'Rahul Verma',
    residentPhone: '+91 99887 76655',
    residentAddress: 'House #88, 4th Cross, Koramangala 4th Block, Bengaluru',
    residentCoordinates: { lat: 12.9352, lng: 77.6245 },
    agentId: 'usr_agent_1',
    agentName: 'Rajesh Kumar',
    category: 'metal',
    pickupType: 'routine',
    scheduledDate: '2026-09-05',
    timeSlot: '04:00 PM - 06:00 PM',
    status: 'completed',
    isSegregated: true,
    segregationFactor: 0.8,
    weightKg: 3.50,
    weightSource: 'iot_loadcell',
    rawAdcReading: 612000,
    wastePhotoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80',
    cnnCategory: 'metal',
    cnnConfidence: 0.95,
    mismatchFlagged: false,
    itemDetails: {
      metalType: 'Aluminum Cans & Foil',
      condition: 'Clean sorted scrap',
      approxWeight: 3.50
    },
    recyclingDestinationFacility: 'Scrap Metal Induction Smelting & Secondary Refining Unit',
    processingFee: 8.40,
    recyclablePayout: 112.00,
    netSettlement: 103.60,
    paymentStatus: 'payout_credited',
    upiTxnId: 'UPI-202609059910',
    createdAt: '2026-09-05T14:10:00Z',
    completedAt: '2026-09-05T16:30:00Z',
    notes: 'Aluminum beverage cans cleanly crushed.'
  },
  {
    id: 'pku_105',
    pickupCode: 'ECO-338190',
    residentId: 'usr_res_1',
    residentName: 'Priya Sharma',
    residentPhone: '+91 98450 11223',
    residentAddress: 'Flat 402, Green Glen Layout, Indiranagar, Bengaluru',
    residentCoordinates: { lat: 12.9716, lng: 77.6412 },
    agentId: 'usr_agent_1',
    agentName: 'Rajesh Kumar',
    category: 'glass',
    pickupType: 'routine',
    scheduledDate: '2026-09-04',
    timeSlot: '10:00 AM - 12:00 PM',
    status: 'completed',
    isSegregated: true,
    segregationFactor: 0.8,
    weightKg: 4.20,
    weightSource: 'iot_loadcell',
    rawAdcReading: 735000,
    wastePhotoUrl: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?auto=format&fit=crop&w=600&q=80',
    cnnCategory: 'glass',
    cnnConfidence: 0.93,
    mismatchFlagged: false,
    itemDetails: {
      glassType: 'Beverage & soda bottles',
      color: 'Clear (Flint)',
      isSafePackaged: 'Yes, securely packed in cardboard box',
      approxWeight: 4.20
    },
    recyclingDestinationFacility: 'Cullet Smelting & Secondary Container Glass Foundry',
    processingFee: 8.40,
    recyclablePayout: 16.80,
    netSettlement: 8.40,
    paymentStatus: 'payout_credited',
    upiTxnId: 'UPI-202609041234',
    createdAt: '2026-09-04T09:00:00Z',
    completedAt: '2026-09-04T11:15:00Z',
    notes: 'Clear glass bottles boxed and safely handed over.'
  }
];

// Initial App Notifications
export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_1',
    userId: 'usr_res_1',
    pickupId: 'pku_101',
    title: 'Agent En Route',
    message: 'Rajesh Kumar is on the way to collect your plastic waste. Estimated arrival: 15 mins.',
    type: 'pickup_update',
    timestamp: '2026-09-07T08:45:00Z',
    read: false
  },
  {
    id: 'notif_2',
    userId: 'usr_res_1',
    pickupId: 'pku_103',
    title: 'Sent for Responsible Recycling',
    message: 'Your 6.4 KG paper & cardboard waste has been delivered to Pulp Recycling Mill (Peenya).',
    type: 'success',
    timestamp: '2026-09-06T14:30:00Z',
    read: true
  },
  {
    id: 'notif_3',
    userId: 'usr_res_1',
    pickupId: 'pku_103',
    title: 'Reward Credited to Wallet',
    message: '₹66.56 credited for verified paper recycling + 25 Green Reward Points.',
    type: 'reward',
    timestamp: '2026-09-06T12:22:00Z',
    read: true
  },
  {
    id: 'notif_4',
    userId: 'usr_res_2',
    pickupId: 'pku_102',
    title: 'Pickup Confirmed',
    message: 'Your E-Waste pickup ECO-791044 is confirmed for today (02:00 PM - 04:00 PM).',
    type: 'info',
    timestamp: '2026-09-07T08:35:00Z',
    read: false
  }
];

// Initial Demo Telemetry Logs
export const INITIAL_WEIGHT_LOGS: WeightLog[] = [
  {
    id: 'wlog_1',
    scaleId: 'ESP32-HX711-UNIT-01',
    weightKg: 4.85,
    rawADC: 842100,
    batteryVoltage: 3.88,
    wifiRssi: -62,
    pickupCode: 'ECO-842910',
    timestamp: '2026-09-07T08:50:30Z'
  },
  {
    id: 'wlog_2',
    scaleId: 'ESP32-HX711-UNIT-01',
    weightKg: 3.50,
    rawADC: 612000,
    batteryVoltage: 3.94,
    wifiRssi: -59,
    pickupCode: 'ECO-552319',
    timestamp: '2026-09-05T16:15:10Z'
  },
  {
    id: 'wlog_3',
    scaleId: 'ESP32-HX711-UNIT-02',
    weightKg: 6.40,
    rawADC: 1125000,
    batteryVoltage: 4.05,
    wifiRssi: -67,
    pickupCode: 'ECO-654120',
    timestamp: '2026-09-06T11:45:00Z'
  }
];

// Sample multi-waste photos with categories for AI vision inference and simulation
export const SAMPLE_WASTE_PHOTOS: {
  title: string;
  category: WasteCategory;
  confidence: number;
  url: string;
  description: string;
}[] = [
  {
    title: 'PET Water Bottles & Containers',
    category: 'plastic',
    confidence: 0.96,
    url: 'https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=600&q=80',
    description: 'Clean segregated polyethylene terephthalate bottles'
  },
  {
    title: 'Corrugated Cardboard & Paper Boxes',
    category: 'paper_cardboard',
    confidence: 0.98,
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
    description: 'Dry pulped fiber packaging and clean boxes'
  },
  {
    title: 'Motherboards, Cables & Circuit Assemblies',
    category: 'e_waste',
    confidence: 0.94,
    url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=600&q=80',
    description: 'Electronic printed circuit boards and mobile scrap'
  },
  {
    title: 'Fruit & Vegetable Kitchen Waste',
    category: 'organic',
    confidence: 0.92,
    url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
    description: 'Biodegradable wet compostable scraps'
  },
  {
    title: 'Aluminum Cans & Metal Scrap',
    category: 'metal',
    confidence: 0.95,
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80',
    description: 'Crushed beverage cans and recyclable metal parts'
  },
  {
    title: 'Flint & Amber Glass Bottles',
    category: 'glass',
    confidence: 0.93,
    url: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?auto=format&fit=crop&w=600&q=80',
    description: 'Safely boxed soda and beverage glass bottles'
  },
  {
    title: 'Discarded Garments & Clean Fabric',
    category: 'textile',
    confidence: 0.91,
    url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    description: 'Clean segregated cotton and synthetic apparel'
  },
  {
    title: 'Dry Cell Batteries & Electronic Cells',
    category: 'hazardous',
    confidence: 0.89,
    url: 'https://images.unsplash.com/photo-1619725002198-6a689b72f41d?auto=format&fit=crop&w=600&q=80',
    description: 'Alkaline batteries requiring hazardous isolation'
  }
];
