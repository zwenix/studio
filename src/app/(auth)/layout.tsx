import Image from "next/image";
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
                <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="EduAI Companion Logo" width={28} height={28} />
                <span>EduAI Companion</span>
            </Link>
        </div>
      {children}
    </div>
  );
}
