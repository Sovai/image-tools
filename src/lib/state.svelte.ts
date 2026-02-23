export class AppState {
  currentTool = $state("converter");
  theme = $state("dark");

  tools = [
    {
      id: "converter",
      name: "Image Converter",
      description: "Convert images between formats with precision.",
    },
    {
      id: "compressor",
      name: "Compressor",
      description: "Reduce file sizes instantly with no quality loss.",
    },
    {
      id: "resizer",
      name: "Resizer",
      description: "Pixel-perfect resizing with aspect ratio control.",
    },
    {
      id: "svg",
      name: "SVG Optimizer",
      description: "Clean up and minify SVG code for web use.",
    },
    {
      id: "favicon",
      name: "Favicon Generator",
      description: "Generate all standard favicons in one click.",
    },
    {
      id: "bg-remover",
      name: "Background Remover",
      description: "Remove image backgrounds instantly on the client.",
    },
  ];

  get currentToolName() {
    return (
      this.tools.find((t) => t.id === this.currentTool)?.name ||
      this.currentTool
    );
  }

  get currentToolDescription() {
    return this.tools.find((t) => t.id === this.currentTool)?.description || "";
  }

  initTheme() {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        this.theme = storedTheme;
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        this.theme = "dark";
      } else {
        this.theme = "light";
      }
      this.applyTheme();
    }
  }

  toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", this.theme);
    this.applyTheme();
  }

  private applyTheme() {
    if (typeof document === "undefined") return;

    if (this.theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }
}

export const appState = new AppState();
