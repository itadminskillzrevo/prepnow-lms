import React from "react";

type LogoSize = "sm" | "md" | "lg" | "xl" | "header";

interface SiteLogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  size?: LogoSize;
  iconClassName?: string;
}

const sizeConfig: Record<LogoSize, string> = {
  sm: "h-10 max-w-[140px]",
  md: "h-12 max-w-[180px]",
  header: "h-[60px] max-w-[200px]",
  lg: "h-20 max-w-[400px]",
  xl: "h-40 max-w-[600px]",
};

export const SiteLogo: React.FC<SiteLogoProps> = ({
  className = "",
  size = "lg",
}) => {
  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src="/prepnowlogo.jpeg" alt="Prepnow" className={`${config} object-contain`} />
    </div>
  );
};
