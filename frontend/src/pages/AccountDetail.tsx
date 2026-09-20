import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Ban } from "lucide-react";
import { accountsApi, transactionsApi, getErrorMessage } from "@/lib/api";
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
  COMPLETED: "success",
  PROCESSING: "secondary",
  PENDING_VERIFICATION: "warning",
  FLAGGED: "destructive",
  FAILED: "destructive",
};

export default function AccountDetail() {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const queryClient = useQueryClient();
  const [isBlocking, setIsBlocking] = React.useState(false);

  const { data: account, isLoading } = useQuery({
    queryKey: ["accounts", accountNumber],
    queryFn: () => accountsApi.get(accountNumber!),
    enabled: !!accountNumber,
  });

  const { data: history } = useQuery({
    queryKey: ["transactions", "history", accountNumber],
    queryFn: () => transactionsApi.history(accountNumber!),
    enabled: !!accountNumber,
  });

  const handleBlock = async () => {
    if (!accountNumber) return;
    setIsBlocking(true);
    try {
      await accountsApi.block(accountNumber);
      toast.success("Account blocked");
      queryClient.invalidateQueries({ queryKey: ["accounts", accountNumber] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsBlocking(false);
    }
  };

  if (isLoading || !account) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div>
      <Link to="/accounts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to accounts
      </Link>

      <div className="rounded-2xl p-7 mb-6 relative overflow-hidden bg-ink">
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full opacity-[0.15] bg-volt" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div>
            <p className="text-[13px] text-white/55 mb-1">
              {account.accountType.replace("_", " ")} — •••• {account.accountNumber.slice(-4)}
            </p>
            <p className="text-white text-[2.5rem] leading-none font-semibold tabular-nums tracking-tight mt-2">
              {formatMoney(account.balance)}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Badge className="rounded-full border-0 bg-volt/15 text-volt">{account.status}</Badge>
              <span className="text-[12px] text-white/40">
                Daily limit: {formatMoney(account.dailyTransactionLimit)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild variant="volt" size="sm">
              <Link to={`/transfer?from=${account.accountNumber}`}>
                <ArrowUpRight className="w-4 h-4 mr-1.5" />
                Transfer
              </Link>
            </Button>
            {account.status !== "BLOCKED" && (
              <Button variant="outline" size="sm" onClick={handleBlock} disabled={isBlocking}>
                <Ban className="w-4 h-4 mr-1.5" />
                Block
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <div className="px-5 py-4">
          <h2 className="text-[14px] font-medium">Transaction history</h2>
        </div>
        <Separator />
        {!history || history.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-6">No transactions yet.</p>
        ) : (
          <div>
            {history.map((t, i) => {
              const isOutgoing = t.senderAccountNumber === account.accountNumber;
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
                          {isOutgoing
                            ? `To •••• ${t.receiverAccountNumber.slice(-4)}`
                            : `From •••• ${t.senderAccountNumber.slice(-4)}`}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {new Date(t.createdAt).toLocaleString()}
                          {t.description ? ` · ${t.description}` : ""}
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
                  {i < history.length - 1 && <Separator />}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
