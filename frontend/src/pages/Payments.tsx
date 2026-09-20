import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { accountsApi, paymentsApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const STATUS_VARIANT: Record<string, "success" | "destructive" | "secondary"> = {
  SUCCESS: "success",
  CREATED: "secondary",
  FAILED: "destructive",
};

export default function Payments() {
  const { user } = useAuth();
  const [accountNumber, setAccountNumber] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activePaymentId, setActivePaymentId] = React.useState<string | null>(null);

  const { data: accounts } = useQuery({
    queryKey: ["accounts", "mine", user?.email],
    queryFn: () => accountsApi.listMine(user!.email),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (!accountNumber && accounts && accounts.length > 0) {
      setAccountNumber(accounts[0].accountNumber);
    }
  }, [accounts, accountNumber]);

  const { data: history } = useQuery({
    queryKey: ["payments", "history", accountNumber],
    queryFn: () => paymentsApi.history(accountNumber),
    enabled: !!accountNumber,
  });

  const { data: activePayment } = useQuery({
    queryKey: ["payments", activePaymentId],
    queryFn: () => paymentsApi.get(activePaymentId!),
    enabled: !!activePaymentId,
    refetchInterval: (query) => (query.state.data?.status === "CREATED" ? 2500 : false),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const order = await paymentsApi.createOrder({
        accountNumber,
        amount: Number(amount),
        description: description || undefined,
      });

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        toast.error("Couldn't load the payment widget. Check your connection and try again.");
        setIsSubmitting(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "Nova Bank",
        description: description || "Account top-up",
        order_id: order.razorpayOrderId,
        handler: () => {
          setActivePaymentId(order.paymentId);
          toast.success("Payment submitted — confirming with your bank…");
        },
        modal: {
          ondismiss: () => setIsSubmitting(false),
        },
        theme: { color: "#111318" },
      });

      rzp.on("payment.failed", () => {
        toast.error("Payment failed or was cancelled.");
        setIsSubmitting(false);
      });

      rzp.open();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Top up</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add money via card</CardTitle>
          <CardDescription>
            Processed through Razorpay. Requires valid Razorpay API keys to be configured on the
            server — see .env.example.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>To account</Label>
              <Select value={accountNumber} onValueChange={setAccountNumber}>
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
              />
            </div>

            <Button type="submit" variant="volt" className="w-full" disabled={isSubmitting || !accountNumber}>
              <CreditCard className="w-4 h-4 mr-1.5" />
              {isSubmitting ? "Opening checkout…" : "Continue to payment"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {activePayment && (
        <Card className="mt-4">
          <CardContent className="p-4 flex items-center gap-3">
            {activePayment.status === "CREATED" && <Loader2 className="w-4 h-4 animate-spin" />}
            {activePayment.status === "SUCCESS" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {activePayment.status === "FAILED" && <XCircle className="w-4 h-4 text-destructive" />}
            <div>
              <p className="text-sm font-medium">
                {activePayment.status === "CREATED"
                  ? "Waiting for confirmation from Razorpay…"
                  : activePayment.status === "SUCCESS"
                  ? "Top-up successful"
                  : activePayment.failureReason || "Top-up failed"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatMoney(activePayment.amount)} to •••• {activePayment.accountNumber.slice(-4)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {history && history.length > 0 && (
        <Card className="mt-6">
          <div className="px-5 py-4">
            <h2 className="text-[14px] font-medium">Payment history</h2>
          </div>
          <Separator />
          {history.map((p, i) => (
            <div key={p.id}>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-[13.5px]">{p.description || "Top-up"}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13.5px] font-medium tabular-nums">{formatMoney(p.amount)}</p>
                  <Badge variant={STATUS_VARIANT[p.status] || "secondary"} className="mt-1">
                    {p.status}
                  </Badge>
                </div>
              </div>
              {i < history.length - 1 && <Separator />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
