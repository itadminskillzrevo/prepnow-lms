import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Building2, CheckCircle2, Award, Calendar, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import certificateImage from '@/assets/certificates/sspl-certificate.jpeg';

export const CertificateShowcase: React.FC = () => {
  return (
    <section className="py-8 md:py-12 relative">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-4 md:mb-6">
            <ShieldCheck className="h-3 w-3 md:h-4 md:w-4" />
            Our Certifications
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold mb-4 md:mb-6 tracking-tight">
            Recognised <span className="text-primary">Skilling Partner</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto px-2">
            SkillzRevo is a certified and recognised skilling partner of IT-ITeS SSC Nasscom, ensuring industry-standard training and certifications.
          </p>
        </motion.div>

        {/* Two Column Layout: Certificate + Details */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto"
        >
          {/* Left: Certificate Image */}
          <div className="glass-card p-3 md:p-5 rounded-2xl overflow-hidden group">
            <div className="relative">
              <img
                src={certificateImage}
                alt="Certificate of Partnership - SkillzRevo Solutions Private Limited is a Recognised Skilling Partner of IT-ITeS SSC Nasscom"
                className="w-full h-auto rounded-xl group-hover:scale-[1.02] transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute top-3 right-3">
                <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 text-xs md:text-sm px-3 py-1 rounded-full shadow-lg">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </div>
            <div className="text-center mt-4 pb-2">
              <p className="text-xs md:text-sm text-muted-foreground">Certificate of Partnership</p>
              <p className="font-semibold text-sm md:text-base text-foreground mt-1">SkillzRevo Solutions Private Limited</p>
            </div>
          </div>

          {/* Right: Partnership Details */}
          <div className="flex flex-col gap-4 md:gap-5">
            {/* Details Card */}
            <div className="glass-card p-5 md:p-6 rounded-2xl flex-1">
              <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-5 md:mb-6">Partnership Details</h3>
              <div className="space-y-4 md:space-y-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm md:text-base text-foreground">Organization</p>
                    <p className="text-xs md:text-sm text-muted-foreground">SkillzRevo Solutions Private Limited</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm md:text-base text-foreground">Recognition Status</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Recognised Skilling Partner</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Award className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm md:text-base text-foreground">Certifying Authority</p>
                    <p className="text-xs md:text-sm text-muted-foreground">IT-ITeS SSC Nasscom</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm md:text-base text-foreground">Validity Period</p>
                    <p className="text-xs md:text-sm text-muted-foreground">24/11/2025 - 24/11/2026</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FutureSkills Prime Card */}
            <div className="rounded-2xl p-5 md:p-6 bg-gradient-to-br from-primary to-[hsl(220,80%,50%)] text-white">
              <h4 className="font-semibold text-base md:text-lg mb-1.5">FutureSkills Prime Initiative</h4>
              <p className="text-white/80 text-xs md:text-sm mb-3">
                A MeitY - Nasscom Digital Skilling Initiative empowering professionals with cutting-edge IT skills
              </p>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs md:text-sm font-medium">Active Partnership</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4 md:p-5 rounded-2xl text-center">
                <p className="text-2xl md:text-3xl font-bold text-primary">10+</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Year Partnership</p>
              </div>
              <div className="glass-card p-4 md:p-5 rounded-2xl text-center">
                <p className="text-2xl md:text-3xl font-bold text-primary">100%</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Certified</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-10 md:mt-14 text-center"
        >
          <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
            Committed to Excellence in Digital Skilling
          </h3>
          <p className="text-muted-foreground text-xs md:text-sm max-w-2xl mx-auto mb-5">
            As a recognized skilling partner, we are dedicated to delivering world-class IT training and development programs aligned with industry standards and government initiatives.
          </p>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs md:text-sm border-primary text-primary font-medium">
              Skill India
            </Badge>
            <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs md:text-sm border-purple-500 text-purple-500 font-medium">
              IT-ITeS Sector
            </Badge>
            <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs md:text-sm border-green-500 text-green-500 font-medium">
              Nasscom Certified
            </Badge>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
