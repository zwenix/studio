'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Home,
  Users,
  ScanText,
  Sparkles,
  ClipboardCheck,
  Mail,
  FlaskConical,
  Cog,
  History,
  BarChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { User as UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['teacher', 'student', 'parent', 'admin'] },
  { href: '/content-generator', label: 'Content Generator', icon: Bot, roles: ['teacher', 'admin'] },
  { href: '/content-history', label: 'Content History', icon: History, roles: ['teacher', 'admin'] },
  { href: '/my-classes', label: 'My Classes', icon: Users, roles: ['teacher', 'student', 'admin'] },
  { href: '/progress-reports', label: 'Progress Reports', icon: BarChart, roles: ['teacher', 'student', 'parent', 'admin'] },
  { href: '/ocr', label: 'OCR Tool', icon: ScanText, roles: ['teacher', 'student', 'admin'] },
  { href: '/ai-tutor', label: 'AI Tutor', icon: Sparkles, roles: ['teacher', 'student', 'parent', 'admin'] },
  { href: '/autograding', label: 'Autograding', icon: ClipboardCheck, roles: ['teacher', 'admin'] },
  { href: '/mock-assessment', label: 'Practice Test', icon: FlaskConical, roles: ['student'] },
  { href: '/communication', label: 'Communication', icon: Mail, roles: ['teacher', 'parent', 'admin'] },
  { href: '/settings', label: 'Settings', icon: Cog, roles: ['teacher', 'admin'] },
];

export function MainNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const navItems = userProfile ? allNavItems.filter(item => item.roles.includes(userProfile.role)) : [];

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
