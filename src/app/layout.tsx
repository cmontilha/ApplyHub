import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'ApplyHub',
    description: 'A focused workspace to track applications, companies and certifications.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
