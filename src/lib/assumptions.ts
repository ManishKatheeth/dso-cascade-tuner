// Every number in this file is a SYNTHETIC ASSUMPTION for demo purposes.
// None of it is Kwikly data. Replace with real baselines from the warehouse before using for decisions.

export type Role = "hygienist" | "assistant" | "front_office";
export const ROLES: Role[] = ["hygienist", "assistant", "front_office"];

export interface RoleAssumptions {
  label: string;
  shareOfShifts: number; // share of posted shifts
  shiftHours: number;
  internalCostPerHr: number; // fully loaded cost of an internal employee/float
  networkBillPerHr: number; // W-2 marketplace bill rate
  vendorBillPerHr: number; // third-party agency bill rate
  lostProductionPerHr: number; // production lost when the chair sits empty
  internalHalfLifeH: number; // median hours for an available internal person to claim
  networkHalfLifeH: number;
  vendorHalfLifeH: number;
  pInternalAvailable: number; // chance anyone internal can take this shift at all
  pNetworkAvailable: number;
  pVendorAvailable: number;
}

export const ROLE_ASSUMPTIONS: Record<Role, RoleAssumptions> = {
  hygienist: {
    label: "Hygienist",
    shareOfShifts: 0.55,
    shiftHours: 8,
    internalCostPerHr: 48,
    networkBillPerHr: 72,
    vendorBillPerHr: 85,
    lostProductionPerHr: 190,
    internalHalfLifeH: 30,
    networkHalfLifeH: 6,
    vendorHalfLifeH: 10,
    pInternalAvailable: 0.6,
    pNetworkAvailable: 0.85,
    pVendorAvailable: 0.6,
  },
  assistant: {
    label: "Dental assistant",
    shareOfShifts: 0.35,
    shiftHours: 8,
    internalCostPerHr: 30,
    networkBillPerHr: 48,
    vendorBillPerHr: 58,
    lostProductionPerHr: 90,
    internalHalfLifeH: 20,
    networkHalfLifeH: 5,
    vendorHalfLifeH: 8,
    pInternalAvailable: 0.7,
    pNetworkAvailable: 0.9,
    pVendorAvailable: 0.6,
  },
  front_office: {
    label: "Front office",
    shareOfShifts: 0.1,
    shiftHours: 8,
    internalCostPerHr: 25,
    networkBillPerHr: 40,
    vendorBillPerHr: 48,
    lostProductionPerHr: 40,
    internalHalfLifeH: 24,
    networkHalfLifeH: 10,
    vendorHalfLifeH: 12,
    pInternalAvailable: 0.65,
    pNetworkAvailable: 0.75,
    pVendorAvailable: 0.6,
  },
};

// How far ahead of the start time shifts get posted (hours). Mix of call-outs and planned gaps.
export const LEAD_TIME_BUCKETS = [
  { label: "Call-out (<24h)", share: 0.3, minH: 2, maxH: 24 },
  { label: "This week (1-5 days)", share: 0.4, minH: 24, maxH: 120 },
  { label: "Planned (5-14 days)", share: 0.3, minH: 120, maxH: 336 },
];

// One platform, several marketplaces: the same policy lands differently on each.
export type ProfileId = "large_dso" | "mid_group" | "independent";
export interface MarketplaceProfile {
  id: ProfileId;
  label: string;
  description: string;
  offices: number;
  internalAvailabilityMult: number; // scales pInternalAvailable
  internalSpeedMult: number; // >1 = internal pool claims faster
}

export const PROFILES: Record<ProfileId, MarketplaceProfile> = {
  large_dso: {
    id: "large_dso",
    label: "Large DSO, deep float pool",
    description: "Branded marketplace, hundreds of offices, an established internal float pool.",
    offices: 60,
    internalAvailabilityMult: 1.15,
    internalSpeedMult: 1.2,
  },
  mid_group: {
    id: "mid_group",
    label: "Mid-size group, thin pool",
    description: "Branded marketplace that is new to internal-first, with a small float pool.",
    offices: 25,
    internalAvailabilityMult: 0.55,
    internalSpeedMult: 0.8,
  },
  independent: {
    id: "independent",
    label: "Independent practice",
    description: "Open marketplace and no internal pool. Waiting on internal staff only adds delay.",
    offices: 40,
    internalAvailabilityMult: 0,
    internalSpeedMult: 1,
  },
};

export const SIM_DEFAULTS = {
  seed: 42,
  weeks: 8,
  shiftsPerOfficePerWeek: 3,
  networkBufferH: 24, // always release to the network at least this long before start
};
