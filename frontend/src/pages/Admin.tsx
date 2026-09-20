import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { accountsApi, getErrorMessage } from "@/lib/api";
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

export default function Admin() {
  const queryClient = useQueryClient();
  const [blockingId, setBlockingId] = React.useState<string | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts", "all"],
    queryFn: () => accountsApi.listAll(),
  });

  const handleBlock = async (accountNumber: string) => {
    setBlockingId(accountNumber);
    try {
      await accountsApi.block(accountNumber);
      toast.success(`•••• ${accountNumber.slice(-4)} blocked`);
      queryClient.invalidateQueries({ queryKey: ["accounts", "all"] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBlockingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight mb-1">All accounts</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {accounts ? `${accounts.length} account${accounts.length === 1 ? "" : "s"} across all users` : ""}
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !accounts || accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts yet.</p>
      ) : (
        <Card>
          {accounts.map((a, i) => (
            <div key={a.id}>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium">
                    •••• {a.accountNumber.slice(-4)} — {a.accountHolderName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.email} · {a.accountType.replace("_", " ")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">{formatMoney(a.balance)}</p>
                    <Badge variant={STATUS_VARIANT[a.status] || "secondary"} className="mt-1">
                      {a.status}
                    </Badge>
                  </div>
                  {a.status !== "BLOCKED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBlock(a.accountNumber)}
                      disabled={blockingId === a.accountNumber}
                    >
                      <Ban className="w-3.5 h-3.5 mr-1.5" />
                      Block
                    </Button>
                  )}
                </div>
              </div>
              {i < accounts.length - 1 && <Separator />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
