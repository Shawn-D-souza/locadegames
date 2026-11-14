// Head Crash's own screens: the countdown, driving, and the ending. Its results are the tournament's (the platform's).
import { sees, wait } from "../playtest/session.mjs";

export default async function headcrash(camera) {
  const [host, guest] = await camera.room(2);
  await host.getByRole("button", { name: /head crash/i }).click();
  await host.waitForFunction(() => window.headcrash?.hud().countdown > 0, null, { timeout: 10_000 });
  await camera.shoot(host, "countdown");
  await host.waitForFunction(() => window.headcrash.hud().countdown === 0, null, { timeout: 8_000 });
  await host.keyboard.down("ArrowRight");
  await wait(900);
  await camera.shoot(host, "driving");
  await host.keyboard.up("ArrowRight");
  await guest.getByRole("button", { name: "Quit match" }).click();
  await guest.getByRole("button", { name: "QUIT", exact: true }).click();
  await sees(host, /you win!/i);
  await wait(1_200);
  await camera.shoot(host, "ending");
}
