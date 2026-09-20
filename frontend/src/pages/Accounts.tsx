import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { accountsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  BLOCKED: "destructive",
  CLOSED: "secondary",
};

export default function Accounts() {
  const { user } = useAuth();
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts", "mine", user?.email],
    queryFn: () => accountsApi.listMine(user!.email),
    enabled: !!user,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Accounts</h1>
        <Button asChild variant="volt" size="sm">
          <Link to="/accounts/new">
            <Plus className="w-4 h-4 mr-1.5" />
            New account
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !accounts || accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts yet.</p>
      ) : (
        <Card>
          {accounts.map((a, i) => (
            <div key={a.id}>
              <Link
                to={`/accounts/${a.accountNumber}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">
                    {a.accountType.replace("_", " ")} — •••• {a.accountNumber.slice(-4)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.accountHolderName}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">{formatMoney(a.balance)}</p>
                    <Badge variant={STATUS_VARIANT[a.status] || "secondary"} className="mt-1">
                      {a.status}
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
              {i < accounts.length - 1 && <Separator />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
