process.env.GENERATE_SOURCEMAP = "false";

(async () => {
  const { build } = await import("vite");
  await build({ mode: "production" });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
