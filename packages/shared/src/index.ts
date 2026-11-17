export type UserRole = 'customer' | 'rider' | 'admin';

export type KycStatus = 'pending' | 'approved' | 'rejected';

export type VehicleType = 'motorbike';

export type RequestStatus =
  | 'pending_payment'
  | 'searching_rider'
  | 'accepted'
  | 'at_terminal'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export interface CargoTerminal {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
}

export interface FareEstimateInput {
  distanceKm: number;
  toPayAmount: number;
}

export interface FareEstimate {
  baseFare: number;
  distanceFare: number;
  serviceFee: number;
  toPayAmount: number;
  totalPayable: number;
}

/**
 * Calculates MVP motorbike cargo pickup fare in PKR.
 * Base fare covers terminal waiting time; per-km rate covers delivery distance.
 */
export function calculateMotorbikeFare(input: FareEstimateInput): FareEstimate {
  const baseFare = 200;
  const perKmRate = 35;
  const distanceFare = Math.round(Math.max(1, input.distanceKm) * perKmRate);
  const serviceFee = 50;
  const toPayAmount = Math.max(0, Math.round(input.toPayAmount));
  const totalPayable = baseFare + distanceFare + serviceFee + toPayAmount;

  return {
    baseFare,
    distanceFare,
    serviceFee,
    toPayAmount,
    totalPayable,
  };
}

export interface SecureDocumentPayload {
  requestId: string;
  biltyNumber: string;
  biltyImageUrl: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
  watermarkText: string;
  expiresAt: string;
}
