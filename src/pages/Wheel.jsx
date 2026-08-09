import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";

const SIZE = 560;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 268;
const INNER_R = 252; // thinner gold rim (ref image)
const HUB_R = 62;
const SPIN_MS = 5200;
const JOIN_URL = "https://nexora-owners-draw.vercel.app/join";
const COIN_SRCS = [
  "/coins/akasha.png",
  "/coins/assetia.png",
  "/coins/inception.png",
  "/coins/olivia.png",
  "/coins/andy.png",
];

const EMPTY_SEGMENTS = [
  { label: "Scan to enter", tone: "gold" },
  { label: "Your seat awaits", tone: "green" },
  { label: "One winner", tone: "gold" },
  { label: "Takes the pool", tone: "green" },
  { label: "Connect · Earn", tone: "gold" },
  { label: "Spend · Own", tone: "green" },
  { label: "Join the draw", tone: "gold" },
  { label: "Good luck", tone: "green" },
];

function displayName(p) {
  return p.username || p.name || "Guest";
}

function drawRim(ctx) {
  const rimGrad = ctx.createRadialGradient(CX, CY, INNER_R, CX, CY, OUTER_R);
  rimGrad.addColorStop(0, "#B8924E");
  rimGrad.addColorStop(0.4, "#C5A059");
  rimGrad.addColorStop(0.75, "#E8C97A");
  rimGrad.addColorStop(1, "#8F7035");
  ctx.beginPath();
  ctx.arc(CX, CY, OUTER_R, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  const dotR = (OUTER_R + INNER_R) / 2;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(a) * dotR, CY + Math.sin(a) * dotR, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,245,220,0.95)" : "rgba(224,196,122,0.85)";
    ctx.shadowColor = "rgba(224,196,122,0.7)";
    ctx.shadowBlur = 4;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(CX, CY, INNER_R + 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawHubCutout(ctx) {
  ctx.beginPath();
  ctx.arc(CX, CY, HUB_R + 6, 0, Math.PI * 2);
  ctx.fillStyle = "#0d2e29";
  ctx.fill();
}

function drawEmptyWheel(ctx) {
  const n = EMPTY_SEGMENTS.length;
  const slice = (2 * Math.PI) / n;

  EMPTY_SEGMENTS.forEach((seg, i) => {
    const start = -Math.PI / 2 + i * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, INNER_R, start, end);
    ctx.closePath();

    if (seg.tone === "gold") {
      const g = ctx.createLinearGradient(
        CX + Math.cos(start) * INNER_R,
        CY + Math.sin(start) * INNER_R,
        CX + Math.cos(end) * INNER_R,
        CY + Math.sin(end) * INNER_R
      );
      g.addColorStop(0, "#B8924E");
      g.addColorStop(0.5, "#C5A059");
      g.addColorStop(1, "#A68542");
      ctx.fillStyle = g;
    } else {
      const g = ctx.createRadialGradient(CX, CY, 40, CX, CY, INNER_R);
      g.addColorStop(0, "#1a5248");
      g.addColorStop(1, "#0e322c");
      ctx.fillStyle = g;
    }
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(start) * INNER_R, CY + Math.sin(start) * INNER_R);
    ctx.strokeStyle = "rgba(17, 59, 52, 0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const mid = start + slice / 2;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(mid);
    ctx.fillStyle = seg.tone === "gold" ? "#0F172A" : "#F9F7F2";
    ctx.font = "700 12px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(seg.label, INNER_R * 0.58, 0);
    ctx.restore();
  });
}

