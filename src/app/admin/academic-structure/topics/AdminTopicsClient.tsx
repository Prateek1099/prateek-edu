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
import { Plus, Pencil, ListTree, UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTopic, updateTopic, bulkImportTopics } from "@/app/actions/academic-structure";
import { toast } from "sonner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminBoard } from "@/components/AdminBoardContext";

type TopicWithRelations = {
  id: string;
  topicName: string;
  status: string;
  sortOrder: number;
  description: string | null;
  subjectId: string;
  subject: { name: string; iconType: string | null; iconValue: string | null; qualification: { title: string; board: { name: string; title: string } } };
  _count: { notes: number; challenges: number; bankQuestions: number };
};

type SubjectOption = {
  id: string;
  name: string;
  qualification: { title: string; board: { name: string; title: string } };
};

export default function AdminTopicsClient({
  topics,
  subjects,
}: {
  topics: TopicWithRelations[];
  subjects: SubjectOption[];
}) {
  const router = useRouter();
  const { selectedBoard } = useAdminBoard();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  
  const [selectedTopic, setSelectedTopic] = useState<TopicWithRelations | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterSubjectId, setFilterSubjectId] = useState("all");

  // Form Fields
  const [subjectId, setSubjectId] = useState("");
  const [topicName, setTopicName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("PUBLISHED");
  const [sortOrder, setSortOrder] = useState("0");
  
  // Bulk Import
  const [bulkText, setBulkText] = useState("");
  const [bulkStatus, setBulkStatus] = useState("DRAFT");

  const filteredSubjects = useMemo(() => {
    if (selectedBoard === "all") return subjects;
    return subjects.filter(s => s.qualification.board.name === selectedBoard);
  }, [subjects, selectedBoard]);

  const filteredTopics = useMemo(() => {
    let result = topics;
    if (selectedBoard !== "all") {
      result = result.filter(t => t.subject.qualification.board.name === selectedBoard);
    }
    if (filterSubjectId !== "all") {
      result = result.filter(t => t.subjectId === filterSubjectId);
    }
    return result;
  }, [topics, selectedBoard, filterSubjectId]);

  const resetForm = () => {
    setSubjectId(filteredSubjects[0]?.id || "");
    setTopicName("");
    setDescription("");
    setStatus("PUBLISHED");
    setSortOrder("0");
    setSelectedTopic(null);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (topic: TopicWithRelations) => {
    setSelectedTopic(topic);
    setSubjectId(topic.subjectId);
    setTopicName(topic.topicName);
    setDescription(topic.description || "");
    setStatus(topic.status);
    setSortOrder(topic.sortOrder.toString());
    setIsEditOpen(true);
  };

  const openBulk = () => {
    setSubjectId(filteredSubjects[0]?.id || "");
    setBulkText("");
    setBulkStatus("DRAFT");
    setIsBulkOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return toast.error("Please select a subject");
    setLoading(true);
    try {
      await createTopic({
        subjectId,
        topicName,
        description: description || undefined,
        status,
        sortOrder: parseInt(sortOrder, 10),
      });
      toast.success("Topic added");
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
    if (!selectedTopic) return;
    setLoading(true);
    try {
      await updateTopic(selectedTopic.id, {
        topicName,
        description: description || undefined,
        status,
        sortOrder: parseInt(sortOrder, 10),
      });
      toast.success("Topic updated");
      setIsEditOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return toast.error("Please select a subject");
    if (!bulkText.trim()) return toast.error("Please enter some topics");
    setLoading(true);
    try {
      const res = await bulkImportTopics(subjectId, bulkText, bulkStatus);
      toast.success(`Imported ${res.count} topics successfully!`);
      setIsBulkOpen(false);
      setBulkText("");
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
            <ListTree className="size-8 text-primary" />
            Topics
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage granular curriculum topics for each subject.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openBulk}>
            <UploadCloud className="size-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={openAdd}>
            <Plus className="size-4 mr-2" />
            Add Topic
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 space-y-0">
          <CardTitle className="text-lg">All Topics</CardTitle>
          <CardDescription>
            Organized by Subject sequence.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-4">
          <Select value={filterSubjectId} onValueChange={(val) => val && setFilterSubjectId(val)}>
            <SelectTrigger className="w-full sm:max-w-md">
              <SelectValue placeholder="All Subjects">
                {filterSubjectId === "all" ? "All Subjects" : filteredSubjects.find(s => s.id === filterSubjectId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {filteredSubjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name} ({s.qualification.title})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Topic Name</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Content Attached</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-14">
                    No topics found matching filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTopics.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium text-muted-foreground">{t.subject.name}</div>
                      <div className="text-xs text-muted-foreground/60">{t.subject.qualification.title}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{t.topicName}</div>
                      {t.description && <div className="text-xs text-muted-foreground truncate max-w-[300px]">{t.description}</div>}
                    </TableCell>
                    <TableCell>{t.sortOrder}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div>Notes: {t._count.notes}</div>
                        <div>QBank: {t._count.bankQuestions}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === "PUBLISHED" ? "default" : t.status === "DRAFT" ? "secondary" : "outline"} className={t.status === "PUBLISHED" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
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

      {/* Add / Edit Form Modal */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) { setIsAddOpen(false); setIsEditOpen(false); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Edit Topic" : "Add Topic"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={isEditOpen ? handleEdit : handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={(val) => val && setSubjectId(val)} disabled={isEditOpen}>
                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.qualification.title})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic Name</Label>
              <Input required value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="e.g. Data Representation" />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
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

      {/* Bulk Import Modal */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Topics</DialogTitle>
            <DialogDescription>
              Paste a list of topics separated by a new line. They will be generated in order automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Destination Subject</Label>
                <Select value={subjectId} onValueChange={(val) => val && setSubjectId(val)}>
                  <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.qualification.title})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Import Status</Label>
                <Select value={bulkStatus} onValueChange={(val) => val && setBulkStatus(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Topics (One per line)</Label>
              <Textarea 
                required 
                value={bulkText} 
                onChange={(e) => setBulkText(e.target.value)} 
                rows={10} 
                placeholder={`Data Representation\nCommunication\nHardware`}
                className="font-mono text-sm leading-relaxed"
              />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsBulkOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Importing..." : "Start Import"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
