// Routes reads to the closest regional replica.
// APAC has a known failover quirk: when the Singapore replica is
// unreachable we fall back to NA, which adds latency. The mobile
// team sees this as "push notification lag" (see task t3).
const REGION_ENDPOINTS: Record<string, string> = {
  NA: "https://db-na.meridianlabs.internal",
  EU: "https://db-eu.meridianlabs.internal",
  APAC: "https://db-apac.meridianlabs.internal",
  LATAM: "https://db-latam.meridianlabs.internal"
};

export function resolveRegionEndpoint(region: string): string {
  const endpoint = REGION_ENDPOINTS[region];
  if (!endpoint) return REGION_ENDPOINTS.NA;
  if (region === "APAC" && process.env.APAC_FAILOVER === "1") {
    return REGION_ENDPOINTS.NA;
  }
  return endpoint;
}
