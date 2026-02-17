// LillForm - Fixed Preview using Native Poster & Re-added Slashes
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions, StyleSheet, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../../context/AuthContext';
import { X, ArrowLeft, Globe, Users, Lock, Play, Check, Upload, Hash, Plus, Music, Mic, Disc, Image as ImageIcon } from 'lucide-react-native';
import { MediaUploadService } from '../../services/MediaUploadService';
import { supabase } from '../../lib/supabase';
import SuccessOverlay from '../SuccessOverlay';
import { PostService, PostVisibility } from '../../services/PostService';

const { width: SW } = Dimensions.get('window');
const PREVIEW_WIDTH = SW * 0.6; // Slightly smaller to ensure fit
const PREVIEW_HEIGHT = PREVIEW_WIDTH * (16 / 9);

export default function LillForm({ onBack }: { onBack: () => void }) {
    const { session } = useAuth();
    const videoRef = useRef<Video>(null);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [posterUri, setPosterUri] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [caption, setCaption] = useState('');
    const [visibility, setVisibility] = useState<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>('PUBLIC');
    const [filter, setFilter] = useState('none');
    const [picking, setPicking] = useState(false);
    const [posting, setPosting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [success, setSuccess] = useState(false);
    const [slashInput, setSlashInput] = useState('');
    const [slashes, setSlashes] = useState<string[]>([]);

    // Audio state
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [audioName, setAudioName] = useState<string | null>(null);
    const [showAudioPicker, setShowAudioPicker] = useState(false);

    const FILTERS = [
        { id: 'none', label: 'None', color: 'transparent', overlay: 'transparent' },
        { id: 'warm', label: 'Warm', color: '#D4915C', overlay: 'rgba(255,150,50,0.25)' },
        { id: 'cool', label: 'Cool', color: '#4A7AB0', overlay: 'rgba(50,120,220,0.25)' },
        { id: 'dark', label: 'Dark', color: '#333333', overlay: 'rgba(0,0,0,0.4)' },
    ];

    const generateThumbnail = async (uri: string) => {
        try {
            const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(uri, { time: 500 });
            setPosterUri(thumb);
        } catch (e) {
            console.log('Thumb error:', e);
        }
    };

    const pickThumbnail = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [9, 16],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setPosterUri(result.assets[0].uri);
            }
        } catch (e) {
            console.error('Thumbnail pick error:', e);
        }
    };

    const pick = async () => {
        if (picking) return;
        setPicking(true);
        setIsPlaying(false);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsEditing: true,
                quality: 0.8,
                videoMaxDuration: 60,
            });
            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setVideoUri(asset.uri);
                setDuration(asset.duration ? Math.floor(asset.duration / 1000) : 0);
                setIsPlaying(false);
                // Generate poster immediately
                generateThumbnail(asset.uri);
            }
        } catch (e) {
            console.error('Video pick error:', e);
        }
        setPicking(false);
    };

    const pickAudio = () => {
        setShowAudioPicker(true);
    };

    const selectAudioSource = (type: 'library' | 'original') => {
        if (type === 'library') {
            setAudioName('Trending Audio');
            setAudioUri('library://trending');
        } else {
            setAudioName('Original Sound');
            setAudioUri('original');
        }
        setShowAudioPicker(false);
    };

    const clearAudio = () => {
        setAudioUri(null);
        setAudioName(null);
    };

    const clear = () => {
        setVideoUri(null);
        setPosterUri(null);
        setDuration(0);
        setFilter('none');
        setIsPlaying(false);
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const addSlash = () => {
        const tag = slashInput.trim().replace(/^#/, '').toLowerCase();
        if (tag && !slashes.includes(tag) && slashes.length < 10) {
            setSlashes([...slashes, tag]);
            setSlashInput('');
        }
    };

    const removeSlash = (tag: string) => {
        setSlashes(slashes.filter(s => s !== tag));
    };

    const post = async () => {
        if (!videoUri || !session?.user?.email) return;
        setPosting(true);
        setProgress(0);
        try {
            const { data: u } = await supabase.from('User').select('id').eq('email', session.user.email).single();
            if (!u?.id) throw new Error('User not found');
            setProgress(20);

            // Upload Video
            const upload = await MediaUploadService.uploadVideo(videoUri, `lill_${Date.now()}.mp4`);
            setProgress(60);

            // Upload Thumbnail (if available)
            let uploadedThumbnailUrl = null;
            if (posterUri) {
                try {
                    const thumbUpload = await MediaUploadService.uploadImage(posterUri, `lill_thumb_${Date.now()}.jpg`);
                    uploadedThumbnailUrl = thumbUpload.url;
                } catch (e) {
                    console.log('Thumbnail upload failed, proceeding without it:', e);
                }
            }
            setProgress(80);

            await PostService.createPost({
                userId: u.id,
                postType: 'LILL',
                content: caption || 'New Lill',
                visibility: visibility as PostVisibility,
                media: [{ uri: upload.url, type: 'VIDEO', duration: duration || 60, thumbnailUrl: uploadedThumbnailUrl || undefined }], // Add to media
                lillData: {
                    duration: duration || 60,
                    aspectRatio: '9:16',
                    thumbnailUrl: uploadedThumbnailUrl || undefined // Add to lillData
                },
                slashes: slashes,
            });
            setProgress(100);
            setSuccess(true);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
        setPosting(false);
    };

    const currentFilter = FILTERS.find(f => f.id === filter);

    return (
        <View style={s.root}>
            {/* HEADER */}
            <View style={s.hdr}>
                <TouchableOpacity onPress={onBack} style={s.back}>
                    <ArrowLeft size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={s.title}>Create Lill</Text>
            </View>

            <ScrollView style={s.scroll} contentContainerStyle={s.content}>
                {/* PREVIEW */}
                <Text style={s.lbl}>POST PREVIEW</Text>

                <View style={s.previewContainer}>
                    <TouchableOpacity
                        onPress={videoUri ? togglePlay : pick}
                        activeOpacity={1}
                        style={[s.mediaBox, !videoUri && s.mediaBoxEmpty]}
                    >
                        {videoUri ? (
                            <View style={s.videoWrapper}>
                                <Video
                                    ref={videoRef}
                                    source={{ uri: videoUri }}
                                    style={s.video}
                                    resizeMode={ResizeMode.COVER}
                                    shouldPlay={isPlaying}
                                    isLooping
                                    isMuted={!!audioUri}
                                    useNativeControls={false}
                                    usePoster={true}
                                    posterSource={posterUri ? { uri: posterUri } : undefined}
                                    posterStyle={{ resizeMode: 'cover' }}
                                />

                                {/* Filter overlay */}
                                <View style={[s.filterOverlay, { backgroundColor: currentFilter?.overlay || 'transparent' }]} />

                                {/* Play Button overlay */}
                                {!isPlaying && (
                                    <View style={s.playOverlay}>
                                        <View style={s.playBtn}>
                                            <Play size={28} color="#fff" fill="#fff" />
                                        </View>
                                        <Text style={s.tapToPlay}>Preview</Text>
                                    </View>
                                )}

                                <View style={s.durBadge}>
                                    <Text style={s.durTxt}>{duration}s</Text>
                                </View>
                            </View>
                        ) : picking ? (
                            <ActivityIndicator color="#fff" size="large" />
                        ) : (
                            <View style={s.center}>
                                <View style={s.playCircle}>
                                    <Play size={32} color="#fff" />
                                </View>
                                <Text style={s.emptyTxt}>Select Video</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Actions outside */}
                    {videoUri && (
                        <View style={s.actionsRight}>
                            <TouchableOpacity onPress={clear} style={s.actionBtn}>
                                <X size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={pick} style={s.actionBtn}>
                                <Upload size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={pickThumbnail} style={s.actionBtn}>
                                <ImageIcon size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* FILTERS */}
                {videoUri && (
                    <>
                        <Text style={s.lbl}>FILTER</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
                            {FILTERS.map(f => (
                                <TouchableOpacity key={f.id} onPress={() => setFilter(f.id)} style={s.filterBtn}>
                                    <View style={[s.filterCircle, filter === f.id && s.filterActive, { backgroundColor: f.id === 'none' ? '#333' : f.color }]}>
                                        {filter === f.id && <Check size={14} color="#fff" />}
                                    </View>
                                    <Text style={[s.filterLabel, filter === f.id && s.filterLabelActive]}>{f.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* AUDIO */}
                <Text style={s.lbl}>AUDIO / MUSIC</Text>
                {audioUri ? (
                    <View style={s.audioSelected}>
                        <View style={s.audioIcon}><Music size={20} color="#fff" /></View>
                        <View style={s.audioInfo}>
                            <Text style={s.audioName} numberOfLines={1}>{audioName}</Text>
                            <Text style={s.audioSource}>Tap to preview</Text>
                        </View>
                        <TouchableOpacity onPress={clearAudio} style={s.audioRemove}><X size={16} color="#888" /></TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity onPress={pickAudio} style={s.audioBtn}>
                        <Music size={20} color="#888" />
                        <Text style={s.audioBtnTxt}>Add Music or Sound</Text>
                        <Plus size={18} color="#888" />
                    </TouchableOpacity>
                )}

                {/* CAPTION */}
                <Text style={s.lbl}>CAPTION</Text>
                <TextInput value={caption} onChangeText={setCaption} placeholder="Write something..." placeholderTextColor="#666" style={s.input} multiline maxLength={300} />

                {/* SLASHES / TAGS */}
                <Text style={s.lbl}>SLASHES</Text>
                <View style={s.slashInputRow}>
                    <Hash size={16} color="#666" />
                    <TextInput
                        value={slashInput}
                        onChangeText={setSlashInput}
                        placeholder="Add a slash tag..."
                        placeholderTextColor="#666"
                        style={s.slashInput}
                        onSubmitEditing={addSlash}
                        returnKeyType="done"
                    />
                    <TouchableOpacity onPress={addSlash} style={s.addSlashBtn}>
                        <Plus size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
                {slashes.length > 0 && (
                    <View style={s.slashTags}>
                        {slashes.map(tag => (
                            <TouchableOpacity key={tag} onPress={() => removeSlash(tag)} style={s.slashTag}>
                                <Text style={s.slashTagTxt}>#{tag}</Text>
                                <X size={12} color="#888" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* VISIBILITY */}
                <Text style={s.lbl}>VISIBILITY</Text>
                <View style={s.visRow}>
                    {[{ v: 'PUBLIC', l: 'Public', I: Globe }, { v: 'FRIENDS', l: 'Friends', I: Users }, { v: 'PRIVATE', l: 'Private', I: Lock }].map((o: any) => (
                        <TouchableOpacity key={o.v} onPress={() => setVisibility(o.v)} style={[s.visBtn, visibility === o.v && s.visBtnActive]}>
                            <o.I size={14} color={visibility === o.v ? '#000' : '#888'} />
                            <Text style={[s.visTxt, visibility === o.v && s.visTxtActive]}>{o.l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* POST BUTTON */}
                <TouchableOpacity onPress={post} disabled={posting || !videoUri} style={[s.postBtn, (!videoUri || posting) && s.postBtnOff]}>
                    {posting ? <ActivityIndicator color="#000" /> : <Text style={s.postTxt}>POST LILL</Text>}
                </TouchableOpacity>
            </ScrollView>
            <SuccessOverlay visible={success} message="Posted!" onFinish={onBack} />

            {/* AUDIO PICKER MODAL */}
            <Modal visible={showAudioPicker} transparent animationType="fade" onRequestClose={() => setShowAudioPicker(false)}>
                <View style={s.modalOverlay}>
                    <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowAudioPicker(false)} />
                    <BlurView intensity={40} tint="dark" style={s.modalContent}>
                        <View style={s.modalHandle} />
                        <Text style={s.modalTitle}>Choose Audio</Text>

                        <TouchableOpacity style={s.modalOption} onPress={() => selectAudioSource('library')}>
                            <View style={[s.modalIconBox, { backgroundColor: '#FF3366' }]}>
                                <Disc size={24} color="#fff" />
                            </View>
                            <View>
                                <Text style={s.modalOptionTitle}>Music Library</Text>
                                <Text style={s.modalOptionDesc}>Browse trending tracks & sounds</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.modalOption} onPress={() => selectAudioSource('original')}>
                            <View style={[s.modalIconBox, { backgroundColor: '#3366FF' }]}>
                                <Mic size={24} color="#fff" />
                            </View>
                            <View>
                                <Text style={s.modalOptionTitle}>Original Audio</Text>
                                <Text style={s.modalOptionDesc}>Use audio from your video</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.modalCancel} onPress={() => setShowAudioPicker(false)}>
                            <Text style={s.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </BlurView>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },

    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject },
    modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, overflow: 'hidden' },
    modalHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
    modalIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    modalOptionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 2 },
    modalOptionDesc: { color: '#888', fontSize: 13 },
    modalCancel: { marginTop: 12, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#222' },
    modalCancelText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    hdr: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
    title: { color: '#fff', fontSize: 18, fontWeight: '700', marginLeft: 12 },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 60 },
    lbl: { color: '#888', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginTop: 20 },

    // Preview
    previewContainer: { flexDirection: 'row', justifyContent: 'center' },
    mediaBox: { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, backgroundColor: '#111', borderRadius: 12 },
    mediaBoxEmpty: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#444' },
    videoWrapper: { width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
    video: { width: '100%', height: '100%', backgroundColor: '#000' }, // Ensure black bg
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    actionsRight: { marginLeft: 16, gap: 12, paddingTop: 10 },
    actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },

    // Play overlay
    playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    playBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
    tapToPlay: { color: '#fff', fontSize: 11, marginTop: 8, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
    filterOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
    durBadge: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    durTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

    playCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    emptyTxt: { color: '#888', fontSize: 14, fontWeight: '600' },

    // Filters
    filterRow: { marginBottom: 10 },
    filterBtn: { alignItems: 'center', marginRight: 16 },
    filterCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', marginBottom: 4 },
    filterActive: { borderColor: '#fff' },
    filterLabel: { color: '#666', fontSize: 10, fontWeight: '500' },
    filterLabelActive: { color: '#fff' },

    // Audio
    audioBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#222', gap: 10 },
    audioBtnTxt: { flex: 1, color: '#888', fontSize: 14 },
    audioSelected: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333', gap: 12 },
    audioIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
    audioInfo: { flex: 1 },
    audioName: { color: '#fff', fontSize: 14, fontWeight: '600' },
    audioSource: { color: '#666', fontSize: 11, marginTop: 2 },
    audioRemove: { padding: 8 },

    input: { color: '#fff', backgroundColor: '#111', padding: 14, borderRadius: 12, minHeight: 80, textAlignVertical: 'top', fontSize: 15, borderWidth: 1, borderColor: '#222' },

    // Slashes
    slashInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#222' },
    slashInput: { flex: 1, color: '#fff', paddingVertical: 12, marginLeft: 8, fontSize: 14 },
    addSlashBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
    slashTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    slashTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: '#333' },
    slashTagTxt: { color: '#fff', fontSize: 13 },

    // Vis
    visRow: { flexDirection: 'row', gap: 10 },
    visBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333', gap: 6, backgroundColor: '#111' },
    visBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
    visTxt: { color: '#888', fontSize: 12, fontWeight: '600' },
    visTxtActive: { color: '#000' },

    postBtn: { backgroundColor: '#fff', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 28 },
    postBtnOff: { opacity: 0.3 },
    postTxt: { color: '#000', fontSize: 15, fontWeight: '700' },

    progBox: { marginTop: 24, alignItems: 'center' },
    progBar: { width: '100%', height: 4, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden' },
    progFill: { height: '100%', backgroundColor: '#fff' },
    progTxt: { color: '#666', fontSize: 11, marginTop: 8 },
});
