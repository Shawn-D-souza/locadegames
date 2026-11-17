import type { ReactNode } from "react";
import { Avatar } from "../../../src/web/components/Avatar";
import { colors, fonts, player, TEXT } from "../look";
import { CHAT_NAMES } from "../cast";

const AVATAR = 64;

/**
 * One message in the group chat: a friend's on the left (white), yours (Ana's) on the right, in your color.
 * Like a real chat, a run of messages from one person shows the name on the first and the avatar on the last.
 */
export function ChatBubble({ from, first = true, last = true, children }: { from: number; first?: boolean; last?: boolean; children: ReactNode }) {
  const mine = from === 0;
  const c = player(from);
  return (
    <div style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", alignItems: "flex-end", gap: 16 }}>
      <div style={{ width: AVATAR, height: AVATAR, flex: "none", visibility: last ? "visible" : "hidden" }}>
        <div style={{ zoom: AVATAR / 44 }}>
          <Avatar name={CHAT_NAMES[from]!} colorIndex={from} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 6, maxWidth: 760 }}>
        {first && (
          <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: TEXT.chatName, color: colors.sectionLabel, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0 10px" }}>
            {CHAT_NAMES[from]}
          </span>
        )}
        <div
          style={{
            background: mine ? c.base : colors.white,
            color: mine ? c.text : colors.ink,
            border: `3px solid ${colors.ink}`,
            borderRadius: 28,
            [mine ? "borderBottomRightRadius" : "borderBottomLeftRadius"]: last ? 8 : 28,
            padding: "14px 26px",
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: TEXT.chat,
            lineHeight: 1.3,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** The sender's avatar on its own, beside a message that isn't a bubble (Ana's invite card). */
export function ChatAvatar({ from }: { from: number }) {
  return (
    <div style={{ width: AVATAR, height: AVATAR, flex: "none" }}>
      <div style={{ zoom: AVATAR / 44 }}>
        <Avatar name={CHAT_NAMES[from]!} colorIndex={from} />
      </div>
    </div>
  );
}
