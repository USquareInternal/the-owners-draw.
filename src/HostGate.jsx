import { useState } from "react";

const GATE_KEY = "hs";
const EXPECTED =
  "6d7d3e2c27b8c46862987842d3bfb2880747230353ac6a7bce2e70a54e666985";

async function digestHex(value) {
  const data = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isUnlocked() {
  try {
    return sessionStorage.getItem(GATE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function HostGate({ children }) {
  const [open, setOpen] = useState(() => isUnlocked());
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  if (open) return children;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    setError(false);
    try {
      const hash = await digestHex(pin);
      if (hash === EXPECTED) {
        try {
          sessionStorage.setItem(GATE_KEY, "1");
        } catch {
          /* ignore */
        }
        setOpen(true);
        return;
      }
      setError(true);
      setPin("");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="pinGate">
      <form className="pinGateForm" onSubmit={handleSubmit}>
        <input
          className="pinGateInput"
          type="password"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          placeholder="Enter your pin"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
        />
        {error ? <p className="pinGateError">Incorrect pin</p> : null}
      </form>
    </div>
  );
}
