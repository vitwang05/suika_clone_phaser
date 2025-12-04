import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Dùng đường dẫn tương đối để chạy tốt khi nhúng trên CrazyGames (hoặc host khác)
  base: "./",
  build: {
    outDir: "dist",
  },
});



