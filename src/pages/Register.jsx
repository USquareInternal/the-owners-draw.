import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const DISPLAY_SEGMENTS = [
  "Grow your own",
  "The table remembers",
  "Sovereignty over speed",
  "You showed up",
  "Connect. Earn. Own.",
  "Build, don't gossip",
  "A seat at the table",
  "Quiet confidence",
  "Long-term over hype",
  "We over me",
];

const SIZE = 520;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 248;
const INNER_R = 208;
const HUB_R = 56;

function drawDisplayWheel(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, SIZE, SIZE);
  const n = DISPLAY_SEGMENTS.length;
  const slice = (2 * Math.PI) / n;

  // Gold rim
  const rimGrad = ctx.createRadialGradient(CX, CY, INNER_R, CX, CY, OUTER_R);
  rimGrad.addColorStop(0, "#B8924E");
  rimGrad.addColorStop(0.4, "#C5A059");
  rimGrad.addColorStop(0.75, "#E0C47A");
  rimGrad.addColorStop(1, "#8F7035");
  ctx.beginPath();
  ctx.arc(CX, CY, OUTER_R, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // Marquee dots on rim
  const dotR = (OUTER_R + INNER_R) / 2 + 2;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(a) * dotR, CY + Math.sin(a) * dotR, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? "rgba(249,247,242,0.9)" : "rgba(224,196,122,0.75)";
    ctx.shadowColor = "rgba(224,196,122,0.8)";
    ctx.shadowBlur = 6;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Inner shadow
  ctx.beginPath();
  ctx.arc(CX, CY, INNER_R + 3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 6;
  ctx.stroke();

  DISPLAY_SEGMENTS.forEach((label, i) => {
    const start = -Math.PI / 2 + i * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, INNER_R, start, end);
    ctx.closePath();
    const g = ctx.createRadialGradient(CX, CY, 30, CX, CY, INNER_R);
    g.addColorStop(0, "#1a4f45");
    g.addColorStop(1, "#0e322c");
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(start) * INNER_R, CY + Math.sin(start) * INNER_R);
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const mid = start + slice / 2;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(mid);
    ctx.fillStyle = "rgba(249,247,242,0.88)";
    ctx.font = "600 11px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const words = label.split(" ");
    let lines = [label];
    if (label.length > 14) {
      if (words.length >= 3) {
        lines = [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
      } else if (words.length === 2) {
        lines = words;
      }
    }
    const baseX = INNER_R * 0.58;
    const lineH = 13;
    lines.forEach((line, li) => {
      ctx.fillText(line, baseX, (li - (lines.length - 1) / 2) * lineH);
    });
    ctx.restore();
  });

  // Hub cutout
  ctx.beginPath();
  ctx.arc(CX, CY, HUB_R + 6, 0, Math.PI * 2);
  ctx.fillStyle = "#0d2e29";
  ctx.fill();
}

function StaticWheel() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) drawDisplayWheel(canvasRef.current);
  }, []);

  return (
    <div className="displayWheel" aria-hidden="true">
      <div className="displayPointer" />
      <canvas ref={canvasRef} width={SIZE} height={SIZE} />
      <div className="displayHub">
        <img src="/logo.png" alt="" className="hubLogo" />
      </div>
    </div>
  );
}

function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

async function fetchCountry() {
  try {
    const res = await withTimeout(fetch("https://get.geojs.io/v1/ip/geo.json"));
    if (res.ok) {
      const data = await res.json();
      if (data?.country) return String(data.country);
    }
  } catch {
    /* fall through */
  }

  try {
    const res = await withTimeout(fetch("https://ipwho.is/"));
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data.country) return String(data.country);
    }
  } catch {
    /* ignore */
  }

  return "Unknown";
}

export default function Register() {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const countryRef = useRef("");

  // Prefetch so submit doesn't wait (and so country is ready)
  useEffect(() => {
    let active = true;
    fetchCountry().then((c) => {
      if (active) countryRef.current = c;
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !email.trim() || loading) return;

    setLoading(true);
    try {
      let country = countryRef.current;
      if (!country) {
        country = await fetchCountry();
        countryRef.current = country;
      }

      await addDoc(collection(db, "participants"), {
        username: nickname.trim(),
        email: email.trim(),
        country: country || "Unknown",
        won: false,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page owners">
      <div className="ownersSheen" aria-hidden="true" />
      <div className="ownersStage">
        <header className="ownersHeader">
          <div className="ownersLogoBadge">
            <img className="ownersLogo" src="/logo.png" alt="Nexora" />
          </div>
          <h1 className="ownersTitle">The Owners&apos; Draw</h1>
          <p className="ownersSubtitle">One winner takes the pool</p>
          <p className="ownersPrize">$1200</p>
          <p className="ownersGrow">grows with the room</p>
        </header>

        <StaticWheel />

        <form className="ownersForm" onSubmit={handleSubmit}>
          <input
            placeholder="nickname (shown on the big screen)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            autoComplete="nickname"
            disabled={submitted}
          />
          <input
            type="email"
            placeholder="your email (private, for payout)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={submitted}
          />
          <button className="ownersCta" type="submit" disabled={submitted || loading}>
            <span>{submitted ? "Seat claimed" : loading ? "Claiming…" : "Spin to claim your seat"}</span>
          </button>
          {submitted && (
            <p className="success">You&apos;re in. See you on the call.</p>
          )}
        </form>

        <p className="ownersDisclaimer">
          One entry per person. Multiple sign-ups from one network are blocked. Your
          spin claims your seat. The one winner is drawn live on the call.
        </p>

        <nav className="ownersNav" aria-label="Nexora pillars">
          <span>Connect</span>
          <span>Earn</span>
          <span>Spend</span>
          <span>Own</span>
        </nav>
      </div>
    </div>
  );
}
