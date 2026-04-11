'use client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-user';
import { useFirestore, useDoc, useMemoFirebase } from "@/lib/supabase";
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User as UserProfile } from '@/lib/types';
export function UserNav() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.id) : null, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const handleSignOut = async () => {
    await getSupabaseClient().auth.signOut();
    router.push('/login');
    router.refresh();
  };
  const initials = userProfile ? `${userProfile.firstName?.[0]??''}${userProfile.lastName?.[0]??''}`.toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? 'U');
  const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : (user?.displayName ?? user?.email ?? 'User');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile?.avatarUrl ?? user?.photoURL ?? ''} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email ?? ''}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild><Link href="/dashboard">Dashboard</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
