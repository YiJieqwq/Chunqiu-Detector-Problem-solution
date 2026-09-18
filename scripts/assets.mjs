import { cpSync, rmSync, mkdirSync } from "node:fs";
rmSync("public/File", { recursive: true, force: true });
mkdirSync("public", { recursive: true });
cpSync("File", "public/File", { recursive: true });
