import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./app/router";
import AuthProvider from "./app/AuthProvider"; // <- default import
import "./index.css";
import "./theme/palette.css";
import "./theme/components.css";
// frontend/src/pages/pagos/PagoPage.tsx
import "./theme/pagos/pagos.css";


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
