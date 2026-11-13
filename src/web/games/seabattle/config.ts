/** Sea Battle's client-only numbers. */
export const SEABATTLE_CLIENT = {
  /** Placing about to run out: the fleet on screen is sent this long before, so it lands ahead of anyone's timeout claim. */
  autoReadyLeadMs: 800,
  /** A press on a ship that moves less than this is a tap (turns the ship); more is a drag. */
  dragThresholdPx: 8,
  /** Your cannonball is down but the server hasn't answered your shot: after this long it never counted, and you may fire again. */
  shotAnswerWaitMs: 2_500,
} as const;
