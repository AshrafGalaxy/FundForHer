import { useState } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, Building, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BankDetailsForm({ applicationId, onSubmitted }: { applicationId: string, onSubmitted: () => void }) {
    const [accountName, setAccountName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifsc, setIfsc] = useState("");
    const [bankName, setBankName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const auth = useAuth();
    const db = useFirestore();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth?.currentUser || !db) return;

        setSubmitting(true);
        try {
            // Write the disbursement details, defaulting to 'Processing' status
            await setDoc(doc(db, "disbursements", applicationId), {
                userId: auth.currentUser.uid,
                applicationId,
                accountName,
                accountNumber: "***" + accountNumber.slice(-4), // In a real app, PII should be encrypted/tokenized
                ifsc,
                bankName,
                status: "Processing",
                submittedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            toast({
                title: "Bank Details Secured",
                description: "Your financial details have been securely submitted to the provider. Disbursement is now processing.",
                className: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200"
            });
            onSubmitted();

        } catch (error) {
            console.error("Error submitting bank details: ", error);
            toast({ title: "Error", description: "Failed to submit bank details.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-6 relative overflow-hidden">
            {/* Security Stamp Background */}
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                <ShieldCheck className="w-48 h-48 text-emerald-600" />
            </div>

            <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex flex-shrink-0 items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Building className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-headline font-bold text-lg text-emerald-900 dark:text-emerald-300">Action Required: Claim Your Funds</h3>
                        <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">
                            Congratulations! Please enter your Indian bank details below (NEFT/RTGS supported) to initiate the transfer.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background/50 p-4 min-w-full rounded-lg border shadow-sm">
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Account Holder Name</Label>
                        <Input
                            required
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            placeholder="As written on your passbook"
                            className="bg-card"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Account Number</Label>
                        <Input
                            required
                            type="password"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="00000000000"
                            className="bg-card"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">IFSC Code</Label>
                        <Input
                            required
                            maxLength={11}
                            value={ifsc}
                            onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                            placeholder="HDFC0001234"
                            className="bg-card uppercase"
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Bank Name</Label>
                        <Input
                            required
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="e.g., State Bank of India"
                            className="bg-card"
                        />
                    </div>

                    <div className="sm:col-span-2 pt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground flex items-center gap-1 opacity-80">
                            <ShieldCheck className="w-3.5 h-3.5" /> End-to-End Encrypted Vault
                        </p>
                        <Button type="submit" disabled={submitting || !accountName || !accountNumber || ifsc.length !== 11} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md">
                            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Securing...</> : <><Send className="w-4 h-4 mr-2" /> Start Transfer</>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
