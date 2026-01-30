'use client';
import type { ReactNode } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Header } from '@/components/header';
import { MainNav } from '@/components/main-nav';
import Link from 'next/link';
import Image from 'next/image';
import AuthGuard from './auth-guard';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
        <SidebarProvider>
        <Sidebar>
            <SidebarHeader>
            <div className="flex items-center gap-2 p-2 font-headline font-semibold text-lg">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="EduAI Companion Logo" width={24} height={24} />
                        <span>EduAI Companion</span>
                    </Link>
                </div>
            </SidebarHeader>
            <SidebarContent>
            <MainNav />
            </SidebarContent>
        </Sidebar>
        <SidebarInset className="flex flex-col">
            <Header>
                <SidebarTrigger className="md:hidden" />
            </Header>
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </SidebarInset>
        </SidebarProvider>
    </AuthGuard>
  );
}
