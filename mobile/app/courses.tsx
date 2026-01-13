import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, GraduationCap, Play } from 'lucide-react-native';
import { api } from '../lib/api-client';

interface Course {
    id: string;
    name: string;
    images: string;
    description: string;
}

interface Purchase {
    id: string;
    items: {
        id: string;
        product: {
            id: string;
            name: string;
            images: string;
            type: string;
            description: string;
        };
    }[];
}

export default function CoursesScreen() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data, error } = await api.get<Purchase[]>('/api/user/purchases');
            if (data && !error) {
                // Filter for courses
                const myCourses = data.flatMap(order =>
                    order.items
                        .filter(item => item.product?.type === 'COURSE')
                        .map(item => item.product)
                );
                setCourses(myCourses);
            }
        } catch (e) {
            console.error('Failed to fetch courses:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <GraduationCap color="#f59e0b" size={28} />
                        <Text style={styles.headerTitle}>My Courses</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="white" />
                    </View>
                ) : courses.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <GraduationCap size={48} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.emptyTitle}>No Courses Yet</Text>
                        <Text style={styles.emptySubtitle}>Purchase courses to start learning</Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.push('/shop')}
                        >
                            <Text style={styles.browseButtonText}>Browse Courses</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.listContainer}>
                        {courses.map((course) => {
                            const images = course.images ? JSON.parse(course.images) : [];
                            const image = images[0] || null;
                            return (
                                <TouchableOpacity
                                    key={course.id}
                                    style={styles.courseCard}
                                    onPress={() => router.push(`/shop/product/${course.id}` as any)}
                                >
                                    <View style={styles.courseImage}>
                                        {image ? (
                                            <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                        ) : (
                                            <GraduationCap size={32} color="rgba(255,255,255,0.3)" />
                                        )}
                                        <View style={styles.playOverlay}>
                                            <View style={styles.playButton}>
                                                <Play size={24} color="black" fill="black" />
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.courseInfo}>
                                        <Text style={styles.courseName}>{course.name}</Text>
                                        <Text style={styles.courseDesc} numberOfLines={2}>{course.description}</Text>
                                        <View style={styles.progressContainer}>
                                            <View style={styles.progressBar}>
                                                <View style={[styles.progressFill, { width: '0%' }]} />
                                            </View>
                                            <Text style={styles.progressText}>0% Complete</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
    emptySubtitle: { color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center' },
    browseButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: 'white', borderRadius: 999 },
    browseButtonText: { color: 'black', fontWeight: 'bold' },
    listContainer: { padding: 16, gap: 16 },
    courseCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    courseImage: { aspectRatio: 16 / 9, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    playOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    playButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
    courseInfo: { padding: 16 },
    courseName: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    courseDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16 },
    progressContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 },
    progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: '#f59e0b' },
    progressText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});
