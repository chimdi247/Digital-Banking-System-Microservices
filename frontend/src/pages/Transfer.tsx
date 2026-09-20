import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Loader2, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { accountsApi, transactionsApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { TransactionResponse } from "@/types";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "FLAGGED"]);

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function Transfer() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const { data: accounts } = useQuery({
    queryKey: ["accounts", "mine", user?.email],
    queryFn: () => accountsApi.listMine(user!.email),
    enabled: !!user,
  });

  const [senderAccountNumber, setSenderAccountNumber] = React.useState(
    searchParams.get("from") || ""
  );
  const [receiverAccountNumber, setReceiverAccountNumber] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [activeTransactionId, setActiveTransactionId] = React.useState<string | null>(null);
  const [otp, setOtp] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);

  React.useEffect(() => {
    if (!senderAccountNumber && accounts && accounts.length > 0) {
      setSenderAccountNumber(accounts[0].accountNumber);
    }
  }, [accounts, senderAccountNumber]);

  const { data: activeTx } = useQuery({
    queryKey: ["transactions", activeTransactionId],
    queryFn: () => transactionsApi.get(activeTransactionId!),
    enabled: !!activeTransactionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_STATUSES.has(status) ? false : 2000;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const tx = await transactionsApi.transfer({
        senderAccountNumber,
        receiverAccountNumber,
        amount: Number(amount),
        description: description || undefined,
      });
      setActiveTransactionId(tx.id);
      setAmount("");
      setReceiverAccountNumber("");
      setDescription("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransactionId) return;
    setIsVerifying(true);
    try {
      await transactionsApi.verifyOtp(activeTransactionId, otp);
      setOtp("");
      toast.success("Verified");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Transfer money</h1>

      <Card>
        <CardHeader>
          <CardTitle>New transfer</CardTitle>
          <CardDescription>Money moves between accounts instantly, pending fraud checks.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Select value={senderAccountNumber} onValueChange={setSenderAccountNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts || []).map((a) => (
                    <SelectItem key={a.accountNumber} value={a.accountNumber}>
                      •••• {a.accountNumber.slice(-4)} — {formatMoney(a.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receiver">To (account number)</Label>
              <Input
                id="receiver"
                value={receiverAccountNumber}
                onChange={(e) => setReceiverAccountNumber(e.target.value)}
                placeholder="Recipient's account number"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Note (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this for?"
              />
            </div>

            <Button
              type="submit"
              variant="volt"
              className="w-full"
              disabled={isSubmitting || !senderAccountNumber}
            >
              {isSubmitting ? "Sending…" : (
                <>
                  Send transfer <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {activeTx && <TransferStatusCard tx={activeTx} onVerifyClick={() => {}} />}

      <Dialog
        open={activeTx?.status === "PENDING_VERIFICATION"}
        onOpenChange={(open) => !open && setActiveTransactionId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Verify this transfer
            </DialogTitle>
            <DialogDescription>
              This transfer needs a one-time code before it can complete. In this local/demo
              setup, no real SMS is sent — check the code in the notification-service logs:{" "}
              <code className="text-[11px]">docker compose logs notification-service</code>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp">One-time code</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                required
              />
            </div>
            <Button type="submit" variant="volt" className="w-full" disabled={isVerifying}>
              {isVerifying ? "Verifying…" : "Verify"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransferStatusCard({ tx }: { tx: TransactionResponse; onVerifyClick: () => void }) {
  const config: Record<string, { icon: React.ReactNode; label: string; tone: string }> = {
    PROCESSING: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: "Processing — running fraud checks…",
      tone: "text-muted-foreground",
    },
    PENDING_VERIFICATION: {
      icon: <ShieldAlert className="w-4 h-4" />,
      label: "Awaiting one-time code verification",
      tone: "text-amber-600",
    },
    COMPLETED: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: "Transfer completed",
      tone: "text-emerald-600",
    },
    FAILED: {
      icon: <XCircle className="w-4 h-4" />,
      label: tx.failureReason || "Transfer failed",
      tone: "text-destructive",
    },
    FLAGGED: {
      icon: <ShieldAlert className="w-4 h-4" />,
      label: "Transfer flagged and blocked for review",
      tone: "text-destructive",
    },
  };

  const state = config[tx.status] || { icon: null, label: tx.status, tone: "text-muted-foreground" };

  return (
    <Card className="mt-4">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={state.tone}>{state.icon}</div>
        <div>
          <p className={`text-sm font-medium ${state.tone}`}>{state.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ref: {tx.referenceNumber || tx.id.slice(0, 8)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
