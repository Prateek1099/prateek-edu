export const boards = [
  { id: "cambridge", name: "Cambridge International" },
  { id: "cbse", name: "CBSE" },
];

export const levels = [
  { id: "igcse", name: "IGCSE", boardId: "cambridge" },
  { id: "o-level", name: "O Level", boardId: "cambridge" },
  { id: "as-level", name: "AS Level", boardId: "cambridge" },
  { id: "a-level", name: "A Level", boardId: "cambridge" },
  { id: "class-10", name: "Class 10", boardId: "cbse" },
  { id: "class-12", name: "Class 12", boardId: "cbse" },
];

export const subjects = [
  { id: "ict-0417", name: "ICT (0417)", levelIds: ["igcse"] },
  { id: "cs-0478", name: "Computer Science (0478)", levelIds: ["igcse", "o-level"] },
  { id: "it-9626", name: "Information Technology (9626)", levelIds: ["as-level", "a-level"] },
  { id: "cs-9618", name: "Computer Science (9618)", levelIds: ["as-level", "a-level"] },
  { id: "ip-065", name: "Informatics Practices (065)", levelIds: ["class-12"] },
  { id: "it-402", name: "Information Technology (402)", levelIds: ["class-10"] },
];
