'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AnimatedStatus } from '@/components/ui/animated-status'
import { ResourceStatusBadge } from '@/components/ui/resource-status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LoadingSkeleton, ResourceLoadingSkeleton } from '@/components/ui/loading-boundary'
import { NotFound } from '@/components/ui/not-found'
import { ResourceHeader } from '@/components/ui/resource-header'
import { LiveCounter } from '@/components/ui/live-counter'
import { ConnectionStatus } from '@/components/ui/connection-status'
import { Bot } from 'lucide-react'
import { useTheme } from 'next-themes'

export default function StyleGuidePage() {
  const { theme, setTheme } = useTheme()
  const [counterValue, setCounterValue] = useState(3)
  const [counterPrev, setCounterPrev] = useState<number | undefined>(undefined)

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-[13px] tracking-widest uppercase font-light text-foreground">
          Marfa Design System
        </h1>
        <p className="text-sm font-light text-muted-foreground">
          A minimalist design system inspired by Donald Judd and the West Texas landscape of Marfa.
        </p>
        
        {/* Theme Toggle */}
        <div className="flex gap-2">
          <Button 
            variant={theme === 'light' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTheme('light')}
          >
            West Texas Day
          </Button>
          <Button 
            variant={theme === 'dark' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTheme('dark')}
          >
            West Texas Night
          </Button>
        </div>
      </div>

      {/* Colors */}
      <Card className="gap-6 py-6">
        <CardHeader className="px-generous [.border-b]:pb-generous">
          <CardTitle>Color Palette</CardTitle>
          <CardDescription>Stone/amber for light mode, sage/fire for dark mode</CardDescription>
        </CardHeader>
        <CardContent className="px-generous space-y-6">
          <div>
            <h3 className="text-[11px] tracking-wider uppercase font-light mb-4">Light Mode: Stone & Amber</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-16 bg-stone-50 border border-stone-200"></div>
                <p className="text-[10px] tracking-widest uppercase">Stone-50</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-stone-600 border border-stone-200"></div>
                <p className="text-[10px] tracking-widest uppercase">Stone-600</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-stone-900 border border-stone-200"></div>
                <p className="text-[10px] tracking-widest uppercase">Stone-900</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-amber-900 border border-stone-200"></div>
                <p className="text-[10px] tracking-widest uppercase">Amber-900</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-[11px] tracking-wider uppercase font-light mb-4">Dark Mode: Sage & Fire</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-16 bg-stone-300 border border-stone-600"></div>
                <p className="text-[10px] tracking-widest uppercase">Stone-300 (Moonlight)</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-stone-400 border border-stone-600"></div>
                <p className="text-[10px] tracking-widest uppercase">Stone-400 (Sage)</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-amber-600 border border-stone-600"></div>
                <p className="text-[10px] tracking-widest uppercase">Amber-600 (Fire)</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-amber-400 border border-stone-600"></div>
                <p className="text-[10px] tracking-widest uppercase">Amber-400 (Starlight)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card className="gap-6 py-6">
        <CardHeader className="px-generous [.border-b]:pb-generous">
          <CardTitle>Typography</CardTitle>
          <CardDescription>System fonts with extended tracking and light weight</CardDescription>
        </CardHeader>
        <CardContent className="px-generous space-y-6">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] tracking-wider uppercase font-light mb-2">Header Style</p>
              <h1 className="text-[13px] tracking-widest uppercase font-light text-foreground">
                Language Operator
                <span className="inline-block w-2 h-3.5 bg-foreground dark:bg-accent animate-pulse ml-1" />
              </h1>
            </div>
            
            <div>
              <p className="text-[11px] tracking-wider uppercase font-light mb-2">Label Style</p>
              <Label>Resource Name</Label>
            </div>
            
            <div>
              <p className="text-[11px] tracking-wider uppercase font-light mb-2">Button Text</p>
              <p className="text-[11px] tracking-wider uppercase font-light">Create Agent</p>
            </div>
            
            <div>
              <p className="text-[11px] tracking-wider uppercase font-light mb-2">Body Text</p>
              <p className="text-sm font-light text-muted-foreground">
                This is regular body text with light font weight for enhanced readability.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Stone gradients with firelight hover states</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Button className="w-full">Default</Button>
              <p className="text-[10px] tracking-widest uppercase text-center">Primary</p>
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full">Outline</Button>
              <p className="text-[10px] tracking-widest uppercase text-center">Secondary</p>
            </div>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full">Ghost</Button>
              <p className="text-[10px] tracking-widest uppercase text-center">Minimal</p>
            </div>
            <div className="space-y-2">
              <Button variant="destructive" className="w-full">Delete</Button>
              <p className="text-[10px] tracking-widest uppercase text-center">Destructive</p>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Button size="sm" className="w-full">Small</Button>
              <p className="text-[10px] tracking-widest uppercase text-center">h-10</p>
            </div>
            <div className="space-y-2">
              <Button size="default" className="w-full">Default</Button>
              <p className="text-[10px] tracking-widest uppercase text-center">h-12</p>
            </div>
            <div className="space-y-2">
              <Button size="lg" className="w-full">Large</Button>
              <p className="text-[10px] tracking-widest uppercase text-center">h-14</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Elements */}
      <Card>
        <CardHeader>
          <CardTitle>Form Elements</CardTitle>
          <CardDescription>Stone backgrounds with amber focus rings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="Enter your email" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" placeholder="Enter your message" />
          </div>
          
          <div className="space-y-2">
            <Label>Status Badges</Label>
            <div className="flex gap-2">
              <Badge variant="default">Ready</Badge>
              <Badge variant="secondary">Pending</Badge>
              <Badge variant="destructive">Failed</Badge>
              <Badge variant="outline">Unknown</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Card Components</CardTitle>
          <CardDescription>Clean rectangular containers with warm/night shadows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="gap-6 py-6">
              <CardHeader className="px-generous [.border-b]:pb-generous">
                <CardTitle>Basic Card</CardTitle>
                <CardDescription>Simple card with header and content</CardDescription>
              </CardHeader>
              <CardContent className="px-generous">
                <p className="text-sm font-light">
                  Card content with generous padding and clean typography.
                </p>
              </CardContent>
            </Card>
            
            <Card className="gap-6 py-6">
              <CardHeader className="px-generous [.border-b]:pb-generous">
                <CardTitle>Status Card</CardTitle>
                <CardDescription>Card with status information</CardDescription>
              </CardHeader>
              <CardContent className="px-generous space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-light">Status</span>
                  <Badge>Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-light">Count</span>
                  <span className="text-sm font-light">42</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Tables */}
      <Card>
        <CardHeader>
          <CardTitle>Table Component</CardTitle>
          <CardDescription>Data tables with stone borders and typography</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-light">my-cluster</TableCell>
                <TableCell><Badge variant="default">Ready</Badge></TableCell>
                <TableCell className="font-light">2 hours ago</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Edit</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-light">test-cluster</TableCell>
                <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                <TableCell className="font-light">1 day ago</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Edit</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Tab Navigation</CardTitle>
          <CardDescription>Subnav pattern with amber underlines and icon support - the standard for resource detail pages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Basic Tabs */}
          <div className="space-y-4">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Basic Text Tabs</h3>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="yaml">YAML</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <div className="space-y-4">
                  <h4 className="text-[11px] tracking-wider uppercase font-light">Overview Content</h4>
                  <p className="text-sm font-light">
                    This is the overview tab content with Marfa design system styling.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="metrics">
                <div className="space-y-4">
                  <h4 className="text-[11px] tracking-wider uppercase font-light">Metrics Content</h4>
                  <p className="text-sm font-light">
                    Metrics and analytics content would be displayed here.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="logs">
                <div className="space-y-4">
                  <h4 className="text-[11px] tracking-wider uppercase font-light">Logs Content</h4>
                  <p className="text-sm font-light">
                    Log output with terminal-style formatting.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="yaml">
                <div className="space-y-4">
                  <h4 className="text-[11px] tracking-wider uppercase font-light">YAML Content</h4>
                  <p className="text-sm font-light">
                    Raw YAML configuration display.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Subnav with Icons */}
          <div className="space-y-4">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Resource Detail Subnav (Recommended)</h3>
            <p className="text-xs font-light text-muted-foreground">
              Standard pattern for agent, model, tool, and persona detail pages. Features icons, clean typography, and amber active states.
            </p>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-5-3-5 3V5z" />
                  </svg>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="details">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Details
                </TabsTrigger>
                <TabsTrigger value="metrics">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Metrics
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <Card className="p-6">
                  <h4 className="text-[11px] tracking-wider uppercase font-light mb-4">Resource Overview</h4>
                  <p className="text-sm font-light">
                    Primary resource information including status, configuration, and key metrics. 
                    This is the default view for most resource detail pages.
                  </p>
                </Card>
              </TabsContent>
              <TabsContent value="details">
                <Card className="p-6">
                  <h4 className="text-[11px] tracking-wider uppercase font-light mb-4">Detailed Configuration</h4>
                  <p className="text-sm font-light">
                    Complete configuration details, advanced settings, and technical specifications.
                    Used for deep inspection of resource properties.
                  </p>
                </Card>
              </TabsContent>
              <TabsContent value="metrics">
                <Card className="p-6">
                  <h4 className="text-[11px] tracking-wider uppercase font-light mb-4">Performance Metrics</h4>
                  <p className="text-sm font-light">
                    Real-time and historical performance data, charts, and monitoring information.
                    Essential for operational insights and debugging.
                  </p>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Implementation Code Example */}
          <div className="space-y-4">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Implementation</h3>
            <div className="bg-muted border p-4">
              <pre className="text-xs font-mono text-foreground overflow-x-auto">
{`<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="overview">
      <Home className="w-4 h-4 mr-2" />
      Overview
    </TabsTrigger>
    <TabsTrigger value="details">
      <Info className="w-4 h-4 mr-2" />
      Details
    </TabsTrigger>
    <TabsTrigger value="metrics">
      <BarChart3 className="w-4 h-4 mr-2" />
      Metrics
    </TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    <ResourceOverview />
  </TabsContent>
  
  <TabsContent value="details">
    <ResourceDetails />
  </TabsContent>
  
  <TabsContent value="metrics">
    <ResourceMetrics />
  </TabsContent>
</Tabs>`}
              </pre>
            </div>
          </div>

          {/* Usage Guidelines */}
          <div className="space-y-4">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Usage Guidelines</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="text-xs font-light text-foreground">✓ Do</h4>
                <ul className="text-xs font-light text-muted-foreground space-y-1">
                  <li>• Use icons for resource detail pages</li>
                  <li>• Keep tab labels concise and clear</li>
                  <li>• Follow Overview → Details → Metrics pattern</li>
                  <li>• Use consistent icons across similar resources</li>
                  <li>• Maintain logical information hierarchy</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-light text-destructive">✗ Don't</h4>
                <ul className="text-xs font-light text-muted-foreground space-y-1">
                  <li>• Use more than 5 tabs in a single nav</li>
                  <li>• Mix icons and non-icon tabs in same set</li>
                  <li>• Create deeply nested tab structures</li>
                  <li>• Use tabs for primary navigation</li>
                  <li>• Override the Marfa tab styling</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Card>
        <CardHeader>
          <CardTitle>Dialog Component</CardTitle>
          <CardDescription>Modal dialogs with backdrop blur</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Example Dialog</DialogTitle>
                <DialogDescription>
                  This dialog demonstrates the Marfa design system styling with proper backdrop blur and stone colors.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Enter resource name" />
                </div>
                <div className="flex gap-2">
                  <Button>Save Changes</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Design Tokens */}
      <Card>
        <CardHeader>
          <CardTitle>Design Tokens</CardTitle>
          <CardDescription>
            CSS custom properties defined in globals.css, wired through Tailwind. Use these classes everywhere — never use raw color utilities like stone-*, amber-*, gray-*, green-*, etc. in app code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">

          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Semantic Color Tokens</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tailwind class</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Light</TableHead>
                  <TableHead>Dark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">bg-background / text-foreground</TableCell>
                  <TableCell className="text-xs font-light">Page canvas and primary text</TableCell>
                  <TableCell className="text-xs font-light">stone-100 / stone-900</TableCell>
                  <TableCell className="text-xs font-light">neutral-950 / stone-300</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">bg-card / text-card-foreground</TableCell>
                  <TableCell className="text-xs font-light">Card and panel surfaces</TableCell>
                  <TableCell className="text-xs font-light">white/95 / stone-900</TableCell>
                  <TableCell className="text-xs font-light">stone-900/95 / stone-300</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">bg-muted / text-muted-foreground</TableCell>
                  <TableCell className="text-xs font-light">Subdued surfaces and secondary labels</TableCell>
                  <TableCell className="text-xs font-light">stone-200 / stone-600</TableCell>
                  <TableCell className="text-xs font-light">stone-800 / stone-400</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">bg-primary / text-primary-foreground</TableCell>
                  <TableCell className="text-xs font-light">Primary action fill and label</TableCell>
                  <TableCell className="text-xs font-light">stone-900 / stone-50</TableCell>
                  <TableCell className="text-xs font-light">stone-300 / stone-900</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">bg-secondary / text-secondary-foreground</TableCell>
                  <TableCell className="text-xs font-light">Secondary action fill and label</TableCell>
                  <TableCell className="text-xs font-light">stone-50 / stone-900</TableCell>
                  <TableCell className="text-xs font-light">stone-900 / stone-300</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">bg-accent / text-accent-foreground</TableCell>
                  <TableCell className="text-xs font-light">Amber highlight — hover states, active indicators</TableCell>
                  <TableCell className="text-xs font-light">amber-400 / stone-900</TableCell>
                  <TableCell className="text-xs font-light">amber-400 / stone-900</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">bg-destructive / text-destructive-foreground</TableCell>
                  <TableCell className="text-xs font-light">Danger actions only (delete, revoke)</TableCell>
                  <TableCell className="text-xs font-light">red-500 / white</TableCell>
                  <TableCell className="text-xs font-light">red-900 / red-50</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">border</TableCell>
                  <TableCell className="text-xs font-light">All borders — div, card, input, separator</TableCell>
                  <TableCell className="text-xs font-light">stone-800/90</TableCell>
                  <TableCell className="text-xs font-light">stone-700/90</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">ring</TableCell>
                  <TableCell className="text-xs font-light">Focus rings on interactive elements</TableCell>
                  <TableCell className="text-xs font-light">amber-900</TableCell>
                  <TableCell className="text-xs font-light">amber-600</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">bg-popover / text-popover-foreground</TableCell>
                  <TableCell className="text-xs font-light">Dropdowns, tooltips, floating panels</TableCell>
                  <TableCell className="text-xs font-light">white / stone-900</TableCell>
                  <TableCell className="text-xs font-light">stone-900 / stone-300</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Custom Extension Tokens</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tailwind class</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Use for</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">shadow-warm / shadow-warm-sm</TableCell>
                  <TableCell className="text-xs font-light">0 8px 32px rgba(120,53,15,0.08)</TableCell>
                  <TableCell className="text-xs font-light">Cards and buttons in light mode</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">shadow-night / shadow-night-sm</TableCell>
                  <TableCell className="text-xs font-light">0 8px 32px rgba(0,0,0,0.4)</TableCell>
                  <TableCell className="text-xs font-light">Cards and buttons in dark mode</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">p-generous / gap-generous</TableCell>
                  <TableCell className="text-xs font-light">48px (3rem)</TableCell>
                  <TableCell className="text-xs font-light">Primary container padding — Card sections</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">p-comfortable / gap-comfortable</TableCell>
                  <TableCell className="text-xs font-light">24px (1.5rem)</TableCell>
                  <TableCell className="text-xs font-light">Form field spacing, section gaps</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">tracking-widest</TableCell>
                  <TableCell className="text-xs font-light">0.2em</TableCell>
                  <TableCell className="text-xs font-light">Headers, labels — all uppercase chrome</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">tracking-wider</TableCell>
                  <TableCell className="text-xs font-light">0.15em</TableCell>
                  <TableCell className="text-xs font-light">Button text</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Enforcement Rule</h3>
            <div className="bg-muted p-4 border text-xs font-mono space-y-1">
              <p className="text-foreground">// CORRECT — semantic token, theme-aware</p>
              <p className="text-foreground">{'<p className="text-muted-foreground">Secondary text</p>'}</p>
              <p className="text-foreground mt-3">// WRONG — hardcoded palette class, not theme-aware</p>
              <p className="text-destructive">{'<p className="text-stone-600">Secondary text</p>'}</p>
              <p className="text-destructive">{'<p className="text-gray-500">Secondary text</p>'}</p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Component Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Component Inventory</CardTitle>
          <CardDescription>
            Every component in src/components/ui/. Check here before writing any inline CSS. If a component exists for your use case, use it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">

          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Critical — Most Commonly Bypassed</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Use for</TableHead>
                  <TableHead>Never do this instead</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">AlertDialog</TableCell>
                  <TableCell className="text-xs font-light">All destructive confirm flows (delete, revoke)</TableCell>
                  <TableCell className="text-xs font-destructive font-light text-destructive">confirm() / alert()</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">AnimatedStatus</TableCell>
                  <TableCell className="text-xs font-light">Resource phase badges (Ready, Pending, Failed, Unknown)</TableCell>
                  <TableCell className="text-xs font-light text-destructive">getStatusColor() inline functions with bg-green-* etc.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">ResourceStatusBadge</TableCell>
                  <TableCell className="text-xs font-light">Compact phase display in tables and headers</TableCell>
                  <TableCell className="text-xs font-light text-destructive">{'<Badge className={getStatusColor(...)}>'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Skeleton</TableCell>
                  <TableCell className="text-xs font-light">Loading placeholders for content that hasn't loaded yet</TableCell>
                  <TableCell className="text-xs font-light text-destructive">{'<div className="animate-pulse rounded-full bg-gray-200">'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">LoadingBoundary</TableCell>
                  <TableCell className="text-xs font-light">Wrapping async route segments; shows Skeleton automatically</TableCell>
                  <TableCell className="text-xs font-light text-destructive">{'<div className="animate-spin rounded-full border-b-2 border-gray-900">'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">NotFound</TableCell>
                  <TableCell className="text-xs font-light">Empty states and 404 conditions for any resource</TableCell>
                  <TableCell className="text-xs font-light text-destructive">Inline h3 + p with custom copy and gray icons</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">ResourceHeader</TableCell>
                  <TableCell className="text-xs font-light">Title bar on all resource detail pages (agent, model, tool, persona)</TableCell>
                  <TableCell className="text-xs font-light text-destructive">{'<h1 className="text-3xl font-bold">'} inline</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Actions & Overlays</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Variants / sizes</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">Button</TableCell>
                  <TableCell className="text-xs font-light">default · outline · ghost · destructive · link — sm · default · lg · icon · icon-sm</TableCell>
                  <TableCell className="text-xs font-light">Use size="icon" or size="icon-sm" for icon-only buttons — do not override h/w</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Dialog</TableCell>
                  <TableCell className="text-xs font-light">—</TableCell>
                  <TableCell className="text-xs font-light">Non-destructive modals (forms, detail views)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">AlertDialog</TableCell>
                  <TableCell className="text-xs font-light">—</TableCell>
                  <TableCell className="text-xs font-light">Destructive confirm only — see Critical table above</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">DropdownMenu</TableCell>
                  <TableCell className="text-xs font-light">—</TableCell>
                  <TableCell className="text-xs font-light">Context menus, kebab menus on table rows</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Status & Feedback</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">Alert</TableCell>
                  <TableCell className="text-xs font-light">Inline banners — default and destructive variants</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Badge</TableCell>
                  <TableCell className="text-xs font-light">default · secondary · destructive · outline — never add raw className color overrides; use variant prop only</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">AnimatedStatus</TableCell>
                  <TableCell className="text-xs font-light">Animated phase badge with pulse dot — preferred for resource list pages</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">ResourceStatusBadge</TableCell>
                  <TableCell className="text-xs font-light">Compact phase badge without animation — use in headers, tight spaces</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">ConnectionStatus</TableCell>
                  <TableCell className="text-xs font-light">Live/disconnected indicator dot for SSE watch connections</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">ResourceNotifications</TableCell>
                  <TableCell className="text-xs font-light">Toast-style K8s event alerts — used in sidebar header</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">NavigationProgress</TableCell>
                  <TableCell className="text-xs font-light">Top-of-page route transition bar — already mounted globally</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Sonner (toast)</TableCell>
                  <TableCell className="text-xs font-light">{'import { toast } from "sonner" — use for error feedback instead of alert()'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Forms</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">Form + FormField + FormItem + FormLabel + FormMessage</TableCell>
                  <TableCell className="text-xs font-light">react-hook-form integration — use for all validated forms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Input</TableCell>
                  <TableCell className="text-xs font-light">Single-line text fields</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Textarea</TableCell>
                  <TableCell className="text-xs font-light">Multi-line text fields</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Select</TableCell>
                  <TableCell className="text-xs font-light">Dropdown selection — Radix-based, keyboard accessible</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Checkbox / Switch</TableCell>
                  <TableCell className="text-xs font-light">Boolean toggles</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Label</TableCell>
                  <TableCell className="text-xs font-light">Form field labels — always pair with htmlFor</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">DateRangePicker / AdvancedDateRangePicker</TableCell>
                  <TableCell className="text-xs font-light">Date filtering — AdvancedDateRangePicker has preset ranges</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Data Display</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">Table + TableHeader + TableBody + TableRow + TableHead + TableCell</TableCell>
                  <TableCell className="text-xs font-light">All data tables — never hand-roll table HTML</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Card + CardHeader + CardTitle + CardDescription + CardContent</TableCell>
                  <TableCell className="text-xs font-light">Primary surface container — use px-generous on CardContent for correct padding</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Tabs + TabsList + TabsTrigger + TabsContent</TableCell>
                  <TableCell className="text-xs font-light">Resource detail page subnav — see Tabs section above for pattern</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">LiveCounter</TableCell>
                  <TableCell className="text-xs font-light">Animated stat counter card — use for dashboard overview metrics</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Sparkline</TableCell>
                  <TableCell className="text-xs font-light">Mini inline chart — use inside metric cards</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Progress</TableCell>
                  <TableCell className="text-xs font-light">Horizontal progress bar</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Avatar</TableCell>
                  <TableCell className="text-xs font-light">User avatars with initials fallback</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">MarkdownContent</TableCell>
                  <TableCell className="text-xs font-light">Renders markdown strings — use for persona system prompts, descriptions</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">EventsActivity</TableCell>
                  <TableCell className="text-xs font-light">K8s event feed with live updates — used in sidebar</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Layout & Utility</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">Separator</TableCell>
                  <TableCell className="text-xs font-light">Horizontal or vertical divider — uses border token</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">ScrollArea</TableCell>
                  <TableCell className="text-xs font-light">Scrollable container with custom scrollbar — use for tall sidebars/panels</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">PodSelector</TableCell>
                  <TableCell className="text-xs font-light">Pod/container picker for log and exec views</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">PodLogViewer</TableCell>
                  <TableCell className="text-xs font-light">Log streaming panel with ANSI color support</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">Icons</TableCell>
                  <TableCell className="text-xs font-light">Custom SVG icon set — check here before importing from lucide-react</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

        </CardContent>
      </Card>

      {/* AnimatedStatus */}
      <Card>
        <CardHeader>
          <CardTitle>AnimatedStatus</CardTitle>
          <CardDescription>Animated phase badge — use for resource status in list pages. Never roll a custom getStatusColor() function.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Phase States</h3>
            <div className="flex flex-wrap gap-3">
              <AnimatedStatus status="Ready" />
              <AnimatedStatus status="Pending" />
              <AnimatedStatus status="Failed" />
              <AnimatedStatus status="Unknown" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Size Variants</h3>
            <div className="flex flex-wrap items-center gap-3">
              <AnimatedStatus status="Ready" size="sm" />
              <AnimatedStatus status="Ready" size="md" />
              <AnimatedStatus status="Ready" size="lg" />
            </div>
          </div>
          <div className="bg-muted p-4 border text-xs font-mono space-y-1">
            <p className="text-foreground">{'import { AnimatedStatus } from \'@/components/ui/animated-status\''}</p>
            <p className="text-foreground mt-2">{'<AnimatedStatus status="Ready" />'}</p>
            <p className="text-foreground">{'<AnimatedStatus status="Pending" size="sm" />'}</p>
            <p className="text-foreground">{'<AnimatedStatus status="Failed" size="lg" />'}</p>
          </div>
        </CardContent>
      </Card>

      {/* ResourceStatusBadge */}
      <Card>
        <CardHeader>
          <CardTitle>ResourceStatusBadge</CardTitle>
          <CardDescription>Wraps AnimatedStatus — prefer phase prop over status; falls back to Unknown. Use in headers and tight spaces.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">status vs phase prop</h3>
            <div className="flex flex-wrap gap-3">
              <ResourceStatusBadge status="Ready" />
              <ResourceStatusBadge phase="Pending" />
              <ResourceStatusBadge phase="Failed" size="sm" />
              <ResourceStatusBadge />
            </div>
          </div>
          <div className="bg-muted p-4 border text-xs font-mono space-y-1">
            <p className="text-foreground">{'import { ResourceStatusBadge } from \'@/components/ui/resource-status-badge\''}</p>
            <p className="text-foreground mt-2">{'// phase takes priority over status'}</p>
            <p className="text-foreground">{'<ResourceStatusBadge status="Ready" />'}</p>
            <p className="text-foreground">{'<ResourceStatusBadge phase="Pending" size="sm" />'}</p>
          </div>
        </CardContent>
      </Card>

      {/* AlertDialog */}
      <Card>
        <CardHeader>
          <CardTitle>AlertDialog</CardTitle>
          <CardDescription>Destructive confirmation dialogs. Always use this — never confirm() or alert() for delete/revoke flows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Agent</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete my-agent?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the agent and all associated resources. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="bg-muted p-4 border text-xs font-mono space-y-1">
            <p className="text-foreground">{'import { AlertDialog, AlertDialogTrigger, AlertDialogContent,'}</p>
            <p className="text-foreground">{'  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,'}</p>
            <p className="text-foreground">{'  AlertDialogFooter, AlertDialogCancel, AlertDialogAction'}</p>
            <p className="text-foreground">{"} from '@/components/ui/alert-dialog'"}</p>
            <p className="text-foreground mt-2">{'<AlertDialog>'}</p>
            <p className="text-foreground">{'  <AlertDialogTrigger asChild><Button variant="destructive">Delete</Button></AlertDialogTrigger>'}</p>
            <p className="text-foreground">{'  <AlertDialogContent>'}</p>
            <p className="text-foreground">{'    <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle>'}</p>
            <p className="text-foreground">{'      <AlertDialogDescription>Cannot be undone.</AlertDialogDescription>'}</p>
            <p className="text-foreground">{'    </AlertDialogHeader>'}</p>
            <p className="text-foreground">{'    <AlertDialogFooter>'}</p>
            <p className="text-foreground">{'      <AlertDialogCancel>Cancel</AlertDialogCancel>'}</p>
            <p className="text-foreground">{'      <AlertDialogAction>Delete</AlertDialogAction>'}</p>
            <p className="text-foreground">{'    </AlertDialogFooter>'}</p>
            <p className="text-foreground">{'  </AlertDialogContent>'}</p>
            <p className="text-foreground">{'</AlertDialog>'}</p>
          </div>
        </CardContent>
      </Card>

      {/* LoadingBoundary */}
      <Card>
        <CardHeader>
          <CardTitle>LoadingBoundary</CardTitle>
          <CardDescription>Error boundary + Suspense wrapper with built-in skeleton fallbacks. Use LoadingSkeleton and ResourceLoadingSkeleton directly for loading states.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">LoadingSkeleton — basic card</h3>
            <LoadingSkeleton />
          </div>
          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">ResourceLoadingSkeleton — 4-column grid</h3>
            <ResourceLoadingSkeleton />
          </div>
          <div className="bg-muted p-4 border text-xs font-mono space-y-1">
            <p className="text-foreground">{'import { LoadingSkeleton, ResourceLoadingSkeleton } from \'@/components/ui/loading-boundary\''}</p>
            <p className="text-foreground mt-2">{'// Wrap async segments:'}</p>
            <p className="text-foreground">{'<LoadingBoundary><AsyncComponent /></LoadingBoundary>'}</p>
            <p className="text-foreground mt-2">{'// Use skeletons directly as fallback:'}</p>
            <p className="text-foreground">{'<Suspense fallback={<ResourceLoadingSkeleton />}>'}</p>
            <p className="text-foreground">{'  <ResourceList />'}</p>
            <p className="text-foreground">{'</Suspense>'}</p>
          </div>
        </CardContent>
      </Card>

      {/* NotFound */}
      <Card>
        <CardHeader>
          <CardTitle>NotFound</CardTitle>
          <CardDescription>Empty state and 404 component. Always use this — never write inline h3+p with custom copy and gray icons.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Without onBack (plain empty state)</h3>
            <div className="border">
              <NotFound title="Agent Not Found" message="The agent you are looking for does not exist in this cluster." />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">With onBack prop (shows back button)</h3>
            <div className="border">
              <NotFound
                title="Agent Not Found"
                message="The agent you are looking for does not exist in this cluster."
                onBack={() => {}}
                backLabel="Back to Agents"
              />
            </div>
          </div>
          <div className="bg-muted p-4 border text-xs font-mono space-y-1">
            <p className="text-foreground">{"import { NotFound } from '@/components/ui/not-found'"}</p>
            <p className="text-foreground mt-2">{'<NotFound'}</p>
            <p className="text-foreground">{'  title="Agent Not Found"'}</p>
            <p className="text-foreground">{'  message="The resource does not exist."'}</p>
            <p className="text-foreground">{'  onBack={() => router.back()}'}</p>
            <p className="text-foreground">{'  backLabel="Back to Agents"'}</p>
            <p className="text-foreground">{'/>'}  </p>
          </div>
        </CardContent>
      </Card>

      {/* ResourceHeader */}
      <Card>
        <CardHeader>
          <CardTitle>ResourceHeader</CardTitle>
          <CardDescription>Title bar for all resource detail pages. Includes icon, title, subtitle, back navigation, and actions slot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border p-4">
            <ResourceHeader
              icon={Bot}
              title="my-agent"
              subtitle="LanguageAgent"
              backHref="#"
              backLabel="Agents"
              actions={
                <Button variant="destructive" size="sm">Delete</Button>
              }
            />
          </div>
          <div className="bg-muted p-4 border text-xs font-mono space-y-1">
            <p className="text-foreground">{"import { ResourceHeader } from '@/components/ui/resource-header'"}</p>
            <p className="text-foreground">{"import { Bot } from 'lucide-react'"}</p>
            <p className="text-foreground mt-2">{'<ResourceHeader'}</p>
            <p className="text-foreground">{'  icon={Bot}'}</p>
            <p className="text-foreground">{'  title="my-agent"'}</p>
            <p className="text-foreground">{'  subtitle="LanguageAgent"'}</p>
            <p className="text-foreground">{'  backHref={`/clusters/${name}/agents`}'}</p>
            <p className="text-foreground">{'  backLabel="Agents"'}</p>
            <p className="text-foreground">{'  actions={<Button variant="destructive">Delete</Button>}'}</p>
            <p className="text-foreground">{'/>'}  </p>
          </div>
        </CardContent>
      </Card>

      {/* LiveCounter */}
      <Card>
        <CardHeader>
          <CardTitle>LiveCounter</CardTitle>
          <CardDescription>Animated stat counter that transitions between values. Use for dashboard overview metrics — value changes trigger a smooth count animation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="space-y-1">
              <p className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Agents</p>
              <LiveCounter value={counterValue} previousValue={counterPrev} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCounterPrev(counterValue)
                setCounterValue(v => v + 1)
              }}
            >
              Increment
            </Button>
          </div>
          <div className="bg-muted p-4 border text-xs font-mono space-y-1">
            <p className="text-foreground">{"import { LiveCounter } from '@/components/ui/live-counter'"}</p>
            <p className="text-foreground mt-2">{'const [value, setValue] = useState(3)'}</p>
            <p className="text-foreground">{'const [prev, setPrev] = useState<number | undefined>(undefined)'}</p>
            <p className="text-foreground mt-2">{'<LiveCounter value={value} previousValue={prev} />'}</p>
            <p className="text-foreground mt-2">{'// On update:'}</p>
            <p className="text-foreground">{'setPrev(value); setValue(newCount)'}</p>
          </div>
        </CardContent>
      </Card>

      {/* ConnectionStatus */}
      <Card>
        <CardHeader>
          <CardTitle>ConnectionStatus</CardTitle>
          <CardDescription>Live/disconnected indicator dot for SSE watch connections. Renders a small colored dot — no text.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Connected</p>
              <div className="flex items-center gap-2">
                <ConnectionStatus isConnected={true} />
                <span className="text-sm font-light">Live</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Disconnected</p>
              <div className="flex items-center gap-2">
                <ConnectionStatus isConnected={false} />
                <span className="text-sm font-light">Reconnecting</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] tracking-wider uppercase font-light text-muted-foreground">Error</p>
              <div className="flex items-center gap-2">
                <ConnectionStatus isConnected={false} connectionError="Connection refused" />
                <span className="text-sm font-light">Error</span>
              </div>
            </div>
          </div>
          <div className="bg-muted p-4 border text-xs font-mono space-y-1">
            <p className="text-foreground">{"import { ConnectionStatus } from '@/components/ui/connection-status'"}</p>
            <p className="text-foreground mt-2">{'<ConnectionStatus isConnected={true} />'}</p>
            <p className="text-foreground">{'<ConnectionStatus isConnected={false} />'}</p>
            <p className="text-foreground">{'<ConnectionStatus isConnected={false} connectionError="Connection refused" />'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Spacing */}
      <Card>
        <CardHeader>
          <CardTitle>Spacing System</CardTitle>
          <CardDescription>Generous padding and comfortable gaps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[11px] tracking-wider uppercase font-light mb-2">Base Unit: 12px</p>
            <div className="h-3 bg-muted"></div>
          </div>
          
          <div>
            <p className="text-[11px] tracking-wider uppercase font-light mb-2">Comfortable: 24px</p>
            <div className="h-6 bg-muted"></div>
          </div>
          
          <div>
            <p className="text-[11px] tracking-wider uppercase font-light mb-2">Generous: 48px</p>
            <div className="h-12 bg-muted"></div>
          </div>
        </CardContent>
      </Card>

      {/* Design Principles */}
      <Card>
        <CardHeader>
          <CardTitle>Design Principles</CardTitle>
          <CardDescription>West Texas minimalism philosophy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-[11px] tracking-wider uppercase font-light mb-2">Light Mode ☀️</h3>
              <ul className="space-y-1 text-sm font-light text-muted-foreground">
                <li>• Embrace white space and desert light</li>
                <li>• Stone as primary, amber as warmth</li>
                <li>• Warm brown shadows (not black)</li>
                <li>• Restrained earth tones</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-[11px] tracking-wider uppercase font-light mb-2">Dark Mode 🌌</h3>
              <ul className="space-y-1 text-sm font-light text-muted-foreground">
                <li>• Embrace vast darkness and starlight</li>
                <li>• Deep blacks with stone undertones</li>
                <li>• Sage moonlight for readable text</li>
                <li>• Fire colors revealed through interaction</li>
              </ul>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-[11px] tracking-wider uppercase font-light mb-2">Universal Principles</h3>
            <ul className="space-y-1 text-sm font-light">
              <li>• Pure geometric precision (no rounded corners)</li>
              <li>• Typography as sculptural element (extended tracking)</li>
              <li>• Material honesty (no decoration)</li>
              <li>• Warmth revealed through interaction</li>
              <li>• Maximum negative space is intentional</li>
              <li>• Light font weight (300) only</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center space-y-2">
        <p className="text-[11px] font-light text-muted-foreground">
          Marfa Design System — Inspired by Donald Judd & West Texas
        </p>
        <p className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">
          Not just a design system — an aesthetic philosophy
        </p>
      </div>
    </div>
  )
}