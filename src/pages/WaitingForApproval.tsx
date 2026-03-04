import React from "react";
import { Link } from "react-router-dom";
import { Clock, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const WaitingForApproval: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary to-accent p-6">
      <Card className="w-full max-w-lg shadow-elevated">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Waiting for approval</CardTitle>
          <CardDescription className="text-base">
            Your account is waiting for Super Admin approval.
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center text-sm text-muted-foreground">
          <Link to="/" className="underline hover:text-primary">
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitingForApproval;
