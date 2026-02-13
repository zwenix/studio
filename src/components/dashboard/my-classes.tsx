'use client';
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Users, Loader2 } from "lucide-react"
import type { Class } from "@/lib/types";

interface MyClassesProps {
    classes: Class[] | null;
}

export function MyClasses({ classes }: MyClassesProps) {
  if (!classes) {
      return (
          <div className="flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
      );
  }

  if (classes.length === 0) {
      return <p className="text-sm text-muted-foreground">No classes found.</p>
  }
  
  return (
    <div className="space-y-6">
      {classes.slice(0, 4).map((item) => (
        <div key={item.id} className="flex items-center">
            <Avatar className="h-9 w-9">
                <AvatarFallback>
                    <Users className="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{item.name}</p>
                <p className="text-sm text-muted-foreground">Grade {item.grade}</p>
            </div>
            <div className="ml-auto font-medium">{item.learnerIds?.length || 0} Students</div>
        </div>
      ))}
    </div>
  )
}
