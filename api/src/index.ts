import { createApp } from "./app";

const port = Number(process.env.PORT) || 3001;
const server = createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Free it with: lsof -nP -iTCP:${port} -sTCP:LISTEN`,
    );
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
