import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register.jsx";
import Wheel from "./pages/Wheel.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Wheel />} />
        <Route path="/join" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}
