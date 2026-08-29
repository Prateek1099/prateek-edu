import { SavedPaperViewerClient } from "@/components/paper-builder/SavedPaperViewerClient";
import type { SavedGeneratedPaperDetail } from "@/lib/paper-builder/saved-paper-types";

export default function SavedPaperClient({ saved }: { saved: SavedGeneratedPaperDetail }) {
  return (
    <SavedPaperViewerClient
      saved={saved}
      archiveHref="/admin/paper-builder/archive"
    />
  );
}
