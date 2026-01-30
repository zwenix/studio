import { cn } from "@/lib/utils"
import Link from "next/link"
import { Bot } from "lucide-react"
import { UserNav } from "./user-nav"
import type { ReactNode } from "react"

export function Header({children}: {children?: ReactNode}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 font-headline font-semibold text-lg md:flex">
            <Link href="/" className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                <span>EduAI Companion</span>
            </Link>
        </div>
        {children}
      </div>
      <div className="flex flex-1 items-center justify-end space-x-4">
        <UserNav />
      </div>
    </header>
  )
}
