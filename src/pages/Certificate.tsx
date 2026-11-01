import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Download, Eye, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Certificate: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Certificates
          </h1>
          <p className="text-muted-foreground mt-1">
            View and download your earned certificates
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search certificates..." className="pl-10" />
          </div>
        </div>

        {/* Certificates Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Empty State */}
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg mb-2">No Certificates Yet</CardTitle>
              <CardDescription className="text-center max-w-md">
                Complete courses to earn certificates. Your achievements will appear here once you've successfully finished a course.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              About Certificates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Certificates are automatically generated when you complete a course. Each certificate includes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Your name and the course title</li>
              <li>Date of completion</li>
              <li>Unique certificate ID for verification</li>
              <li>Instructor signature</li>
            </ul>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview Template
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download Sample
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Certificate;
