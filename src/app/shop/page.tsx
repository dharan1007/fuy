'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShoppingBag, BookOpen, GraduationCap, LayoutTemplate, Map } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  images: string | null;
  externalUrl: string;
  brandId: string;
  brand: {
    name: string;
    slug: string;
  };
  type: string;
  seller?: {
    name: string;
    image: string | null;
  };
}

export default function ShopPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [courses, setCourses] = useState<Product[]>([]);
  const [books, setBooks] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [myBrands, setMyBrands] = useState<Brand[]>([]);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['ALL', 'CLOTHING', 'ACCESSORIES', 'DIGITAL', 'ART', 'OTHER'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Brands and New Arrivals (Physical)
        const brandsRes = await fetch('/api/shop/brands');
        if (brandsRes.ok) {
          const data = await brandsRes.json();
          setBrands(data.brands || []);
          setNewArrivals(data.newArrivals || []);
        }

        // Fetch Digital Products
        const [coursesRes, booksRes, templatesRes] = await Promise.all([
          fetch('/api/shop/products?type=COURSE&limit=4'),
          fetch('/api/shop/products?type=EBOOK&limit=4'),
          fetch('/api/shop/products?type=TEMPLATE&limit=4'),
        ]);

        if (coursesRes.ok) setCourses(await coursesRes.json());
        if (booksRes.ok) setBooks(await booksRes.json());
        if (templatesRes.ok) setTemplates(await templatesRes.json());

      } catch (error) {
        console.error('Failed to fetch shop data', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserBrands = async () => {
      try {
        const myRes = await fetch('/api/shop/brands?mine=true');
        if (myRes.ok) {
          const myData = await myRes.json();
          setMyBrands(myData);
        }
      } catch (error) {
        console.error('Failed to fetch user brands', error);
      }
    };

    fetchData();
    fetchUserBrands();
  }, []);

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter Products (New Arrivals)
  const filteredProducts = newArrivals.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    const matchesCategory = selectedCategory === 'ALL' ? true : (p as any).category === selectedCategory;
    return matchesSearch && matchesPrice && matchesCategory;
  });

  const ProductCard = ({ product, type = "PHYSICAL" }: { product: Product, type?: string }) => {
    const images = product.images ? JSON.parse(product.images) : [];
    const image = images[0] || "/placeholder.png";

    return (
      <Link href={`/shop/product/${product.id}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="group cursor-pointer"
        >
          <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-4 relative">
            <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            {type !== "PHYSICAL" && (
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-black px-2 py-1 rounded text-xs font-bold uppercase">
                {type}
              </div>
            )}
          </div>
          <h3 className="font-bold text-lg leading-tight truncate">{product.name}</h3>
          <p className="text-gray-500 text-sm">{product.brand?.name || product.seller?.name || "Unknown Seller"}</p>
          <p className="font-bold mt-1">${product.price}</p>
        </motion.div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Navigation / Header */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-black/90 backdrop-blur-md z-50 text-white">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <div className="text-2xl font-black tracking-tighter">STORE.</div>
        </div>

        <div className="hidden md:flex gap-6 text-sm font-medium text-gray-400">
          <Link href="#courses" className="hover:text-white transition-colors">Courses</Link>
          <Link href="#books" className="hover:text-white transition-colors">Books</Link>
          <Link href="#templates" className="hover:text-white transition-colors">Templates</Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <input
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white/10 px-4 py-2 pl-10 rounded-full text-sm outline-none focus:ring-2 focus:ring-white/20 w-48 focus:w-64 transition-all text-white placeholder-gray-500"
            />
            <svg className="absolute left-3 top-2.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </div>

          <Link href="/shop/sell" className="px-4 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Sell on FUY
          </Link>

          <Link href="/dashboard/purchases" className="hidden sm:block px-4 py-2 border border-white/20 text-white text-sm font-bold rounded-full hover:bg-white/10 transition-colors">
            My Library
          </Link>

          {myBrands.length > 0 ? (
            <Link href={`/shop/brand/${myBrands[0].slug}/dashboard`} className="hidden sm:block px-4 py-2 border border-white text-white text-sm font-bold rounded-full hover:bg-white/10 transition-colors">
              Brand Dashboard
            </Link>
          ) : (
            <Link href="/shop/create-brand" className="hidden sm:block px-4 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors">
              Create Brand
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative h-[60vh] w-full overflow-hidden bg-gray-100 flex items-center justify-center">
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&h=900&fit=crop"
          alt="Hero"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-black/10" /> {/* Subtle overlay */}

        <div className="relative z-10 text-center text-white mix-blend-difference">
          <motion.h1
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none mb-6"
          >
            Your Style<br />Is Here!
          </motion.h1>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex gap-4 justify-center"
          >
            <button
              onClick={() => {
                const el = document.getElementById('new-arrivals');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white text-black px-8 py-3 font-bold rounded-full cursor-pointer hover:bg-gray-200 transition-colors"
            >
              Shop Collection
            </button>
          </motion.div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="1" x2="7" y1="14" y2="14" /><line x1="9" x2="15" y1="8" y2="8" /><line x1="17" x2="23" y1="16" y2="16" /></svg>
            Filters {showFilters ? '(-)' : '(+)'}
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-bold uppercase text-gray-500 mb-4">Category</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${selectedCategory === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase text-gray-500 mb-4">Price Range (${priceRange[0]} - ${priceRange[1]})</h3>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>$0</span>
                  <span>$1000+</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Digital Marketplace Sections */}
      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-20">

        {/* Courses */}
        {courses.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
          return matchesSearch && matchesPrice;
        }).length > 0 && (
            <section id="courses">
              <div className="flex justify-between items-end mb-8">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-8 h-8" />
                  <h2 className="text-3xl font-black uppercase tracking-tight">Popular Courses</h2>
                </div>
                <Link href="/shop/category/courses" className="text-sm font-bold border-b-2 border-black pb-1">View All</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {courses.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
                  return matchesSearch && matchesPrice;
                }).map(product => <ProductCard key={product.id} product={product} type="COURSE" />)}
              </div>
            </section>
          )}

        {/* Books */}
        {books.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
          return matchesSearch && matchesPrice;
        }).length > 0 && (
            <section id="books">
              <div className="flex justify-between items-end mb-8">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8" />
                  <h2 className="text-3xl font-black uppercase tracking-tight">Trending Books</h2>
                </div>
                <Link href="/shop/category/books" className="text-sm font-bold border-b-2 border-black pb-1">View All</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {books.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
                  return matchesSearch && matchesPrice;
                }).map(product => <ProductCard key={product.id} product={product} type="EBOOK" />)}
              </div>
            </section>
          )}

        {/* Templates */}
        {templates.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
          return matchesSearch && matchesPrice;
        }).length > 0 && (
            <section id="templates">
              <div className="flex justify-between items-end mb-8">
                <div className="flex items-center gap-3">
                  <LayoutTemplate className="w-8 h-8" />
                  <h2 className="text-3xl font-black uppercase tracking-tight">Top Templates</h2>
                </div>
                <Link href="/shop/category/templates" className="text-sm font-bold border-b-2 border-black pb-1">View All</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {templates.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
                  return matchesSearch && matchesPrice;
                }).map(product => <ProductCard key={product.id} product={product} type="TEMPLATE" />)}
              </div>
            </section>
          )}

      </div>

      {/* Brands Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-4xl font-black uppercase tracking-tight">Featured Brands</h2>
            <Link href="/shop/brands" className="text-sm font-bold border-b-2 border-black pb-1">View All</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {filteredBrands.map((brand, i) => (
              <Link href={`/shop/brand/${brand.slug}`} key={brand.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group cursor-pointer"
                >
                  <div className="aspect-[4/5] bg-white rounded-xl overflow-hidden mb-4 relative shadow-sm">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-2xl bg-gray-50">
                        {brand.name[0]}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  <h3 className="font-bold text-lg">{brand.name}</h3>
                  <p className="text-gray-500 text-sm line-clamp-1">{brand.description}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* New Arrivals (Masonry-ish) */}
      <div id="new-arrivals" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <h2 className="text-4xl font-black uppercase tracking-tight">New Arrivals</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white p-4 rounded-2xl ${i === 1 ? 'md:mt-12' : ''}`} // Stagger effect
              >
                <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-4 relative group">
                  {product.images ? (
                    <img src={JSON.parse(product.images)[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                  <div className="absolute bottom-4 left-4 right-4 translate-y-full group-hover:translate-y-0 transition-transform">
                    <button
                      onClick={() => window.open(product.externalUrl, '_blank')}
                      className="w-full py-3 bg-white text-black font-bold rounded-full shadow-lg hover:bg-black hover:text-white transition-colors"
                    >
                      Shop Now
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
                    <p className="text-gray-500 text-sm">{product.brand?.name || product.seller?.name || "Unknown Seller"}</p>
                  </div>
                  <span className="font-bold">${product.price}</span>
                </div>
              </motion.div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-3 text-center py-20 text-gray-400">
                <p>No products found matching your filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
