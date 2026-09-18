// Keep legacy .html URLs readable alongside clean directory URLs.
// Pages automatically redirects extensionless directory requests to a trailing slash.
import { copyFileSync } from "node:fs";
for (const lang of ["zh", "en"])
  for (const page of ["items", "prologue"])
    copyFileSync(
      `dist/${lang}/${page}/index.html`,
      `dist/${lang}/${page}.html`,
    );
copyFileSync("dist/thanks/index.html", "dist/thanks.html");
