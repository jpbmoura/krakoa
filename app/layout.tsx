import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

// Roda antes da primeira pintura: sem escolha salva, o CSS deixa o sistema decidir.
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: "Registro de Leitura // Cerebro",
  description: "Tracker de leitura de quadrinhos — Era Krakoa e além.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="frame">
          <ThemeToggle />
          {children}
        </div>
        <footer className="site-footer">
          Data provided by Marvel. © MARVEL — projeto pessoal, sem fins comerciais.
        </footer>
      </body>
    </html>
  );
}
