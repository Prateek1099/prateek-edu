"use client";

import SimplePaperBuilderClient from "@/components/paper-builder/SimplePaperBuilderClient";
import type {
  PaperBuilderQuestion,
  PaperBuilderSubject,
  PaperBuilderTopic,
  PaperHeaderTemplate,
} from "@/lib/paper-builder/types";

import { validatePaperBuilderSelection } from "./actions";
import {
  createPaperHeaderTemplate,
  deletePaperHeaderTemplate,
  updatePaperHeaderTemplate,
} from "./template-actions";

type Props = {
  subjects: PaperBuilderSubject[];
  topics: PaperBuilderTopic[];
  questions: PaperBuilderQuestion[];
  headerTemplates: PaperHeaderTemplate[];
};

export default function PaperBuilderClient(props: Props) {
  return (
    <SimplePaperBuilderClient
      {...props}
      validateSelection={validatePaperBuilderSelection}
      headerTemplateActions={{
        create: createPaperHeaderTemplate,
        update: updatePaperHeaderTemplate,
        delete: deletePaperHeaderTemplate,
      }}
    />
  );
}
