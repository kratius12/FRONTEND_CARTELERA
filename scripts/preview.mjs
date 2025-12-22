import { spawn } from "node:child_process";

const port = process.env.PORT || "4173";
const host = "0.0.0.0";

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";

const child = spawn(
  cmd,
  ["vite", "preview", "--host", host, "--port", port],
  { stdio: "inherit", shell: true  }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
