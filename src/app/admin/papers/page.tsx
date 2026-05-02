import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AdminPapersPage() {
  const papers = await prisma.paper.findMany({
    orderBy: { year: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Papers</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Paper
        </Button>
      </div>
      
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Paper No</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {papers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No papers found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              papers.map((paper: any) => (
                <TableRow key={paper.id}>
                  <TableCell className="font-medium">{paper.subject}</TableCell>
                  <TableCell>{paper.level}</TableCell>
                  <TableCell>{paper.year}</TableCell>
                  <TableCell>{paper.paperNumber} {paper.variant ? `(v${paper.variant})` : ''}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="destructive" size="sm">Delete</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
