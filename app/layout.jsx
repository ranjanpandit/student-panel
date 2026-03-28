import "@/app/globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell font-sans text-slate-900">
        {children}
      </body>
    </html>
  );
}
