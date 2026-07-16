"use client";

import { useMemo, useState } from "react";
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
import { Plus, Pencil, GraduationCap } from "lucide-react";
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
import { createQualification, updateQualification } from "@/app/actions/academic-structure";
import { toast } from "sonner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminBoard } from "@/components/AdminBoardContext";

type QualificationWithBoard = {
  id: string;
  name: string;
  title: string;
  status: string;
  sortOrder: number;
  boardId: string;
  board: { name: string; title: string };
  _count: { subjects: number };
};

export default function AdminQualificationsClient({
  qualifications,
  boards,
}: {
  qualifications: QualificationWithBoard[];
  boards: { id: string; name: string; title: string }[];
}) {
  const router = useRouter();
  const { selectedBoard } = useAdminBoard();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedQual, setSelectedQual] = useState<QualificationWithBoard | null>(null);
  const [loading, setLoading] = useState(false);

  const [boardId, setBoardId] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("PUBLISHED");
  const [sortOrder, setSortOrder] = useState("0");

  const filteredQuals = useMemo(() => {
    if (selectedBoard === "all") return qualifications;
    return qualifications.filter(q => q.board.name === selectedBoard);
  }, [qualifications, selectedBoard]);

  const resetForm = () => {
    setBoardId(boards[0]?.id || "");
    setName("");
    setTitle("");
    setStatus("PUBLISHED");
    setSortOrder("0");
    setSelectedQual(null);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (qual: QualificationWithBoard) => {
    setSelectedQual(qual);
    setBoardId(qual.boardId);
    setName(qual.name);
    setTitle(qual.title);
    setStatus(qual.status);
    setSortOrder(qual.sortOrder.toString());
    setIsEditOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId) return toast.error("Please select a board");
    setLoading(true);
    try {
      await createQualification({ boardId, name, title, status, sortOrder: parseInt(sortOrder, 10) });
      toast.success("Qualification added");
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
    if (!selectedQual) return;
    setLoading(true);
    try {
      await updateQualification(selectedQual.id, { name, title, status, sortOrder: parseInt(sortOrder, 10) });
      toast.success("Qualification updated");
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
            <GraduationCap className="size-8 text-primary" />
            Qualifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage qualifications/classes (e.g., IGCSE, Class 12).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openAdd}>
            <Plus className="size-4 mr-2" />
            Add Qualification
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 space-y-0">
          <CardTitle className="text-lg">All Qualifications</CardTitle>
          <CardDescription>
            Filtered by active board context: {selectedBoard === "all" ? "All Boards" : selectedBoard.toUpperCase()}
          </CardDescription>
        </CardHeader>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Board</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-14">
                    No qualifications found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuals.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-muted-foreground">{q.board.title}</TableCell>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell className="text-muted-foreground">{q.name}</TableCell>
                    <TableCell>{q.sortOrder}</TableCell>
                    <TableCell>{q._count.subjects}</TableCell>
                    <TableCell>
                      <Badge variant={q.status === "PUBLISHED" ? "default" : q.status === "DRAFT" ? "secondary" : "outline"} className={q.status === "PUBLISHED" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(q)}>
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
            <DialogTitle>Add Qualification</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Board</Label>
              <Select value={boardId} onValueChange={(val) => val && setBoardId(val)}>
                <SelectTrigger><SelectValue placeholder="Select Board" /></SelectTrigger>
                <SelectContent>
                  {boards.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Class 12" />
              </div>
              <div className="space-y-2">
                <Label>Identifier (Slug)</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. class-12" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input required type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Qualification</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2 opacity-50">
              <Label>Board</Label>
              <Input disabled value={selectedQual?.board.title || ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Identifier (Slug)</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input required type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
