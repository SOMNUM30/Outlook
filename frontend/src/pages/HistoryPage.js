import React, { useState, useEffect, useCallback } from 'react';
import { classifyApi } from '../services/api';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
    History,
    FolderOpen,
    Clock,
    CheckCircle2,
    RefreshCw,
    BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const HistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [limit, setLimit] = useState('50');

    // Load history
    const loadHistory = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await classifyApi.getHistory(parseInt(limit));
            setHistory(data);
        } catch (error) {
            toast.error('Erreur lors du chargement de l\'historique');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [limit]);

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
        loadHistory();
        loadStats();
    }, [loadHistory, loadStats]);

    // Format date
    const formatDate = (dateString) => {
        try {
            return format(new Date(dateString), "dd MMM yyyy 'à' HH:mm", { locale: fr });
        } catch {
            return dateString;
        }
    };

    // Get confidence badge style
    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.7) return 'text-emerald-700 bg-emerald-50';
        if (confidence >= 0.4) return 'text-amber-700 bg-amber-50';
        return 'text-red-700 bg-red-50';
    };

    return (
        <div className="p-8" data-testid="history-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">
                        Historique des classifications
                    </h1>
                    <p className="text-[#71717A] mt-1">
                        Consultez l'historique de tous les emails classés automatiquement
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={limit} onValueChange={setLimit}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Limite" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25 derniers</SelectItem>
                            <SelectItem value="50">50 derniers</SelectItem>
                            <SelectItem value="100">100 derniers</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        onClick={() => {
                            loadHistory();
                            loadStats();
                        }}
                        disabled={isLoading}
                        data-testid="refresh-history-button"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Actualiser
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="stat-card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#18181B] rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="stat-value text-2xl">
                                    {stats.total_classified || 0}
                                </div>
                                <div className="stat-label text-xs">
                                    Total classés
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="stat-value text-2xl">
                                    {stats.by_rule?.length || 0}
                                </div>
                                <div className="stat-label text-xs">
                                    Règles utilisées
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                <FolderOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="stat-value text-2xl">
                                    {stats.by_folder?.length || 0}
                                </div>
                                <div className="stat-label text-xs">
                                    Dossiers cibles
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="stat-value text-2xl">
                                    {history.length}
                                </div>
                                <div className="stat-label text-xs">
                                    Affichés
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            {stats && (stats.by_rule?.length > 0 || stats.by_folder?.length > 0) && (
                <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* By Rule */}
                    {stats.by_rule?.length > 0 && (
                        <div className="bg-white border border-[#E4E4E7] rounded-xl p-6">
                            <h3 className="font-semibold text-[#09090B] mb-4">
                                Par règle
                            </h3>
                            <div className="space-y-3">
                                {stats.by_rule.map((item, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-[#09090B]">
                                                    {item.rule}
                                                </span>
                                                <span className="text-sm text-[#71717A]">
                                                    {item.count}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-[#18181B] rounded-full"
                                                    style={{ 
                                                        width: `${(item.count / stats.total_classified) * 100}%` 
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* By Folder */}
                    {stats.by_folder?.length > 0 && (
                        <div className="bg-white border border-[#E4E4E7] rounded-xl p-6">
                            <h3 className="font-semibold text-[#09090B] mb-4">
                                Par dossier
                            </h3>
                            <div className="space-y-3">
                                {stats.by_folder.map((item, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-[#09090B] flex items-center gap-2">
                                                    <FolderOpen className="w-4 h-4 text-[#71717A]" />
                                                    {item.folder}
                                                </span>
                                                <span className="text-sm text-[#71717A]">
                                                    {item.count}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ 
                                                        width: `${(item.count / stats.total_classified) * 100}%` 
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* History List */}
            <div className="bg-white border border-[#E4E4E7] rounded-xl">
                <div className="p-4 border-b border-[#E4E4E7]">
                    <h3 className="font-semibold text-[#09090B]">
                        Emails classés récemment
                    </h3>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="spinner"></div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="empty-state py-16">
                        <History className="w-12 h-12 text-[#A1A1AA] mb-4" />
                        <h3 className="text-lg font-semibold text-[#09090B] mb-2">
                            Aucun historique
                        </h3>
                        <p className="text-[#71717A]">
                            Les emails classés apparaîtront ici
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-[500px]">
                        <div className="divide-y divide-[#E4E4E7]">
                            {history.map((item, index) => (
                                <div 
                                    key={item.id || index}
                                    className="p-4 hover:bg-[#FAFAFA] transition-colors"
                                    data-testid={`history-item-${index}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-[#09090B] truncate mb-1">
                                                {item.subject || '(Sans objet)'}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm text-[#71717A]">
                                                <span className="flex items-center gap-1">
                                                    <FolderOpen className="w-4 h-4" />
                                                    {item.target_folder_name}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {formatDate(item.classified_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 ml-4">
                                            <span className="text-sm text-[#71717A]">
                                                {item.rule_name}
                                            </span>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(item.confidence)}`}>
                                                {Math.round(item.confidence * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;
