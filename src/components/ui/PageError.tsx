import { Card, CardContent } from "@/components/ui/card";

export function PageError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <Card className="bg-red-950/20 border-red-900/40">
      <CardContent className="p-4 text-sm text-red-300">
        {message}
      </CardContent>
    </Card>
  );
}
