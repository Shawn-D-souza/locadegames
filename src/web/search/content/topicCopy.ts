import type { TopicPageCopy } from "../types";

/**
 * Pages made for searches that aren't one game, picked from keyword research (US): the GamePigeon question (Easy,
 * 1,000+ a month), 2 player games on different phones (the results are mostly same-screen games), and room codes.
 * GamePigeon is named only in plain words, to say truthfully what it is and isn't (owner decision): never its logo or
 * art, never as if Locade were it or connected to it.
 */
export const TOPIC_COPY = {
  gamePigeon: {
    slug: "game-pigeon-for-android",
    title: "GamePigeon for Android? Play With iPhone Friends | Locade",
    description:
      "GamePigeon only works in iMessage, so Android phones can't join. Locade runs in any phone's browser: chess, checkers, pool, sea battle and more, together.",
    heading: "Is GamePigeon on Android? How to play games together",
    intro: [
      "No: GamePigeon only works inside iMessage, and iMessage only runs on Apple devices. So when one friend has an Android phone, they can't join the game.",
      "Locade is a free way round that. It runs in the browser of any phone, so iPhones and Android phones play together, with nothing to install.",
    ],
    sections: [
      {
        heading: "Can you play GamePigeon on Android?",
        paragraphs: [
          "There's no Android version of GamePigeon. It's an iMessage app, and iMessage only exists on iPhone, iPad and Mac, so an Android phone can't receive or play a GamePigeon game.",
          "You may read about workarounds, but they need extra setup and don't always work. A game that runs in the browser avoids the problem altogether.",
        ],
      },
      {
        heading: "Play on Android and iPhone together",
        paragraphs: [
          "On Locade, one person taps CREATE ROOM and shares a 6-digit code or a link in any chat: WhatsApp, Messages, Discord, anything. Everyone opens it on their own phone and joins the room.",
          "No app, no account, and it doesn't matter who has which phone.",
        ],
        table: [
          ["", "GamePigeon", "Locade"],
          ["Works on", "iPhone, iPad and Mac, inside iMessage", "Any phone, tablet or computer with a browser"],
          ["Android phones", "Can't join", "Play with everyone else"],
          ["Starting a game", "Send it in an iMessage chat", "Share a room code or link in any chat app"],
          ["Install", "The app, in iMessage", "Nothing, and no sign-up"],
        ],
      },
      {
        heading: "The classic 2 player games",
        paragraphs: [
          "Many of the classic games people play in iMessage are on Locade too: chess, checkers, four in a row, sea battle and 8-ball pool, each with its own rules and look.",
        ],
        games: ["chess", "checkers", "fourinarow", "seabattle", "pool"],
      },
      {
        heading: "More than two friends at once",
        paragraphs: [
          "A Locade room takes up to 8 friends. Some games put everyone on one board, like Ludo, Dots and Boxes or Memory; the 1 v 1 games turn into a quick tournament, with a champion at the end.",
        ],
        games: ["ludo", "dotsboxes", "memory"],
      },
    ],
    faq: [
      {
        question: "Can Android and iPhone play GamePigeon together?",
        answer: "No. GamePigeon needs iMessage, which Android phones don't have. To play with mixed phones, use games that run in the browser, like Locade.",
      },
      {
        question: "Is there a GamePigeon alternative for Android and iPhone?",
        answer:
          "Locade works on both: make a room, share the code or link, and play chess, checkers, pool, sea battle, four in a row and more, each on your own phone.",
      },
      {
        question: "Do I need to download anything?",
        answer: "No. Locade runs in the phone's browser. There's no app to install and no account to make.",
      },
      {
        question: "Is it free?",
        answer: "Yes, Locade is free to play.",
      },
    ],
    note: "Locade isn't affiliated with GamePigeon or Apple. GamePigeon and iMessage are trademarks of their owners.",
  },

  differentPhones: {
    slug: "2-player-games-on-different-phones",
    title: "2 Player Games on Different Phones – Free, No App | Locade",
    description:
      "Free 2 player games you play on two different phones, side by side or far apart: chess, pool, sea battle, 4 in a row and more. No app, no sign-up.",
    heading: "2 player games on different phones",
    intro: [
      "Most 2 player games online are played on one shared screen. These are different: each of you plays on your own phone, whether you're on the same couch or on opposite sides of the world.",
      "They run in the browser, so it doesn't matter if one of you has an iPhone and the other an Android. Make a room, share the code, and play.",
    ],
    sections: [
      {
        heading: "How it works",
        paragraphs: [
          "One of you opens Locade and taps CREATE ROOM. Send the 6-digit code or the link to the other phone, they open it, and you're in the same room. Pick a game and it starts on both phones at once.",
          "Nothing to download and no account: the whole thing takes a few seconds.",
        ],
      },
      {
        heading: "Games for two",
        paragraphs: [
          "The classics, made for two phones: your own view of the board, your own timer, and no passing a phone back and forth.",
        ],
        games: ["chess", "checkers", "fourinarow", "seabattle", "tictactoe", "ultimate", "headcrash"],
      },
      {
        heading: "Games that also work for two (or more)",
        paragraphs: [
          "These take up to 8, but they're just as good with two: pool and carrom for up to 4, and board and card games for the whole group.",
        ],
        games: ["pool", "carrom", "dotsboxes", "memory", "ludo", "snakesladders", "dotsclash", "territory"],
      },
      {
        heading: "Far apart, or on a call",
        paragraphs: [
          "Because each player has their own phone, it works just as well long distance. Start a FaceTime, WhatsApp or Discord call, share the room link in the chat, and play while you talk.",
        ],
      },
    ],
    faq: [
      {
        question: "What games can two people play on different phones?",
        answer:
          "Chess, checkers, 4 in a Row, Sea Battle, tic-tac-toe, Ultimate tic-tac-toe, pool, carrom and more: on Locade, each player uses their own phone in the same room.",
      },
      {
        question: "Can an iPhone and an Android phone play together?",
        answer: "Yes. Locade runs in the browser, so any two phones can play together.",
      },
      {
        question: "Do we need to be in the same place?",
        answer: "No. You can play side by side or in different countries; all you share is the room code or link.",
      },
    ],
  },

  roomCodes: {
    slug: "games-with-room-codes",
    title: "Online Games With Room Codes – Play With Friends | Locade",
    description:
      "Free online games with a room code: make a private room, share the 6-digit code or link, and up to 8 friends join from their phones. No app, no sign-up.",
    heading: "Online games with a room code",
    intro: [
      "A room code is the easiest way to get friends into the same game: one person makes a private room, everyone else types its code, and you're together.",
      "On Locade, a room holds up to 8 friends and 15 games. Play one, come back to the room, pick another, without anyone having to join again.",
    ],
    sections: [
      {
        heading: "How room codes work",
        paragraphs: [
          "Tap CREATE ROOM and you get a 6-digit code, like 482 913. Read it out, send it in a chat, or share the room's link or QR code. Friends type the code on the home page, or just open the link, and they're in.",
          "Rooms are private: there's no public lobby and no random matchmaking, so only people with the code can join.",
        ],
      },
      {
        heading: "Up to 8 friends, 15 games",
        paragraphs: [
          "In the room, the host picks a game and it starts for everyone. Others can suggest a game by tapping it. Some games put everyone on one board; the 1 v 1 games turn into a quick tournament.",
        ],
        games: ["ludo", "dotsboxes", "memory", "territory", "chess", "pool"],
      },
      {
        heading: "Nothing to install",
        paragraphs: [
          "Everything runs in the browser, on any phone, tablet or computer. No app, no account: pick a name and play.",
        ],
      },
    ],
    faq: [
      {
        question: "How many friends can join a room?",
        answer: "Up to 8. A few games take fewer (pool and carrom: up to 4).",
      },
      {
        question: "Can strangers join my room?",
        answer: "Only people with the code or link. Rooms are private, and there's no public matchmaking.",
      },
      {
        question: "How long does a room last?",
        answer: "As long as you're playing. A room closes an hour after everyone has left, or after 24 hours.",
      },
    ],
  },
} as const satisfies Record<string, TopicPageCopy>;

/** The page listing every game. */
export const GAMES_INDEX_COPY = {
  title: "All Free Games to Play With Friends on Your Phones | Locade",
  description:
    "All of Locade's free games to play with friends, each on their own phone: chess, checkers, pool, carrom, Ludo, Sea Battle, Dots and Boxes and more. No app.",
  heading: "Free games to play with friends",
  intro: [
    "Every game on Locade, played with friends on your own phones, in the browser. Make a room, share the code, and pick a game: switch to another any time without leaving the room.",
  ],
  groups: {
    together: "Everyone together (2 to 8)",
    versus: "1 v 1 games",
  },
} as const;
