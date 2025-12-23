'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShoppingBag, BookOpen, GraduationCap, LayoutTemplate, Map } from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import AppHeader from '@/components/AppHeader';
import { useCartStore } from "@/lib/cartStore";

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
  const cartItems = useCartStore((state) => state.items);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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
          <div className="aspect-[3/4] bg-white/10 rounded-xl overflow-hidden mb-4 relative border border-white/10">
            <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            {type !== "PHYSICAL" && (
              <div className="absolute top-3 right-3 bg-black/80 backdrop-blur text-white border border-white/20 px-2 py-1 rounded text-xs font-bold uppercase">
                {type}
              </div>
            )}
          </div>
          <h3 className="font-bold text-lg leading-tight truncate text-white">{product.name}</h3>
          <p className="text-gray-400 text-sm">{product.brand?.name || product.seller?.name || "Unknown Seller"}</p>
          <p className="font-bold mt-1 text-white">${product.price}</p>
        </motion.div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      <SpaceBackground />
      <AppHeader title="Shop" showBackButton />

      {/* Toolbar / Categories */}
      <div className="sticky top-14 sm:top-16 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-3 flex items-center justify-between gap-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-6 text-sm font-medium text-gray-400 items-center shrink-0">
          {/* Dynamic Categories with Dropdowns */}
          {[
            {
              label: 'Home',
              items: ['Furniture', 'Decor', 'Kitchen', 'Living', 'Bedroom']
            },
            {
              label: 'Fashion',
              items: ['Men', 'Women', 'Kids', 'Accessories', 'Shoes']
            },
            {
              label: 'Electronics',
              items: ['Phones', 'Laptops', 'Audio', 'Cameras', 'Gaming']
            }
          ].map((category) => (
            <div key={category.label} className="relative group">
              <button
                className="hover:text-white transition-colors flex items-center gap-1 py-1"
                onClick={(e) => {
                  const menu = e.currentTarget.nextElementSibling;
                  menu?.classList.toggle('hidden');
                }}
              >
                {category.label}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M1 1L5 5L9 1" /></svg>
              </button>

              {/* Dropdown Menu */}
              <div className="hidden absolute top-full left-0 mt-2 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col p-2 animate-in fade-in zoom-in-95 duration-200"
                onMouseLeave={(e) => e.currentTarget.classList.add('hidden')}>
                <div className="text-[10px] uppercase font-bold text-gray-500 px-3 py-2 border-b border-white/10 mb-1">
                  Shop {category.label}
                </div>
                {category.items.map(item => (
                  <Link
                    key={item}
                    href={`/shop/category/${category.label.toLowerCase()}-${item.toLowerCase()}`}
                    className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Existing Links */}
          <div className="w-px h-4 bg-white/20 mx-2" />
          <Link href="#courses" className="hover:text-white transition-colors whitespace-nowrap">Courses</Link>
          <Link href="#books" className="hover:text-white transition-colors whitespace-nowrap">Books</Link>
          <Link href="#templates" className="hover:text-white transition-colors whitespace-nowrap">Templates</Link>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="relative hidden lg:block">
            <input
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white/10 px-4 py-1.5 pl-9 rounded-full text-sm outline-none focus:ring-2 focus:ring-white/20 w-40 focus:w-60 transition-all text-white placeholder-gray-500"
            />
            <svg className="absolute left-3 top-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </div>

          <Link href="/shop/sell" className="group px-4 py-1.5 bg-white text-black rounded-full text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 overflow-hidden relative">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="group-hover:hidden">s.o. fuy</span>
            <span className="hidden group-hover:inline">Sell on FUY</span>
          </Link>

          <Link href="/dashboard/purchases" className="hidden sm:block px-4 py-1.5 border border-white/20 text-white text-sm font-bold rounded-full hover:bg-white/10 transition-colors whitespace-nowrap">
            Library
          </Link>

          {myBrands.length > 0 ? (
            <Link href={`/shop/brand/${myBrands[0].slug}/dashboard`} className="hidden sm:block px-4 py-1.5 border border-white text-white text-sm font-bold rounded-full hover:bg-white/10 transition-colors whitespace-nowrap">
              My Brand
            </Link>
          ) : (
            <Link href="/shop/create-brand" className="hidden sm:block px-4 py-1.5 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors whitespace-nowrap">
              Create Brand
            </Link>
          )}

          {/* Cart button */}
          <Link
            href="/cart"
            className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white"
            title="Shopping Cart"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold border border-black">
                {cartItemCount > 9 ? "9+" : cartItemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">

        {/* Hero Section - Full viewport height */}
        <div className="relative h-[100vh] w-full overflow-hidden flex items-center justify-center">
          {/* Background Image */}
          <img
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&h=900&fit=crop"
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />

          <div className="relative z-10 text-center text-white mix-blend-screen">
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-sm"
            >
              Your Style<br />Is Here
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
                className="bg-white text-black border border-white px-8 py-3 font-bold rounded-full cursor-pointer hover:bg-transparent hover:text-white transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
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
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-bold hover:bg-white/10 transition-colors text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="1" x2="7" y1="14" y2="14" /><line x1="9" x2="15" y1="8" y2="8" /><line x1="17" x2="23" y1="16" y2="16" /></svg>
              Filters {showFilters ? '(-)' : '(+)'}
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mb-8 bg-white/5 p-6 rounded-2xl shadow-sm border border-white/10 overflow-hidden backdrop-blur-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-bold uppercase text-gray-400 mb-4">Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${selectedCategory === cat ? 'bg-white text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase text-gray-400 mb-4">Price Range (${priceRange[0]} - ${priceRange[1]})</h3>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full accent-white h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
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
                    <GraduationCap className="w-8 h-8 text-white" />
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white">Popular Courses</h2>
                  </div>
                  <Link href="/shop/category/courses" className="text-sm font-bold border-b-2 border-white pb-1 hover:text-gray-300 hover:border-gray-300 transition-colors">View All</Link>
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
                    <BookOpen className="w-8 h-8 text-white" />
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white">Trending Books</h2>
                  </div>
                  <Link href="/shop/category/books" className="text-sm font-bold border-b-2 border-white pb-1 hover:text-gray-300 hover:border-gray-300 transition-colors">View All</Link>
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
                    <LayoutTemplate className="w-8 h-8 text-white" />
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white">Top Templates</h2>
                  </div>
                  <Link href="/shop/category/templates" className="text-sm font-bold border-b-2 border-white pb-1 hover:text-gray-300 hover:border-gray-300 transition-colors">View All</Link>
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
        <div className="bg-white/5 py-20 border-y border-white/10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-end mb-12">
              <h2 className="text-4xl font-black uppercase tracking-tight text-white">Featured Brands</h2>
              <Link href="/shop/brands" className="text-sm font-bold border-b-2 border-white pb-1 hover:text-gray-300 hover:border-gray-300 transition-colors">View All</Link>
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
                    <div className="aspect-[4/5] bg-white/10 rounded-xl overflow-hidden mb-4 relative shadow-sm border border-white/10">
                      {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-2xl bg-white/5">
                          {brand.name[0]}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                    <h3 className="font-bold text-lg text-white">{brand.name}</h3>
                    <p className="text-gray-400 text-sm line-clamp-1">{brand.description}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* New Arrivals (Masonry-ish) */}
        <div id="new-arrivals" className="bg-transparent py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <h2 className="text-4xl font-black uppercase tracking-tight text-white">New Arrivals</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm ${i === 1 ? 'md:mt-12' : ''}`} // Stagger effect
                >
                  <div className="aspect-[3/4] bg-white/5 rounded-xl overflow-hidden mb-4 relative group">
                    {product.images ? (
                      <img src={JSON.parse(product.images)[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/10" />
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
                      <h3 className="font-bold text-lg leading-tight text-white">{product.name}</h3>
                      <p className="text-gray-400 text-sm">{product.brand?.name || product.seller?.name || "Unknown Seller"}</p>
                    </div>
                    <span className="font-bold text-white">${product.price}</span>
                  </div>
                </motion.div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-3 text-center py-20 text-gray-500">
                  <p>No products found matching your filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
