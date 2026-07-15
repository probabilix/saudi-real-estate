'use client';

import { useEffect, useState } from 'react';
import { crmApi } from '@/lib/api';
import { CrmTopBar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { Scale, Loader2, ArrowRightLeft, TrendingUp, HelpCircle, BarChart3, AlertCircle, X, Square, Bed, Bath, MapPin, ExternalLink, Search, Building2, Layers } from 'lucide-react';
import Image from 'next/image';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

export default function ComparisonInsightsPage() {
  const { user } = useCrmAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);

  // Filter & Sort States
  const [selectedMyListingFilter, setSelectedMyListingFilter] = useState<string>('all');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'count_desc' | 'count_asc' | 'date_desc' | 'date_asc'>('count_desc');

  useEffect(() => {
    async function load() {
      try {
        const res = await crmApi.getComparisonInsights();
        if (res.success && res.data) {
          setInsights(res.data);
        }
      } catch (err) {
        console.error('Failed to load comparison insights', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute metrics
  const totalMyListingsCompared = new Set(insights.map((item) => item.myListing?.id)).size;
  const totalEvents = insights.reduce((sum, item) => sum + Number(item.count), 0);
  
  // Compute aggregated competitor metrics (summing comparison counts across all pairs for the same competitor)
  let topCompetitorName = 'N/A';
  let topCompetitorCount = 0;

  if (insights.length > 0) {
    const competitorCounts: Record<string, { name: string; count: number }> = {};
    
    insights.forEach((item) => {
      const comp = item.competitorListing;
      if (!comp) return;
      const compId = comp.id;
      const name = comp.enTitle || comp.arTitle || 'Unnamed Property';
      const count = Number(item.count) || 0;
      
      if (!competitorCounts[compId]) {
        competitorCounts[compId] = { name, count: 0 };
      }
      competitorCounts[compId].count += count;
    });

    let maxCount = -1;
    let maxName = 'N/A';
    
    Object.values(competitorCounts).forEach((comp) => {
      if (comp.count > maxCount) {
        maxCount = comp.count;
        maxName = comp.name;
      }
    });

    if (maxCount > 0) {
      topCompetitorName = maxName;
      topCompetitorCount = maxCount;
    }
  }

  // Extract unique of my listings to filter
  const myListingsOptions = Array.from(
    new Map(
      insights.map(item => item.myListing ? [item.myListing.id, item.myListing] : null).filter(Boolean) as [string, any][]
    ).values()
  );

  // Extract unique cities
  const cityOptions = Array.from(
    new Set(
      insights.flatMap(item => [
        item.myListing?.city,
        item.competitorListing?.city
      ]).filter(Boolean)
    )
  );

  // Find the competitor listing object corresponding to the top competitor
  const topCompetitorObject = insights.find(
    (item) =>
      item.competitorListing &&
      (item.competitorListing.enTitle === topCompetitorName ||
        item.competitorListing.arTitle === topCompetitorName)
  )?.competitorListing;

  // Filtered and sorted insights array
  const filteredInsights = insights
    .filter((item) => {
      // 1. My Listing Filter
      if (selectedMyListingFilter !== 'all' && item.myListing?.id !== selectedMyListingFilter) {
        return false;
      }
      
      // 2. City Filter
      if (selectedCityFilter !== 'all') {
        const myCity = item.myListing?.city?.toLowerCase();
        const compCity = item.competitorListing?.city?.toLowerCase();
        const targetCity = selectedCityFilter.toLowerCase();
        if (myCity !== targetCity && compCity !== targetCity) {
          return false;
        }
      }

      // 3. Search Term Filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const myTitleEn = (item.myListing?.enTitle || '').toLowerCase();
        const myTitleAr = (item.myListing?.arTitle || '').toLowerCase();
        const compTitleEn = (item.competitorListing?.enTitle || '').toLowerCase();
        const compTitleAr = (item.competitorListing?.arTitle || '').toLowerCase();
        
        if (
          !myTitleEn.includes(term) &&
          !myTitleAr.includes(term) &&
          !compTitleEn.includes(term) &&
          !compTitleAr.includes(term)
        ) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'count_desc') {
        return Number(b.count) - Number(a.count);
      }
      if (sortBy === 'count_asc') {
        return Number(a.count) - Number(b.count);
      }
      if (sortBy === 'date_desc') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return 0;
    });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-50 overflow-y-auto">
      <CrmTopBar title="Comparison Insights" />

      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Intro */}
        <div>
          <h1 className="text-2xl font-black text-surface-900 flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary-600" />
            Competitive Intelligence Dashboard
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Analyze market behavior by tracking which properties buyers compare side-by-side with your listings.
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <span className="text-sm font-semibold text-surface-500">Loading insights...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat 1 */}
              <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-surface-900">{totalMyListingsCompared}</div>
                  <div className="text-xs text-surface-500 font-semibold mt-0.5">My Listings Co-Compared</div>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-surface-900">{totalEvents}</div>
                  <div className="text-xs text-surface-500 font-semibold mt-0.5">Total Co-Comparison Events</div>
                </div>
              </div>

              {/* Stat 3 */}
              <div 
                onClick={() => {
                  if (topCompetitorObject) {
                    setSelectedListing(topCompetitorObject);
                  }
                }}
                className={`bg-white p-5 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4 transition-all ${
                  topCompetitorObject 
                    ? 'cursor-pointer hover:bg-purple-50/40 hover:border-purple-200 active:scale-95' 
                    : ''
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-bold text-surface-900 truncate" title={topCompetitorName}>
                    {topCompetitorName}
                  </div>
                  <div className="text-xs text-surface-500 font-semibold mt-0.5 flex items-center gap-1.5">
                    <span>Highest Compared Competitor ({topCompetitorCount} times)</span>
                    {topCompetitorObject && <span className="text-[10px] text-purple-500 font-bold underline shrink-0">(Click to view)</span>}
                  </div>
                </div>
              </div>
            </div>

            {insights.length === 0 ? (
              /* Empty state */
              <div className="bg-white border border-surface-200 rounded-3xl p-16 text-center max-w-xl mx-auto">
                <AlertCircle className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-surface-800">No Comparison Data Available</h3>
                <p className="text-sm text-surface-500 mt-2">
                  When buyers add your properties to their comparison tray and open the side-by-side grid, details of competitor listings will start populating here.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-surface-150 bg-surface-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="font-bold text-sm text-surface-800">Comparison Pairs Analytics</h3>
                  <span className="text-[10px] font-bold text-surface-500 bg-surface-100 py-1 px-3 rounded-full border border-surface-200 self-start">
                    Showing {filteredInsights.length} of {insights.length} pairs
                  </span>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-4 bg-surface-50/30 border-b border-surface-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                      type="text"
                      placeholder="Search property names..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-surface-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                    />
                  </div>

                  {/* Filter by My Listings */}
                  <select
                    value={selectedMyListingFilter}
                    onChange={(e) => setSelectedMyListingFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-surface-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white font-medium text-surface-700"
                  >
                    <option value="all">All My Properties</option>
                    {myListingsOptions.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.enTitle || opt.arTitle}
                      </option>
                    ))}
                  </select>

                  {/* Filter by City */}
                  <select
                    value={selectedCityFilter}
                    onChange={(e) => setSelectedCityFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-surface-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white font-medium text-surface-700"
                  >
                    <option value="all">All Cities</option>
                    {cityOptions.map((city: any) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>

                  {/* Sort By */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-surface-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white font-semibold text-surface-700"
                  >
                    <option value="count_desc">Compare Count (High to Low)</option>
                    <option value="count_asc">Compare Count (Low to High)</option>
                    <option value="date_desc">Last Compared (Newest First)</option>
                    <option value="date_asc">Last Compared (Oldest First)</option>
                  </select>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-surface-150 text-[10px] font-bold uppercase tracking-wider text-surface-400 bg-surface-50/20">
                        <th className="p-4 pl-6">My Listing</th>
                        <th className="p-4">Compared With (Competitor)</th>
                        <th className="p-4 text-center">Compare Count</th>
                        <th className="p-4 pr-6">Last Compared Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {filteredInsights.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-xs text-surface-400 font-medium">
                            No co-comparison records match your current filters. Try resetting search or filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredInsights.map((pair, index) => {
                          const myPhoto = pair.myListing?.photos?.[0] || '/placeholder.png';
                          const compPhoto = pair.competitorListing?.photos?.[0] || '/placeholder.png';

                          return (
                            <tr key={index} className="hover:bg-surface-50/40 transition-colors">
                               {/* My Listing */}
                               <td className="p-4 pl-6 align-middle">
                                 <div 
                                   onClick={() => setSelectedListing(pair.myListing)}
                                   className="flex items-center gap-3 cursor-pointer hover:bg-surface-50 p-2 rounded-xl transition-all border border-transparent hover:border-surface-200 group"
                                 >
                                   <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-surface-250">
                                     <Image
                                       src={myPhoto}
                                       alt="My Property"
                                       fill
                                       className="object-cover group-hover:scale-105 transition-transform duration-300"
                                     />
                                   </div>
                                   <div className="flex flex-col min-w-0">
                                     <div className="flex items-center gap-1.5">
                                       <span className="font-semibold text-xs text-surface-900 truncate max-w-[140px] group-hover:text-primary-650 transition-colors">
                                         {pair.myListing?.enTitle || pair.myListing?.arTitle}
                                       </span>
                                       <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                         pair.myListing?.propertyType === 'project'
                                           ? 'bg-purple-50 text-purple-600 border border-purple-150'
                                           : 'bg-blue-50 text-blue-600 border border-blue-150'
                                       }`}>
                                         {pair.myListing?.propertyType === 'project' ? 'Project' : 'Property'}
                                       </span>
                                     </div>
                                     <span className="text-[10px] font-black text-primary-600 mt-0.5">
                                       {pair.myListing?.propertyType === 'project'
                                         ? pair.myListing.minPrice && pair.myListing.maxPrice
                                           ? pair.myListing.minPrice === pair.myListing.maxPrice
                                             ? `${pair.myListing.minPrice.toLocaleString()} SAR`
                                             : `${pair.myListing.minPrice.toLocaleString()} - ${pair.myListing.maxPrice.toLocaleString()} SAR`
                                           : pair.myListing?.price ? `${pair.myListing.price.toLocaleString()} SAR` : 'N/A'
                                         : pair.myListing?.price ? `${pair.myListing.price.toLocaleString()} SAR` : 'N/A'}
                                     </span>
                                   </div>
                                 </div>
                               </td>
   
                               {/* Competitor Listing */}
                               <td className="p-4 align-middle">
                                 <div 
                                   onClick={() => setSelectedListing(pair.competitorListing)}
                                   className="flex items-center gap-3 cursor-pointer hover:bg-surface-50 p-2 rounded-xl transition-all border border-transparent hover:border-surface-200 group"
                                 >
                                   <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-surface-250">
                                     <Image
                                       src={compPhoto}
                                       alt="Competitor Property"
                                       fill
                                       className="object-cover group-hover:scale-105 transition-transform duration-300"
                                     />
                                   </div>
                                   <div className="flex flex-col min-w-0">
                                     <div className="flex items-center gap-1.5">
                                       <span className="font-semibold text-xs text-surface-950 truncate max-w-[140px] group-hover:text-primary-650 transition-colors">
                                         {pair.competitorListing?.enTitle || pair.competitorListing?.arTitle}
                                       </span>
                                       <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                         pair.competitorListing?.propertyType === 'project'
                                           ? 'bg-purple-50 text-purple-600 border border-purple-150'
                                           : 'bg-blue-50 text-blue-600 border border-blue-150'
                                       }`}>
                                         {pair.competitorListing?.propertyType === 'project' ? 'Project' : 'Property'}
                                       </span>
                                     </div>
                                     <span className="text-[10px] text-surface-500 mt-0.5">
                                       {pair.competitorListing?.district}, {pair.competitorListing?.city}
                                     </span>
                                     <span className="text-[10px] font-bold text-surface-700 mt-0.5">
                                       {pair.competitorListing?.propertyType === 'project'
                                         ? pair.competitorListing.minPrice && pair.competitorListing.maxPrice
                                           ? pair.competitorListing.minPrice === pair.competitorListing.maxPrice
                                             ? `${pair.competitorListing.minPrice.toLocaleString()} SAR`
                                             : `${pair.competitorListing.minPrice.toLocaleString()} - ${pair.competitorListing.maxPrice.toLocaleString()} SAR`
                                           : pair.competitorListing?.price ? `${pair.competitorListing.price.toLocaleString()} SAR` : 'N/A'
                                         : pair.competitorListing?.price ? `${pair.competitorListing.price.toLocaleString()} SAR` : 'N/A'}
                                     </span>
                                   </div>
                                 </div>
                               </td>

                              {/* Compare Count */}
                              <td className="p-4 text-center align-middle">
                                <span className="inline-flex items-center justify-center bg-primary-50 text-primary-700 text-xs font-black px-2.5 py-1 rounded-full border border-primary-100 min-w-[32px]">
                                  {pair.count}
                                </span>
                              </td>

                              {/* Date */}
                              <td className="p-4 pr-6 align-middle text-xs text-surface-500 font-medium">
                                {new Date(pair.updatedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Listing Detail Preview Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-md w-full border border-surface-100 relative animate-in fade-in zoom-in duration-200">
            
            {/* Image preview */}
            <div className="relative h-56 w-full bg-slate-100">
              <Image
                src={(selectedListing.photos && selectedListing.photos[0]) || '/placeholder.png'}
                alt={selectedListing.enTitle || selectedListing.arTitle || 'Property preview'}
                fill
                className="object-cover"
              />
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedListing(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white transition-all shadow-md z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-surface-900 line-clamp-2">
                  {selectedListing.enTitle || selectedListing.arTitle}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-surface-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                  <span>
                    {[selectedListing.district, selectedListing.city].filter(Boolean).join(', ') || 'Saudi Arabia'}
                  </span>
                </div>
              </div>

              {/* Price tag */}
              <div className="inline-flex items-center px-3 py-1 rounded-xl bg-primary-50 border border-primary-100 text-primary-700 font-bold text-sm">
                {selectedListing.propertyType === 'project'
                  ? selectedListing.minPrice && selectedListing.maxPrice
                    ? selectedListing.minPrice === selectedListing.maxPrice
                      ? `${selectedListing.minPrice.toLocaleString()} SAR`
                      : `${selectedListing.minPrice.toLocaleString()} - ${selectedListing.maxPrice.toLocaleString()} SAR`
                    : selectedListing.price ? `${selectedListing.price.toLocaleString()} SAR` : 'Ask Price'
                  : selectedListing.price ? `${selectedListing.price.toLocaleString()} SAR` : 'Ask Price'}
              </div>

              {/* Specs */}
              {selectedListing.propertyType === 'project' ? (
                <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-surface-100">
                  <div className="bg-surface-50 p-2 rounded-xl flex flex-col items-center justify-center gap-1 text-center">
                    <Layers className="w-3.5 h-3.5 text-primary-500/70" />
                    <span className="text-[9px] text-surface-400 font-bold uppercase tracking-wider">Layouts</span>
                    <span className="text-xs font-semibold text-surface-700">
                      {selectedListing.layoutCount || '0'} plans
                    </span>
                  </div>
                  
                  <div className="bg-surface-50 p-2 rounded-xl flex flex-col items-center justify-center gap-1 text-center">
                    <Bed className="w-3.5 h-3.5 text-primary-500/70" />
                    <span className="text-[9px] text-surface-400 font-bold uppercase tracking-wider">Beds</span>
                    <span className="text-xs font-semibold text-surface-700">
                      {selectedListing.bedroomsList && selectedListing.bedroomsList.length > 0
                        ? `${selectedListing.bedroomsList.join(', ')} BHK`
                        : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-surface-50 p-2 rounded-xl flex flex-col items-center justify-center gap-1 text-center">
                    <Building2 className="w-3.5 h-3.5 text-primary-500/70" />
                    <span className="text-[9px] text-surface-400 font-bold uppercase tracking-wider">Delivery</span>
                    <span className="text-xs font-semibold text-surface-700 truncate max-w-full text-center" title={selectedListing.expectedDelivery || selectedListing.completionStatus}>
                      {selectedListing.expectedDelivery || selectedListing.completionStatus || 'N/A'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-surface-100">
                  <div className="bg-surface-50 p-2 rounded-xl flex flex-col items-center justify-center gap-1 text-center">
                    <Square className="w-3.5 h-3.5 text-primary-500/70" />
                    <span className="text-[9px] text-surface-400 font-bold uppercase tracking-wider">Area</span>
                    <span className="text-xs font-semibold text-surface-700">
                      {selectedListing.areaSqm ? `${selectedListing.areaSqm} sqm` : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="bg-surface-50 p-2 rounded-xl flex flex-col items-center justify-center gap-1 text-center">
                    <Bed className="w-3.5 h-3.5 text-primary-500/70" />
                    <span className="text-[9px] text-surface-400 font-bold uppercase tracking-wider">Beds</span>
                    <span className="text-xs font-semibold text-surface-700">
                      {selectedListing.bedrooms !== undefined && selectedListing.bedrooms !== null ? selectedListing.bedrooms : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-surface-50 p-2 rounded-xl flex flex-col items-center justify-center gap-1 text-center">
                    <Bath className="w-3.5 h-3.5 text-primary-500/70" />
                    <span className="text-[9px] text-surface-400 font-bold uppercase tracking-wider">Baths</span>
                    <span className="text-xs font-semibold text-surface-700">
                      {selectedListing.bathrooms !== undefined && selectedListing.bathrooms !== null ? selectedListing.bathrooms : 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={() => setSelectedListing(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-surface-200 text-surface-600 hover:bg-surface-50 font-bold text-xs transition-all text-center"
                >
                  Close
                </button>
                <a
                  href={
                    selectedListing.propertyType === 'project'
                      ? `${WEB_URL}/en/projects/${selectedListing.id}`
                      : `${WEB_URL}/en/listings/${selectedListing.id}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary-900/10"
                >
                  <span>{selectedListing.propertyType === 'project' ? 'View Project' : 'View Listing'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
