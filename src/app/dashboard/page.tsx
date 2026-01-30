import { Activity, ArrowUpRight, BookOpen, FileUp, PenSquare } from 'lucide-react';
import Image from 'next/image';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PerformanceChart } from '@/components/dashboard/performance-chart';
import { MyClasses } from '@/components/dashboard/my-classes';
import { RecentActivity } from '@/components/dashboard/recent-activity';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Welcome back, Teacher!
          </h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Students
              </CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Assignments Graded
              </CardTitle>
              <PenSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">842</div>
              <p className="text-xs text-muted-foreground">
                +35% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                AI Content Generated
              </CardTitle>
              <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="AI Icon" width={16} height={16} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+72</div>
              <p className="text-xs text-muted-foreground">
                in the last 7 days
              </p>
            </CardContent>
          </Card>
           <Card className="bg-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                 <Button variant="secondary" size="sm" className="justify-start">
                    <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="AI Icon" width={16} height={16} className="mr-2" /> Generate Content
                 </Button>
                 <Button variant="secondary" size="sm" className="justify-start">
                    <PenSquare className="mr-2 h-4 w-4" /> New Assignment
                 </Button>
                 <Button variant="secondary" size="sm" className="justify-start">
                    <FileUp className="mr-2 h-4 w-4" /> Upload Document
                 </Button>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Overall Student Performance</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <PerformanceChart />
            </CardContent>
          </Card>
          <Card className="col-span-4 lg:col-span-3">
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>
                An overview of your active classes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MyClasses />
            </CardContent>
          </Card>
        </div>
        <RecentActivity />
      </div>
    </AppLayout>
  );
}
