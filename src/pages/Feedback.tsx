import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import { Star } from 'lucide-react';

export default function Feedback() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pSnap = await getDocs(collection(db, 'products'));
        const pMap: Record<string, any> = {};
        pSnap.docs.forEach(d => {
          pMap[d.id] = d.data();
        });
        setProducts(pMap);

        const q = query(collection(db, 'reviews'));
        const snap = await getDocs(q);
        setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'newest') return b.createdAt - a.createdAt;
    if (sortBy === 'oldest') return a.createdAt - b.createdAt;
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'lowest') return a.rating - b.rating;
    return 0;
  });

  return (
    <div className="w-full">
      <SEO title="Customer Feedback | Rumble Hub" description="Read what our community thinks about our products." />
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-32">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white"></h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">Sort Reviews By</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1A1D24] border border-zinc-800 text-white text-sm rounded-lg px-4 py-2 outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center text-zinc-500 py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
            No reviews yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedReviews.map(review => {
              const product = products[review.productId];
              const productName = product ? product.title : 'Product';
              const productImage = product ? product.image : null;
              
              return (
                <div key={review.id} className="bg-[#11141D] border border-zinc-800/50 rounded-xl p-5 flex flex-col hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'text-indigo-500 fill-indigo-500' : 'text-zinc-800'}`} />
                      ))}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  
                  <p className={`text-sm mb-6 flex-1 ${review.isAuto ? 'text-zinc-400' : 'text-zinc-300'}`}>
                    {review.text}
                  </p>
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/50">
                    {productImage ? (
                      <img src={productImage} alt={productName} className="w-6 h-6 rounded object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                        {productName.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-medium text-zinc-400 truncate">
                      Purchased: {productName} {review.variantName ? `- ${review.variantName}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
