import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { ActingAs } from "./components/ActingAs";
import { UserProvider } from "./context/UserContext";
import { EquipmentDetailPage } from "./pages/EquipmentDetailPage";
import { EquipmentListPage } from "./pages/EquipmentListPage";

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <div className="app-shell">
          <header className="app-header">
            <Link to="/" className="brand">
              <span className="brand-mark">Cleen</span>
              <span className="brand-sub">Equipment cleaning log</span>
            </Link>
            <ActingAs />
          </header>
          <Routes>
            <Route path="/" element={<EquipmentListPage />} />
            <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </UserProvider>
  );
}
