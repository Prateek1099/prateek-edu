-- Teacher Blueprint Templates Phase 1F-B stores reusable workspace-owned
-- blueprint rules only. It never stores generated or selected question IDs.
CREATE TABLE "workspace_blueprint_templates" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "target_marks" INTEGER NOT NULL,
    "preferred_header_template_id" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_blueprint_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_blueprint_template_topics" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_blueprint_template_topics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_blueprint_template_rows" (
    "id" TEXT NOT NULL,
    "template_topic_id" TEXT NOT NULL,
    "section_label" TEXT NOT NULL,
    "question_type" "BankQuestionType" NOT NULL,
    "question_count" INTEGER NOT NULL,
    "marks_per_question" INTEGER NOT NULL,
    "difficulty" "BlueprintTemplateDifficulty" NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_blueprint_template_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_blueprint_templates_workspace_id_subject_id_name_key_key"
ON "workspace_blueprint_templates"("workspace_id", "subject_id", "name_key");

CREATE INDEX "workspace_blueprint_templates_workspace_id_archived_at_updated_at_idx"
ON "workspace_blueprint_templates"("workspace_id", "archived_at", "updated_at");

CREATE INDEX "workspace_blueprint_templates_workspace_id_subject_id_archived_at_idx"
ON "workspace_blueprint_templates"("workspace_id", "subject_id", "archived_at");

CREATE INDEX "workspace_blueprint_templates_created_by_id_idx"
ON "workspace_blueprint_templates"("created_by_id");

CREATE INDEX "workspace_blueprint_templates_subject_id_idx"
ON "workspace_blueprint_templates"("subject_id");

CREATE INDEX "workspace_blueprint_templates_preferred_header_template_id_idx"
ON "workspace_blueprint_templates"("preferred_header_template_id");

CREATE UNIQUE INDEX "workspace_blueprint_template_topics_template_id_topic_id_key"
ON "workspace_blueprint_template_topics"("template_id", "topic_id");

CREATE UNIQUE INDEX "workspace_blueprint_template_topics_template_id_sort_order_key"
ON "workspace_blueprint_template_topics"("template_id", "sort_order");

CREATE INDEX "workspace_blueprint_template_topics_topic_id_idx"
ON "workspace_blueprint_template_topics"("topic_id");

CREATE UNIQUE INDEX "workspace_blueprint_template_rows_template_topic_id_sort_order_key"
ON "workspace_blueprint_template_rows"("template_topic_id", "sort_order");

ALTER TABLE "workspace_blueprint_templates"
ADD CONSTRAINT "workspace_blueprint_templates_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_blueprint_templates"
ADD CONSTRAINT "workspace_blueprint_templates_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_blueprint_templates"
ADD CONSTRAINT "workspace_blueprint_templates_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_blueprint_templates"
ADD CONSTRAINT "workspace_blueprint_templates_preferred_header_template_id_fkey"
FOREIGN KEY ("preferred_header_template_id") REFERENCES "workspace_paper_header_templates"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workspace_blueprint_template_topics"
ADD CONSTRAINT "workspace_blueprint_template_topics_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "workspace_blueprint_templates"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_blueprint_template_topics"
ADD CONSTRAINT "workspace_blueprint_template_topics_topic_id_fkey"
FOREIGN KEY ("topic_id") REFERENCES "topics"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_blueprint_template_rows"
ADD CONSTRAINT "workspace_blueprint_template_rows_template_topic_id_fkey"
FOREIGN KEY ("template_topic_id") REFERENCES "workspace_blueprint_template_topics"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
