import { seededRandom } from "../../random";
import { MEMORY_CONFIG } from "./config";
import { CARD_COLORS, familyOf, GROUPS, groupOf, LOOKALIKES, PICTURE_GROUPS, type PictureId } from "./pictures";
import type { MemoryFace } from "./types";

/** A whole number in 0 … count - 1. */
const below = (random: () => number, count: number) => Math.floor(random() * count);

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = below(random, i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const looksLike = (picture: PictureId, others: readonly PictureId[]) =>
  LOOKALIKES.some(([a, b]) => (a === picture && others.includes(b)) || (b === picture && others.includes(a)));

/**
 * The pictures for a game: a random group with room left (one or two from a group), then a random picture of it that
 * isn't in yet and looks like nothing in yet. Groups are picked evenly, so a group of six pictures isn't favoured.
 */
function pickPictures(count: number, random: () => number): PictureId[] {
  const picked: PictureId[] = [];
  while (picked.length < count) {
    const choices = (group: (typeof GROUPS)[number]) =>
      (PICTURE_GROUPS[group] as readonly PictureId[]).filter((p) => !picked.includes(p) && !looksLike(p, picked));
    const open = GROUPS.filter((g) => picked.filter((p) => groupOf(p) === g).length < MEMORY_CONFIG.perGroup && choices(g).length > 0);
    if (open.length === 0) break;
    const pictures = choices(open[below(random, open.length)]!);
    picked.push(pictures[below(random, pictures.length)]!);
  }
  return picked;
}

/**
 * A game's `pairs` faces, from `seed` (my calls on the mix): about two thirds different pictures (one or two from a
 * group), the rest a picture already in again in a color from another family (owner: a different color is a different
 * pair, and confuses). If the groups run out of pictures first, pictures come round again in a third color, every
 * color of a picture from a different family. Colors come from a shuffled bag, so each is used about as often.
 */
export function pickFaces(pairs: number, seed: number): MemoryFace[] {
  const random = seededRandom(seed);
  const pictures = pickPictures(Math.min(pairs, Math.ceil(pairs * MEMORY_CONFIG.pictureShare)), random);
  let bag: number[] = [];
  const draw = (avoid: readonly number[]) => {
    for (let tries = 0; tries < 2; tries++) {
      if (bag.length === 0) bag = shuffled(CARD_COLORS, random);
      const at = bag.findIndex((color) => !avoid.includes(familyOf(color)));
      if (at !== -1) return bag.splice(at, 1)[0]!;
      bag = [];
    }
    return CARD_COLORS.find((color) => !avoid.includes(familyOf(color)))!;
  };
  const faces: MemoryFace[] = pictures.map((picture) => ({ picture, color: draw([]) }));
  // Rounds of pictures coming again, each round in a fresh order, until every pair is there.
  while (faces.length < pairs) {
    for (const picture of shuffled(pictures, random).slice(0, pairs - faces.length)) {
      faces.push({ picture, color: draw(faces.filter((f) => f.picture === picture).map((f) => familyOf(f.color))) });
    }
  }
  return shuffled(faces, random);
}

/** The face a card gets the first time it's turned: one of the cards not yet turned, each as likely, from `seed`. */
export function dealFace(undealt: readonly number[], seed: number): number {
  const total = undealt.reduce((sum, n) => sum + n, 0);
  let pick = below(seededRandom(seed), total);
  for (let face = 0; face < undealt.length; face++) {
    pick -= undealt[face]!;
    if (pick < 0) return face;
  }
  return undealt.findIndex((n) => n > 0);
}
