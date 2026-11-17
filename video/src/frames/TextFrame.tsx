import { Page } from "../parts/Page";
import { TextCard } from "../parts/TextCard";
import { PhoneRow } from "./PhonesFrame";

/** Style frame 4: a line of text over the phones. */
export function TextFrame() {
  return (
    <Page>
      <PhoneRow width={300} top={40} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center" }}>
        <TextCard>Everyone on their own phone.</TextCard>
      </div>
    </Page>
  );
}
