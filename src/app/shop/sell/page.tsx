"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Upload, Link as LinkIcon, Check, DollarSign, FileText, BookOpen, GraduationCap, LayoutTemplate, Map } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const PRODUCT_TYPES = [
    { id: "COURSE", label: "Course", icon: GraduationCap, description: "Sell your knowledge" },
    { id: "EBOOK", label: "eBook", icon: BookOpen, description: "Digital books & guides" },
    { id: "TEMPLATE", label: "Template", icon: LayoutTemplate, description: "Canvas designs" },
    { id: "HOPIN_PLAN", label: "Hopin Plan", icon: Map, description: "Travel itineraries" },
    { id: "DIGITAL_ASSET", label: "Asset", icon: FileText, description: "Files, presets, etc." },
];

export default function SellPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        type: "",
        name: "",
        description: "",
        price: "",
        images: "",
        digitalFileUrl: "",
        linkedResourceId: "",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const type = searchParams.get("type");
        const linkedResourceId = searchParams.get("linkedResourceId");
        const name = searchParams.get("name");

        if (type && linkedResourceId) {
            setFormData(prev => ({
                ...prev,
                type,
                linkedResourceId,
                name: name || prev.name
            }));
            setStep(2); // Skip to details
        }
    }, [searchParams]);

    const handleNext = () => setStep((prev) => prev + 1);
    const handleBack = () => setStep((prev) => prev - 1);

    const handleTypeSelect = (typeId: string) => {
        if (typeId === "TEMPLATE") {
            router.push("/canvas?mode=select&returnUrl=/shop/sell");
            return;
        }
        if (typeId === "HOPIN_PLAN") {
            router.push("/hopin?mode=select&returnUrl=/shop/sell");
            return;
        }
        setFormData({ ...formData, type: typeId });
        handleNext();
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/shop/user-products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    price: parseFloat(formData.price),
                    // images is already a JSON string of objects {url, type}
                }),
            });

            if (res.ok) {
                router.push("/dashboard/store"); // Redirect to store dashboard after success
            } else {
                alert("Failed to list item");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-mono">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center mb-12">
                    <Link href="/shop" className="mr-4 p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tighter">List New Item</h1>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-between mb-12 relative">
                    <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white/10 -z-10" />
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 ${step >= s ? "bg-white text-black" : "bg-black border border-white/20 text-white/50"
                                }`}
                        >
                            {s}
                        </div>
                    ))}
                </div>

                {/* Steps */}
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <h2 className="text-2xl font-bold mb-6">What are you selling?</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {PRODUCT_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleTypeSelect(type.id)}
                                        className={`p-6 rounded-xl border text-left transition-all hover:scale-[1.02] ${formData.type === type.id
                                            ? "bg-white text-black border-white"
                                            : "bg-white/5 border-white/10 hover:border-white/30"
                                            }`}
                                    >
                                        <type.icon className="w-8 h-8 mb-4" />
                                        <h3 className="text-lg font-bold">{type.label}</h3>
                                        <p className={`text-sm ${formData.type === type.id ? "text-black/70" : "text-white/50"}`}>
                                            {type.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <h2 className="text-2xl font-bold mb-6">Item Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-white/50 mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-white/50 transition-colors"
                                        placeholder="e.g. Ultimate Design Course"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-white/50 mb-2">Price ($)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 pl-12 focus:outline-none focus:border-white/50 transition-colors"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-white/50 mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-4 h-32 focus:outline-none focus:border-white/50 transition-colors resize-none"
                                        placeholder="Describe your item..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-white/50 mb-2">Product Media (Max 7 files, max 2 videos)</label>
                                    <div className="space-y-4">
                                        <div
                                            onClick={() => imageInputRef.current?.click()}
                                            className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-white/30 transition-colors cursor-pointer bg-white/5"
                                        >
                                            <Upload className="w-8 h-8 mx-auto mb-2 text-white/50" />
                                            <p className="text-sm text-white/70">Upload Images & Videos</p>
                                            <p className="text-xs text-white/30 mt-1">JPG, PNG, MP4</p>
                                            <input
                                                ref={imageInputRef}
                                                type="file"
                                                accept="image/*,video/*"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    const currentImages = formData.images ? JSON.parse(formData.images) : [];

                                                    // Filter and validate
                                                    const newMedia = files.map(file => ({
                                                        url: URL.createObjectURL(file),
                                                        type: file.type.startsWith('video') ? 'video' : 'image'
                                                    }));

                                                    const combined = [...currentImages, ...newMedia];
                                                    const videos = combined.filter((m: any) => m.type === 'video');

                                                    if (combined.length > 7) {
                                                        alert("Maximum 7 files allowed");
                                                        return;
                                                    }
                                                    if (videos.length > 2) {
                                                        alert("Maximum 2 videos allowed");
                                                        return;
                                                    }

                                                    setFormData({ ...formData, images: JSON.stringify(combined) });
                                                }}
                                            />
                                        </div>

                                        {/* Preview Grid */}
                                        {formData.images && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {JSON.parse(formData.images).map((media: any, i: number) => (
                                                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 group">
                                                        {media.type === 'video' ? (
                                                            <video src={media.url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <img src={media.url} alt={`Media ${i}`} className="w-full h-full object-cover" />
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                const current = JSON.parse(formData.images);
                                                                const updated = current.filter((_: any, index: number) => index !== i);
                                                                setFormData({ ...formData, images: JSON.stringify(updated) });
                                                            }}
                                                            className="absolute top-1 right-1 bg-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <div className="w-3 h-3 bg-white mask-x" /> {/* Simple X icon placeholder */}
                                                            <span className="text-xs text-white font-bold">✕</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between pt-6">
                                <button
                                    onClick={handleNext}
                                    disabled={!formData.name || !formData.price}
                                    className="px-8 py-3 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <h2 className="text-2xl font-bold mb-6">Add Content</h2>

                            {["TEMPLATE", "HOPIN_PLAN"].includes(formData.type) ? (
                                <div className="space-y-4">
                                    <p className="text-white/70">Select a resource from your library to link:</p>
                                    {/* Mock Resource Selection */}
                                    <div className="grid gap-3">
                                        {[1, 2, 3].map((i) => (
                                            <button
                                                key={i}
                                                onClick={() => setFormData({ ...formData, linkedResourceId: `resource-${i}` })}
                                                className={`p-4 rounded-lg border text-left flex items-center justify-between transition-all ${formData.linkedResourceId === `resource-${i}`
                                                    ? "bg-white/10 border-white"
                                                    : "bg-white/5 border-white/10 hover:border-white/30"
                                                    }`}
                                            >
                                                <span className="font-medium">My Awesome Template {i}</span>
                                                {formData.linkedResourceId === `resource-${i}` && <Check className="w-5 h-5" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-white/40 transition-colors cursor-pointer"
                                    >
                                        <Upload className="w-12 h-12 mx-auto mb-4 text-white/50" />
                                        <p className="text-lg font-medium mb-2">
                                            {formData.digitalFileUrl && !formData.digitalFileUrl.startsWith('http') ? "File Selected" : "Upload Product File"}
                                        </p>
                                        <p className="text-sm text-white/50 mb-4">
                                            {formData.digitalFileUrl && !formData.digitalFileUrl.startsWith('http') ? formData.digitalFileUrl.split('/').pop() : "PDF, MP4, ZIP (Max 500MB)"}
                                        </p>
                                        <p className="text-xs text-white/30 bg-white/5 inline-block px-3 py-1 rounded-full">
                                            Private file delivered after purchase
                                        </p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    // Simulating upload for now
                                                    setFormData({ ...formData, digitalFileUrl: `https://fuy.com/uploads/${file.name}` });
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="h-px bg-white/10 flex-1" />
                                        <span className="text-sm text-white/30">OR</span>
                                        <div className="h-px bg-white/10 flex-1" />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-white/50 mb-2">External File URL</label>
                                        <input
                                            type="url"
                                            value={formData.digitalFileUrl.startsWith('http') ? formData.digitalFileUrl : ''}
                                            onChange={(e) => setFormData({ ...formData, digitalFileUrl: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-white/50 transition-colors"
                                            placeholder="https://drive.google.com/..."
                                        />
                                        <p className="text-xs text-white/30 mt-2">
                                            Link to your file hosted on Google Drive, Dropbox, etc.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between pt-6">
                                <button onClick={handleBack} className="px-6 py-3 rounded-lg hover:bg-white/10 transition-colors">
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    // Allow skipping for demo/mock purposes if needed, but ideally enforce selection
                                    className="px-8 py-3 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <h2 className="text-2xl font-bold mb-6">Review & List</h2>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm text-white/50 uppercase tracking-wider mb-1">Type</p>
                                        <p className="font-medium">{PRODUCT_TYPES.find(t => t.id === formData.type)?.label}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-white/50 uppercase tracking-wider mb-1">Price</p>
                                        <p className="text-xl font-bold">${formData.price}</p>
                                    </div>
                                </div>
                                <div className="h-px bg-white/10" />
                                <div>
                                    <p className="text-sm text-white/50 uppercase tracking-wider mb-1">Name</p>
                                    <p className="text-lg font-bold">{formData.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-white/50 uppercase tracking-wider mb-1">Description</p>
                                    <p className="text-white/70">{formData.description}</p>
                                </div>
                            </div>

                            <div className="flex justify-between pt-6">
                                <button onClick={handleBack} className="px-6 py-3 rounded-lg hover:bg-white/10 transition-colors">
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="px-8 py-3 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    {loading ? "Listing..." : "List Item"}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
