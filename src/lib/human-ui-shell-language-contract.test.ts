import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const rootLayout = read("src/app/layout.tsx");
const appChrome = read("src/components/AppChrome.tsx");
const workspaceSidebar = read("src/components/WorkspaceSidebar.tsx");
const globalStyles = read("src/app/globals.css");
const paperModeNav = read("src/components/paper-builder/PaperBuilderModeNav.tsx");
const studentsClient = read("src/app/workspace/students/StudentsClient.tsx");
const classesClient = read("src/app/workspace/classes/WorkspaceClassesClient.tsx");
const classDetail = read("src/app/workspace/classes/[id]/ClassDetailClient.tsx");
const adminSidebar = read("src/components/AdminSidebar.tsx");

test("public chrome is omitted for admin and workspace route trees", () => {
  assert.match(rootLayout, /<AppChrome publicHeader=\{<Navbar \/>\} publicFooter=\{<Footer \/>\}>/);
  assert.match(appChrome, /\["\/admin", "\/workspace"\]/);
  assert.match(appChrome, /pathname === prefix \|\| pathname\.startsWith\(`\$\{prefix\}\/`\)/);
  assert.match(appChrome, /if \(usesAuthenticatedShell\(pathname\)\)/);
  assert.match(appChrome, /\{publicHeader\}/);
  assert.match(appChrome, /\{publicFooter\}/);
});

test("normal application typography resolves to Geist Sans", () => {
  assert.match(rootLayout, /body className="[^"]*font-sans/);
  assert.match(globalStyles, /--font-sans: var\(--font-geist-sans\);/);
  assert.match(globalStyles, /--font-heading: var\(--font-geist-sans\);/);
  assert.doesNotMatch(globalStyles, /--font-sans: var\(--font-sans\);/);
});

test("teacher navigation is grouped by workflow and keeps existing routes", () => {
  for (const section of ["Teach", "Create", "Papers", "Settings"]) {
    assert.match(workspaceSidebar, new RegExp(`label: "${section}"`));
  }
  for (const route of [
    "/workspace/classes",
    "/workspace/students",
    "/workspace/quick-practice",
    "/workspace/worksheets",
    "/workspace/content",
    "/workspace/question-bank",
    "/workspace/paper-builder",
    "/workspace/paper-builder/blueprint",
    "/workspace/paper-builder/templates",
    "/workspace/paper-builder/blueprint/templates",
    "/workspace/paper-builder/header-templates",
    "/workspace/paper-builder/archive",
    "/workspace/settings",
  ]) {
    assert.match(workspaceSidebar, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(workspaceSidebar, /label: "Home"/);
  assert.match(workspaceSidebar, /label: "All students"/);
  assert.match(workspaceSidebar, /label: "Practice sets"/);
  assert.match(workspaceSidebar, /z-50[\s\S]*lg:hidden/);
});

test("teacher paper navigation uses friendly labels while admin labels remain intact", () => {
  for (const label of [
    "Quick Paper",
    "Chapter-wise Paper",
    "Saved paper setups",
    "Saved chapter patterns",
    "Paper headers",
    "Saved papers",
  ]) {
    assert.match(paperModeNav, new RegExp(`label: "${label}"`));
  }
  assert.match(paperModeNav, /Use Quick Paper for fast tests\./);
  assert.match(paperModeNav, /label: "Simple Builder"/);
  assert.match(paperModeNav, /label: "Blueprint Builder"/);
  assert.match(adminSidebar, /\sDashboard\s*<\/Link>/);
});

test("high-impact empty states and visible student profile action are present", () => {
  assert.match(classesClient, /Create your first class, then share its code with students\./);
  assert.match(classDetail, /No one has joined yet\. Share the class code with students\./);
  assert.match(classDetail, /Nothing assigned to this class yet\./);
  assert.match(studentsClient, /Not enough attempts yet/);
  assert.match(studentsClient, />\s*View Profile\s*</);
  assert.doesNotMatch(studentsClient, /opacity-0 group-hover:opacity-100/);
});
