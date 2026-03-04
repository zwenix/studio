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
            <div className="flex items-center gap-2 p-2 font-patrick-hand font-semibold text-lg">
                    <Link href="/dashboard" className="flex items-center gap-2 group">
                        <div className="bg-transparent p-1 rounded-lg">
                            <Image src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" alt="EduAI Companion Logo" width={24} height={36} className="group-hover:rotate-12 transition-transform" />
                        </div>
                        <span className="font-patrick-hand">EduAI <span className="text-primary">Companion</span></span>
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
