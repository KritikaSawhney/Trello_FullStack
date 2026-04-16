import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TaskFlow — Kanban Project Management',
  description: 'A powerful Kanban-style project management tool to organize your tasks and collaborate with your team.',
  keywords: 'kanban, project management, task tracker, boards, cards, lists',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
