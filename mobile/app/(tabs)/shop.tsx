import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions, TextInput, RefreshControl, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { ShopService, Brand, Product } from '../../services/ShopService';
import { Search, ShoppingCart, X, ChevronRight, Package, BookOpen, GraduationCap, LayoutTemplate } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Varied card dimension patterns for visual interest
const CARD_DIMENSIONS = [
    { width: 180, height: 220 },  // Wide tall
    { width: 140, height: 180 },  // Compact
    { width: 160, height: 200 },  // Medium
    { width: 200, height: 160 },  // Wide short
    { width: 150, height: 190 },  // Narrow tall
    { width: 170, height: 170 },  // Square-ish
];

// Get card dimensions based on index
const getCardDimensions = (index: number) => {
    return CARD_DIMENSIONS[index % CARD_DIMENSIONS.length];
};

// Product type filters
const PRODUCT_TYPES = [
    { id: 'all', label: 'All', icon: Package },
    { id: 'COURSE', label: 'Courses', icon: GraduationCap },
    { id: 'EBOOK', label: 'Books', icon: BookOpen },
    { id: 'TEMPLATE', label: 'Templates', icon: LayoutTemplate },
];

// Placeholder data for when no real data exists
const PLACEHOLDER_PRODUCTS: Product[] = [
    { id: 'p1', name: 'Premium Design Course', price: 49.99, images: 'https://picsum.photos/seed/course1/400/400', type: 'COURSE', status: 'ACTIVE', createdAt: '' },
    { id: 'p2', name: 'E-Book: Growth Mindset', price: 19.99, images: 'https://picsum.photos/seed/book1/400/400', type: 'EBOOK', status: 'ACTIVE', createdAt: '' },
    { id: 'p3', name: 'UI Template Kit', price: 29.99, images: 'https://picsum.photos/seed/template1/400/400', type: 'TEMPLATE', status: 'ACTIVE', createdAt: '' },
    { id: 'p4', name: 'Photography Basics', price: 39.99, images: 'https://picsum.photos/seed/course2/400/400', type: 'COURSE', status: 'ACTIVE', createdAt: '' },
    { id: 'p5', name: 'Business Templates', price: 24.99, images: 'https://picsum.photos/seed/template2/400/400', type: 'TEMPLATE', status: 'ACTIVE', createdAt: '' },
    { id: 'p6', name: 'Digital Marketing Guide', price: 15.99, images: 'https://picsum.photos/seed/book2/400/400', type: 'EBOOK', status: 'ACTIVE', createdAt: '' },
];

const PLACEHOLDER_BRANDS: Brand[] = [
    { id: 'b1', name: 'Design Studio', slug: 'design-studio', logoUrl: 'https://picsum.photos/seed/brand1/100/100', description: null },
    { id: 'b2', name: 'Creative Hub', slug: 'creative-hub', logoUrl: 'https://picsum.photos/seed/brand2/100/100', description: null },
    { id: 'b3', name: 'Learn Pro', slug: 'learn-pro', logoUrl: 'https://picsum.photos/seed/brand3/100/100', description: null },
    { id: 'b4', name: 'Tech Books', slug: 'tech-books', logoUrl: 'https://picsum.photos/seed/brand4/100/100', description: null },
];

