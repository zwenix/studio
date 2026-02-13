import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { UserNav } from "./user-nav"
import type { ReactNode } from "react"
import { ThemeToggle } from "./theme-toggle"

export function Header({children}: {children?: ReactNode}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 font-headline font-semibold text-lg md:flex">
            <Link href="/" className="flex items-center gap-2">
                <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="EduAI Companion Logo" width={24} height={24} />
                <span>EduAI Companion</span>
            </Link>
        </div>
        {children}
      </div>
      <div className="flex flex-1 items-center justify-end space-x-2">
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  )
}
