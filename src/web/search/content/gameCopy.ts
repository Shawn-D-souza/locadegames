import type { GameId } from "../../../shared/games/catalog";
import type { GamePageCopy } from "../types";

/**
 * Each game's page made for search: the words people search for (US English, `docs/games/` for the rules). Keep the
 * rules in step with the game's doc; a rule changed there is changed here too.
 */
export const GAME_COPY: Record<GameId, GamePageCopy> = {
  chess: {
    slug: "chess",
    title: "Play Chess Online With Friends – Free, No App | Locade",
    description:
      "Play chess with a friend on your phones: full rules and a 10 + 5 clock, in the browser. Make a room, share the code, play. Free, no app, no sign-up.",
    heading: "Play chess online with friends",
    intro: [
      "Real chess with a friend, each on your own phone, right in the browser. One of you makes a room, the other types its code, and the board is up in seconds. No app to install and no account to make.",
      "Every rule is there: castling, en passant, promotion to the piece you pick, check and checkmate. Each player gets a chess clock, so a game never drags on.",
    ],
    rules: [
      "The full rules of chess: every piece's moves, castling on both sides, en passant and promotion (you choose queen, rook, bishop or knight).",
      "A clock of 10 minutes each, with 5 seconds added after every move, and at most 2 minutes for any one move. Running out of time loses.",
      "Win by checkmate, or when the other player's time runs out.",
      "Draws are automatic: stalemate, too little left to mate, the same position three times, or 50 moves each with no capture and no pawn moved.",
      "Who plays first is fair: never always the host, and shared out evenly over a session.",
      "Resign any time with the ✕ in the corner.",
    ],
    faq: [
      {
        question: "How do I play chess with a friend online?",
        answer:
          "Open Locade, tap CREATE ROOM and send your friend the 6-digit code or the link. When they've joined, tap Chess and the game starts on both phones.",
      },
      {
        question: "Do we need an account or an app?",
        answer: "No. Locade runs in the browser of any phone, tablet or computer, and nobody signs up.",
      },
      {
        question: "Can more than two friends play chess together?",
        answer:
          "Yes. With 3 to 8 in the room, everyone plays a short tournament: a game each round against someone new, with points for wins and draws, and a champion at the end.",
      },
    ],
    related: ["checkers", "fourinarow", "ultimate"],
  },

  checkers: {
    slug: "checkers",
    title: "Play Checkers Online With Friends – Free, No App | Locade",
    description:
      "Play checkers with a friend on your phones: classic American rules, captures forced, kings crowned. Share a room code and play. Free, no sign-up.",
    heading: "Play checkers online with friends",
    intro: [
      "Checkers the way most people learned it, played with a friend on your own phones. Make a room, share the code, and you're playing in seconds, in the browser, with nothing to install.",
      "It uses classic American rules on an 8 × 8 board: jumps are forced, a chain of jumps goes on to the end, and a piece reaching the far side is crowned king.",
    ],
    rules: [
      "8 × 8 board, 12 pieces each on the dark squares.",
      "Pieces move one square diagonally forward and capture by jumping, forward only.",
      "Captures are forced: if you can jump, you must, and a chain of jumps is played to its end (you pick which chain).",
      "A piece reaching the far row becomes a king, and that ends its move. Kings move and jump one square in any diagonal direction.",
      "Win by taking every piece of the other player, or leaving them no move.",
      "A draw: 40 moves each with only kings moving and nothing taken, or the same position three times.",
      "30 seconds a move. If time runs out, a move is played for you.",
    ],
    faq: [
      {
        question: "How do I play checkers online with a friend?",
        answer: "Tap CREATE ROOM on Locade, send the code or link to your friend, and tap Checkers once they're in. Each of you plays on your own phone.",
      },
      {
        question: "Are captures forced?",
        answer: "Yes, as in American checkers: when any of your pieces can jump, you have to jump.",
      },
      {
        question: "Can kings move across the whole board?",
        answer: "No. Kings move one square at a time, in any diagonal direction (no flying kings).",
      },
    ],
    related: ["chess", "fourinarow", "seabattle"],
  },

  fourinarow: {
    slug: "4-in-a-row",
    title: "4 in a Row Online With Friends – Free, No App | Locade",
    description:
      "Play 4 in a Row with a friend on your phones: drop discs, get four in a line to win. The classic drop-four game, free in the browser, no sign-up.",
    heading: "4 in a Row online with friends",
    intro: [
      "The drop-four game many people know as Connect 4, played with a friend on your own phones. Take turns dropping discs into a standing board; the first to line up four wins.",
      "Make a room, share its code, and play in the browser. No app, no account, and it works on iPhone and Android together.",
    ],
    rules: [
      "A standing board of 7 columns and 6 rows.",
      "On your turn, pick a column: your disc falls to the lowest empty hole.",
      "Four or more of your discs in a line wins: across, down or diagonally.",
      "A full board with no line is a draw.",
      "Who goes first is fair, and shared out evenly over a session (going first matters in this game).",
      "30 seconds a move. If time runs out, your disc drops in the leftmost column with room.",
    ],
    faq: [
      {
        question: "How do I play 4 in a Row online with a friend?",
        answer: "Open Locade, tap CREATE ROOM, share the code or link, then tap 4 in a Row. You each play on your own phone.",
      },
      {
        question: "Is this the same as Connect 4?",
        answer:
          "It's the same classic game: drop discs into a 7 × 6 board and get four in a row. Locade's version has its own name and look, and isn't affiliated with Connect 4 or its owners.",
      },
      {
        question: "Can I play with more than one friend?",
        answer: "Yes. With 3 or more in the room, everyone plays a short tournament: a game each round, points for wins and draws, and a champion at the end.",
      },
    ],
    related: ["tictactoe", "checkers", "seabattle"],
  },

  seabattle: {
    slug: "sea-battle",
    title: "Sea Battle Online With Friends – Battleship-Style | Locade",
    description:
      "Play Sea Battle with a friend on your phones: hide your fleet, fire at theirs, sink every ship first. A Battleship-style game, free in the browser.",
    heading: "Sea Battle online with friends",
    intro: [
      "The classic hidden-fleet game, Battleship-style, played on two phones. You each place your ships in secret, then take turns firing at each other's waters. A hit fires again.",
      "Because each player has their own phone, nobody can peek. Make a room, share the code and play in the browser, with no app and no sign-up.",
    ],
    rules: [
      "An 8 × 8 sea each, and a fleet of five ships: 5, 4, 3, 3 and 2 squares long.",
      "Both players place their ships at the same time, in secret, within 60 seconds: drag them onto the board, tap to turn them.",
      "Ships are straight and may touch, but never overlap.",
      "Take turns firing: press and hold on their waters to aim, let go to fire. A hit fires again; a miss passes the turn.",
      "A sunk ship shows to both players. A single hit tells you nothing more.",
      "The first to sink the whole fleet wins.",
      "30 seconds a shot.",
    ],
    faq: [
      {
        question: "How do I play Battleship online with a friend?",
        answer:
          "Locade's Sea Battle is a Battleship-style game you play on two phones: tap CREATE ROOM, send your friend the code, then tap Sea Battle. Locade isn't affiliated with Battleship or its owners.",
      },
      {
        question: "Can my friend see where my ships are?",
        answer: "No. Each fleet stays on its owner's phone; even people watching the game only see the shots until a ship sinks.",
      },
      {
        question: "Can ships touch each other?",
        answer: "Yes, side by side or corner to corner, so the square next to a sunk ship can hold another one.",
      },
    ],
    related: ["fourinarow", "chess", "headcrash"],
  },

  tictactoe: {
    slug: "tic-tac-toe",
    title: "Tic-Tac-Toe Online With Friends – Share a Link | Locade",
    description:
      "Play tic-tac-toe with a friend on your phones: share a code or link and play in seconds. Free in the browser, no app, no sign-up, iPhone and Android.",
    heading: "Tic-tac-toe online with friends",
    intro: [
      "The quickest game there is, played with a friend on your own phones. Share a room code or link, tap Tic-tac-toe, and you're playing.",
      "Each round takes a minute, so it's a good warm-up before something longer, and with more friends in the room it turns into a quick tournament.",
    ],
    rules: [
      "A 3 × 3 board. X goes first, then O.",
      "Three of yours in a row, across, down or diagonally, wins.",
      "A full board with no line is a draw.",
      "Who gets X is fair, and shared out evenly over a session.",
      "30 seconds a move.",
    ],
    faq: [
      {
        question: "How can I play tic-tac-toe with a friend online?",
        answer: "Open Locade, tap CREATE ROOM and send the link or the 6-digit code. When your friend joins, tap Tic-tac-toe.",
      },
      {
        question: "Can I send a link instead of a code?",
        answer: "Yes. The room has a share button that sends a link; opening it takes your friend straight to the room.",
      },
      {
        question: "Is there a harder version?",
        answer: "Try Ultimate Tic-tac-toe: nine small boards inside a big one, where every move decides where the other player plays next.",
      },
    ],
    related: ["ultimate", "fourinarow", "dotsboxes"],
  },

  ultimate: {
    slug: "ultimate-tic-tac-toe",
    title: "Ultimate Tic-Tac-Toe Online With Friends – Free | Locade",
    description:
      "Play Ultimate Tic-Tac-Toe with a friend: nine boards in one, where every move sends your opponent somewhere. Free in the browser, no app, no sign-up.",
    heading: "Ultimate tic-tac-toe online with friends",
    intro: [
      "Tic-tac-toe grown up: a big 3 × 3 board made of nine small tic-tac-toe boards. Where you play in a small board decides which board the other player must play in next.",
      "Play it with a friend on your own phones. Make a room, share the code and play in the browser, with nothing to install.",
    ],
    rules: [
      "Nine small boards make one big board. X goes first, anywhere.",
      "The square you play in sends the other player to the small board in the same place on the big board.",
      "Three in a row in a small board wins it: it becomes your square on the big board.",
      "Sent to a board that is won or full, you may play in any open board.",
      "Three small boards in a row on the big board wins the game. If every board closes with no line, it's a draw.",
      "30 seconds a move.",
    ],
    faq: [
      {
        question: "What is Ultimate Tic-Tac-Toe?",
        answer: "A strategy version of tic-tac-toe played on nine small boards at once, where each move chooses the board your opponent plays next.",
      },
      {
        question: "What happens if I'm sent to a board that's already won?",
        answer: "You may play in any open board instead.",
      },
      {
        question: "How do I play it with a friend?",
        answer: "Tap CREATE ROOM on Locade, share the code or link, and tap Ultimate Tic-tac-toe once your friend has joined.",
      },
    ],
    related: ["tictactoe", "chess", "dotsclash"],
  },

  dotsboxes: {
    slug: "dots-and-boxes",
    title: "Dots and Boxes Online With Friends – Up to 8 Players | Locade",
    description:
      "Play Dots and Boxes with friends on your phones: take turns drawing lines, close a box and go again. Up to 8 on one board, free, no app.",
    heading: "Dots and Boxes online with friends",
    intro: [
      "The paper-and-pencil classic for the whole group: take turns drawing a line between two dots, close a box to claim it, and draw again. Most boxes wins.",
      "Up to 8 friends play on one board that grows with the group, each on their own phone. Make a room, share the code and play in the browser.",
    ],
    rules: [
      "2 to 8 players on one board. The board grows with the group: 5 × 5 boxes for 2 players, up to 8 × 8 for 8.",
      "On your turn, draw one line between two dots next to each other.",
      "Draw a box's fourth side and it's yours, and you draw again. A line that closes nothing passes the turn.",
      "When every line is drawn, the most boxes wins. Players level on top share the win.",
      "30 seconds a line. If time runs out, a line is drawn for you.",
    ],
    faq: [
      {
        question: "Can more than two people play Dots and Boxes online?",
        answer: "Yes: up to 8 on one board, taking turns, each on their own phone.",
      },
      {
        question: "Do you get another turn after closing a box?",
        answer: "Yes. Close a box and you draw again, so one line can start a long run.",
      },
      {
        question: "How do I start a game with friends?",
        answer: "Open Locade, tap CREATE ROOM, share the code or link, and tap Dots & Boxes once everyone's in.",
      },
    ],
    related: ["dotsclash", "memory", "tictactoe"],
  },

  pool: {
    slug: "pool",
    title: "Pool Online With Friends – 8-Ball for 2 to 4, No App | Locade",
    description:
      "Play 8-ball pool with friends on your phones: 2 to 4 players round one table, each with their own balls. Free in the browser, no download, no sign-up.",
    heading: "Play pool online with friends",
    intro: [
      "8-ball pool for 2, 3 or 4 friends round one table, each on your own phone. Everyone has their own balls in their own color: clear yours, then sink the black.",
      "There's no aim line, so it's all about feel. Make a room, share the code and play in the browser, with no download and no account.",
    ],
    rules: [
      "2 to 4 players. Each gets their own balls: 7 each for 2 players, 4 each for 3, 3 each for 4, plus the black.",
      "Sweep your finger round the cue ball to aim, take hold of the cue, pull it back and let go to shoot.",
      "Hit one of your own balls first (on the break, any ball).",
      "Pot one of yours with no foul and you shoot again. Anything else passes the turn.",
      "Fouls just pass the turn: the cue ball going in, touching no ball, or hitting someone else's ball first.",
      "Sink the black after all of yours to win. Sink it early and you're out.",
      "45 seconds a shot.",
    ],
    faq: [
      {
        question: "Can I play pool online with friends without downloading anything?",
        answer: "Yes. Locade runs in the browser: make a room, share the code or link, and everyone plays on their own phone.",
      },
      {
        question: "How many players can play?",
        answer: "2 to 4 round one table. Everyone plays for themselves, each with their own color of balls.",
      },
      {
        question: "Is there an aim line?",
        answer: "No. Only the cue points where you aim, so every shot is down to feel.",
      },
    ],
    related: ["carrom", "headcrash", "ludo"],
  },

  carrom: {
    slug: "carrom",
    title: "Carrom Online With Friends – Free, 2 to 4 Players | Locade",
    description:
      "Play carrom with friends on your phones: flick the striker, pocket coins, cover the queen. 2 to 4 players, free in the browser, no app, no sign-up.",
    heading: "Play carrom online with friends",
    intro: [
      "The board game played across South Asia and beyond, for 2 to 4 friends on their own phones. Pull back on the striker and let go to flick it, and pocket as many coins as you can.",
      "It's point carrom: anyone may pocket any coin, and the most points wins. Make a room, share the code and play in the browser.",
    ],
    rules: [
      "2 to 4 players round one board, each from their own side, everyone for themselves.",
      "Place the striker on your baseline, pull back in any direction and let go: it shoots the opposite way, as hard as you pulled.",
      "Any coin counts: white 20 points, black 10.",
      "The queen is worth 50, but only once covered: pocket another coin with her or on your next shot, or she goes back to the middle.",
      "Pocket a coin with no foul and you shoot again.",
      "The striker going into a pocket is a foul: minus 10 points, and the coins that went in with it come back.",
      "When every coin is in, the most points wins. 45 seconds a shot.",
    ],
    faq: [
      {
        question: "Can I play carrom online with friends for free?",
        answer: "Yes. Make a room on Locade, share the code or link, and up to 4 friends play on one board, each on their own phone.",
      },
      {
        question: "How does the queen work?",
        answer: "She's worth 50 once covered: a coin must go in with her or on your next shot. Otherwise she goes back to the middle.",
      },
      {
        question: "Do I need to download a carrom app?",
        answer: "No. It runs in the browser on any phone, iPhone or Android.",
      },
    ],
    related: ["pool", "ludo", "snakesladders"],
  },

  ludo: {
    slug: "ludo",
    title: "Ludo Online With Friends – Up to 8 Players, Free | Locade",
    description:
      "Play Ludo with friends on your phones: roll, race your four pawns home, capture the others. Up to 8 players on one board, free, no app, no sign-up.",
    heading: "Play Ludo online with friends",
    intro: [
      "Classic Ludo with your friends, each on your own phone: roll the die, bring your pawns out on a 6, race them round and home, and send the others back to base.",
      "The board grows with the group, so up to 8 can play: the classic cross for 2 to 4, a six-armed star for 5 or 6, an eight-armed star for 7 or 8. Make a room, share the code and play.",
    ],
    rules: [
      "4 pawns each. Only a 6 brings a pawn out of its base.",
      "Roll, then pick which pawn to move. Landing on another player's pawn sends it back to its base.",
      "Start squares and star squares are safe: nobody can be captured there.",
      "A 6, a capture, or a pawn getting home gives you another roll. Three 6s in a row end your turn.",
      "Getting home needs the exact roll.",
      "The game goes on until all but one player have every pawn home, so everyone gets a place.",
      "30 seconds to roll and to move.",
    ],
    faq: [
      {
        question: "How many players can play Ludo online here?",
        answer: "2 to 8 on one board. The board changes shape for 5 to 8 players so everyone has their own arm and home.",
      },
      {
        question: "Do I need a 6 to start?",
        answer: "Yes. Only a 6 brings a pawn out of its base.",
      },
      {
        question: "How do I play Ludo with friends online?",
        answer: "Open Locade, tap CREATE ROOM, send the code or link, then tap Ludo once everyone has joined.",
      },
    ],
    related: ["snakesladders", "carrom", "memory"],
  },

  snakesladders: {
    slug: "snakes-and-ladders",
    title: "Snakes and Ladders Online With Friends – Free | Locade",
    description:
      "Play Snakes and Ladders with friends on your phones: roll, climb the ladders, slide down the snakes. Up to 8 players, free in the browser, no app.",
    heading: "Snakes and Ladders online with friends",
    intro: [
      "The classic race to 100 for the whole group, each on your own phone. Roll the die, climb the ladders, slide down the snakes.",
      "Up to 8 friends race on one board, and the game goes on until everyone but one is home. Make a room, share the code or link, and play in the browser.",
    ],
    rules: [
      "A 10 × 10 board. Your first roll moves you straight on: no 6 needed to start.",
      "Ladders take you up; snakes take you down.",
      "A 6 rolls again. Three 6s in a row send you back to where your turn began.",
      "Reaching 100 needs the exact roll; a roll that goes past it doesn't move you.",
      "Pieces can share a square.",
      "Places follow the order players get home; the game goes on until all but one are home.",
      "30 seconds a roll. If time runs out, the die is rolled for you.",
    ],
    faq: [
      {
        question: "Can I play Snakes and Ladders online with friends?",
        answer: "Yes: up to 8 on one board, each on their own phone. Share a room code or link and tap Snakes & Ladders.",
      },
      {
        question: "Do I need a 6 to start?",
        answer: "No. Your first roll moves you straight onto the board.",
      },
      {
        question: "What happens if I roll too high near the end?",
        answer: "You need the exact number to land on 100; a bigger roll leaves you where you are.",
      },
    ],
    related: ["ludo", "memory", "dotsboxes"],
  },

  memory: {
    slug: "memory",
    title: "Memory Game Online With Friends – Multiplayer, Free | Locade",
    description:
      "Play the memory card game with friends on your phones: turn two cards, find pairs, go again. Up to 8 players, new cards every game, free.",
    heading: "Memory game online with friends",
    intro: [
      "The matching card game for the whole group, each on your own phone. Every card lies face down; turn two, and if they match, they're yours and you go again.",
      "Every game deals new pictures in new colors, so nobody remembers the last one. Make a room, share the code and play in the browser.",
    ],
    rules: [
      "2 to 8 players round one table of face-down cards: 15 pairs for 2 players, 18 for 3 or 4, 21 for 5 to 8.",
      "On your turn, turn one card, then another. Everyone sees them.",
      "A pair is the same picture in the same color. Find one and you turn two more.",
      "Two that don't match turn back and the turn passes.",
      "When every pair is found, the most pairs wins. Players level on top share the win.",
      "30 seconds a card.",
    ],
    faq: [
      {
        question: "Is there a multiplayer memory game online?",
        answer: "Yes: on Locade up to 8 friends play one table of cards, taking turns, each on their own phone.",
      },
      {
        question: "Are the cards the same every game?",
        answer: "No. Every game deals new pictures in new colors.",
      },
      {
        question: "Is the same picture in two colors a pair?",
        answer: "No: a pair is the same picture in the same color. The same picture in another color is a different pair.",
      },
    ],
    related: ["dotsboxes", "snakesladders", "ludo"],
  },

  dotsclash: {
    slug: "dots-clash",
    title: "Dots Clash – Chain Reaction Game With Friends, Free | Locade",
    description:
      "A chain reaction game for 2 to 8 friends on their phones: add dots, explode cells into your neighbours, take their land. Last one standing wins.",
    heading: "Dots Clash: a chain reaction game for friends",
    intro: [
      "Locade's own chain reaction game for the whole group. Add dots to your cells; a cell with 4 dots explodes into its four neighbours and takes them, dots and all, which can set off a chain across the board.",
      "Up to 8 friends play on one board, each on their own phone. The last player with dots left wins. Make a room, share the code and play.",
    ],
    rules: [
      "2 to 8 players on one board that wraps round on every side.",
      "To start, everyone picks a cell at the same time, in secret.",
      "Then take turns: tap one of your own cells to add a dot.",
      "A cell reaching 4 dots explodes: one dot flies to each neighbour, and those cells become yours with everything on them.",
      "Explosions can chain across the board. A player left with no cells is out.",
      "The last player with cells wins.",
      "30 seconds a turn.",
    ],
    faq: [
      {
        question: "What is Dots Clash?",
        answer: "A turn-based chain reaction game for 2 to 8 players, made for Locade: grow your cells until they burst and take the cells next to them.",
      },
      {
        question: "How many can play?",
        answer: "2 to 8 on one board, each on their own phone.",
      },
      {
        question: "Can a game go on forever?",
        answer: "No. Every turn adds a dot and explosions never lose one, so sooner or later one player takes everything.",
      },
    ],
    related: ["dotsboxes", "territory", "ultimate"],
  },

  territory: {
    slug: "territory",
    title: "Territory – Real-Time Land Grab Game With Friends | Locade",
    description:
      "A real-time land grab game for 2 to 8 friends: leave your land, draw a loop, take everything inside. Cut their trail to knock them out. 3 minutes.",
    heading: "Territory: a real-time land grab with friends",
    intro: [
      "Everyone in one round arena at once, in real time. Leave your land and you draw a trail; get back home and everything the loop closed off becomes yours.",
      "But touch someone's trail and they're out, and they can do the same to you. A match lasts at most 3 minutes, for 2 to 8 friends on their own phones.",
    ],
    rules: [
      "2 to 8 players in one round arena, a match of at most 3 minutes.",
      "Drag anywhere on the screen to steer (arrow keys or WASD on a computer).",
      "Outside your land you leave a trail. Get back home and the trail, and everything it closed off, becomes your land.",
      "Touch another player's trail with your head and they're out; their land becomes yours.",
      "Lose all your land and you're out too. No respawns: you watch the rest.",
      "When time's up, the biggest share of the arena wins.",
    ],
    faq: [
      {
        question: "What kind of game is Territory?",
        answer: "A real-time land grab in the style of the .io games: draw loops to take land, cut other players' trails to knock them out.",
      },
      {
        question: "How long is a match?",
        answer: "At most 3 minutes, and it ends early when only one player is left.",
      },
      {
        question: "Can I play it on my phone?",
        answer: "Yes. Drag anywhere to steer; on a computer, the arrow keys or WASD.",
      },
    ],
    related: ["headcrash", "dotsclash", "pool"],
  },

  headcrash: {
    slug: "head-crash",
    title: "Head Crash – 2 Player Car Game on Two Phones | Locade",
    description:
      "A 2 player car game played on two phones: drive, jump, flip and land on the other driver's head. First to 5 wins. Free in the browser, no app.",
    heading: "Head Crash: a 2 player car game on two phones",
    intro: [
      "Two small cars, a new map every round, and one goal: land on the other driver's head. Drive up walls, jump, flip, and keep your own head safe.",
      "Each driver plays on their own phone with just two buttons, in real time. With more friends in the room, it turns into a tournament.",
    ],
    rules: [
      "1 v 1 in real time. Two buttons: drive left and drive right. In the air, the same buttons flip the car.",
      "Touch the other driver's head with your car and you score a point.",
      "Your own head touching the ground, a wall or the water gives the point to the other driver.",
      "A new map every round: bowls, ramps, trampolines, fans, lifts and more.",
      "The water slowly rises, so no round lasts long.",
      "First to 5 points wins.",
    ],
    faq: [
      {
        question: "Is Head Crash played on one phone or two?",
        answer: "Two: each driver uses their own phone, so you can play side by side or far apart.",
      },
      {
        question: "How many can play?",
        answer: "Matches are 1 v 1. With 3 to 8 in the room, everyone plays a match each round in a short tournament.",
      },
      {
        question: "How do the controls work?",
        answer: "Just two buttons, left and right. On the ground they drive and lift the car; in the air they flip it.",
      },
    ],
    related: ["territory", "pool", "seabattle"],
  },
};
