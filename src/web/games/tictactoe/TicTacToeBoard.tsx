import type { TicTacToeState } from "../../../shared/games/tictactoe/types";
import { Board } from "../../components/Board";
import type { MatchBoardProps } from "../matchLook";

/** Tic-tac-toe's board on the match screen: the winning marks jump one after another on the winner's phone, and the points count up. */
export function TicTacToeBoard(props: MatchBoardProps<TicTacToeState>) {
  return <Board {...props} markMotion="hop" countUp />;
}
