import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Mahalaxmi Group | Plot Sales CRM - A Tradition of Trust',
  description: 'Official enterprise hierarchy-driven plot sales and incentive management platform of Mahalaxmi Group',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f6f9f7] text-brand-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
