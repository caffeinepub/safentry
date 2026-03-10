import { useEffect, useState } from "react";
import { Toaster } from "./components/ui/sonner";
import CompanyAuth from "./pages/CompanyAuth";
import CompanyDashboard from "./pages/CompanyDashboard";
import DocumentVerify from "./pages/DocumentVerify";
import EmployeeAuth from "./pages/EmployeeAuth";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import InviteForm from "./pages/InviteForm";
import Landing from "./pages/Landing";

export type Screen =
  | "landing"
  | "company-auth"
  | "employee-auth"
  | "document-verify"
  | "company-dashboard"
  | "employee-dashboard"
  | "invite-form";

export interface SessionCompany {
  companyId: string;
  loginCode: string;
  name: string;
  sector: string;
  address: string;
  contactPersonName: string;
}

export interface SessionEmployee {
  employeeId: string;
  name: string;
  surname: string;
}

export interface SessionEmployeeCompany {
  companyId: string;
  companyName: string;
  role: "owner" | "authorized" | "registrar";
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("invite")) {
      setScreen("invite-form");
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {screen === "landing" && <Landing onNavigate={setScreen} />}
      {screen === "company-auth" && <CompanyAuth onNavigate={setScreen} />}
      {screen === "employee-auth" && <EmployeeAuth onNavigate={setScreen} />}
      {screen === "document-verify" && (
        <DocumentVerify onNavigate={setScreen} />
      )}
      {screen === "company-dashboard" && (
        <CompanyDashboard onNavigate={setScreen} />
      )}
      {screen === "employee-dashboard" && (
        <EmployeeDashboard onNavigate={setScreen} />
      )}
      {screen === "invite-form" && <InviteForm />}
      <Toaster richColors />
    </div>
  );
}
