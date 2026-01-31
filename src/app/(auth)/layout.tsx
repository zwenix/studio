import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
       <div className="relative hidden lg:flex flex-col items-center justify-center p-8 text-white bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <div className="absolute top-8 left-8 z-10">
            <Link href="/" className="flex items-center gap-2 font-headline font-bold text-2xl">
                <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="EduAI Companion Logo" width={32} height={32} />
                <span>EduAI Companion</span>
            </Link>
        </div>

        <div className="relative z-10 w-full max-w-md text-center">
             <div className="space-y-4">
                <h2 className="text-4xl font-bold font-headline">Unlock Your Teaching Potential</h2>
                <p className="text-lg text-blue-200">Join a community of educators revolutionizing the classroom with the power of AI.</p>
             </div>
        </div>

        <div className="absolute bottom-8 z-10 w-full max-w-md">
            <blockquote className="space-y-2 text-center">
                <p className="text-base font-medium">"This platform has saved me countless hours of prep time. It's a game-changer for any teacher."</p>
                <footer className="text-sm font-semibold text-blue-300">— J. Doe, High School Teacher</footer>
            </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        {children}
      </div>
    </div>
  );
}
