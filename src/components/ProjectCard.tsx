'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  name: string;
  repoUrl: string;
  platform: 'vercel' | 'netlify' | 'cloudflare-pages' | 'railway';
  status: 'active' | 'pending' | 'failed';
  lastDeployed?: string;
  deploymentCount: number;
  className?: string;
}

const platformConfig = {
  vercel: { label: 'Vercel', color: 'bg-black text-white' },
  netlify: { label: 'Netlify', color: 'bg-green-600 text-white' },
  'cloudflare-pages': { label: 'Cloudflare Pages', color: 'bg-orange-500 text-white' },
  railway: { label: 'Railway', color: 'bg-purple-600 text-white' },
} as const;

const statusConfig = {
  active: { label: 'Active', variant: 'default' as const },
  pending: { label: 'Pending', variant: 'secondary' as const },
  failed: { label: 'Failed', variant: 'destructive' as const },
} as const;

export function ProjectCard({
  name,
  repoUrl,
  platform,
  status,
  lastDeployed,
  deploymentCount,
  className,
}: ProjectCardProps) {
  const platformInfo = platformConfig[platform];
  const statusInfo = statusConfig[status];

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            <CardDescription className="text-sm mt-1">
              {repoUrl.replace('https://github.com/', '')}
            </CardDescription>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', {
              'bg-green-500': status === 'active',
              'bg-yellow-500': status === 'pending',
              'bg-red-500': status === 'failed',
            })} />
            <span className="text-muted-foreground">
              {deploymentCount} deployment{deploymentCount !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className={cn(
            'px-2 py-1 rounded text-xs font-medium',
            platformInfo.color
          )}>
            {platformInfo.label}
          </div>
        </div>
        
        {lastDeployed && (
          <div className="mt-3 text-xs text-muted-foreground">
            Last deployed: {lastDeployed}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0">
        <div className="flex w-full gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Logs
          </Button>
          <Button size="sm" className="flex-1">
            Redeploy
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}