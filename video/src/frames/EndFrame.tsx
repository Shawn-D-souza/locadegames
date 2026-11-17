import { Img } from "remotion";
import logo from "../../../src/web/public/logo.svg";
import { Page } from "../parts/Page";
import { colors, fonts } from "../look";

/** Style frame 5: the end card. The logo, the name, what it is, and where to play. */
export function EndFrame() {
  return (
    <Page>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <Img src={logo} style={{ width: 260, height: 260 }} />
          <div style={{ background: colors.white, border: `4px solid ${colors.ink}`, borderRadius: 40, padding: "26px 52px", fontFamily: fonts.display, fontWeight: 800, fontSize: 150, lineHeight: 0.95, color: colors.ink, textTransform: "uppercase" }}>
            Locade
            <br />
            Games
          </div>
        </div>
        <div style={{ background: colors.white, border: `3px solid ${colors.ink}`, borderRadius: 999, padding: "12px 34px", fontFamily: fonts.body, fontWeight: 700, fontSize: 30, letterSpacing: "0.08em", color: colors.ink, textTransform: "uppercase" }}>
          Free · In your browser · No download
        </div>
        <div style={{ background: colors.coral, color: "#fff", border: `4px solid ${colors.ink}`, borderRadius: 28, boxShadow: `0 10px 0 ${colors.ink}`, padding: "20px 56px", fontFamily: fonts.body, fontWeight: 700, fontSize: 52, letterSpacing: "0.04em" }}>
          locadegames.pages.dev
        </div>
      </div>
    </Page>
  );
}
