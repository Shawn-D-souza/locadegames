import { useEffect, useState } from "react";
import { formatRoomCode } from "../../shared/rooms/roomCode";
import { CLIENT_CONFIG } from "../config";
import { playSound } from "../services/soundPlayer";
import { buildShareLink } from "../utils/roomUrl";
import { IconButton } from "./IconButton";
import { Modal } from "./Modal";
import { PillButton } from "./PillButton";
import { QrCode } from "./QrCode";
import { RoomCode } from "./RoomCode";

/** Big room code with COPY, SHARE (falls back to copying the link) and QR (opens it big for friends nearby). */
export function RoomCodePanel({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const link = buildShareLink(code);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), CLIENT_CONFIG.copiedFeedbackMs);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      playSound("copied");
    } catch {
      // Clipboard blocked; the code is still on screen.
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Come play with me on Locade Games!", text: `Room code: ${formatRoomCode(code)}`, url: link });
        return;
      } catch {
        // Cancelled or unsupported; fall back to copying.
      }
    }
    await copy(link);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <RoomCode code={code} />
      <div className="flex gap-3">
        <IconButton wide icon={copied ? "check" : "copy"} label={copied ? "Copied!" : "Copy code"} onClick={() => copy(code)} />
        <IconButton wide icon="share" label="Share invite link" onClick={share} />
        <IconButton wide icon="qr" label="Show QR code" onClick={() => setQrOpen(true)} />
      </div>
      {qrOpen && (
        <Modal
          title="Scan to join"
          onDismiss={() => setQrOpen(false)}
          actions={
            <PillButton variant="deep" fullWidth sound="popupClose" onClick={() => setQrOpen(false)}>
              CLOSE
            </PillButton>
          }
        >
          <QrCode value={link} label={`QR code to join room ${formatRoomCode(code)}`} />
          {/* Sideways there's no room for it under the QR; the code is on the room card behind. */}
          <div className="w-full landscape:hidden">
            <RoomCode code={code} />
          </div>
        </Modal>
      )}
    </div>
  );
}
