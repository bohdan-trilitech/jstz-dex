"use client";

import { zodResolver } from "@hookform/resolvers/zod";



import { UserPlus, UserMinus, Shield, Users, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";



import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useWalletContext } from "@/contexts/wallet.context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DexAPI } from "@/services/dex-api";





// Schema for adding operators
const addOperatorSchema = z.object({
  address: z
    .string()
    .min(1, "Address is required")
    .regex(/^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/, "Invalid Tezos address format"),
});

type AddOperatorForm = z.infer<typeof addOperatorSchema>;

export function Settings() {
  const { isAdmin, userAddress, extensionStatus } = useWalletContext();

  const extensionAvailable = extensionStatus === "available" || extensionStatus === "checking";

  const [operators, setOperators] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [operatorToRemove, setOperatorToRemove] = useState<string | null>(null);
  const { showToast } = useToast();

  const form = useForm<AddOperatorForm>({
    resolver: zodResolver(addOperatorSchema),
    defaultValues: {
      address: "",
    },
  });

  const loadOperators = async () => {
    setLoading(true);
    try {
      const { operators } = await DexAPI.getOperators();
      setOperators(operators ?? []);
    } catch (error) {
      console.error("Failed to load operators:", error);
      showToast(error instanceof Error ? error.message : "Failed to load operators", 500);
    } finally {
      setLoading(false);
    }
  };

  const onAddOperator = async (data: AddOperatorForm) => {
    if (!extensionAvailable) {
      showToast("Cannot manage operators while jstz signer extension is disconnected", 400);
      return;
    }

    const newAddress = data.address.trim();

    // Check if address is already an operator
    if (operators.includes(newAddress)) {
      showToast("This address is already in the operators list", 400);
      return;
    }

    setLoading(true);
    try {
      const result = await DexAPI.addOperator(newAddress);

      setOperators(result.operators ?? {});

      showToast(result.message, result.status);

      form.reset();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to add operator", 500);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOperator = async (addressToRemove: string) => {
    if (!extensionAvailable) {
      showToast("Cannot manage operators while jstz signer extension is disconnected", 400);
      return;
    }

    // Prevent removing yourself if you're the only operator
    if (operators.length === 1 && operators[0] === userAddress) {
      showToast("Cannot remove the last operator. Add another operator first.", 400);
      return;
    }

    setLoading(true);
    try {
      const result = await DexAPI.removeOperator(addressToRemove);

      setOperators(result.operators ?? []);

      showToast(result.message, result.status);

      setOperatorToRemove(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to remove operator", 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Operator Management
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Operators have special privileges to manage assets and perform administrative functions
            on the DEX.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Operator Form - Only show if current user is an operator */}
          {isAdmin && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Add New Operator</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddOperator)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operator Address</FormLabel>
                        <FormControl>
                          <Input placeholder="tz1... or KT1..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting || loading || !extensionAvailable}
                    className="w-full"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {form.formState.isSubmitting || loading
                      ? "Adding..."
                      : !extensionAvailable
                        ? "Extension Unavailable"
                        : "Add Operator"}
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {/* Operators List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Operators ({operators.length}) {" "}
              <Button disabled={loading} variant="link" onClick={loadOperators}>
                <RefreshCw className={cn(loading && "animate-spin")} />
              </Button></h3>
            {operators.length === 0 ? (
              <p className="text-muted-foreground">No operators found</p>
            ) : (
              <div className="space-y-2">
                {operators.map((operatorAddress, index) => (
                  <div
                    key={operatorAddress}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium">
                          {operatorAddress.slice(0, 6)}...{operatorAddress.slice(-4)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {operatorAddress === userAddress ? "You" : `Operator #${index + 1}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Operator</Badge>
                      {/* Only show remove button if current user is operator and it's not themselves (unless there are other operators) */}
                      {isAdmin && (operatorAddress !== userAddress && operators.length > 1) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={loading || !extensionAvailable}
                              onClick={() => setOperatorToRemove(operatorAddress)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Operator</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove{" "}
                                <span className="font-mono">
                                  {operatorAddress.slice(0, 6)}...{operatorAddress.slice(-4)}
                                </span>{" "}
                                from the operators list? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setOperatorToRemove(null)}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveOperator(operatorAddress)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Information Card */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-semibold">Operator Privileges</h4>
            <ul className="space-y-1 text-sm">
              <li>• Mint new assets and tokens</li>
              <li>• List and unlist assets for trading</li>
              <li>• Manage other operators (add/remove)</li>
              <li>• Access administrative functions</li>
              <li>• Modify DEX parameters and settings</li>
            </ul>
          </div>

          {!isAdmin && (
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-semibold">Limited Access</h4>
              <p className="text-sm">
                You are not currently an operator. Contact an existing operator to request operator
                privileges if you need administrative access to the DEX.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
