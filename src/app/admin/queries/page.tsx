export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ResolveQueryButton from "./ResolveQueryButton";

export default async function AdminQueriesPage() {
  const queries = await prisma.contactQuery.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Contact Queries</h1>
      </div>
      
      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No contact queries found.
                </TableCell>
              </TableRow>
            ) : (
              queries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell className="font-medium">{query.name}</TableCell>
                  <TableCell>{query.email}</TableCell>
                  <TableCell className="max-w-xs truncate">{query.message}</TableCell>
                  <TableCell>
                    <Badge variant={query.resolved ? 'outline' : 'destructive'}>
                      {query.resolved ? 'Resolved' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(query.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {!query.resolved && (
                      <ResolveQueryButton queryId={query.id} />
                    )}
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
