import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { accountsApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AccountType } from "@/types";

export default function NewAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = React.useState("");
  const [accountType, setAccountType] = React.useState<AccountType>("SAVINGS");
  const [initialDeposit, setInitialDeposit] = React.useState("100");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const account = await accountsApi.create({
        accountHolderName: user.fullName,
        email: user.email,
        phone,
        accountType,
        initialDeposit: Number(initialDeposit),
      });
      toast.success(`Account •••• ${account.accountNumber.slice(-4)} opened`);
      navigate(`/accounts/${account.accountNumber}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Open a new account</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Opened under {user?.fullName} ({user?.email}).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Account type</Label>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAVINGS">Savings</SelectItem>
                  <SelectItem value="CURRENT">Current</SelectItem>
                  <SelectItem value="FIXED_DEPOSIT">Fixed Deposit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deposit">Initial deposit ($)</Label>
              <Input
                id="deposit"
                type="number"
                min="0.01"
                step="0.01"
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="volt" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Opening account…" : "Open account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
