import re

with open("prisma/schema.prisma", "r") as f:
    content = f.read()

models = content.split("model ")
new_content = models[0]

for model in models[1:]:
    lines = model.split("\n")
    model_name = lines[0].strip().split("{")[0].strip()
    
    # find all scalar fields that end in Id or _id and are foreign keys
    # wait, the simplest way is to look for fields with `@map("..._id")` or fields ending in `Id`
    fk_fields = []
    for line in lines:
        line_trimmed = line.strip()
        if not line_trimmed or line_trimmed.startswith("//") or line_trimmed.startswith("@@"):
            continue
        
        # Look for relations
        if "@relation" in line and "fields: [" in line:
            # extract fields: [field_name]
            match = re.search(r'fields:\s*\[(.*?)\]', line)
            if match:
                fks = [f.strip() for f in match.group(1).split(",")]
                fk_fields.extend(fks)

    # remove duplicates
    fk_fields = list(set(fk_fields))
    
    # insert @@index for each fk_field just before the last closing brace
    # also don't insert if it's already a @@unique by itself
    # Check existing uniques
    unique_fields = []
    for line in lines:
        match = re.search(r'@@unique\(\[(.*?)\]\)', line)
        if match:
            # if unique is just one field or if the fk is the first field in unique, no need for index
            first_field = match.group(1).split(",")[0].strip()
            unique_fields.append(first_field)
        
        # also check @unique on the field itself
        if "@unique" in line and not line.strip().startswith("@@"):
            field_name = line.strip().split()[0]
            unique_fields.append(field_name)

    indexes_to_add = []
    for fk in fk_fields:
        if fk not in unique_fields:
            indexes_to_add.append(f"  @@index([{fk}])")
    
    # insert before the closing '}'
    if indexes_to_add:
        # find last '}'
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip() == "}":
                for idx in indexes_to_add:
                    lines.insert(i, idx)
                break

    new_content += "model " + "\n".join(lines)

with open("prisma/schema.prisma", "w") as f:
    f.write(new_content)

print("Indexes added successfully.")
