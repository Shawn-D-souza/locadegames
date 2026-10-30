import { ROOM_CONFIG } from "../../shared/rooms/config";

/** Friendly words for first-visit names. Longest adjective + space + longest animal fits `nameMaxLength`. */
export const NAME_ADJECTIVES = [
  "Happy", "Brave", "Swift", "Sunny", "Jolly", "Mighty", "Clever", "Cosmic", "Fuzzy", "Bouncy",
  "Sneaky", "Speedy", "Zippy", "Witty", "Bold", "Calm", "Cheery", "Daring", "Epic", "Fancy",
  "Gentle", "Giddy", "Groovy", "Jazzy", "Keen", "Noble", "Plucky", "Quick", "Silly", "Snappy",
  "Spicy", "Super", "Turbo", "Wild", "Zesty",
] as const;

export const NAME_ANIMALS = [
  "Panda", "Tiger", "Otter", "Falcon", "Koala", "Fox", "Penguin", "Dolphin", "Llama", "Badger",
  "Gecko", "Hippo", "Lynx", "Moose", "Narwhal", "Owl", "Parrot", "Rabbit", "Raccoon", "Shark",
  "Sloth", "Turtle", "Walrus", "Yak", "Zebra", "Bison", "Camel", "Eagle", "Ferret", "Hedgehog",
  "Jaguar", "Kiwi", "Lemur", "Puffin", "Quokka", "Rhino", "Squid", "Toucan", "Wombat",
] as const;

const pick = <T>(words: readonly T[], random: () => number): T =>
  words[Math.floor(random() * words.length)] ?? words[0]!;

/** A name like "Brave Otter" for players who haven't picked one. */
export function randomName(random: () => number = Math.random): string {
  const name = `${pick(NAME_ADJECTIVES, random)} ${pick(NAME_ANIMALS, random)}`;
  return [...name].slice(0, ROOM_CONFIG.nameMaxLength).join("");
}
