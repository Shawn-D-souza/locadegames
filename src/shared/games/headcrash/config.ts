/**
 * Head Crash's gameplay numbers. The world is in meters (a car is about 2.5 long), seconds and steps;
 * y points up. Server and phones run the same steps with these numbers, so they must only change together.
 */
export const HEADCRASH_CONFIG = {
  minPlayers: 2,
  /** Simulation steps per second: physics this quick stays solid, and a button answers within a frame. */
  tickRate: 60,
  tickMs: 1000 / 60,
  /** The server sends the whole state every this many steps (30 a second). */
  snapshotEveryTicks: 2,

  /** First to this many points wins the match. */
  pointsToWin: 5,
  /** This many rounds in a row without a point (both heads hit at once) end the match as it stands: nobody is playing. */
  maxDeadRounds: 3,
  /** 3, 2, 1 before a match's first round (a second each, so everyone has the arena on screen), and before every later round (quicker). */
  firstCountdownTicks: 180,
  countdownTicks: 108,
  /** After a head is hit everything holds still this long, then the next round starts. */
  hitPauseTicks: 84,

  water: {
    /** The water stands this high above the frame's bottom from the start: a band along the bottom of the screen, below every floor. */
    startDepth: 1,
    /** It starts rising this long into a round and reaches the ceiling this much later. */
    startTicks: 20 * 60,
    riseTicks: 15 * 60,
  },

  gravity: 28,
  car: {
    mass: 1,
    /** Resistance to turning (mass × radius²): higher is lazier in the air and steadier on bumps. */
    inertia: 0.7,
    /** Wheels: centers left and right of the middle and below it, and their size. */
    wheelX: 0.82,
    wheelY: -0.3,
    wheelRadius: 0.48,
    /** The body: three discs in a row. */
    bodyX: 0.74,
    bodyY: 0.16,
    bodyRadius: 0.42,
    /** The driver's head, sticking out of the top. It is not solid: anything touching it ends the round. */
    headY: 0.84,
    headRadius: 0.34,
    /** Fastest a car may move or spin, whatever happens (keeps a pile-up sane). */
    maxSpeed: 40,
    maxSpin: 16,
  },
  drive: {
    /** A button pushes the wheels toward this speed along the ground, this hard. */
    maxSpeed: 15,
    accel: 32,
    /** Grip: the push can't be more than this times how hard the wheel presses on the ground (none on a wall it only brushes). */
    grip: 1.3,
    /** With no button the car rolls freely, slowing this gently. */
    rollDecel: 5,
    /**
     * The push comes from where the tyres touch the ground, below the car's middle, so it also tips the body: driving
     * off lifts the nose and braking dips it. This share of that tipping reaches the body (1 would flip the car over
     * backwards just by setting off).
     */
    lean: 0.5,
    /**
     * On the ground the buttons also lift the car (a wheelie): toward this spin (radians a second), this hard (0: off),
     * easing off over the last `tiltEase` before `tiltMax` (radians from the ground under its wheels) and holding
     * there. The car would fall over backwards past about 0.8 (its middle over the rear wheel), so the limit stays below.
     */
    tiltSpin: 3,
    tiltAccel: 16,
    tiltMax: 0.45,
    tiltEase: 0.25,
  },
  /**
   * Each wheel sits on a spring: it gives under the car's weight and on landings, so the body rocks and tilts on the
   * ground. Stiffness and damping are per unit of the car's mass; a wheel can be pushed this far up before it hits
   * the body (then it is solid).
   */
  suspension: {
    stiffness: 80,
    damping: 7,
    travel: 0.34,
  },
  air: {
    /** No wheel on the ground: the buttons turn the car toward this spin (radians a second), this hard. */
    maxSpin: 4.5,
    spinAccel: 30,
    /** Share of spin lost per second with no button held. */
    damping: 3,
  },
  contact: {
    /** Passes over all contacts per step. */
    iterations: 8,
    /** Contacts are found this far before touching, so fast cars slow into walls and never pass through. */
    margin: 0.06,
    /** Overlap allowed before pushing apart, the share pushed out per step, and the fastest push. */
    slop: 0.01,
    pushOut: 0.2,
    maxPushSpeed: 4,
    /** Bounce (share of speed returned) off the arena and between cars, for hits faster than `bounceMinSpeed`. */
    bounce: 0.12,
    carBounce: 0.35,
    bounceMinSpeed: 2.5,
    /** Sliding friction of a car's body on the arena, and between two cars. */
    bodyFriction: 0.45,
    carFriction: 0.35,
  },

  /** Ground that plays differently (the maps say where). */
  surfaces: {
    /**
     * A bounce pad throws whatever touches its top off at this speed at least (about 6 m up). Only pieces facing up at
     * least this much throw (its edges are just ground), so a car crossing it keeps its speed and flies on.
     */
    padLaunch: 18,
    padFacing: 0.9,
  },
  /** Things on some maps that move a car (the maps say where). */
  gadgets: {
    /**
     * A fan blows up this hard (a share of gravity) at its bottom, less and less up to nothing at its top, so a car
     * floats about 60% of the way up. The air also slows a car's rising and falling (a share a second), and the
     * buttons push the car sideways (instead of turning it), this hard.
     */
    fanLift: 2.6,
    fanDamping: 1.5,
    fanSteer: 12,
    /** A lift waits at the bottom, rises, waits at the top and comes down (seconds each). */
    liftWait: 1.5,
    liftMove: 2,
  },

  arena: {
    /**
     * What every screen shows whole (meters): x from -halfWidth to halfWidth, y from bottom to top. Wide and low
     * like a phone held sideways; the rest of the screen is more of the same world. The maps are in `maps.ts`.
     */
    frame: { halfWidth: 15, bottom: -3, top: 12 },
    /** Maps (and their frame) are drawn this much bigger than written in `maps.ts`: more room for the same car (owner: "slightly smaller" cars). */
    mapScale: 1.15,
    /** Longest piece of a curve in the ground's outline (curves are this smooth). */
    segment: 0.45,
  },
} as const;

/** Bits of a player's buttons. Both at once cancel out. */
export const BUTTON_LEFT = 1;
export const BUTTON_RIGHT = 2;

/** −1 left, +1 right, 0 none (or both). */
export const buttonDirection = (buttons: number): -1 | 0 | 1 =>
  (buttons & BUTTON_RIGHT ? 1 : 0) - (buttons & BUTTON_LEFT ? 1 : 0) as -1 | 0 | 1;
