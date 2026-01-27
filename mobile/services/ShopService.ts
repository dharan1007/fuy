import { supabase, supabaseAdmin } from '../lib/supabase';

// Types
export interface Brand {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    slug: string;
    ownerId?: string;
    _count?: { followers: number; products: number };
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    images: string | null;
    externalUrl?: string;
    brandId?: string;
    brand?: { name: string; slug: string };
    type: 'PHYSICAL' | 'COURSE' | 'EBOOK' | 'TEMPLATE' | 'HOPIN_PLAN' | 'DIGITAL_ASSET';
    category?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
    sellerId?: string;
    seller?: { name: string; image: string | null };
    createdAt: string;
}

export interface ShopAnalytics {
    totalViews: number;
    activeListings: number;
    totalOrders: number;
    totalRevenue: number;
}

// CUID generator for new records
function generateCuid(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    return `c${timestamp}${randomPart}${randomPart2}`.substring(0, 25);
}

// Get current user ID from Supabase auth
async function getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Not authenticated');
    return user.id;
}

// Use admin client for writes, regular client for reads
function getWriteClient() {
    return supabaseAdmin || supabase;
}

export const ShopService = {
    // ==================== BRANDS ====================

    async fetchBrands(limit = 20): Promise<Brand[]> {
        try {
            const { data, error } = await supabase
                .from('Brand')
                .select('id, name, description, logoUrl, slug, ownerId')
                .order('createdAt', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[ShopService] fetchBrands error:', error);
            return [];
        }
    },

    async fetchUserBrands(): Promise<Brand[]> {
        try {
            const userId = await getCurrentUserId();
            const { data, error } = await supabase
                .from('Brand')
                .select('id, name, description, logoUrl, slug, ownerId')
                .eq('ownerId', userId);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[ShopService] fetchUserBrands error:', error);
            return [];
        }
    },

    async fetchBrandBySlug(slug: string): Promise<Brand | null> {
        try {
            const { data, error } = await supabase
                .from('Brand')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[ShopService] fetchBrandBySlug error:', error);
            return null;
        }
    },

    async createBrand(brand: { name: string; description?: string; logoUrl?: string }): Promise<Brand | null> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();
            const slug = brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const { data, error } = await writeClient
                .from('Brand')
                .insert({
                    id: generateCuid(),
                    ownerId: userId,
                    name: brand.name,
                    description: brand.description || null,
                    logoUrl: brand.logoUrl || null,
                    slug,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[ShopService] createBrand error:', error);
            return null;
        }
    },

    // ==================== PRODUCTS ====================

    async fetchProducts(options: {
        type?: string;
        category?: string;
        brandId?: string;
        limit?: number;
        search?: string;
    } = {}): Promise<Product[]> {
        try {
            let query = supabase
                .from('Product')
                .select(`
                    id, name, description, price, images, externalUrl, 
                    type, category, status, createdAt, brandId,
                    brand:Brand(name, slug),
                    seller:User!sellerId(name, profile:Profile(avatarUrl))
                `)
                .eq('status', 'ACTIVE')
                .order('createdAt', { ascending: false });

            if (options.type) query = query.eq('type', options.type);
            if (options.category) query = query.eq('category', options.category);
            if (options.brandId) query = query.eq('brandId', options.brandId);
            if (options.search) query = query.ilike('name', `%${options.search}%`);
            if (options.limit) query = query.limit(options.limit);

            const { data, error } = await query;
            if (error) throw error;

            return (data || []).map(p => ({
                ...p,
                brand: Array.isArray(p.brand) && p.brand.length > 0
                    ? { name: p.brand[0].name, slug: p.brand[0].slug }
                    : (p.brand as unknown as { name: string; slug: string } | undefined),
                seller: p.seller ? {
                    name: (p.seller as any).name,
                    image: (p.seller as any).profile?.avatarUrl || null,
                } : undefined,
            }));
        } catch (error) {
            console.error('[ShopService] fetchProducts error:', error);
            return [];
        }
    },

    async fetchNewArrivals(limit = 8): Promise<Product[]> {
        return this.fetchProducts({ limit });
    },

    async fetchCourses(limit = 6): Promise<Product[]> {
        return this.fetchProducts({ type: 'COURSE', limit });
    },

    async fetchBooks(limit = 6): Promise<Product[]> {
        return this.fetchProducts({ type: 'EBOOK', limit });
    },

    async fetchTemplates(limit = 6): Promise<Product[]> {
        return this.fetchProducts({ type: 'TEMPLATE', limit });
    },

    async fetchUserProducts(): Promise<Product[]> {
        try {
            const userId = await getCurrentUserId();
            const { data, error } = await supabase
                .from('Product')
                .select('*')
                .eq('sellerId', userId)
                .order('createdAt', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[ShopService] fetchUserProducts error:', error);
            return [];
        }
    },

    async fetchProductById(id: string): Promise<Product | null> {
        try {
            const { data, error } = await supabase
                .from('Product')
                .select(`
                    *,
                    brand:Brand(name, slug, logoUrl),
                    seller:User!sellerId(name, profile:Profile(avatarUrl))
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[ShopService] fetchProductById error:', error);
            return null;
        }
    },

    async createProduct(product: {
        name: string;
        description?: string;
        price: number;
        images?: string[];
        type: 'PHYSICAL' | 'COURSE' | 'EBOOK' | 'TEMPLATE' | 'HOPIN_PLAN' | 'DIGITAL_ASSET';
        category?: string;
        externalUrl?: string;
        brandId?: string;
    }): Promise<Product | null> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            const { data, error } = await writeClient
                .from('Product')
                .insert({
                    id: generateCuid(),
                    sellerId: userId,
                    name: product.name,
                    description: product.description || '',
                    price: product.price,
                    images: product.images ? JSON.stringify(product.images) : null,
                    type: product.type,
                    category: product.category || null,
                    externalUrl: product.externalUrl || null,
                    brandId: product.brandId || null,
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[ShopService] createProduct error:', error);
            return null;
        }
    },

    async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            const { data, error } = await writeClient
                .from('Product')
                .update({
                    ...updates,
                    images: updates.images ? JSON.stringify(updates.images) : undefined,
                    updatedAt: new Date().toISOString(),
                })
                .eq('id', id)
                .eq('sellerId', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[ShopService] updateProduct error:', error);
            return null;
        }
    },

    async deleteProduct(id: string): Promise<boolean> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            const { error } = await writeClient
                .from('Product')
                .delete()
                .eq('id', id)
                .eq('sellerId', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[ShopService] deleteProduct error:', error);
            return false;
        }
    },

    // ==================== ANALYTICS ====================

    async fetchStoreAnalytics(): Promise<ShopAnalytics> {
        try {
            const userId = await getCurrentUserId();

            // Get products for this user
            const { data: products, count: activeListings } = await supabase
                .from('Product')
                .select('id', { count: 'exact' })
                .eq('sellerId', userId)
                .eq('status', 'ACTIVE');

            const productIds = (products || []).map(p => p.id);
            if (productIds.length === 0) {
                return { totalViews: 0, activeListings: 0, totalOrders: 0, totalRevenue: 0 };
            }

            // Get order items for these products
            const { data: orderItems } = await supabase
                .from('OrderItem')
                .select('price, quantity')
                .in('productId', productIds);

            const totalOrders = orderItems?.length || 0;
            const totalRevenue = orderItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;

            return {
                totalViews: 0, // ProductView table may not exist
                activeListings: activeListings || 0,
                totalOrders,
                totalRevenue,
            };
        } catch (error) {
            console.error('[ShopService] fetchStoreAnalytics error:', error);
            return { totalViews: 0, activeListings: 0, totalOrders: 0, totalRevenue: 0 };
        }
    },

    // ==================== INTERESTS ====================

    async fetchInterests(): Promise<string[]> {
        try {
            const userId = await getCurrentUserId();
            const { data } = await supabase
                .from('Profile')
                .select('shoppingInterests')
                .eq('userId', userId)
                .single();

            return data?.shoppingInterests || [];
        } catch (error) {
            return [];
        }
    },

    async saveInterests(interests: string[]): Promise<boolean> {
        try {
            const userId = await getCurrentUserId();
            const writeClient = getWriteClient();

            const { error } = await writeClient
                .from('Profile')
                .update({ shoppingInterests: interests })
                .eq('userId', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[ShopService] saveInterests error:', error);
            return false;
        }
    },

    // ==================== CART ====================
    // TODO: CartItem table does not exist in the database yet.
    // These functions return gracefully until the table is created.

    async addToCart(productId: string, quantity = 1): Promise<boolean> {
        // CartItem table not implemented in database
        console.log('[ShopService] Cart feature not yet implemented');
        return false;
    },

    async fetchCart(): Promise<any[]> {
        // CartItem table not implemented in database
        return [];
    },

    async removeFromCart(cartItemId: string): Promise<boolean> {
        // CartItem table not implemented in database
        console.log('[ShopService] Cart feature not yet implemented');
        return false;
    },
};
