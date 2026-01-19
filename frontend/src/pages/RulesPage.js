import React, { useState, useEffect, useCallback } from 'react';
import { rulesApi, mailApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '../components/ui/dialog';
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
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import {
    Plus,
    Edit2,
    Trash2,
    FolderOpen,
    Sparkles,
    Tag,
    FileText
} from 'lucide-react';

const RulesPage = () => {
    const [rules, setRules] = useState([]);
    const [folders, setFolders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        target_folder_id: '',
        target_folder_name: '',
        keywords: '',
        ai_prompt: ''
    });

    // Load rules
    const loadRules = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await rulesApi.getRules();
            setRules(data);
        } catch (error) {
            toast.error('Erreur lors du chargement des règles');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load folders
    const loadFolders = useCallback(async () => {
        try {
            const data = await mailApi.getFolders();
            setFolders(data);
        } catch (error) {
            console.error('Error loading folders:', error);
        }
    }, []);

    useEffect(() => {
        loadRules();
        loadFolders();
    }, [loadRules, loadFolders]);

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            target_folder_id: '',
            target_folder_name: '',
            keywords: '',
            ai_prompt: ''
        });
        setEditingRule(null);
    };

    // Open dialog for editing
    const handleEdit = (rule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            description: rule.description,
            target_folder_id: rule.target_folder_id,
            target_folder_name: rule.target_folder_name,
            keywords: rule.keywords?.join(', ') || '',
            ai_prompt: rule.ai_prompt || ''
        });
        setIsDialogOpen(true);
    };

    // Handle folder selection
    const handleFolderSelect = (folderId) => {
        const folder = folders.find(f => f.id === folderId);
        setFormData(prev => ({
            ...prev,
            target_folder_id: folderId,
            target_folder_name: folder?.display_name || ''
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.target_folder_id) {
            toast.warning('Veuillez remplir les champs obligatoires');
            return;
        }

        const ruleData = {
            name: formData.name,
            description: formData.description,
            target_folder_id: formData.target_folder_id,
            target_folder_name: formData.target_folder_name,
            keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
            ai_prompt: formData.ai_prompt
        };

        try {
            if (editingRule) {
                await rulesApi.updateRule(editingRule.id, ruleData);
                toast.success('Règle mise à jour');
            } else {
                await rulesApi.createRule(ruleData);
                toast.success('Règle créée');
            }
            setIsDialogOpen(false);
            resetForm();
            loadRules();
        } catch (error) {
            toast.error('Erreur lors de la sauvegarde');
            console.error(error);
        }
    };

    // Handle delete
    const handleDelete = async (ruleId) => {
        try {
            await rulesApi.deleteRule(ruleId);
            toast.success('Règle supprimée');
            loadRules();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
            console.error(error);
        }
    };

    // Handle toggle
    const handleToggle = async (ruleId) => {
        try {
            await rulesApi.toggleRule(ruleId);
            loadRules();
        } catch (error) {
            toast.error('Erreur lors de la modification');
            console.error(error);
        }
    };

    return (
        <div className="p-8" data-testid="rules-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">
                        Règles de classification
                    </h1>
                    <p className="text-[#71717A] mt-1">
                        Définissez comment vos emails doivent être classés automatiquement
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button 
                            className="bg-[#18181B] hover:bg-[#27272A]"
                            data-testid="create-rule-button"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nouvelle règle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRule ? 'Modifier la règle' : 'Créer une règle'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nom de la règle *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Factures clients"
                                    data-testid="rule-name-input"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Décrivez les types d'emails concernés..."
                                    rows={2}
                                    data-testid="rule-description-input"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Dossier de destination *</Label>
                                <Select
                                    value={formData.target_folder_id}
                                    onValueChange={handleFolderSelect}
                                >
                                    <SelectTrigger data-testid="folder-select">
                                        <SelectValue placeholder="Sélectionner un dossier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {folders.map((folder) => (
                                            <SelectItem key={folder.id} value={folder.id}>
                                                <div className="flex items-center gap-2">
                                                    <FolderOpen className="w-4 h-4" />
                                                    {folder.display_name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="keywords">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4" />
                                        Mots-clés (séparés par des virgules)
                                    </div>
                                </Label>
                                <Input
                                    id="keywords"
                                    value={formData.keywords}
                                    onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                                    placeholder="facture, devis, commande"
                                    data-testid="rule-keywords-input"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ai_prompt">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        Instructions pour l'IA
                                    </div>
                                </Label>
                                <Textarea
                                    id="ai_prompt"
                                    value={formData.ai_prompt}
                                    onChange={(e) => setFormData(prev => ({ ...prev, ai_prompt: e.target.value }))}
                                    placeholder="Décrivez à l'IA comment identifier ce type d'email..."
                                    rows={3}
                                    data-testid="rule-ai-prompt-input"
                                />
                                <p className="text-xs text-[#71717A]">
                                    L'IA utilisera ces instructions pour analyser le contenu des emails
                                </p>
                            </div>

                            <DialogFooter className="mt-6">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Annuler
                                    </Button>
                                </DialogClose>
                                <Button 
                                    type="submit" 
                                    className="bg-[#18181B] hover:bg-[#27272A]"
                                    data-testid="save-rule-button"
                                >
                                    {editingRule ? 'Mettre à jour' : 'Créer'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Rules List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner"></div>
                </div>
            ) : rules.length === 0 ? (
                <div className="empty-state bg-white rounded-xl border border-[#E4E4E7]">
                    <FileText className="w-12 h-12 text-[#A1A1AA] mb-4" />
                    <h3 className="text-lg font-semibold text-[#09090B] mb-2">
                        Aucune règle créée
                    </h3>
                    <p className="text-[#71717A] mb-6">
                        Créez votre première règle pour commencer à classifier vos emails
                    </p>
                    <Button 
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-[#18181B] hover:bg-[#27272A]"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer une règle
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {rules.map((rule) => (
                        <div 
                            key={rule.id}
                            className="rule-card flex items-start justify-between"
                            data-testid={`rule-card-${rule.id}`}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-[#09090B]">
                                        {rule.name}
                                    </h3>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        rule.is_active 
                                            ? 'bg-emerald-50 text-emerald-700' 
                                            : 'bg-zinc-100 text-zinc-500'
                                    }`}>
                                        {rule.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p className="text-sm text-[#71717A] mb-3">
                                    {rule.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-[#71717A]">
                                        <FolderOpen className="w-4 h-4" />
                                        <span>{rule.target_folder_name}</span>
                                    </div>
                                    {rule.keywords && rule.keywords.length > 0 && (
                                        <div className="flex items-center gap-2 text-[#71717A]">
                                            <Tag className="w-4 h-4" />
                                            <span>{rule.keywords.slice(0, 3).join(', ')}</span>
                                            {rule.keywords.length > 3 && (
                                                <span>+{rule.keywords.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                    {rule.ai_prompt && (
                                        <div className="flex items-center gap-2 text-[#71717A]">
                                            <Sparkles className="w-4 h-4" />
                                            <span>Prompt IA configuré</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 mr-4">
                                    <Label htmlFor={`toggle-${rule.id}`} className="text-sm text-[#71717A]">
                                        {rule.is_active ? 'Active' : 'Inactive'}
                                    </Label>
                                    <Switch
                                        id={`toggle-${rule.id}`}
                                        checked={rule.is_active}
                                        onCheckedChange={() => handleToggle(rule.id)}
                                        data-testid={`toggle-rule-${rule.id}`}
                                    />
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(rule)}
                                    data-testid={`edit-rule-${rule.id}`}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            data-testid={`delete-rule-${rule.id}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Supprimer cette règle ?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Cette action est irréversible. La règle "{rule.name}" sera définitivement supprimée.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDelete(rule.id)}
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                Supprimer
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tips Section */}
            <div className="mt-8 p-6 bg-[#F4F4F5] rounded-xl">
                <h3 className="font-semibold text-[#09090B] mb-4">
                    💡 Conseils pour de meilleures classifications
                </h3>
                <ul className="space-y-2 text-sm text-[#71717A]">
                    <li>• Utilisez des mots-clés spécifiques au contenu des emails</li>
                    <li>• Décrivez clairement le type d'email dans le prompt IA</li>
                    <li>• Créez des règles distinctes pour éviter les conflits</li>
                    <li>• Testez avec "Analyser" avant de classifier automatiquement</li>
                </ul>
            </div>
        </div>
    );
};

export default RulesPage;
