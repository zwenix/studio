import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
       <div className="relative hidden bg-gray-100 lg:flex flex-col p-8 text-white">
         <div className="absolute inset-0">
            <Image
                src="https://picsum.photos/seed/auth-page/1200/1000"
                alt="Students learning in a classroom"
                data-ai-hint="students classroom"
                fill
                className="object-cover"
            />
            <div className="absolute inset-0 bg-primary/70 mix-blend-multiply" />
         </div>

        <div className="relative z-10 w-full">
            <Link href="/" className="flex items-center gap-2 font-headline font-bold text-2xl">
                <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="EduAI Companion Logo" width={32} height={32} />
                <span>EduAI Companion</span>
            </Link>
             <div className="mt-16">
                <h2 className="text-4xl font-bold font-headline">Unlock Your Teaching Potential</h2>
                <p className="mt-4 text-lg max-w-md">Join a community of educators revolutionizing the classroom with the power of AI.</p>
             </div>
        </div>
        <div className="relative z-10 mt-auto w-full">
            <blockquote className="space-y-2">
                <p className="text-base">"This platform has saved me countless hours of prep time. It's a game-changer for any teacher."</p>
                <footer className="text-sm font-semibold">— J. Doe, High School Teacher</footer>
            </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        {children}
      </div>
    </div>
  );
}
