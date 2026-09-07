-- Repair pre-A0 migration-history debt. Never edit the original 19 migrations.
-- Existing matching objects are retained; unexpected definitions fail closed.
BEGIN;

-- Serialize the empty-table check with writers and hold DDL locks until commit.
-- This does not rewrite the table or any Course values.
LOCK TABLE public.courses IN ACCESS EXCLUSIVE MODE;

DO $reconcile$
DECLARE
    spec RECORD;
    actual RECORD;
    slug_att SMALLINT;
    slug_collation OID;
    equivalent_index OID;
    expected_name OID;
BEGIN
    -- Never invent public URLs for a populated legacy table.
    IF NOT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'public.courses'::regclass
          AND attname = 'slug' AND attnum > 0 AND NOT attisdropped
    ) AND EXISTS (SELECT 1 FROM public.courses LIMIT 1) THEN
        RAISE EXCEPTION 'Baseline reconciliation: courses.slug is missing on a populated table; an approved slug backfill strategy is required. No slugs were generated.';
    END IF;

    FOR spec IN SELECT * FROM (VALUES
        ('image_url', 'text', false, NULL::text, 'TEXT'),
        ('instructor_name', 'text', false, NULL::text, 'TEXT'),
        ('is_published', 'boolean', true, 'false', 'BOOLEAN NOT NULL DEFAULT false'),
        ('language', 'text', false, '''English''::text', 'TEXT DEFAULT ''English'''),
        ('learning_outcomes', 'text', false, NULL::text, 'TEXT'),
        ('level', 'text', false, NULL::text, 'TEXT'),
        ('requirements', 'text', false, NULL::text, 'TEXT'),
        ('short_description', 'text', false, NULL::text, 'TEXT'),
        ('slug', 'text', true, NULL::text, 'TEXT NOT NULL'),
        ('target_audience', 'text', false, NULL::text, 'TEXT')
    ) AS definitions(name, sql_type, required, default_expression, ddl)
    LOOP
        SELECT a.atttypid, a.atttypmod, a.attnotnull, a.attidentity, a.attgenerated,
               pg_get_expr(d.adbin, d.adrelid) AS default_expression
          INTO actual
          FROM pg_attribute a
          LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
         WHERE a.attrelid = 'public.courses'::regclass AND a.attname = spec.name
           AND a.attnum > 0 AND NOT a.attisdropped;
        IF NOT FOUND THEN
            EXECUTE format('ALTER TABLE public.courses ADD COLUMN %I %s', spec.name, spec.ddl);
        ELSIF actual.atttypid <> spec.sql_type::regtype
           OR actual.atttypmod <> -1
           OR actual.attnotnull IS DISTINCT FROM spec.required
           OR actual.default_expression IS DISTINCT FROM spec.default_expression
           OR actual.attidentity <> '' OR actual.attgenerated <> '' THEN
            RAISE EXCEPTION 'Baseline reconciliation: unexpected definition for courses.%; expected % (type, nullability and default must match). No existing values were normalized.', spec.name, spec.ddl;
        END IF;
    END LOOP;

    SELECT attnum, attcollation INTO slug_att, slug_collation
      FROM pg_attribute WHERE attrelid = 'public.courses'::regclass
      AND attname = 'slug' AND NOT attisdropped;

    -- Accept a semantically equivalent unique index under ANY physical name.
    -- Partial/expression/invalid/deferred/custom-comparison indexes do not prove
    -- the same immediate, whole-column uniqueness contract.
    SELECT i.indexrelid INTO equivalent_index
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      JOIN pg_am am ON am.oid = c.relam
      JOIN pg_opclass op ON op.oid = i.indclass[0]
      JOIN pg_namespace ns ON ns.oid = op.opcnamespace
     WHERE i.indrelid = 'public.courses'::regclass
       AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate
       AND i.indnkeyatts = 1 AND i.indkey[0] = slug_att
       AND i.indpred IS NULL AND i.indexprs IS NULL
       AND i.indcollation[0] = slug_collation
       AND am.amname = 'btree' AND op.opcname = 'text_ops' AND ns.nspname = 'pg_catalog'
     ORDER BY i.indexrelid LIMIT 1;

    expected_name := to_regclass('public.courses_slug_key');
    IF expected_name IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_am am ON am.oid = c.relam
        JOIN pg_opclass op ON op.oid = i.indclass[0]
        JOIN pg_namespace ns ON ns.oid = op.opcnamespace
        WHERE i.indexrelid = expected_name AND i.indrelid = 'public.courses'::regclass
          AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate
          AND i.indnkeyatts = 1 AND i.indkey[0] = slug_att
          AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indcollation[0] = slug_collation
          AND am.amname = 'btree' AND op.opcname = 'text_ops' AND ns.nspname = 'pg_catalog'
    ) THEN
        RAISE EXCEPTION 'Baseline reconciliation: courses_slug_key exists with an unexpected definition; no index was replaced.';
    END IF;

    IF equivalent_index IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.courses GROUP BY slug HAVING count(*) > 1) THEN
            RAISE EXCEPTION 'Baseline reconciliation: duplicate Course slugs require an approved data correction; no records were deduplicated.';
        END IF;
        CREATE UNIQUE INDEX courses_slug_key ON public.courses USING btree (slug);
    END IF;
END
$reconcile$;

-- Academic-scope timestamp default and equivalent historical indexes stay put.
COMMIT;
