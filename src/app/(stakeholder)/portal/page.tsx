"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useStakeholders, type StakeholderLink } from "@/hooks/useStakeholders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, MessageSquare, Loader2 } from "lucide-react";
import Link from "next/link";

function FamilyCard({ link }: { link: StakeholderLink }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-heading">
            Family: {link.family_id.slice(0, 8)}…
          </CardTitle>
          <Badge
            variant="secondary"
            className={
              link.status === "active"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }
          >
            {link.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Your role: {link.role} · Linked {new Date(link.created_at).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Link
            href={`/portal/upload?family=${link.family_id}`}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            Upload document
          </Link>
          <Link
            href={`/portal/messages?family=${link.family_id}`}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Send message
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PortalPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: stakeholders, isLoading } = useStakeholders();

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please sign in to access the portal.</p>
      </div>
    );
  }

  const links = stakeholders ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Linked Families
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Families who have granted you access to view documents and communicate.
        </p>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              No linked families yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              A parent or guardian must invite you by email before you can access
              their family&apos;s documents and messages.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {links.map((link) => (
            <FamilyCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
