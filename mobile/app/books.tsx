import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, BookOpen } from 'lucide-react-native';
import { api } from '../lib/api-client';

interface Book {
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

export default function BooksScreen() {
    const router = useRouter();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            const { data, error } = await api.get<Purchase[]>('/api/user/purchases');
            if (data && !error) {
                // Filter for eBooks
                const myBooks = data.flatMap(order =>
                    order.items
                        .filter(item => item.product?.type === 'EBOOK')
                        .map(item => item.product)
                );
                setBooks(myBooks);
            }
        } catch (e) {
            console.error('Failed to fetch books:', e);
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
                        <BookOpen color="#10b981" size={28} />
                        <Text style={styles.headerTitle}>My Books</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="white" />
                    </View>
                ) : books.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <BookOpen size={48} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.emptyTitle}>No Books Yet</Text>
                        <Text style={styles.emptySubtitle}>Purchase eBooks to build your library</Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.push('/shop')}
                        >
                            <Text style={styles.browseButtonText}>Browse Books</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.gridContainer}>
                        <View style={styles.grid}>
                            {books.map((book) => {
                                const images = book.images ? JSON.parse(book.images) : [];
                                const image = images[0] || null;
                                return (
                                    <TouchableOpacity
                                        key={book.id}
                                        style={styles.bookCard}
                                        onPress={() => router.push(`/shop/product/${book.id}` as any)}
                                    >
                                        <View style={styles.bookCover}>
                                            {image ? (
                                                <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            ) : (
                                                <BookOpen size={32} color="rgba(255,255,255,0.3)" />
                                            )}
                                            <View style={styles.readBadge}>
                                                <Text style={styles.readBadgeText}>Read</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.bookName} numberOfLines={2}>{book.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
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
    gridContainer: { padding: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
    bookCard: { width: '30%' },
    bookCover: { aspectRatio: 2 / 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative' },
    readBadge: { position: 'absolute', bottom: 8, left: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 6, borderRadius: 4, alignItems: 'center' },
    readBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    bookName: { color: 'white', fontSize: 12, fontWeight: '600', lineHeight: 16 },
});
