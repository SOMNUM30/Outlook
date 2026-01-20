import React, { useState, useEffect, useCallback } from 'react';
import { mailApi, classifyApi, rulesApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
    Mail,
    Inbox,
    FolderOpen,
    RefreshCw,
    Sparkles,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const DashboardPage = () => {
    const [folders, setFolders] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState('inbox');
    const [selectedMessages, setSelectedMessages] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [emailDetail, setEmailDetail] = useState(null);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isClassifying, setIsClassifying] = useState(false);
    const [classificationResults, setClassificationResults] = useState([]);
    const [rules, setRules] = useState([]);
    const [stats, setStats] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [emailFilter, setEmailFilter] = useState('read'); // 'all', 'unread', 'read'

    // Load folders
    const loadFolders = useCallback(async () => {
        try {
            setIsLoadingFolders(true);
            const data = await mailApi.getFolders();
            setFolders(data);
        } catch (error) {
            toast.error('Erreur lors du chargement des dossiers');
            console.error(error);
        } finally {
            setIsLoadingFolders(false);
        }
    }, []);

    // Load messages
    const loadMessages = useCallback(async (folderId, reset = true, filter = 'read') => {
        try {
            setIsLoadingMessages(true);
            if (reset) {
                setSelectedMessages([]);
                setClassificationResults([]);
                setMessages([]);
            }
            const data = await mailApi.getMessages(folderId, 100, 0, filter);
            setMessages(data);
            setHasMore(data.length === 100);
        } catch (error) {
            toast.error('Erreur lors du chargement des emails');
            console.error(error);
        } finally {
            setIsLoadingMessages(false);
        }
    }, []);

    // Load more messages
    const loadMoreMessages = useCallback(async () => {
        try {
            setIsLoadingMore(true);
            const data = await mailApi.getMessages(selectedFolder, 100, messages.length, emailFilter);
            if (data.length > 0) {
                setMessages(prev => [...prev, ...data]);
                setHasMore(data.length === 100 && messages.length + data.length < 500);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            setHasMore(false);
            console.error(error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [selectedFolder, messages.length, emailFilter]);

    // Load email detail
    const loadEmailDetail = useCallback(async (messageId) => {
        try {
            const data = await mailApi.getMessageDetail(messageId);
            setEmailDetail(data);
        } catch (error) {
            toast.error('Erreur lors du chargement de l\'email');
            console.error(error);
        }
    }, []);

    // Load rules
    const loadRules = useCallback(async () => {
        try {
            const data = await rulesApi.getRules();
            setRules(data);
        } catch (error) {
            console.error('Error loading rules:', error);
        }
    }, []);

    // Load stats
    const loadStats = useCallback(async () => {
        try {
            const data = await classifyApi.getStats();
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }, []);

    useEffect(() => {
        loadFolders();
        loadRules();
        loadStats();
    }, [loadFolders, loadRules, loadStats]);

    useEffect(() => {
        loadMessages(selectedFolder, true, emailFilter);
    }, [selectedFolder, emailFilter, loadMessages]);

    useEffect(() => {
        if (selectedEmail) {
            loadEmailDetail(selectedEmail);
        } else {
            setEmailDetail(null);
        }
    }, [selectedEmail, loadEmailDetail]);

    // Handle message selection
    const handleSelectMessage = (messageId) => {
        setSelectedMessages(prev => {
            if (prev.includes(messageId)) {
                return prev.filter(id => id !== messageId);
            }
            return [...prev, messageId];
        });
    };

    // Select all messages
    const handleSelectAll = () => {
        if (selectedMessages.length === messages.length) {
            setSelectedMessages([]);
        } else {
            setSelectedMessages(messages.map(m => m.id));
        }
    };

    // Classify selected emails
    const handleClassify = async (execute = false) => {
        if (selectedMessages.length === 0) {
            toast.warning('Sélectionnez au moins un email');
            return;
        }

        if (rules.length === 0) {
            toast.warning('Créez d\'abord des règles de classification');
            return;
        }

        setIsClassifying(true);
        try {
            let results;
            if (execute) {
                results = await classifyApi.executeClassification(selectedMessages);
                const movedCount = results.filter(r => r.moved).length;
                toast.success(`${movedCount} email(s) classé(s) avec succès`);
                loadMessages(selectedFolder);
                loadStats();
            } else {
                results = await classifyApi.analyzeEmails(selectedMessages);
                toast.info('Analyse terminée - Vérifiez les suggestions');
            }
            setClassificationResults(results);
        } catch (error) {
            toast.error('Erreur lors de la classification');
            console.error(error);
        } finally {
            setIsClassifying(false);
        }
    };

    // Get classification result for a message
    const getClassificationResult = (messageId) => {
        return classificationResults.find(r => r.message_id === messageId);
    };

    // Get confidence badge style
    const getConfidenceBadge = (confidence) => {
        if (confidence >= 0.7) {
            return 'ai-badge-high';
        } else if (confidence >= 0.4) {
            return 'ai-badge-medium';
        }
        return 'ai-badge-low';
    };

    // Format date
    const formatDate = (dateString) => {
        try {
            return format(new Date(dateString), 'dd MMM HH:mm', { locale: fr });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] flex" data-testid="dashboard-page">
            {/* Left Panel - Email List */}
            <div className="w-2/5 border-r border-[#E4E4E7] flex flex-col bg-white">
                {/* Toolbar */}
                <div className="p-4 border-b border-[#E4E4E7] space-y-3">
                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedFolder}
                            onValueChange={setSelectedFolder}
                        >
                            <SelectTrigger className="w-48" data-testid="folder-select">
                                <SelectValue placeholder="Sélectionner un dossier" />
                            </SelectTrigger>
                            <SelectContent>
                                {folders.map((folder) => (
                                    <SelectItem key={folder.id} value={folder.id}>
                                        <div className="flex items-center gap-2">
                                            <FolderOpen className="w-4 h-4" />
                                            <span>{folder.display_name}</span>
                                            {folder.unread_item_count > 0 && (
                                                <span className="text-xs bg-[#18181B] text-white px-1.5 py-0.5 rounded-full">
                                                    {folder.unread_item_count}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={emailFilter} onValueChange={setEmailFilter}>
                            <SelectTrigger className="w-32" data-testid="filter-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unread">Non lus</SelectItem>
                                <SelectItem value="read">Lus</SelectItem>
                                <SelectItem value="all">Tous</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => loadMessages(selectedFolder, true, emailFilter)}
                            disabled={isLoadingMessages}
                            data-testid="refresh-button"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedMessages.length === messages.length && messages.length > 0}
                                    onCheckedChange={handleSelectAll}
                                    data-testid="select-all-checkbox"
                                />
                                <span className="text-sm text-[#71717A]">
                                    {selectedMessages.length > 0 
                                        ? `${selectedMessages.length} sélectionné(s)` 
                                        : 'Tout'}
                                </span>
                            </div>
                            
                            {/* Load More Button */}
                            {hasMore && messages.length < 500 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={loadMoreMessages}
                                    disabled={isLoadingMore}
                                    data-testid="load-more-button"
                                >
                                    {isLoadingMore ? "..." : `+ Charger plus (${messages.length})`}
                                </Button>
                            )}
                            {(!hasMore || messages.length >= 500) && messages.length > 0 && (
                                <span className="text-xs text-[#71717A]">✓ {messages.length} emails</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClassify(false)}
                                disabled={isClassifying || selectedMessages.length === 0}
                                data-testid="analyze-button"
                            >
                                <Sparkles className="w-4 h-4 mr-1" />
                                Analyser
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleClassify(true)}
                                disabled={isClassifying || selectedMessages.length === 0}
                                className="bg-[#18181B] hover:bg-[#27272A]"
                                data-testid="classify-button"
                            >
                                {isClassifying ? (
                                    <>
                                        <div className="spinner w-4 h-4 mr-1"></div>
                                        Classification...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-1" />
                                        Classer
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Email List */}
                <ScrollArea className="flex-1">
                    {isLoadingMessages ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="spinner"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="empty-state">
                            <Inbox className="w-12 h-12 text-[#A1A1AA] mb-4" />
                            <p className="text-[#71717A]">Aucun email dans ce dossier</p>
                        </div>
                    ) : (
                        <div>
                            <div className="divide-y divide-[#E4E4E7]">
                                {messages.map((message, index) => {
                                    const result = getClassificationResult(message.id);
                                    return (
                                        <div
                                            key={message.id}
                                            className={`email-item flex items-start gap-3 p-3 cursor-pointer ${
                                                selectedEmail === message.id ? 'selected' : ''
                                            } ${!message.is_read ? 'bg-blue-50/50' : ''}`}
                                            onClick={() => setSelectedEmail(message.id)}
                                            data-testid={`email-item-${index}`}
                                        >
                                            <Checkbox
                                                checked={selectedMessages.includes(message.id)}
                                                onCheckedChange={() => handleSelectMessage(message.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className={`text-sm truncate ${!message.is_read ? 'font-semibold text-[#09090B]' : 'text-[#71717A]'}`}>
                                                    {message.from_name || message.from_address}
                                                </span>
                                                <span className="text-xs text-[#A1A1AA] tabular-nums flex-shrink-0">
                                                    {formatDate(message.received_at)}
                                                </span>
                                            </div>
                                            <p className={`text-sm truncate mb-1 ${!message.is_read ? 'font-medium text-[#09090B]' : 'text-[#71717A]'}`}>
                                                {message.subject || '(Sans objet)'}
                                            </p>
                                            <p className="text-xs text-[#A1A1AA] truncate">
                                                {message.body_preview}
                                            </p>
                                            {result && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    {result.moved ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Classé: {result.suggested_folder_name}
                                                        </span>
                                                    ) : result.confidence > 0 ? (
                                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getConfidenceBadge(result.confidence)}`}>
                                                            <Sparkles className="w-3 h-3" />
                                                            {result.suggested_folder_name} ({Math.round(result.confidence * 100)}%)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs text-[#71717A] bg-[#F4F4F5] px-2 py-1 rounded-full">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Pas de correspondance
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[#A1A1AA] mt-1 flex-shrink-0" />
                                    </div>
                                );
                            })}
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Right Panel - Email Detail / Stats */}
            <div className="flex-1 bg-white overflow-auto">
                {emailDetail ? (
                    <div className="p-8" data-testid="email-detail">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-[#09090B] tracking-tight mb-2">
                                {emailDetail.subject || '(Sans objet)'}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-[#71717A]">
                                <span>
                                    De: {emailDetail.from?.emailAddress?.name || emailDetail.from?.emailAddress?.address}
                                </span>
                                <span>•</span>
                                <span>{formatDate(emailDetail.receivedDateTime)}</span>
                            </div>
                        </div>

                        <div className="prose prose-sm max-w-none">
                            <div 
                                dangerouslySetInnerHTML={{ 
                                    __html: emailDetail.body?.content || '' 
                                }} 
                            />
                        </div>
                    </div>
                ) : (
                    <div className="p-8">
                        {/* Stats Cards */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-[#09090B] mb-4">
                                Statistiques
                            </h2>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="stat-card">
                                    <div className="stat-value">
                                        {stats?.total_classified || 0}
                                    </div>
                                    <div className="stat-label">
                                        Emails classés
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">
                                        {rules.length}
                                    </div>
                                    <div className="stat-label">
                                        Règles actives
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">
                                        {stats?.by_folder?.length || 0}
                                    </div>
                                    <div className="stat-label">
                                        Dossiers utilisés
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Start Guide */}
                        <div className="bg-[#F4F4F5] rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-[#09090B] mb-4">
                                Comment ça marche ?
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-[#18181B] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-medium text-[#09090B]">Créez des règles</p>
                                        <p className="text-sm text-[#71717A]">
                                            Définissez vos critères de classification dans l'onglet "Règles"
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-[#18181B] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-medium text-[#09090B]">Sélectionnez des emails</p>
                                        <p className="text-sm text-[#71717A]">
                                            Cochez les emails à classifier dans la liste
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-[#18181B] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-medium text-[#09090B]">Classez automatiquement</p>
                                        <p className="text-sm text-[#71717A]">
                                            L'IA analyse le contenu et classe vos emails
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Classifications */}
                        {stats?.by_rule && stats.by_rule.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-lg font-semibold text-[#09090B] mb-4">
                                    Classifications récentes par règle
                                </h3>
                                <div className="space-y-2">
                                    {stats.by_rule.slice(0, 5).map((item, index) => (
                                        <div 
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-lg"
                                        >
                                            <span className="font-medium text-[#09090B]">
                                                {item.rule}
                                            </span>
                                            <span className="text-sm text-[#71717A]">
                                                {item.count} emails
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
