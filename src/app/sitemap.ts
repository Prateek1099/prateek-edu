import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const routes = [
  "", "/features", "/pricing", "/about", "/request-demo", "/contact",
  "/resources", "/resources/cbse", "/resources/cambridge", "/syllabus", "/courses",
  "/question-paper-generator", "/teacher-question-bank",
  "/cbse-informatics-practices-question-bank", "/privacy", "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route, index) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : route === "/resources" || route === "/question-paper-generator" ? 0.9 : 0.7,
  }));
}
