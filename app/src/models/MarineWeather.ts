export type MarineRiskLevel = 'good' | 'normal' | 'caution' | 'danger';

export interface MarineWeather {
  pointId: string;
  lat: number;
  lng: number;
  waveHeightM?: number;
  currentDirectionDeg?: number;
  currentSpeedKnot?: number;
  waterTempC?: number;
  windSpeedMps?: number;
  visibilityM?: number;
  tideTimeIso?: string;
  airTempC?: number;
  weatherState?: string;
  riskLevel: MarineRiskLevel;
  riskReason: string;
  summary: string;
  recommendationScore?: number;
  dataCompletenessScore?: number;
  riskConfidence?: 'high' | 'medium' | 'low';
  diveAllowed?: boolean;
  noDiveReason?: string;
  beginnerSafe?: boolean;
  beginnerWarning?: string;
  warnings?: string[];
  bestDiveTimeIso?: string;
  bestDiveScore?: number;
  bestDiveWindowStartIso?: string;
  bestDiveWindowEndIso?: string;
  source: 'stormglass' | 'cache' | 'none';
  hourly?: {
    timeIso: string;
    waveHeightM?: number;
    currentSpeedKnot?: number;
    waterTempC?: number;
    visibilityM?: number;
    riskLevel?: MarineRiskLevel;
    recommendationScore?: number;
    diveAllowed?: boolean;
  }[];
  tideTimes?: { type: 'high' | 'low'; timeIso: string }[];
  observedAt: string;
  fetchedAt: string;
}
