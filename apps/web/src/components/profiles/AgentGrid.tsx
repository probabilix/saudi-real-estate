'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ChevronRight, 
  Phone, 
  MessageCircle,
  ShieldCheck
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface Agent {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  regaVerified: boolean;
}

interface AgentGridProps {
  agents: Agent[];
}

export default function AgentGrid({ agents }: AgentGridProps) {
  const t = useTranslations('profiles');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <Link 
          key={agent.id} 
          href={`/${locale}/brokers/${agent.id}`}
          className="group bg-white rounded-3xl p-6 border border-surface-100 shadow-sm hover:shadow-xl hover:border-primary-100 transition-all duration-300"
        >
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
               <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-surface-50">
                  <Image 
                    src={agent.avatarUrl || '/avatars/default-broker.jpg'} 
                    alt={agent.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
               </div>
               {agent.regaVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-primary-600 text-white p-1 rounded-lg border-2 border-white shadow-sm">
                     <ShieldCheck className="w-3 h-3" />
                  </div>
               )}
            </div>

            <div className="flex-1 min-w-0">
               <h4 className="text-lg font-bold text-charcoal truncate mb-1">{agent.name}</h4>
               <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">
                  {agent.role === 'AGENT' ? t('propertyConsultant') : agent.role}
               </p>
               
               <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal-muted">
                  {t('viewProfile')}
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-6">
             <button className="flex items-center justify-center gap-2 h-10 bg-surface-50 text-charcoal rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-100 transition-colors">
                <Phone className="w-3 h-3" />
                {t('call')}
             </button>
             <button className="flex items-center justify-center gap-2 h-10 bg-surface-50 text-charcoal rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-100 transition-colors">
                <MessageCircle className="w-3 h-3 text-[#25D366]" />
                WhatsApp
             </button>
          </div>
        </Link>
      ))}
    </div>
  );
}