export default function ShopScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    // Data
    const [products, setProducts] = useState<Product[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [myBrands, setMyBrands] = useState<Brand[]>([]);
    const [cartCount, setCartCount] = useState(0);

    // UI State
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showSearch, setShowSearch] = useState(false);
    const [usePlaceholder, setUsePlaceholder] = useState(false);

    const isDark = mode === 'dark';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';

    const fetchData = useCallback(async () => {
        try {
            const type = activeFilter === 'all' ? undefined : activeFilter;
            const [productsData, brandsData, myBrandsData, cartData] = await Promise.all([
                ShopService.fetchProducts({ type, search: searchQuery || undefined, limit: 20 }),
                ShopService.fetchBrands(6),
                ShopService.fetchUserBrands(),
                ShopService.fetchCart(),
            ]);

            // Use placeholder if no real data
            const hasRealProducts = productsData.length > 0;
            const hasRealBrands = brandsData.length > 0;

            setProducts(hasRealProducts ? productsData : PLACEHOLDER_PRODUCTS);
            setBrands(hasRealBrands ? brandsData : PLACEHOLDER_BRANDS);
            setMyBrands(myBrandsData);
            setCartCount(cartData.length);
            setUsePlaceholder(!hasRealProducts && !hasRealBrands);
        } catch (error) {
            console.error('Shop fetch error:', error);
            // Show placeholders on error
            setProducts(PLACEHOLDER_PRODUCTS);
            setBrands(PLACEHOLDER_BRANDS);
            setUsePlaceholder(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeFilter, searchQuery]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getProductImage = (product: Product): string => {
        if (product.images) {
            try {
                const imgs = JSON.parse(product.images);
                return imgs[0] || 'https://picsum.photos/seed/product/400/400';
            } catch {
                return product.images;
            }
        }
        return 'https://picsum.photos/seed/product/400/400';
    };

    // Modern Minimalist Product Card
    const ProductCard = ({ product, index = 0, isGrid = false }: { product: Product; index?: number; isGrid?: boolean }) => {
        const dims = getCardDimensions(index);
        const cardWidth = isGrid ? (width - 48) / 2 : dims.width;
        const cardHeight = isGrid ? (cardWidth * 1.15) : dims.height;

        return (
            <TouchableOpacity
                onPress={() => !usePlaceholder && router.push(`/shop/product/${product.id}`)}
                style={{
                    width: cardWidth,
                    height: cardHeight,
                    marginRight: isGrid ? 0 : 12,
                    marginBottom: isGrid ? 16 : 0,
                    borderRadius: 20,
                    overflow: 'hidden',
                }}
                activeOpacity={0.9}
            >
                <Image
                    source={{ uri: getProductImage(product) }}
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0'
                    }}
                    resizeMode="cover"
                />
                {/* Gradient overlay at bottom for text */}
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 40,
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    justifyContent: 'center',
                    paddingHorizontal: 10,
                }}>
                    <Text
                        numberOfLines={1}
                        style={{
                            fontSize: 9,
                            fontWeight: '500',
                            color: '#fff',
                            letterSpacing: 0.3,
                            fontStyle: 'italic',
                        }}
                    >
                        {product.name}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Brand Banner Card - Wide horizontal banner style
    const BrandCard = ({ brand, index = 0 }: { brand: Brand; index?: number }) => (
        <TouchableOpacity
            onPress={() => !usePlaceholder && router.push(`/shop/brand/${brand.slug}`)}
            style={{
                width: 280,
                height: 120,
                marginRight: 14,
                borderRadius: 16,
                overflow: 'hidden',
            }}
        >
            {brand.logoUrl ? (
                <Image
                    source={{ uri: brand.logoUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                />
            ) : (
                <View style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: isDark ? '#2a2a2a' : '#e8e8e8',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Text style={{ fontSize: 32, fontWeight: '200', color: subtleText, letterSpacing: 4 }}>{brand.name[0]}</Text>
                </View>
            )}
            {/* Overlay with brand name */}
            <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 32,
                backgroundColor: 'rgba(0,0,0,0.45)',
                justifyContent: 'center',
                paddingHorizontal: 12,
            }}>
                <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: '#fff',
                        letterSpacing: 1,
                    }}
                >
                    {brand.name}
                </Text>
            </View>
        </TouchableOpacity>
    );

    // Section Header Component with stylish font
    const SectionHeader = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 12 }}>
            <Text style={{
                fontSize: 16,
                fontWeight: '300',
                color: colors.text,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
            }}>{title}</Text>
            {onSeeAll && (
                <TouchableOpacity onPress={onSeeAll} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: subtleText, fontStyle: 'italic' }}>see all</Text>
                    <ChevronRight size={12} color={subtleText} />
                </TouchableOpacity>
            )}
        </View>
    );

    // Auto-scrolling section with manual scroll support
    const AutoScrollSection = ({ products: sectionProducts, baseIndex = 0, reverse = false }: { products: Product[]; baseIndex?: number; reverse?: boolean }) => {
        const scrollViewRef = useRef<ScrollView>(null);
        const scrollOffset = useRef(0);
        const isUserScrolling = useRef(false);
        const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
        const animationFrame = useRef<number | null>(null);

        // Calculate total width
        const cardAvgWidth = 180;
        const totalWidth = sectionProducts.length * cardAvgWidth;

        // Duplicate products for seamless loop
        const duplicatedProducts = [...sectionProducts, ...sectionProducts, ...sectionProducts];

        useEffect(() => {
            let scrollPosition = reverse ? totalWidth * 2 : totalWidth;
            scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: false });
            scrollOffset.current = scrollPosition;

            const autoScroll = () => {
                if (isUserScrolling.current) {
                    animationFrame.current = requestAnimationFrame(autoScroll);
                    return;
                }

                scrollPosition += reverse ? -0.5 : 0.5;

                // Loop logic
                if (!reverse && scrollPosition >= totalWidth * 2) {
                    scrollPosition = totalWidth;
                    scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: false });
                } else if (reverse && scrollPosition <= totalWidth) {
                    scrollPosition = totalWidth * 2;
                    scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: false });
                } else {
                    scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: false });
                }

                scrollOffset.current = scrollPosition;
                animationFrame.current = requestAnimationFrame(autoScroll);
            };

            animationFrame.current = requestAnimationFrame(autoScroll);

            return () => {
                if (animationFrame.current) {
                    cancelAnimationFrame(animationFrame.current);
                }
                if (autoScrollTimer.current) {
                    clearTimeout(autoScrollTimer.current);
                }
            };
        }, [sectionProducts.length, reverse, totalWidth]);

        const handleScrollBegin = () => {
            isUserScrolling.current = true;
            if (autoScrollTimer.current) {
                clearTimeout(autoScrollTimer.current);
            }
        };

        const handleScrollEnd = () => {
            // Resume auto-scroll after 1.5 seconds of inactivity
            autoScrollTimer.current = setTimeout(() => {
                isUserScrolling.current = false;
            }, 1500);
        };

        return (
            <View style={{ height: 220, marginTop: 4 }}>
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onScrollBeginDrag={handleScrollBegin}
                    onScrollEndDrag={handleScrollEnd}
                    onMomentumScrollEnd={handleScrollEnd}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingLeft: 20 }}
                >
                    {duplicatedProducts.map((product, idx) => (
                        <ProductCard
                            key={`${product.id}-${idx}`}
                            product={product}
                            index={baseIndex + (idx % sectionProducts.length)}
                        />
                    ))}
                </ScrollView>
            </View>
        );
    };

    const courses = products.filter(p => p.type === 'COURSE');
    const books = products.filter(p => p.type === 'EBOOK');
    const templates = products.filter(p => p.type === 'TEMPLATE');

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 24, fontWeight: '200', color: colors.text, letterSpacing: 2 }}>SHOP</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {/* s.o. fuy button */}
                            <TouchableOpacity
                                onPress={() => router.push('/shop/sell')}
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 12,
                                    backgroundColor: colors.text,
                                }}
                            >
                                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.background, letterSpacing: 0.5 }}>s.o. fuy</Text>
                            </TouchableOpacity>
                            {/* Create Brand / My Store button */}
                            <TouchableOpacity
                                onPress={() => myBrands.length > 0 ? router.push('/dashboard/store') : router.push('/shop/create-brand')}
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.text,
                                }}
                            >
                                <Text style={{ fontSize: 9, fontWeight: '500', color: colors.text, letterSpacing: 0.5 }}>
                                    {myBrands.length > 0 ? 'store' : 'create'}
                                </Text>
                            </TouchableOpacity>
                            {/* Search */}
                            <TouchableOpacity
                                onPress={() => setShowSearch(!showSearch)}
                                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Search size={16} color={colors.text} />
                            </TouchableOpacity>
                            {/* Cart */}
                            <TouchableOpacity
                                onPress={() => router.push('/cart')}
                                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ShoppingCart size={16} color={colors.text} />
                                {cartCount > 0 && (
                                    <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', borderRadius: 6, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{cartCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Search Bar */}
                    {showSearch && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 10,
                            backgroundColor: cardBg,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            borderWidth: 1,
                            borderColor,
                        }}>
                            <Search size={14} color={subtleText} />
                            <TextInput
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search..."
                                placeholderTextColor={subtleText}
                                style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 10, fontSize: 13, color: colors.text }}
                                returnKeyType="search"
                                onSubmitEditing={() => fetchData()}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => { setSearchQuery(''); fetchData(); }}>
                                    <X size={14} color={subtleText} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Type Filters */}
                <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {PRODUCT_TYPES.map(type => {
                            const Icon = type.icon;
                            const isActive = activeFilter === type.id;
                            return (
                                <TouchableOpacity
                                    key={type.id}
                                    onPress={() => setActiveFilter(type.id)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        marginRight: 8,
                                        backgroundColor: isActive ? colors.text : cardBg,
                                        gap: 5,
                                    }}
                                >
                                    <Icon size={13} color={isActive ? colors.background : colors.text} />
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? colors.background : colors.text }}>{type.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Content */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                    showsVerticalScrollIndicator={false}
                >

                    {loading ? (
                        <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
                            <ActivityIndicator color={colors.text} />
                        </View>
                    ) : (
                        <>
                            {/* Placeholder Banner */}
                            {usePlaceholder && (
                                <View style={{
                                    backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)',
                                    borderRadius: 12,
                                    padding: 14,
                                    marginBottom: 20,
                                    borderWidth: 1,
                                    borderColor: 'rgba(168,85,247,0.3)',
                                }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#a855f7' }}>Sample Data</Text>
                                    <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', marginTop: 2 }}>
                                        This is placeholder data. Real products will appear once added.
                                    </Text>
                                </View>
                            )}

                            {/* Brands Section */}
                            {brands.length > 0 && (
                                <View style={{ marginBottom: 24 }}>
                                    <SectionHeader title="Top Brands" onSeeAll={() => router.push('/shop/brands')} />
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {brands.map(brand => <BrandCard key={brand.id} brand={brand} />)}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Courses Section - Auto-scrolling */}
                            {courses.length > 0 && (
                                <View style={{ marginBottom: 24, marginHorizontal: -20, overflow: 'hidden' }}>
                                    <View style={{ paddingHorizontal: 20 }}>
                                        <SectionHeader title="Learn & Grow" />
                                    </View>
                                    <AutoScrollSection products={courses} baseIndex={0} />
                                </View>
                            )}

                            {/* Books Section - Auto-scrolling */}
                            {books.length > 0 && (
                                <View style={{ marginBottom: 24, marginHorizontal: -20, overflow: 'hidden' }}>
                                    <View style={{ paddingHorizontal: 20 }}>
                                        <SectionHeader title="Books & Guides" />
                                    </View>
                                    <AutoScrollSection products={books} baseIndex={2} reverse />
                                </View>
                            )}

                            {/* Templates Section - Auto-scrolling */}
                            {templates.length > 0 && (
                                <View style={{ marginBottom: 24, marginHorizontal: -20, overflow: 'hidden' }}>
                                    <View style={{ paddingHorizontal: 20 }}>
                                        <SectionHeader title="Templates & Tools" />
                                    </View>
                                    <AutoScrollSection products={templates} baseIndex={4} />
                                </View>
                            )}

                            {/* All Products Grid */}
                            <SectionHeader title="Browse All" />
                            {products.length > 0 ? (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                    {products.map((product, idx) => <ProductCard key={product.id} product={product} index={idx} isGrid />)}
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                                    <Package size={40} color={subtleText} />
                                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 12 }}>
                                        {searchQuery ? 'No results' : 'No products yet'}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: subtleText, marginTop: 4 }}>
                                        {searchQuery ? 'Try a different search' : 'Check back later'}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
