import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Image as ImageIcon, Save, ExternalLink, Layout, Eye, AlertCircle, X, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface Banner {
    id: string;
    title: string;
    subtitle?: string;
    link_url?: string;
    cta_text?: string;
    image_url: string;
    is_active: boolean;
    display_order: number;
}

const SUGGESTED_LINKS = [
    { label: 'All Venues', value: '/venues' },
    { label: 'Turf', value: '/venues?category=turf' },
    { label: 'Badminton', value: '/venues?category=badminton' },
    { label: 'Swimming', value: '/venues?category=swimming' },
    { label: 'Cricket', value: '/venues?category=cricket' },
    { label: 'Football', value: '/venues?category=football' },
    { label: 'Gym', value: '/venues?category=gym' },
];

export const BannerManager = () => {
    const { toast } = useToast();
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [newBannerTitle, setNewBannerTitle] = useState('');
    const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
    const [newBannerLink, setNewBannerLink] = useState('');
    const [newBannerCTA, setNewBannerCTA] = useState('Explore Now');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('banners')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            setBanners(data || []);
        } catch (error: any) {
            console.error('Error fetching banners:', error);
            toast({ title: "Error", description: "Failed to load banners", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const resetForm = () => {
        setNewBannerTitle('');
        setNewBannerSubtitle('');
        setNewBannerLink('');
        setNewBannerCTA('Explore Now');
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpload = async () => {
        if (!selectedFile || !newBannerTitle) {
            toast({ title: "Missing fields", description: "Please select an image and enter a title.", variant: "destructive" });
            return;
        }

        setUploading(true);
        try {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('banners')
                .upload(filePath, selectedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('banners')
                .getPublicUrl(filePath);

            const { error: dbError } = await supabase
                .from('banners')
                .insert({
                    title: newBannerTitle,
                    subtitle: newBannerSubtitle,
                    link_url: newBannerLink,
                    cta_text: newBannerCTA,
                    image_url: publicUrl,
                    is_active: true,
                    display_order: banners.length + 1
                });

            if (dbError) throw dbError;

            toast({ title: "Success", description: "Banner uploaded successfully!" });
            resetForm();
            fetchBanners();
        } catch (error: any) {
            console.error('Error uploading banner:', error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const toggleActive = async (id: string, currentState: boolean) => {
        const previousState = banners.find(b => b.id === id)?.is_active;
        // Optimistic update
        setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentState } : b));

        try {
            const { error } = await supabase
                .from('banners')
                .update({ is_active: !currentState })
                .eq('id', id);

            if (error) throw error;
        } catch (error: any) {
            // Revert on error
            setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: previousState ?? currentState } : b));
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string, imageUrl: string) => {
        if (!confirm('Are you sure you want to delete this banner?')) return;

        try {
            const { error: dbError } = await supabase
                .from('banners')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;

            const fileName = imageUrl.split('/').pop();
            if (fileName) {
                await supabase.storage.from('banners').remove([fileName]);
            }

            setBanners(banners.filter(b => b.id !== id));
            toast({ title: "Deleted", description: "Banner removed successfully." });
        } catch (error: any) {
            console.error('Error deleting banner:', error);
            toast({ title: "Error", description: "Failed to delete banner", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pt-4">

            {/* Upload Section */}
            <Card className="bg-card/30 backdrop-blur-xl border-border/40 shadow-2xl shadow-primary/5 overflow-hidden">
                <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Plus className="h-4 w-4 text-primary" />
                        </div>
                        Create New Banner
                    </CardTitle>
                    <CardDescription>Upload a high-quality image (16:9 ratio recommended)</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Form Inputs */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest ml-1">Main Heading</label>
                                    <Input
                                        placeholder="e.g., Weekend Bash"
                                        value={newBannerTitle}
                                        onChange={(e) => setNewBannerTitle(e.target.value)}
                                        className="bg-background/50 border-border/50 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest ml-1">Sub Headline</label>
                                    <Input
                                        placeholder="e.g., Get Flat 20% Off"
                                        value={newBannerSubtitle}
                                        onChange={(e) => setNewBannerSubtitle(e.target.value)}
                                        className="bg-background/50 border-border/50 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest ml-1">Destination URL</label>
                                <Input
                                    placeholder="e.g., /venues?category=turf"
                                    value={newBannerLink}
                                    onChange={(e) => setNewBannerLink(e.target.value)}
                                    className="bg-background/50 border-border/50 focus:ring-primary/20"
                                />
                                <div className="flex flex-wrap gap-1.5 pt-2">
                                    {SUGGESTED_LINKS.map((link) => (
                                        <Badge
                                            key={link.value}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-300 font-medium px-2 py-0.5 text-[10px]"
                                            onClick={() => setNewBannerLink(link.value)}
                                        >
                                            {link.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest ml-1">Button Text (CTA)</label>
                                    <Input
                                        placeholder="e.g., Book Now"
                                        value={newBannerCTA}
                                        onChange={(e) => setNewBannerCTA(e.target.value)}
                                        className="bg-background/50 border-border/50 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest ml-1">Banner Image</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="relative">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="banner-file-upload"
                                            />
                                            <label
                                                htmlFor="banner-file-upload"
                                                className="flex flex-col h-24 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-background/40 hover:bg-muted/20 hover:border-primary/40 transition-all group relative overflow-hidden"
                                            >
                                                {selectedFile ? (
                                                    <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in-95 duration-300">
                                                        <div className="p-1.5 bg-primary/10 rounded-full">
                                                            <ImageIcon className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{selectedFile.name}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Reselect Image</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 transition-all group-hover:scale-105">
                                                        <ImageIcon className="h-6 w-6 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                                                        <span className="text-sm font-medium text-muted-foreground">Drop image or click to browse</span>
                                                        <span className="text-[10px] text-muted-foreground/30 uppercase tracking-widest font-bold">High Quality 16:9 Recommended</span>
                                                    </div>
                                                )}

                                                {/* Hover effect background */}
                                                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors pointer-events-none" />
                                            </label>
                                        </div>
                                        {selectedFile && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setSelectedFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-bold h-8 transition-all"
                                            >
                                                <X className="mr-2 h-3 w-3" />
                                                Remove Selection
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleUpload}
                                disabled={uploading || !selectedFile || !newBannerTitle}
                                className="w-full h-11 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] font-bold"
                            >
                                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Publish Banner Content
                            </Button>
                        </div>

                        {/* Preview Area */}
                        <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-muted/10 group">
                            {previewUrl ? (
                                <div className="relative aspect-video w-full h-full">
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                                        <div className="space-y-1">
                                            <Badge variant="outline" className="text-primary-foreground border-primary bg-primary/20 backdrop-blur-md mb-2">Live Preview</Badge>
                                            <h4 className="text-2xl font-bold text-white leading-tight">{newBannerTitle || "Your Title Here"}</h4>
                                            <p className="text-sm text-white/70">{newBannerSubtitle || "Your subtitle will appear here"}</p>
                                        </div>
                                        <Button className="mt-4 w-fit bg-primary text-primary-foreground pointer-events-none rounded-full px-6">
                                            {newBannerCTA}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-video w-full h-full flex flex-col items-center justify-center p-8 text-center bg-muted/5 relative">
                                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                        <Layout className="h-40 w-40" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="p-4 rounded-full bg-muted/20 mb-4 animate-pulse inline-block">
                                            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                                        </div>
                                        <p className="font-semibold text-muted-foreground/50">No Image Selected</p>
                                        <p className="text-xs text-muted-foreground/30 mt-1 uppercase tracking-widest font-bold">Upload a file to see preview</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Banner Grid Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Layout className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Active Banners</h3>
                        <p className="text-xs text-muted-foreground">Currently displaying {banners.filter(b => b.is_active).length} active items</p>
                    </div>
                </div>
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-bold uppercase tracking-tighter">Live Content</Badge>
            </div>

            {/* Banner List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="aspect-video bg-muted/20 border border-border/40 rounded-2xl animate-pulse" />
                        ))
                    ) : banners.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="col-span-full h-64 flex flex-col items-center justify-center text-center bg-card/10 rounded-2xl border-2 border-dashed border-border/40 p-12"
                        >
                            <div className="p-4 bg-muted/30 rounded-full mb-4">
                                <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
                            </div>
                            <h4 className="font-bold text-muted-foreground">No Campaigns Active</h4>
                            <p className="text-xs text-muted-foreground/60 mt-1">Start by uploading your first promotional banner.</p>
                        </motion.div>
                    ) : (
                        banners.map((banner, index) => (
                            <motion.div
                                key={banner.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="group relative"
                            >
                                <Card className={`overflow-hidden rounded-2xl shadow-xl transition-all duration-500 hover:shadow-primary/10 hover:-translate-y-1 ${banner.is_active ? 'bg-card/40 border-border/40' : 'bg-muted/10 border-border/10 opacity-70'}`}>
                                    {/* Image Block */}
                                    <div className="relative aspect-video overflow-hidden">
                                        <img
                                            src={banner.image_url}
                                            alt={banner.title}
                                            className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${banner.is_active ? 'opacity-100' : 'opacity-40 grayscale'}`}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                        {/* Status Badge */}
                                        <div className="absolute top-4 left-4">
                                            <Badge className={`backdrop-blur-md border shadow-lg font-bold ${banner.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                <div className={`h-1.5 w-1.5 rounded-full mr-2 ${banner.is_active ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                                                {banner.is_active ? 'ACTIVE' : 'PAUSED'}
                                            </Badge>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 transform translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="h-8 w-8 rounded-full shadow-lg border border-red-500/20"
                                                onClick={() => handleDelete(banner.id, banner.image_url)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Content Block */}
                                    <CardContent className="p-5 space-y-4 bg-gradient-to-b from-transparent to-background/20 backdrop-blur-[2px]">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">{banner.title}</h4>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{banner.subtitle || 'No subtitle provided'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={banner.is_active}
                                                    onCheckedChange={() => toggleActive(banner.id, banner.is_active)}
                                                    className="data-[state=checked]:bg-green-500 shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-border/10 flex items-center justify-between">
                                            {banner.link_url ? (
                                                <Badge variant="secondary" className="bg-muted/30 hover:bg-primary/10 text-muted-foreground hover:text-primary border-transparent transition-all text-[10px] font-medium lowercase flex gap-1 items-center max-w-[150px] truncate px-2 py-0.5">
                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                    {banner.link_url}
                                                </Badge>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground/40 italic">No link assigned</span>
                                            )}

                                            <div className="flex gap-2">
                                                <a href={banner.link_url || '#'} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary rounded-full transition-all duration-300">
                                                        <ArrowUpRight className="h-4 w-4" />
                                                    </Button>
                                                </a>
                                            </div>
                                        </div>
                                    </CardContent>

                                    {/* Hover Indicator */}
                                    <div className="h-1 w-full bg-gradient-to-r from-primary/40 to-primary/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                                </Card>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
