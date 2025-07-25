'use client';

// Epic 8, Story 8.4: Email Integration Main Page

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
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Mail, 
  Settings, 
  RefreshCw, 
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  BarChart3
} from 'lucide-react';
import { emailService } from '@/lib/services/emailService';
import type { 
  EmailConnection, 
  EmailProcessingRule,
  ProcessedEmail,
  EmailSyncLog,
  EmailStats,
  CreateRuleRequest
} from '@/lib/types/email';

export default function EmailIntegrationsPage() {
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [rules, setRules] = useState<EmailProcessingRule[]>([]);
  const [emails, setEmails] = useState<ProcessedEmail[]>([]);
  const [syncLogs, setSyncLogs] = useState<EmailSyncLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    total_emails: 0,
    processed_emails: 0,
    pending_emails: 0,
    failed_emails: 0,
    tasks_created: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<EmailProcessingRule | null>(null);

  // Form state for new/edit rule
  const [ruleForm, setRuleForm] = useState<Partial<CreateRuleRequest>>({
    rule_name: '',
    rule_description: '',
    priority: 1,
    from_addresses: [],
    subject_patterns: [],
    body_keywords: [],
    task_title_template: 'Email: {{subject}}',
    task_description_template: 'From: {{from}}\nSubject: {{subject}}\n\n{{body}}',
    default_priority: 'medium',
    default_complexity: 'simple',
    auto_assign_to_user: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      searchEmails();
    } else {
      loadEmails();
    }
  }, [searchTerm, selectedConnection]);

  const loadData = async () => {
    try {
      const [connectionsData, rulesData, emailsData, logsData, statsData] = await Promise.all([
        emailService.getConnections(),
        emailService.getProcessingRules(),
        emailService.getProcessedEmails(),
        emailService.getSyncLogs(),
        emailService.getEmailStats(),
      ]);
      
      setConnections(connectionsData);
      setRules(rulesData);
      setEmails(emailsData);
      setSyncLogs(logsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load email data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    try {
      const emailsData = await emailService.getProcessedEmails(selectedConnection || undefined);
      setEmails(emailsData);
    } catch (error) {
      console.error('Failed to load emails:', error);
    }
  };

  const searchEmails = async () => {
    try {
      const results = await emailService.searchEmails(
        searchTerm, 
        selectedConnection || undefined
      );
      // Convert search results to ProcessedEmail format
      const emailsData = await emailService.getProcessedEmails();
      const filteredEmails = emailsData.filter(email => 
        results.some(result => result.email_id === email.id)
      );
      setEmails(filteredEmails);
    } catch (error) {
      console.error('Failed to search emails:', error);
    }
  };

  const handleGmailConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
    const redirectUri = `${window.location.origin}/integrations/email/gmail/callback`;
    const scope = 'https://www.googleapis.com/auth/gmail.readonly';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    window.location.href = authUrl;
  };

  const handleOutlookConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID;
    const redirectUri = `${window.location.origin}/integrations/email/outlook/callback`;
    const scope = 'https://graph.microsoft.com/Mail.Read offline_access';
    
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `prompt=consent`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await emailService.disconnectEmail(connectionId);
      loadData();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(prev => ({ ...prev, [connectionId]: true }));
    try {
      await emailService.syncEmails(connectionId);
      loadData();
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setSyncing(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleSaveRule = async () => {
    try {
      if (editingRule) {
        await emailService.updateProcessingRule(editingRule.id, ruleForm);
      } else {
        await emailService.createProcessingRule(ruleForm as CreateRuleRequest);
      }
      
      setShowRuleDialog(false);
      setEditingRule(null);
      setRuleForm({
        rule_name: '',
        rule_description: '',
        priority: 1,
        from_addresses: [],
        subject_patterns: [],
        body_keywords: [],
        task_title_template: 'Email: {{subject}}',
        task_description_template: 'From: {{from}}\nSubject: {{subject}}\n\n{{body}}',
        default_priority: 'medium',
        default_complexity: 'simple',
        auto_assign_to_user: true,
      });
      loadData();
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const handleEditRule = (rule: EmailProcessingRule) => {
    setEditingRule(rule);
    setRuleForm({
      rule_name: rule.rule_name,
      rule_description: rule.rule_description,
      priority: rule.priority,
      from_addresses: rule.from_addresses,
      subject_patterns: rule.subject_patterns,
      body_keywords: rule.body_keywords,
      task_title_template: rule.task_title_template,
      task_description_template: rule.task_description_template,
      default_priority: rule.default_priority,
      default_complexity: rule.default_complexity,
      auto_assign_to_user: rule.auto_assign_to_user,
    });
    setShowRuleDialog(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await emailService.deleteProcessingRule(ruleId);
      loadData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleProcessEmail = async (emailId: string, ruleId?: string) => {
    try {
      await emailService.processEmailToTask(emailId, ruleId);
      loadData();
    } catch (error) {
      console.error('Failed to process email:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
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
          <h1 className="text-3xl font-bold">Email Integration</h1>
          <p className="text-muted-foreground">
            Connect your email accounts to automatically create tasks from emails
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleGmailConnect} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Connect Gmail
          </Button>
          <Button onClick={handleOutlookConnect} variant="outline" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Connect Outlook
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_emails}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processed_emails}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_emails}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed_emails}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Created</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks_created}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="connections" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="rules">Processing Rules</TabsTrigger>
          <TabsTrigger value="emails">Email History</TabsTrigger>
          <TabsTrigger value="sync-logs">Sync Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Email Connections</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your email accounts to start creating tasks from emails
                </p>
                <div className="flex justify-center gap-2">
                  <Button onClick={handleGmailConnect}>Connect Gmail</Button>
                  <Button variant="outline" onClick={handleOutlookConnect}>
                    Connect Outlook
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connections.map((connection) => (
                <Card key={connection.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">
                            {connection.email_address}
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
                      <span className="text-muted-foreground">Last Sync:</span>
                      <span className="text-xs">
                        {connection.last_sync_at 
                          ? new Date(connection.last_sync_at).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
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
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Processing Rules</h3>
            <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? 'Edit Processing Rule' : 'Create Processing Rule'}
                  </DialogTitle>
                  <DialogDescription>
                    Define rules to automatically create tasks from incoming emails
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rule-name">Rule Name</Label>
                      <Input
                        id="rule-name"
                        value={ruleForm.rule_name}
                        onChange={(e) => setRuleForm(prev => ({ ...prev, rule_name: e.target.value }))}
                        placeholder="Support Emails"
                      />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={ruleForm.priority}
                        onChange={(e) => setRuleForm(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={ruleForm.rule_description}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, rule_description: e.target.value }))}
                      placeholder="Describe when this rule should trigger"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="from-addresses">From Addresses (one per line)</Label>
                      <Textarea
                        id="from-addresses"
                        value={ruleForm.from_addresses?.join('\n') || ''}
                        onChange={(e) => setRuleForm(prev => ({ 
                          ...prev, 
                          from_addresses: e.target.value.split('\n').filter(Boolean) 
                        }))}
                        placeholder="support@company.com&#10;%@domain.com"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject-patterns">Subject Patterns (one per line)</Label>
                      <Textarea
                        id="subject-patterns"
                        value={ruleForm.subject_patterns?.join('\n') || ''}
                        onChange={(e) => setRuleForm(prev => ({ 
                          ...prev, 
                          subject_patterns: e.target.value.split('\n').filter(Boolean) 
                        }))}
                        placeholder="[URGENT]%&#10;%support request%"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="task-title">Task Title Template</Label>
                    <Input
                      id="task-title"
                      value={ruleForm.task_title_template}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, task_title_template: e.target.value }))}
                      placeholder="Email: {{subject}}"
                    />
                  </div>

                  <div>
                    <Label htmlFor="task-description">Task Description Template</Label>
                    <Textarea
                      id="task-description"
                      value={ruleForm.task_description_template}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, task_description_template: e.target.value }))}
                      placeholder="From: {{from}}&#10;Subject: {{subject}}&#10;&#10;{{body}}"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="default-priority">Default Priority</Label>
                      <Select 
                        value={ruleForm.default_priority} 
                        onValueChange={(value) => setRuleForm(prev => ({ ...prev, default_priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="default-complexity">Default Complexity</Label>
                      <Select 
                        value={ruleForm.default_complexity} 
                        onValueChange={(value) => setRuleForm(prev => ({ ...prev, default_complexity: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="complex">Complex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRule}>
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{rule.rule_name}</CardTitle>
                      <CardDescription>{rule.rule_description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Priority: {rule.priority}</Badge>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">From Patterns:</span>
                      <div className="font-medium">
                        {rule.from_addresses?.length ? rule.from_addresses.join(', ') : 'Any'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subject Patterns:</span>
                      <div className="font-medium">
                        {rule.subject_patterns?.length ? rule.subject_patterns.join(', ') : 'Any'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Default Priority:</span>
                      <div className="font-medium">{rule.default_priority}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Default Complexity:</span>
                      <div className="font-medium">{rule.default_complexity}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditRule(rule)}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {rules.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Processing Rules</h3>
                  <p className="text-muted-foreground mb-4">
                    Create rules to automatically process emails into tasks
                  </p>
                  <Button onClick={() => setShowRuleDialog(true)}>
                    Create Your First Rule
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
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
                  {conn.email_address} ({conn.provider})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4">
            {emails.map((email) => (
              <Card key={email.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-1">
                        {email.subject || 'No Subject'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{email.from_address}</span>
                        <span>•</span>
                        <span>{new Date(email.received_date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{email.connection?.provider}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(email.processing_status)}
                      <Badge variant="outline">{email.processing_status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {email.body_text && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {email.body_text}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {email.has_attachments && <span>📎 Attachments</span>}
                      {email.task_id && (
                        <Badge variant="secondary">Task Created</Badge>
                      )}
                    </div>
                    
                    {email.processing_status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleProcessEmail(email.id)}
                      >
                        Create Task
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {emails.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Emails Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try a different search term' : 'Connect an email account and sync to see emails here'}
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
                          {log.connection?.email_address} ({log.connection?.provider})
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
                      <div className="font-medium">{log.emails_processed}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Imported:</span>
                      <div className="font-medium text-blue-600">{log.emails_imported}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tasks Created:</span>
                      <div className="font-medium text-green-600">{log.tasks_created}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Errors:</span>
                      <div className="font-medium text-red-600">{log.errors_count}</div>
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
                    Sync logs will appear here after your first email synchronization
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