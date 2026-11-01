import React from 'react';
import { motion } from 'framer-motion';
import { Handshake } from 'lucide-react';

import futureskillsLogo from '@/assets/partners/futureskills.webp';
import itesLogo from '@/assets/partners/ites.webp';
import meitLogo from '@/assets/partners/meit.webp';
import nasscomLogo from '@/assets/partners/nasscom.webp';
import ncvetLogo from '@/assets/partners/ncvet.webp';
import nsdcLogo from '@/assets/partners/nsdc.webp';
import skillIndiaLogo from '@/assets/partners/skill-india.webp';

const partners = [
  { name: 'Future Skills Prime', logo: futureskillsLogo },
  { name: 'IT-ITeS SSC NASSCOM', logo: itesLogo },
  { name: 'MeitY', logo: meitLogo },
  { name: 'NASSCOM', logo: nasscomLogo },
  { name: 'NCVET', logo: ncvetLogo },
  { name: 'NSDC', logo: nsdcLogo },
  { name: 'Skill India', logo: skillIndiaLogo },
];

export const KnowledgePartners: React.FC = () => {
  return (
    <section className="py-8 md:py-12 relative bg-accent/5">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-accent/10 text-accent text-xs md:text-sm font-medium mb-4 md:mb-6">
            <Handshake className="h-3 w-3 md:h-4 md:w-4" />
            Our Partners
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold mb-4 md:mb-6 tracking-tight">
            Our Knowledge Partners, <span className="text-accent">Certification Alliances</span> & Curriculum Creators
          </h2>
        </motion.div>

        <div className="overflow-hidden w-full">
          <div className="flex animate-marquee gap-8 md:gap-12 w-max">
            {[...partners, ...partners].map((partner, index) => (
              <div
                key={`${partner.name}-${index}`}
                className="bg-white rounded-2xl px-6 py-4 md:px-8 md:py-5 flex items-center justify-center shadow-sm flex-shrink-0"
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="h-12 md:h-16 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
