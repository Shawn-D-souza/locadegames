import { staticFile } from "remotion";
import { Phone } from "../parts/Phone";
import { Page } from "../parts/Page";
import { FRIENDS } from "../cast";
import { colors, fonts, player } from "../look";

/** The four friends' phones in a row, each on its own room screen, its owner's name under it. */
export function PhoneRow({ width = 330, top = 70 }: { width?: number; top?: number }) {
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 64 }}>
      {FRIENDS.map((name, i) => (
        <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, transform: `translateY(${[0, -14, 8, -6][i]}px) rotate(${[-2, 1.5, -1, 2][i]}deg)` }}>
          <Phone src={staticFile(`screens/room-${i}.png`)} width={width} />
          <span
            style={{
              background: player(i).base,
              color: player(i).text,
              border: `3px solid ${colors.ink}`,
              borderRadius: 999,
              padding: "6px 26px",
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: "0.04em",
            }}
          >
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Style frame 2: everyone in the room, each on their own phone. */
export function PhonesFrame() {
  return (
    <Page>
      <PhoneRow />
    </Page>
  );
}
