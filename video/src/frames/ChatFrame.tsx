import { RoomCode } from "../../../src/web/components/RoomCode";
import { TabCard } from "../../../src/web/components/TabCard";
import { GAME_LOOKS } from "../../../src/web/games/gameLooks";
import { ChatAvatar, ChatBubble } from "../parts/ChatBubble";
import { Page } from "../parts/Page";
import { ROOM_CODE } from "../cast";
import { colors, UI_ZOOM, type Dots } from "../look";

export const CHAT = [
  { from: 1, text: "anyone up for ludo?" },
  { from: 2, text: "only if we're not passing one phone around again" },
  { from: 3, text: "lol that took forever" },
  { from: 0, text: "found something. everyone plays on their own phone" },
  { from: 0, text: "and it's not just ludo" },
] as const;

/** Ana's invite: the app's tab card with the room code, and a peek at the games. */
export function InviteCard({ zoom = UI_ZOOM * 0.8 }: { zoom?: number }) {
  const arts = (["ludo", "pool", "chess", "territory"] as const).map((id) => GAME_LOOKS[id].Art);
  return (
    <div style={{ zoom, width: 300 }}>
      <TabCard title="Join my room">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <RoomCode code={ROOM_CODE} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {arts.map((Art, k) => (
              <div key={k} style={{ width: 52, height: 52, overflow: "hidden", borderRadius: 12, border: `2px solid ${colors.ink}`, background: colors.white, padding: 3, boxSizing: "border-box" }}>
                <Art />
              </div>
            ))}
          </div>
        </div>
      </TabCard>
    </div>
  );
}

/** Style frame 1: the chat, the moment Ana's invite lands. */
export function ChatFrame({ dots = "soft" }: { dots?: Dots }) {
  return (
    <Page dots={dots}>
      <div
        style={{
          position: "absolute",
          inset: "0 330px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 14,
        }}
      >
        {CHAT.map((m, i) => (
          <ChatBubble key={i} from={m.from} first={CHAT[i - 1]?.from !== m.from} last={m.from !== 0 && CHAT[i + 1]?.from !== m.from}>
            {m.text}
          </ChatBubble>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, alignItems: "flex-end" }}>
          <InviteCard />
          <ChatAvatar from={0} />
        </div>
      </div>
    </Page>
  );
}
