
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Practice Interview | precasprep',
  description: 'AI-powered interview preparation platform',
};

export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout provides a fullscreen experience for the interview,
  // removing the standard dashboard sidebar and header.
  return <div className="min-h-screen w-full bg-secondary">{children}</div>;
}
