"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { updateMyWorkspace } from "@/app/actions/workspace";
import { toast } from "sonner";

type WorkspaceData = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: Date;
};

export default function WorkspaceSettingsClient({ workspace }: { workspace: WorkspaceData }) {
  const [name, setName] = useState(workspace.name);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateMyWorkspace({ name });
      toast.success("Workspace updated");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="size-8 text-primary" />
          Workspace Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your workspace configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Update your workspace details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Workspace Name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div>
                <Badge variant={workspace.status === "ACTIVE" ? "default" : "secondary"} className={workspace.status === "ACTIVE" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                  {workspace.status}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Created</Label>
              <p className="text-sm text-muted-foreground">{new Date(workspace.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
