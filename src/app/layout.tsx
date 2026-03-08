import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
    title: 'ApplyHub',
    description: 'A focused workspace to track applications, companies and certifications.',
    icons: {
        icon: '/brand/applyhub-logo.png',
        shortcut: '/brand/applyhub-logo.png',
        apple: '/brand/applyhub-logo.png',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                {children}
                <Analytics />
            </body>
        </html>
    );
}
