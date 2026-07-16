"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Layers, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBoard, updateBoard } from "@/app/actions/academic-structure";
import { toast } from "sonner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BoardWithCount = {
  id: string;
  name: string;
  title: string;
  status: string;
  _count: { qualifications: number };
};

export default function AdminBoardsClient({ boards }: { boards: BoardWithCount[] }) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<BoardWithCount | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("PUBLISHED");

  const resetForm = () => {
    setName("");
    setTitle("");
    setStatus("PUBLISHED");
    setSelectedBoard(null);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (board: BoardWithCount) => {
    setSelectedBoard(board);
    setName(board.name);
    setTitle(board.title);
    setStatus(board.status);
    setIsEditOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createBoard({ name, title, status });
      toast.success("Board added");
      setIsAddOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoard) return;
    setLoading(true);
    try {
      await updateBoard(selectedBoard.id, { name, title, status });
      toast.success("Board updated");
      setIsEditOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="size-8 text-primary" />
            Boards
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage educational boards (e.g., Cambridge, CBSE).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openAdd}>
            <Plus className="size-4 mr-2" />
            Add Board
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 space-y-0">
          <CardTitle className="text-lg">All Boards</CardTitle>
          <CardDescription>A list of all educational boards currently registered.</CardDescription>
        </CardHeader>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Identifier (Name)</TableHead>
                <TableHead>Qualifications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-14">
                    No boards found.
                  </TableCell>
                </TableRow>
              ) : (
                boards.map((board) => (
                  <TableRow key={board.id}>
                    <TableCell className="font-medium">{board.title}</TableCell>
                    <TableCell className="text-muted-foreground">{board.name}</TableCell>
                    <TableCell>{board._count.qualifications}</TableCell>
                    <TableCell>
                      <Badge variant={board.status === "PUBLISHED" ? "default" : board.status === "DRAFT" ? "secondary" : "outline"} className={board.status === "PUBLISHED" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                        {board.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(board)}>
                        <Pencil className="size-4 mr-1" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CBSE Board" />
            </div>
            <div className="space-y-2">
              <Label>Identifier (Slug)</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. cbse" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Board"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Identifier (Slug)</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
