'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProjectCard } from '@/components/ProjectCard';

export default function Dashboard() {
  const [deployParams, setDeployParams] = useState({
    repoUrl: '',
    projectName: '',
    platform: 'vercel' as const,
    branch: 'main',
    buildCommand: 'npm run build',
  });
  const [isDeploying, setIsDeploying] = useState(false);

  // Mock data for demonstration
  const mockProjects = [
    {
      name: 'Next.js Website',
      repoUrl: 'https://github.com/user/nextjs-website',
      platform: 'vercel' as const,
      status: 'active' as const,
      lastDeployed: '2 hours ago',
      deploymentCount: 12,
    },
    {
      name: 'React Dashboard',
      repoUrl: 'https://github.com/user/react-dashboard',
      platform: 'netlify' as const,
      status: 'pending' as const,
      lastDeployed: 'Just now',
      deploymentCount: 5,
    },
    {
      name: 'API Service',
      repoUrl: 'https://github.com/user/api-service',
      platform: 'railway' as const,
      status: 'active' as const,
      lastDeployed: '1 day ago',
      deploymentCount: 8,
    },
  ];

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    alert(`Deployment started for: ${deployParams.projectName || deployParams.repoUrl}`);
    setIsDeploying(false);
    setDeployParams({
      repoUrl: '',
      projectName: '',
      platform: 'vercel',
      branch: 'main',
      buildCommand: 'npm run build',
    });
  };

  return (
    <div className="space-y-8">
      {/* Quick Deploy Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-blue-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-900 dark:text-white">
            Quick Deploy
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Deploy a new project in seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDeploy} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Repository URL *
                </label>
                <input
                  type="url"
                  required
                  value={deployParams.repoUrl}
                  onChange={(e) => setDeployParams({ ...deployParams, repoUrl: e.target.value })}
                  placeholder="https://github.com/username/repo"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={deployParams.projectName}
                  onChange={(e) => setDeployParams({ ...deployParams, projectName: e.target.value })}
                  placeholder="my-awesome-project"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Platform
                </label>
                <select
                  value={deployParams.platform}
                  onChange={(e) => setDeployParams({ ...deployParams, platform: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="vercel">Vercel</option>
                  <option value="netlify">Netlify</option>
                  <option value="cloudflare-pages">Cloudflare Pages</option>
                  <option value="railway">Railway</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Branch
                </label>
                <input
                  type="text"
                  value={deployParams.branch}
                  onChange={(e) => setDeployParams({ ...deployParams, branch: e.target.value })}
                  placeholder="main"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Build Command
                </label>
                <input
                  type="text"
                  value={deployParams.buildCommand}
                  onChange={(e) => setDeployParams({ ...deployParams, buildCommand: e.target.value })}
                  placeholder="npm run build"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={isDeploying}
                className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                {isDeploying ? 'Deploying...' : 'Deploy Now'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Recent Projects */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Recent Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProjects.map((project, index) => (
            <ProjectCard
              key={index}
              name={project.name}
              repoUrl={project.repoUrl}
              platform={project.platform}
              status={project.status}
              lastDeployed={project.lastDeployed}
              deploymentCount={project.deploymentCount}
            />
          ))}
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">42</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">+12 this month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">98%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">2 failed deployments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">8</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">3 on Vercel, 5 on Netlify</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}