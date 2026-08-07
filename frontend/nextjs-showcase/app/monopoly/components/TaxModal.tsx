// Monopoly - Tax Modal Component

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface TaxModalProps {
  amount: number;
}

export function TaxModal({ amount }: TaxModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <Card className="w-full max-w-sm pointer-events-auto">
        <CardHeader className="text-center">
          <CardTitle>💰 TAX</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-lg">You paid ${amount}.</p>
        </CardContent>
      </Card>
    </div>
  );
}
