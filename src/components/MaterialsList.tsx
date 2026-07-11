import React, { useState } from 'react';
import { AssetItem, Campaign, ParsedItem, ItineraryDay } from '../marketing-types';
import { parseFilename } from '../marketing-utils';
import { Download, Copy, FileText, Image as ImageIcon, Map, FileSpreadsheet, CheckCircle2, Clock, CalendarDays, Search, ArrowDown } from 'lucide-react';

interface MaterialsListProps {
  campaign: Campaign;
  searchQuery?: string;
}

export const MaterialsList: React.FC<MaterialsListProps> = ({ campaign, searchQuery = '' }) => {
  const grouped = React.useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    let filteredItems = campaign.items;
    if (query) {
      filteredItems = campaign.items.filter(item => 
        item.name.toLowerCase().includes(query) || 
        (item.content && item.content.toLowerCase().includes(query))
      );
    }
    
    const parsedItems = filteredItems.map(parseFilename);
    
    return {
      flyer: parsedItems.filter(i => i.type === 'flyer'),
      katalog: parsedItems.filter(i => i.type === 'katalog'),
      copy: parsedItems.filter(i => i.type === 'copy'),
      foto: parsedItems.filter(i => i.type === 'foto'),
      pricelist: parsedItems.filter(i => i.type === 'pricelist'),
      other: parsedItems.filter(i => i.type === 'unknown'),
      total: parsedItems.length
    };
  }, [campaign.items, searchQuery]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderCard = (item: ParsedItem, icon: React.ReactNode, hideThumbnail = false, customAspect = 'aspect-[4/5]', objectFit = 'object-cover') => (
    <div key={item.id} className="group bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-[0_20px_40px_rgb(201,42,54,0.08)] hover:-translate-y-2">
      {!hideThumbnail && item.thumbnail ? (
        <div className={`${customAspect} bg-gray-50 relative overflow-hidden border-b border-gray-100`}>
          <img src={item.thumbnail} alt={item.name} className={`w-full h-full ${objectFit} transition-transform duration-700 group-hover:scale-105`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      ) : (
        <div className={`aspect-video bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center text-brand-red border-b border-gray-100 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-red-100 rounded-full opacity-50 blur-2xl"></div>
          <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col bg-white relative z-10">
        <h4 className="font-extrabold text-brand-dark text-lg mb-3 line-clamp-2 leading-tight" title={item.name}>
          {item.name}
        </h4>
        <div className="mt-auto flex gap-3 pt-4 border-t border-gray-50">
          {item.type === 'copy' && item.content ? (
            <button
              onClick={() => handleCopy(item.content || '', item.id)}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-dark text-white py-3 px-4 rounded-lg font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-md shadow-gray-200"
            >
              {copiedId === item.id ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} />}
              {copiedId === item.id ? 'Copied!' : 'Copy'}
            </button>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-brand-gold text-brand-dark py-3 px-4 rounded-lg font-bold text-sm hover:bg-[#e6b427] transition-all active:scale-95 shadow-md shadow-brand-gold/30"
            >
              <Download size={18} /> Download
            </a>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-16">
      {grouped.total === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold text-brand-dark mb-2">Materi tidak ditemukan</h3>
          <p className="text-gray-500 max-w-md">
            Tidak ada file atau materi yang cocok dengan pencarian "{searchQuery}" di paket ini.
          </p>
        </div>
      )}

      {/* Dynamic Itinerary Section - Timeline Style */}
      {campaign.itineraryDays && campaign.itineraryDays.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-black text-brand-dark flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-brand-red">
                <Map size={24} />
              </div>
              Detail Itinerary
            </h3>
          </div>
          
          <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8">
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-brand-red before:via-brand-red/50 before:to-transparent">
              {campaign.itineraryDays.map((day, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  
                  {/* Timeline Dot */}
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-brand-red text-white shadow shadow-red-200 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <span className="font-bold text-sm">{day.dayNumber || '•'}</span>
                  </div>
                  
                  {/* Content Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-lg bg-gray-50 border border-gray-100 shadow-sm transition-all hover:shadow-md hover:bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      {day.city && (
                        <h4 className="font-black text-xl text-brand-dark">{day.city}</h4>
                      )}
                      <div className="flex items-center gap-3">
                        {day.date && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-brand-red bg-red-50 px-3 py-1 rounded-full">
                            <CalendarDays size={14} /> {day.date}
                          </span>
                        )}
                        {day.time && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-200/70 px-3 py-1 rounded-full">
                            <Clock size={14} /> {day.time}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed font-medium mb-4">
                      {day.activity}
                    </p>
                    {day.pic && (
                      <div className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-brand-dark">
                          PIC
                        </span>
                        {day.pic}
                      </div>
                    )}
                  </div>
                  
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Flyer and Katalog Side-by-Side */}
      {(grouped.flyer.length > 0 || grouped.katalog.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {grouped.flyer.length > 0 && (
            <section className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-brand-red shrink-0">
                  <ImageIcon size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-dark">Flyer Paket</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 flex-1">
                {grouped.flyer.map(item => (
                  <div key={item.id} className="h-full flex flex-col relative">
                    {renderCard(item, <ImageIcon size={40} />, false, 'aspect-[3/4] md:aspect-[4/5]', 'object-contain')}
                  </div>
                ))}
              </div>
            </section>
          )}

          {grouped.katalog.length > 0 && (
            <section className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-brand-red shrink-0">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-dark">Katalog & Itinerary</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 flex-1">
                {grouped.katalog.map(item => (
                  <div key={item.id} className="h-full flex flex-col justify-center">
                    {renderCard(item, <FileSpreadsheet size={40} />, true)}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {grouped.copy.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-brand-red">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-brand-dark">Sales Copy</h3>
              <p className="text-gray-500 font-medium">Pre-written captions and text for your promotions.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {grouped.copy.map(item => (
               <div key={item.id} className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col transition-all duration-300 hover:shadow-[0_20px_40px_rgb(201,42,54,0.08)] hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center text-brand-dark">
                      <FileText size={18} />
                    </div>
                    <h4 className="font-extrabold text-brand-dark text-xl">{item.name}</h4>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-6 rounded-lg text-base text-gray-700 whitespace-pre-wrap mb-6 flex-1 font-medium max-h-72 overflow-y-auto custom-scrollbar leading-relaxed">
                    {item.content || "Download to view content"}
                  </div>
                  {item.content ? (
                    <button
                      onClick={() => handleCopy(item.content || '', item.id)}
                      className="w-full flex items-center justify-center gap-2 bg-brand-dark text-white py-4 px-6 rounded-lg font-bold text-base hover:bg-gray-800 transition-all active:scale-95 shadow-md shadow-gray-200"
                    >
                      {copiedId === item.id ? <CheckCircle2 size={20} className="text-green-400" /> : <Copy size={20} />}
                      {copiedId === item.id ? 'Copied to Clipboard!' : 'Copy Entire Text'}
                    </button>
                  ) : (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-brand-gold text-brand-dark py-4 px-6 rounded-lg font-bold text-base hover:bg-[#e6b427] transition-all active:scale-95 shadow-md shadow-brand-gold/30"
                    >
                      <Download size={20} /> Download Document
                    </a>
                  )}
               </div>
            ))}
          </div>
        </section>
      )}

      {grouped.foto.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-brand-red">
              <ImageIcon size={24} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-brand-dark">Hotel Photos</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {grouped.foto.map(item => renderCard(item, <ImageIcon size={40} />, false, 'aspect-[4/3]'))}
          </div>
        </section>
      )}

      {grouped.pricelist.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-brand-red">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-brand-dark">Price Lists</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {grouped.pricelist.map(item => renderCard(item, <FileSpreadsheet size={40} />, true))}
          </div>
        </section>
      )}
      
      {grouped.other.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-brand-dark">Other Materials</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {grouped.other.map(item => renderCard(item, <FileText size={40} />, true))}
          </div>
        </section>
      )}
    </div>
  );
};
