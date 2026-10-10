/**
 * Development fallback only — shown when the API is unreachable.
 * Never treat these as live production counts.
 */
export const MOCK_DASHBOARD_STATS = {
  activeReports: 3,
  possibleMatches: 1,
  inProgress: 2,
  returned: 1,
  usingMock: true as const,
};

export const MOCK_RECENT_ACTIVITY = [
  {
    id: "mock-act-1",
    title: "Black Backpack",
    type: "LOST" as const,
    date: "2026-10-08",
    location: "Main Library",
    status: "POSSIBLE_MATCH",
    statusLabel: "Possible Match",
  },
  {
    id: "mock-act-2",
    title: "Phone",
    type: "FOUND" as const,
    date: "2026-10-07",
    location: "Student Union",
    status: "UNDER_REVIEW",
    statusLabel: "Under Review",
  },
  {
    id: "mock-act-3",
    title: "Water Bottle",
    type: "LOST" as const,
    date: "2026-10-05",
    location: "Gym entrance",
    status: "RETURNED",
    statusLabel: "Returned",
  },
];
