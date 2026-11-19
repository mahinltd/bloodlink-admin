import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Shell from '@/components/Shell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata = {
  title: {
    default: 'BloodLink Admin',
    template: '%s | BloodLink Admin',
  },
  description: 'BloodLink Administration Panel — internal use only.',
  robots: { index: false, follow: false }, // 🔒 Google-এ index হবে না
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="font-sans bg-[#F6F6F8] text-ink antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}