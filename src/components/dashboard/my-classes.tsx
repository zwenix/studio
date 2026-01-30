import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { mockClasses } from "@/lib/mock-data"
import { Users } from "lucide-react"

export function MyClasses() {
  return (
    <div className="space-y-6">
      {mockClasses.map((item) => (
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
            <div className="ml-auto font-medium">{item.studentCount} Students</div>
        </div>
      ))}
    </div>
  )
}
