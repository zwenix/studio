import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { mockActivities } from '@/lib/mock-data';
import { Activity } from 'lucide-react';

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5"/>
            Recent Activity
        </CardTitle>
        <CardDescription>
          A log of recent actions from you and the AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockActivities.map((activity, index) => (
            <div key={index} className="flex items-start gap-4">
                <Avatar className="h-9 w-9 border">
                    <AvatarImage src={activity.user.avatarUrl} alt="Avatar" />
                    <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{activity.user.name}</span>
                        {' '}
                        {activity.action}
                        {' '}
                        <span className="font-medium text-foreground">{activity.target}</span>.
                    </p>
                    <time className="text-xs text-muted-foreground">{activity.timestamp}</time>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}
