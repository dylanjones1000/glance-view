import '../styles/globals.css';

export const metadata = {
  title: 'GlanceView',
  description: 'A simple display control system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}