function drawParticipantWheel(canvas, names) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, SIZE, SIZE);
  drawRim(ctx);

  if (!names.length) {
    drawEmptyWheel(ctx);
    drawHubCutout(ctx);
    return;
  }

  const n = names.length;
  const slice = (2 * Math.PI) / n;

  names.forEach((name, i) => {
    const start = -Math.PI / 2 + i * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, INNER_R, start, end);
    ctx.closePath();

    const g = ctx.createRadialGradient(CX, CY, 40, CX, CY, INNER_R);
    if (i % 2 === 0) {
      g.addColorStop(0, "#1a5248");
      g.addColorStop(1, "#0e322c");
    } else {
      g.addColorStop(0, "#164a41");
      g.addColorStop(1, "#0a2420");
    }
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(start) * INNER_R, CY + Math.sin(start) * INNER_R);
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const mid = start + slice / 2;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(mid);
    ctx.fillStyle = "#F9F7F2";
    const fontSize = n > 14 ? 10 : n > 10 ? 11 : 13;
    ctx.font = `600 ${fontSize}px Poppins, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(name).slice(0, 16), INNER_R * 0.58, 0);
    ctx.restore();
  });

  drawHubCutout(ctx);
}

function FallingCoins() {
  const coins = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        src: COIN_SRCS[i % COIN_SRCS.length],
        left: `${(i * 17 + 7) % 94}%`,
        delay: `${(i % 9) * 0.7}s`,
        duration: `${7 + (i % 5) * 1.4}s`,
        size: 42 + (i % 5) * 10,
        blur: i % 4 === 0 ? 2.5 : i % 3 === 0 ? 1 : 0,
        opacity: i % 4 === 0 ? 0.35 : 0.7,
      })),
    []
  );

  return (
    <div className="coinRain" aria-hidden="true">
      {coins.map((c) => (
        <img
          key={c.id}
          src={c.src}
          alt=""
          className="fallingCoin"
          style={{
            left: c.left,
            width: c.size,
            animationDelay: c.delay,
            animationDuration: c.duration,
            filter: c.blur ? `blur(${c.blur}px)` : undefined,
            opacity: c.opacity,
          }}
        />
      ))}
    </div>
  );
}

function CoinSplash({ burstKey }) {
  const coins = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
        const dist = 120 + (i % 5) * 55;
        return {
          id: `${burstKey}-${i}`,
          src: COIN_SRCS[i % COIN_SRCS.length],
          size: 36 + (i % 4) * 10,
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist - 40,
          delay: `${(i % 8) * 0.03}s`,
          rot: (i * 47) % 360,
        };
      }),
    [burstKey]
  );

  return (
    <div className="coinSplash" aria-hidden="true">
      {coins.map((c) => (
        <img
          key={c.id}
          src={c.src}
          alt=""
          className="splashCoin"
          style={{
            width: c.size,
            "--tx": `${c.tx}px`,
            "--ty": `${c.ty}px`,
            "--rot": `${c.rot}deg`,
            animationDelay: c.delay,
          }}
        />
      ))}
    </div>
  );
}

function formatPrizeAmount(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  return t.startsWith("$") ? t : `$${t}`;
}

const PRIZE_TITLES = ["1st Prize", "2nd Prize", "3rd Prize"];

function WinnerPopup({ winner, onClose }) {
  if (!winner) return null;

  const prizeLine = winner.prizeAmount
    ? `Takes the ${winner.prizeTitle} · ${winner.prizeAmount}`
    : `Takes the ${winner.prizeTitle}`;

  return (
    <div className="winnerOverlay" role="dialog" aria-modal="true" aria-label="Winner">
      <CoinSplash burstKey={winner.id} />
      <div className="winnerCard">
        <p className="winnerEyebrow">Winner</p>
        <h2 className="winnerName">{winner.name}</h2>
        {winner.country ? (
          <p className="winnerCountry">{winner.country}</p>
        ) : null}
        <p className="winnerPrize">{prizeLine}</p>
        <button type="button" className="winnerClose" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}

function PrizeCard({ label, amount, draft, onDraftChange, onConfirm, onEdit }) {
  if (amount) {
    return (
      <aside className="hostCard hostCard--prize">
        <span className="prizeLabel">{label}</span>
        <strong className="prizeValue">{amount}</strong>
        <button type="button" className="prizeEdit" onClick={onEdit}>
          Edit
        </button>
      </aside>
    );
  }

  return (
    <aside className="hostCard hostCard--prize">
      <span className="prizeLabel">{label}</span>
      <form
        className="prizeForm"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <input
          className="prizeInput"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 1200"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          aria-label={`${label} amount`}
        />
        <button className="prizeOk" type="submit" disabled={!draft.trim()}>
          OK
        </button>
      </form>
    </aside>
  );
}

const TIMER_SECONDS = 5 * 60;

function formatTimer(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export default function Wheel() {
  const [participants, setParticipants] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  // Freeze wheel face during spin + popup (state, not ref — survives Strict Mode)
  const [wheelFrozen, setWheelFrozen] = useState(false);
  const [wheelNames, setWheelNames] = useState([]);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [prizes, setPrizes] = useState([
    { id: 1, label: "Prize 1", draft: "", amount: "" },
    { id: 2, label: "Prize 2", draft: "", amount: "" },
    { id: 3, label: "Prize 3", draft: "", amount: "" },
  ]);
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const pendingWinRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "participants"), (snap) => {
      setParticipants(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const pool = participants.filter((p) => !p.won);
  const liveNames = pool.map(displayName);

  useEffect(() => {
    if (!wheelFrozen) {
      setWheelNames(liveNames);
    }
  }, [liveNames.join("|"), wheelFrozen]);

  useEffect(() => {
    if (canvasRef.current) drawParticipantWheel(canvasRef.current, wheelNames);
  }, [wheelNames.join("|")]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const handleStartTimer = () => {
    setTimerStarted(true);
    setSecondsLeft(TIMER_SECONDS);
    setTimerRunning(true);
  };

  const handlePauseTimer = () => setTimerRunning(false);
  const handleResumeTimer = () => {
    if (secondsLeft <= 0) {
      setSecondsLeft(TIMER_SECONDS);
    }
    setTimerRunning(true);
  };
  const handleStopTimer = () => {
    setTimerRunning(false);
    setTimerStarted(false);
    setSecondsLeft(TIMER_SECONDS);
  };

  const handleSpin = () => {
    if (spinning || pool.length < 1 || winner) return;

    const spinPool = [...pool];
    const spinNames = spinPool.map(displayName);
    // 0 = first win → 1st prize, 1 → 2nd, 2 → 3rd
    const prizeIndex = Math.min(
      participants.filter((p) => p.won).length,
      PRIZE_TITLES.length - 1
    );
    const prizeMeta = {
      prizeTitle: PRIZE_TITLES[prizeIndex],
      prizeAmount: prizes[prizeIndex]?.amount || "",
      prizeRank: prizeIndex + 1,
    };

    setWheelFrozen(true);
    setWheelNames(spinNames);
    setSpinning(true);
    setWinner(null);
    pendingWinRef.current = null;

    const n = spinPool.length;
    const slice = 360 / n;
    const winnerIdx = Math.floor(Math.random() * n);

    // Canvas draws segments from 12 o'clock toward 3 o'clock (clock-wise visually
    // because canvas Y is flipped). CSS rotate() is also clockwise, so to bring
    // segment center to the top pointer we rotate by (360 - centerFromTop).
    const centerFromTop = winnerIdx * slice + slice / 2;
    const targetMod = (360 - centerFromTop) % 360;
    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    let delta = (targetMod - currentMod + 360) % 360;
    if (delta < 30) delta += 360;
    delta += 5 * 360;

    const next = rotationRef.current + delta;
    rotationRef.current = next;
    setRotation(next);

    const picked = spinPool[winnerIdx];
    pendingWinRef.current = { person: picked, prizeMeta };

    setTimeout(() => {
      const pending = pendingWinRef.current;
      if (!pending) return;
      const { person, prizeMeta: prize } = pending;
      setWinner({
        id: person.id,
        name: displayName(person),
        country: person.country || "",
        prizeTitle: prize.prizeTitle,
        prizeAmount: prize.prizeAmount,
      });
      setSpinning(false);
      // Persist after the wheel has visually stopped — do not redraw yet
      updateDoc(doc(db, "participants", person.id), {
        won: true,
        prizeRank: prize.prizeRank,
        prizeTitle: prize.prizeTitle,
        prizeAmount: prize.prizeAmount,
      }).catch(console.error);
    }, SPIN_MS);
  };

  const handleCloseWinner = () => {
    const winnerId = winner?.id;
    setWinner(null);
    pendingWinRef.current = null;
    setWheelFrozen(false);
    setWheelNames(
      participants
        .filter((p) => !p.won && p.id !== winnerId)
        .map(displayName)
    );
  };

  const updatePrizeDraft = (id, draft) => {
    setPrizes((list) =>
      list.map((p) => (p.id === id ? { ...p, draft } : p))
    );
  };

  const confirmPrize = (id) => {
    setPrizes((list) =>
      list.map((p) =>
        p.id === id
          ? { ...p, amount: formatPrizeAmount(p.draft), draft: p.draft.trim() }
          : p
      )
    );
  };

  const editPrize = (id) => {
    setPrizes((list) =>
      list.map((p) =>
        p.id === id
          ? {
              ...p,
              draft: p.amount.replace(/^\$/, ""),
              amount: "",
            }
          : p
      )
    );
  };

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(JOIN_URL)}`;

  return (
    <div className="page wheelHost">
      <FallingCoins />

      <aside className="hostCard hostCard--draw">
        <div className="hostCardHead">
          <span>In the draw</span>
          <strong>{participants.length}</strong>
        </div>
        <ul className="drawList">
          {participants.length === 0 && (
            <li className="drawEmpty">Waiting for entries…</li>
          )}
          {participants.map((p) => (
            <li key={p.id} className={p.won ? "is-won" : undefined}>
              <span className="drawName">{displayName(p)}</span>
              <span className="drawCountry">{p.country || "—"}</span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="hostPrizeColumn">
        {prizes.map((prize) => (
          <PrizeCard
            key={prize.id}
            label={prize.label}
            amount={prize.amount}
            draft={prize.draft}
            onDraftChange={(v) => updatePrizeDraft(prize.id, v)}
            onConfirm={() => confirmPrize(prize.id)}
            onEdit={() => editPrize(prize.id)}
          />
        ))}

        <blockquote className="hostQuote">
          <span className="quoteLabel">From the table</span>
          <p>
            &ldquo;The ones who own the table never chase the markets.&rdquo;
          </p>
        </blockquote>
      </div>

      <aside className="hostCard hostCard--qr">
        <img className="qrCode" src={qrSrc} alt="QR code to enter" />
        <div className="qrMeta">
          <strong>Scan to enter</strong>
          <span className="qrUrl">{JOIN_URL.replace(/^https?:\/\//, "")}</span>
          <span className="qrHint">email · nickname · spin your seat</span>
        </div>
      </aside>

      <main className="hostCenter">
        <header className="hostHeader">
          <img className="hostLogo" src="/logo.png" alt="Nexora" />
          <h1>
            The Owners&apos; <span>Draw</span>
          </h1>
          <p className="hostLive">
            <span className="liveDot" /> Live · One winner takes the pool
          </p>
        </header>

        <div
          className={`hostWheel ${spinning ? "is-spinning" : ""} ${
            wheelNames.length === 0 && !spinning ? "is-idle" : ""
          }`}
        >
          <div className="hostPointer" aria-hidden="true" />
          <div
            className="wheelRotor"
            style={
              wheelNames.length === 0 && !spinning
                ? undefined
                : { transform: `rotate(${rotation}deg)` }
            }
          >
            <canvas ref={canvasRef} width={SIZE} height={SIZE} />
          </div>
          <button
            type="button"
            className="hubBtn"
            onClick={handleSpin}
            disabled={spinning || pool.length < 1}
            aria-label={spinning ? "Spinning" : "Spin the wheel"}
          >
            <img src="/logo.png" alt="Nexora" className="hubLogo" />
          </button>
        </div>

        {spinning ? (
          <p className="hostTimerHint">Spinning…</p>
        ) : wheelNames.length === 0 ? (
          <p className="hostTimerHint">Waiting for entries · scan to join</p>
        ) : null}

        <div className="hostTimerBar">
          {!timerStarted ? (
            <button
              type="button"
              className="hostStartBtn"
              onClick={handleStartTimer}
            >
              Start
            </button>
          ) : (
            <>
              <span
                className={`hostCountdown ${secondsLeft === 0 ? "is-done" : ""}`}
              >
                {formatTimer(secondsLeft)}
              </span>
              <div className="hostTimerControls">
                {timerRunning ? (
                  <button
                    type="button"
                    className="hostTimerIconBtn"
                    onClick={handlePauseTimer}
                    aria-label="Pause timer"
                    title="Pause"
                  >
                    <PauseIcon />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="hostTimerIconBtn"
                    onClick={handleResumeTimer}
                    aria-label="Resume timer"
                    title="Start"
                    disabled={secondsLeft === 0}
                  >
                    <PlayIcon />
                  </button>
                )}
                <button
                  type="button"
                  className="hostTimerIconBtn"
                  onClick={handleStopTimer}
                  aria-label="Stop timer"
                  title="Stop"
                >
                  <StopIcon />
                </button>
              </div>
            </>
          )}
        </div>

        <footer className="hostFooter">
          <span>Connect</span>
          <span>·</span>
          <span>Earn</span>
          <span>·</span>
          <span>Spend</span>
          <span>·</span>
          <span>Own</span>
        </footer>
      </main>

      <WinnerPopup winner={winner} onClose={handleCloseWinner} />
    </div>
  );
}
