// Monopoly - Activity Log Component

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ActivityLogProps {
  log: string[];
}

export function ActivityLog({ log }: ActivityLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
          {log.map((entry, index) => (
            <p key={`${entry}-${index}`}>{entry}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
