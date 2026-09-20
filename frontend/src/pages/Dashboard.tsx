import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownLeft, CreditCard, Plus, ChevronRight, Landmark } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { accountsApi, transactionsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import type { TransactionResponse } from "@/types";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  COMPLETED: "success",
  PROCESSING: "secondary",
  PENDING_VERIFICATION: "warning",
  FLAGGED: "destructive",
  FAILED: "destructive",
};

export default function Dashboard() {
  const { user } = useAuth();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts", "mine", user?.email],
    queryFn: () => accountsApi.listMine(user!.email),
    enabled: !!user,
  });

  const primaryAccount = accounts?.[0];

  const { data: recentTx } = useQuery({
    queryKey: ["transactions", "recent", primaryAccount?.accountNumber],
    queryFn: () => transactionsApi.history(primaryAccount!.accountNumber),
    enabled: !!primaryAccount,
  });

  const totalBalance = (accounts || []).reduce((sum, a) => sum + a.balance, 0);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold mb-2">Welcome, {user?.fullName}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You don't have a bank account yet. Open one to start sending and receiving money.
        </p>
        <Button asChild variant="volt">
          <Link to="/accounts/new">
            <Plus className="w-4 h-4 mr-1.5" />
            Open your first account
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Good to see you,</p>
        <h1 className="text-xl font-semibold tracking-tight">{user?.fullName}</h1>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl p-7 mb-6 relative overflow-hidden bg-ink">
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full opacity-[0.15] bg-volt" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div>
            <p className="text-[13px] text-white/55 mb-3">Total balance</p>
            <p className="text-white text-[2.75rem] leading-none font-semibold tabular-nums tracking-tight">
              {formatMoney(totalBalance)}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Badge className="rounded-full border-0 bg-volt/15 text-volt">
                {accounts.length} account{accounts.length > 1 ? "s" : ""}
              </Badge>
              <span className="text-[12px] text-white/40">
                Primary: •••• {primaryAccount!.accountNumber.slice(-4)}
              </span>
            </div>
          </div>
          <Button asChild variant="volt" className="rounded-full h-10 px-5 shrink-0">
            <Link to="/accounts/new">
              <Plus className="w-4 h-4 mr-1.5" />
              New account
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Link to="/transfer">
          <Card className="py-4 flex flex-col items-center gap-2 cursor-pointer hover:border-foreground/20 transition-colors">
            <ArrowUpRight className="w-[18px] h-[18px]" />
            <span className="text-[12px]">Transfer</span>
          </Card>
        </Link>
        <Link to="/payments">
          <Card className="py-4 flex flex-col items-center gap-2 cursor-pointer hover:border-foreground/20 transition-colors">
            <CreditCard className="w-[18px] h-[18px]" />
            <span className="text-[12px]">Top up</span>
          </Card>
        </Link>
        <Link to="/accounts">
          <Card className="py-4 flex flex-col items-center gap-2 cursor-pointer hover:border-foreground/20 transition-colors">
            <Landmark className="w-[18px] h-[18px]" />
            <span className="text-[12px]">Accounts</span>
          </Card>
        </Link>
      </div>

      {/* Recent transactions (primary account) */}
      <Card>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-[14px] font-medium">
            Recent activity — •••• {primaryAccount!.accountNumber.slice(-4)}
          </h2>
          <Link
            to={`/accounts/${primaryAccount!.accountNumber}`}
            className="text-[13px] flex items-center gap-1 text-muted-foreground"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <Separator />
        {!recentTx || recentTx.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-6">No transactions yet.</p>
        ) : (
          <div>
            {recentTx.slice(0, 5).map((t: TransactionResponse, i: number) => {
              const isOutgoing = t.senderAccountNumber === primaryAccount!.accountNumber;
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary">
                        {isOutgoing ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-[13.5px]">
                          {isOutgoing ? `To •••• ${t.receiverAccountNumber.slice(-4)}` : `From •••• ${t.senderAccountNumber.slice(-4)}`}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {new Date(t.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13.5px] font-medium tabular-nums">
                        {isOutgoing ? "−" : "+"}
                        {formatMoney(t.amount)}
                      </p>
                      <Badge variant={STATUS_VARIANT[t.status] || "secondary"} className="mt-1">
                        {t.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  {i < Math.min(recentTx.length, 5) - 1 && <Separator />}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
