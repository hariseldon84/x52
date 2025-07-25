'use client';

// Epic 8, Story 8.3: Note-Taking App Connections Main Page

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  ExternalLink, 
  Settings, 
  RefreshCw, 
  FileText, 
  Link,
  Trash2,
  Clock,
  Users,
  BookOpen
} from 'lucide-react';
import { notesService } from '@/lib/services/notesService';
import type { 
  NoteAppConnection, 
  NotePage, 
  TaskNoteLink, 
  NoteSyncLog 
} from '@/lib/types/notes';

export default function NotesIntegrationsPage() {
  const [connections, setConnections] = useState<NoteAppConnection[]>([]);
  const [pages, setPages] = useState<NotePage[]>([]);
  const [taskLinks, setTaskLinks] = useState<TaskNoteLink[]>([]);
  const [syncLogs, setSyncLogs] = useState<NoteSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [obsidianVaultName, setObsidianVaultName] = useState('');
  const [obsidianVaultPath, setObsidianVaultPath] = useState('');
  const [showObsidianDialog, setShowObsidianDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      searchPages();
    } else {
      loadPages();
    }
  }, [searchTerm, selectedConnection]);

  const loadData = async () => {
    try {
      const [connectionsData, pagesData, logsData] = await Promise.all([
        notesService.getConnections(),
        notesService.getPages(),
        notesService.getSyncLogs(),
      ]);
      
      setConnections(connectionsData);
      setPages(pagesData);
      setSyncLogs(logsData);
    } catch (error) {
      console.error('Failed to load notes data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPages = async () => {
    try {
      const pagesData = await notesService.getPages(selectedConnection || undefined);
      setPages(pagesData);
    } catch (error) {
      console.error('Failed to load pages:', error);
    }
  };

  const searchPages = async () => {
    try {
      const results = await notesService.searchPages(
        searchTerm, 
        selectedConnection || undefined
      );
      setPages(results);
    } catch (error) {
      console.error('Failed to search pages:', error);
    }
  };

  const handleNotionConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_NOTION_CLIENT_ID;
    const redirectUri = `${window.location.origin}/integrations/notes/notion/callback`;
    const scope = 'read_content,read_user_info';
    
    const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `owner=user&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    window.location.href = authUrl;
  };

  const handleObsidianConnect = async () => {
    try {
      await notesService.connectObsidian(obsidianVaultPath, obsidianVaultName);
      setShowObsidianDialog(false);
      setObsidianVaultName('');
      setObsidianVaultPath('');
      loadData();
    } catch (error) {
      console.error('Failed to connect Obsidian:', error);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await notesService.disconnectApp(connectionId);
      loadData();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(prev => ({ ...prev, [connectionId]: true }));
    try {
      await notesService.syncPages(connectionId);
      loadData();
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setSyncing(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const getConnectionStats = (connectionId: string) => {
    const connectionPages = pages.filter(p => p.connection_id === connectionId);
    const recentSync = syncLogs
      .filter(log => log.connection_id === connectionId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
    
    return {
      pageCount: connectionPages.length,
      lastSync: recentSync?.completed_at || recentSync?.started_at,
      syncStatus: recentSync?.status || 'never'
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Note-Taking App Integrations</h1>
          <p className="text-muted-foreground">
            Connect your favorite note-taking apps to sync tasks and notes
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleNotionConnect} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Connect Notion
          </Button>
          
          <Dialog open={showObsidianDialog} onOpenChange={setShowObsidianDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Connect Obsidian
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Obsidian Vault</DialogTitle>
                <DialogDescription>
                  Enter your Obsidian vault details to enable task-note integration
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vault-name">Vault Name</Label>
                  <Input
                    id="vault-name"
                    value={obsidianVaultName}
                    onChange={(e) => setObsidianVaultName(e.target.value)}
                    placeholder="My Vault"
                  />
                </div>
                <div>
                  <Label htmlFor="vault-path">Vault Path</Label>
                  <Input
                    id="vault-path"
                    value={obsidianVaultPath}
                    onChange={(e) => setObsidianVaultPath(e.target.value)}
                    placeholder="/Users/username/Documents/MyVault"
                  />
                </div>
                <Button 
                  onClick={handleObsidianConnect}
                  disabled={!obsidianVaultName || !obsidianVaultPath}
                  className="w-full"
                >
                  Connect Vault
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="connections" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="pages">Browse Pages</TabsTrigger>
          <TabsTrigger value="sync-logs">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Connections Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your note-taking apps to start syncing tasks and notes
                </p>
                <div className="flex justify-center gap-2">
                  <Button onClick={handleNotionConnect}>Connect Notion</Button>
                  <Button variant="outline" onClick={() => setShowObsidianDialog(true)}>
                    Connect Obsidian
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connections.map((connection) => {
                const stats = getConnectionStats(connection.id);
                return (
                  <Card key={connection.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">
                              {connection.workspace_name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {connection.provider}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={connection.is_active ? 'default' : 'secondary'}>
                          {connection.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pages:</span>
                        <span>{stats.pageCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Sync:</span>
                        <span className="text-xs">
                          {stats.lastSync 
                            ? new Date(stats.lastSync).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={stats.syncStatus === 'completed' ? 'default' : 'secondary'}>
                          {stats.syncStatus}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(connection.id)}
                          disabled={syncing[connection.id]}
                          className="flex-1"
                        >
                          {syncing[connection.id] ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDisconnect(connection.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedConnection}
              onChange={(e) => setSelectedConnection(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Connections</option>
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.workspace_name} ({conn.provider})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4">
            {pages.map((page) => (
              <Card key={page.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-2">
                        {page.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{page.connection?.provider}</span>
                        <span>•</span>
                        <span>{page.connection?.workspace_name}</span>
                        {page.last_edited_time && (
                          <>
                            <span>•</span>
                            <span>{new Date(page.last_edited_time).toLocaleDateString()}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{page.page_type}</Badge>
                      {page.url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(page.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {page.content_preview && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {page.content_preview}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
            
            {pages.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pages Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try a different search term' : 'Connect an app or sync your pages'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sync-logs" className="space-y-4">
          <div className="grid gap-4">
            {syncLogs.map((log) => (
              <Card key={log.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-sm">
                          {log.connection?.workspace_name} ({log.connection?.provider})
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {log.sync_type} • {new Date(log.started_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={log.status === 'completed' ? 'default' : 
                                   log.status === 'failed' ? 'destructive' : 'secondary'}>
                      {log.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Processed:</span>
                      <div className="font-medium">{log.pages_processed}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <div className="font-medium text-green-600">{log.pages_created}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated:</span>
                      <div className="font-medium text-blue-600">{log.pages_updated}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deleted:</span>
                      <div className="font-medium text-red-600">{log.pages_deleted}</div>
                    </div>
                  </div>
                  {log.error_message && (
                    <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                      {log.error_message}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {syncLogs.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Sync History</h3>
                  <p className="text-muted-foreground">
                    Sync logs will appear here after your first synchronization
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}