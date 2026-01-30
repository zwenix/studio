import { Bot } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4">
        <div className="absolute top-8 left-8">
            <Link href="/" className="flex items-center gap-2 font-headline font-bold text-xl">
                <Bot className="h-7 w-7 text-primary" />
                <span>EduAI Companion</span>
            </Link>
        </div>
      {children}
    </div>
  );
}
