import { useRef } from "react";
import { BUTTON_LEFT, BUTTON_RIGHT } from "../../../shared/games/headcrash/config";
import { matchSeed } from "../../../shared/games/headcrash/random";
import type { Seat } from "../../../shared/games/types";
import type { Bytes } from "../../../shared/protocol/bytes";
import type { PlayerId } from "../../../shared/rooms/types";
import { TOURNAMENT_CONFIG } from "../../../shared/tournament/config";
import { isLive } from "../../../shared/tournament/tournament";
import type { LiveMatch, Tournament } from "../../../shared/tournament/types";
import { Badge } from "../../components/Badge";
import { CountdownDisc } from "../../components/CountdownDisc";
import { IconButton } from "../../components/IconButton";
import type { ResultTone } from "../../components/ResultTag";
import { useAutoContinue } from "../../hooks/useAutoContinue";
import { useCountdownSounds } from "../../hooks/useCountdownSounds";
import type { BinaryListener } from "../../hooks/useRoomConnection";
import { entrantName } from "../../utils/tournamentText";
import { HEADCRASH_CLIENT_CONFIG } from "./config";
import { DriveButton } from "./hud/DriveButton";
import { HeadCrashEnding } from "./hud/HeadCrashEnding";
import { ScoreBar } from "./hud/ScoreBar";
import { useHeadCrashGame } from "./useHeadCrashGame";

interface HeadCrashScreenProps {
  tournament: Tournament;
  match: LiveMatch;
  myId: PlayerId;
  clockOffsetMs: number;
  sendBinary(data: Bytes): void;
  subscribeBinary(listener: BinaryListener): () => void;
  /** Watchers only: back to the points table. */
  onBack?: () => void;
  /** Called once the match is over and its result has been shown. */
  onContinue?: () => void;
  /** Your own live match: the ✕ in the corner (the room asks first). */
  onQuit?: () => void;
}

/**
 * Head Crash, full screen: the world fills the screen, with the score as a small tab on its top edge, the ✕ in the
 * corner and a drive button in each bottom corner (each half of the screen takes its touch). Also used to watch
 * someone else's match.
 */
export function HeadCrashScreen({ tournament, match, myId, clockOffsetMs, sendBinary, subscribeBinary, onBack, onContinue, onQuit }: HeadCrashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seat = match.players.indexOf(myId);
  const mySeat = seat === -1 ? null : (seat as Seat);
  const live = isLive(match);
  const { hud, held, press } = useHeadCrashGame(canvasRef, {
    matchKey: `${tournament.startedAt}:${match.id}`,
    matchId: match.id,
    seed: matchSeed(tournament.coinSeed, match.id),
    players: match.players,
    mySeat,
    score: match.game.score,
    startsAt: match.turnStartedAt,
    live,
    clockOffsetMs,
    sendBinary,
    subscribeBinary,
  });
  useAutoContinue(!live, HEADCRASH_CLIENT_CONFIG.hud.endShowMs, onContinue);
  const countdown = live && hud ? hud.countdown : 0;
  // Keyed to what the overlay shows, so each sound lands with its number.
  useCountdownSounds(countdown);

  // While it's played the match's own word is quicker than the room's; once it's over the room has the final score.
  const score = live && hud?.synced ? hud.score : match.game.score;
  const players = [0, 1].map((s) => ({ id: match.players[s as Seat], name: entrantName(tournament, match.players[s as Seat]) })) as [
    { id: PlayerId; name: string },
    { id: PlayerId; name: string },
  ];

  const drawn = match.result === "draw";
  const tone: ResultTone | null = live ? null : drawn ? "draw" : mySeat === null ? "watch" : match.winner === myId ? "win" : "lose";
  const labels: Record<ResultTone, string> = {
    win: "You win!",
    lose: "You lost",
    draw: "Draw!",
    watch: `${entrantName(tournament, match.winner ?? match.players[0])} wins!`,
  };
  // Points this result earned you, in a tournament (a one-match game has no table, so no points).
  const points =
    tone === null || tone === "watch" || tournament.totalRounds === 1 ? null : drawn ? TOURNAMENT_CONFIG.drawPoints : tone === "win" ? TOURNAMENT_CONFIG.winPoints : 0;
  const leaver = match.result === "forfeit" ? match.players.find((id) => id !== match.winner)! : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background select-none">
      {/* The world fills the screen; everything else floats over it, small, at the edges. */}
      <canvas ref={canvasRef} className="absolute inset-0 size-full touch-none" aria-label="Head Crash arena" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        <ScoreBar players={players} score={score} />
      </div>
      {countdown > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <CountdownDisc count={countdown} />
        </div>
      )}
      {live && mySeat === null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
          <Badge tone="ink">
            <span className="size-2 animate-live rounded-pill bg-coral" />
            WATCHING LIVE
          </Badge>
        </div>
      )}
      {tone && (
        <HeadCrashEnding
          tone={tone}
          label={labels[tone]}
          points={points}
          detail={leaver !== null ? `${entrantName(tournament, leaver)} quit` : null}
          colorId={tone === "win" ? myId : (match.winner ?? myId)}
          myId={myId}
        />
      )}
      {mySeat !== null && (
        <>
          {/* Each takes its whole half of the screen, over the world too; its button sits in the bottom corner. */}
          <DriveButton direction="left" pressed={(held & BUTTON_LEFT) !== 0} colorId={myId} onPress={(pointerId, down) => press(BUTTON_LEFT, pointerId, down)} />
          <DriveButton direction="right" pressed={(held & BUTTON_RIGHT) !== 0} colorId={myId} onPress={(pointerId, down) => press(BUTTON_RIGHT, pointerId, down)} />
        </>
      )}
      {/* After the drive buttons, so it sits above their touch areas. */}
      <div className="absolute top-0 left-0 p-4">
        {live && onQuit && <IconButton icon="close" label="Quit match" onClick={onQuit} />}
        {live && mySeat === null && onBack && <IconButton icon="back" label="Back to scores" onClick={onBack} />}
      </div>
    </div>
  );
}
