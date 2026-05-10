/**
 * Cambridge IGCSE ICT (0417) syllabus headings in teaching order.
 * Duplicates removed from source list; matches common specification structure for note/PDF tagging.
 */
export const IGCSE_ICT_0417_TOPIC_ORDER = [
  "Types & Components of Computer Systems",
  "Hardware & Software",
  "Components of Computer Systems",
  "Types of Computer & Emerging Technologies",
  "Networks",
  "Network Issues",
  "Effects of Using IT",
  "ICT Applications",
  "The Systems Life Cycle",
  "Safety & Security",
  "Safety",
  "Security",
  "Communication",
  "Managing Files & Compression",
  "Manage Files Effectively",
  "Compression",
  "Working with Documents",
  "Audience & Purpose",
  "Document Production",
  "Images",
  "Proofing",
  "Databases",
  "Create a Database Structure",
  "Spreadsheets",
  "Create a Data Model",
  "Website Authoring",
  "Web Development Layers",
  "HTML in the Content Layer",
] as const;

export type IgcseIct0417TopicName = (typeof IGCSE_ICT_0417_TOPIC_ORDER)[number];
