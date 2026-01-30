'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Home, Users, ScanText, Sparkles, ClipboardCheck, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/content-generator', label: 'Content Generator', icon: Bot },
  { href: '/my-classes', label: 'My Classes', icon: Users },
  { href: '/ocr', label: 'OCR Tool', icon: ScanText },
  { href: '/ai-tutor', label: 'AI Tutor', icon: Sparkles },
  { href: '/autograding', label: 'Autograding', icon: ClipboardCheck },
  { href: '/communication', label: 'Communication', icon: Mail },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href}>
            <SidebarMenuButton
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
