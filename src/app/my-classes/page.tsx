import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mockClasses, mockStudents } from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, PlusCircle, ArrowUpRight } from 'lucide-react';

export default function MyClassesPage() {
  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
            <Users className="mr-3 h-8 w-8" />
            My Classes
          </h1>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Class
          </Button>
        </div>

        <div className="grid gap-6">
          {mockClasses.map((cls) => (
            <Card key={cls.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{cls.name}</CardTitle>
                  <CardDescription>
                    <Badge variant="secondary" className="mr-2">Grade {cls.grade}</Badge>
                    {cls.studentCount} students
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  View Class <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Students Overview</h4>
                <div className="flex flex-wrap gap-4">
                  {mockStudents.map(student => (
                    <div key={student.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 w-full sm:w-auto">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.avatarUrl} alt={student.name} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">Overall: {student.overallGrade}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
