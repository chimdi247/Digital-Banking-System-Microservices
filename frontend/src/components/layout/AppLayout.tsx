import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ArrowLeftRight,
  Landmark,
  CreditCard,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid },
  { to: "/accounts", label: "Accounts", icon: Landmark },
  { to: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { to: "/payments", label: "Top Up", icon: CreditCard },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.fullName || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 py-7 px-5 bg-ink">
        <div className="flex items-center gap-2 px-2 mb-10">
          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-volt">
            <span className="text-[13px] font-bold text-volt-foreground">N</span>
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">Nova Bank</span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-volt/10 text-volt"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )
              }
            >
              <item.icon className="w-[17px] h-[17px]" />
              {item.label}
            </NavLink>
          ))}
          {user?.role === "ADMIN" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-volt/10 text-volt"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )
              }
            >
              <ShieldCheck className="w-[17px] h-[17px]" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="mt-auto pt-8">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 w-full transition-colors"
          >
            <LogOut className="w-[17px] h-[17px]" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 md:px-10 h-16 border-b border-border">
          <span className="md:hidden font-semibold">Nova Bank</span>
          <div />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center text-[13px] font-medium">
              {initials}
            </div>
          </div>
        </header>
        <main className="flex-1 px-6 md:px-10 py-7 max-w-5xl w-full mx-auto md:mx-0">
          {children}
        </main>
      </div>
    </div>
  );
}
