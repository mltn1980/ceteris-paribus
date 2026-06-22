import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface BookSection {
  id: string;
  label: string;
  shortLabel?: string;
}

const SECTIONS: BookSection[] = [
  { id: "inicio", label: "Inicio", shortLabel: "IN" },
  { id: "precios", label: "Precios", shortLabel: "PR" },
  { id: "volatilidad", label: "Volatilidad", shortLabel: "VX" },
  { id: "clima", label: "Clima", shortLabel: "CL" },
  { id: "tierras", label: "Tierras", shortLabel: "TI" },
  { id: "lacteos", label: "Lácteos", shortLabel: "LA" },
  { id: "commodities", label: "Commodities", shortLabel: "CO" },
  { id: "uruguay", label: "Uruguay", shortLabel: "UY" },
  { id: "sector-financiero", label: "Financiero", shortLabel: "FI" },
  { id: "mercados-globales", label: "Globales", shortLabel: "GL" },
  { id: "productividad", label: "Productividad", shortLabel: "PD" },
  { id: "premium", label: "Premium", shortLabel: "PM" },
  { id: "medios", label: "Medios", shortLabel: "ME" },
  { id: "contacto", label: "Contacto", shortLabel: "CT" },
];

interface BookLayoutProps {
  children: React.ReactNode;
}

export default function BookLayout({ children }: BookLayoutProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const activeSectionRef = useRef(0);

  // Keep ref in sync with state for use in event handlers
  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Detect when the book container is in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Track active section using IntersectionObserver on each section
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sectionElements = container.querySelectorAll(":scope > section[id]");
    if (!sectionElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;
        // Find the most visible section
        let maxRatio = 0;
        let maxIndex = activeSectionRef.current;
        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const idx = Array.from(sectionElements).indexOf(entry.target as Element);
            if (idx >= 0) maxIndex = idx;
          }
        });
        if (maxRatio > 0.3 && maxIndex !== activeSectionRef.current) {
          setActiveSection(maxIndex);
        }
      },
      {
        root: container,
        threshold: [0, 0.3, 0.5, 0.7, 1],
      }
    );

    sectionElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isMobile]);

  // Desktop: also track via scroll position for snap accuracy
  useEffect(() => {
    if (isMobile) return;
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrolling.current) return;
      const scrollTop = container.scrollTop;
      const sectionHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / sectionHeight);
      if (newIndex !== activeSectionRef.current && newIndex >= 0 && newIndex < SECTIONS.length) {
        setActiveSection(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  // Keyboard navigation - handle Page Up/Down and Arrow keys
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      
      const navKeys = ["PageDown", "ArrowDown", "PageUp", "ArrowUp", "Home", "End"];
      if (!navKeys.includes(e.key)) return;
      
      // Always prevent default to avoid browser scroll fighting with snap
      e.preventDefault();
      e.stopPropagation();
      
      // Use ref for current section to avoid stale closure
      const current = activeSectionRef.current;
      let targetIndex = current;
      
      if (e.key === "PageDown" || e.key === "ArrowDown") {
        targetIndex = Math.min(current + 1, SECTIONS.length - 1);
      } else if (e.key === "PageUp" || e.key === "ArrowUp") {
        targetIndex = Math.max(current - 1, 0);
      } else if (e.key === "Home") {
        targetIndex = 0;
      } else if (e.key === "End") {
        targetIndex = SECTIONS.length - 1;
      }

      if (targetIndex !== current) {
        scrollToSection(targetIndex);
      }
    };

    // Focus the container so it receives keyboard events
    container.tabIndex = -1;
    container.addEventListener("keydown", handleKeyDown);
    
    // Also listen on window for when container doesn't have focus
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSection, isVisible]);

  // Listen for custom navigation events from Navbar
  useEffect(() => {
    const handleNavEvent = (e: CustomEvent) => {
      const targetId = e.detail?.id;
      if (!targetId) return;
      
      // Handle "inicio" - scroll to top of book (section 0)
      if (targetId === "inicio") {
        scrollToSection(0);
        return;
      }
      
      const index = SECTIONS.findIndex((s) => s.id === targetId);
      if (index >= 0) {
        scrollToSection(index);
      }
    };

    window.addEventListener("navigateToSection" as any, handleNavEvent as any);
    return () => window.removeEventListener("navigateToSection" as any, handleNavEvent as any);
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    isScrolling.current = true;
    activeSectionRef.current = index;
    setActiveSection(index);
    
    if (isMobile) {
      // On mobile: scroll to the section element directly
      const sectionElements = container.querySelectorAll(":scope > section[id]");
      const targetEl = sectionElements[index] as HTMLElement;
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // On desktop: use exact pixel calculation (snap will handle alignment)
      const targetScroll = index * container.clientHeight;
      container.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
    
    setTimeout(() => {
      isScrolling.current = false;
    }, 600);
  }, [isMobile]);

  // Calculate wheel positions for each item
  const wheelItems = useMemo(() => {
    return SECTIONS.map((section, index) => {
      const distance = index - activeSection;
      const angle = distance * 26;
      const translateY = Math.sin((angle * Math.PI) / 180) * 150;
      const translateZ = (1 - Math.cos((angle * Math.PI) / 180)) * -80;
      const scale = Math.max(0.35, 1 - Math.abs(distance) * 0.13);
      const opacity = Math.max(0, 1 - Math.abs(distance) * 0.25);
      const visible = Math.abs(distance) <= 4;

      return {
        ...section,
        index,
        distance,
        translateY,
        translateZ,
        scale,
        opacity,
        visible,
        isActive: index === activeSection,
      };
    });
  }, [activeSection]);

  return (
    <div className="relative" id="book-container">
      {/* Wheel Side Menu - only visible when book is in viewport */}
      <nav
        className={`fixed left-2 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center transition-all duration-500 ${
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full"
        }`}
        style={{ perspective: "800px" }}
      >
        <div className="relative flex flex-col items-center justify-center w-36 h-[540px]">
          {/* Fade overlay top */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[oklch(0.12_0.02_250)] to-transparent z-10 pointer-events-none rounded-t-2xl" />
          {/* Fade overlay bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[oklch(0.12_0.02_250)] to-transparent z-10 pointer-events-none rounded-b-2xl" />

          {/* Background panel */}
          <div className="absolute inset-0 bg-[oklch(0.10_0.02_250/0.95)] backdrop-blur-xl rounded-2xl border border-[oklch(0.30_0.03_250/0.5)] shadow-[0_0_40px_oklch(0.10_0.02_250/0.8)]" />

          {/* Wheel items */}
          <div className="relative flex flex-col items-center justify-center h-full w-full">
            {wheelItems.map((item) => {
              if (!item.visible) return null;
              return (
                <button
                  key={item.id}
                  onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); scrollToSection(item.index); }}
                  tabIndex={-1}
                  className="absolute flex items-center justify-center transition-all duration-500 ease-out cursor-pointer outline-none focus:outline-none"
                  style={{
                    transform: `translateY(${item.translateY}px) translateZ(${item.translateZ}px) scale(${item.scale})`,
                    opacity: item.opacity,
                    zIndex: item.isActive ? 20 : 10 - Math.abs(item.distance),
                  }}
                >
                  <div
                    className={`flex items-center gap-2.5 px-5 py-3.5 rounded-xl transition-all duration-500 whitespace-nowrap ${
                      item.isActive
                        ? "bg-gradient-to-r from-[oklch(0.72_0.19_165)] to-[oklch(0.60_0.16_195)] shadow-[0_0_30px_oklch(0.72_0.19_165/0.6)] scale-110"
                        : "hover:bg-[oklch(0.25_0.02_250/0.7)]"
                    }`}
                  >
                    <span
                      className={`font-black tracking-wide transition-all duration-300 ${
                        item.isActive
                          ? "text-[oklch(0.10_0.02_250)] text-base"
                          : "text-[oklch(0.55_0.02_250)] text-sm"
                      }`}
                    >
                      {item.shortLabel}
                    </span>
                    <span
                      className={`font-bold transition-all duration-300 ${
                        item.isActive
                          ? "text-[oklch(0.10_0.02_250)] opacity-100 max-w-[100px] text-base"
                          : "text-[oklch(0.50_0.02_250)] opacity-70 max-w-[80px] text-sm"
                      } overflow-hidden`}
                    >
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>


        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden transition-all duration-500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full"
        }`}
      >
        {/* Navigation arrows */}
        <div className="flex justify-center gap-4 mb-2">
          {activeSection > 0 && (
            <button
              onClick={() => scrollToSection(activeSection - 1)}
              className="bg-[oklch(0.72_0.19_165)] text-[oklch(0.10_0.02_250)] rounded-full p-2 shadow-[0_0_16px_oklch(0.72_0.19_165/0.5)]"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          )}
          {activeSection < SECTIONS.length - 1 && (
            <button
              onClick={() => scrollToSection(activeSection + 1)}
              className="animate-bounce bg-[oklch(0.72_0.19_165)] text-[oklch(0.10_0.02_250)] rounded-full p-2 shadow-[0_0_16px_oklch(0.72_0.19_165/0.5)]"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Section indicator bar */}
        <div className="bg-[oklch(0.08_0.02_250/0.97)] backdrop-blur-xl border-t-2 border-[oklch(0.72_0.19_165/0.4)] px-4 py-3 safe-bottom">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-bold text-white">
              {SECTIONS[activeSection]?.label}
            </span>
            <span className="text-sm font-semibold text-[oklch(0.72_0.19_165)]">
              {activeSection + 1} / {SECTIONS.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-[oklch(0.20_0.02_250)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[oklch(0.72_0.19_165)] to-[oklch(0.65_0.16_195)] rounded-full transition-all duration-500"
              style={{ width: `${((activeSection + 1) / SECTIONS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scroll Container - snap on desktop, free scroll on mobile */}
      <div
        ref={containerRef}
        className={`h-screen overflow-y-scroll ${isMobile ? "" : "snap-y snap-mandatory"}`}
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
    </div>
  );
}

export function BookPage({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`min-h-screen w-full snap-start snap-always flex flex-col relative ${className}`}
      style={{ scrollbarWidth: "none" }}
    >
      {/* Top divider - visible gradient line with padding */}
      <div className="w-full flex-shrink-0 h-[3px] relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.72_0.19_165/0.1)] via-[oklch(0.72_0.19_165/0.9)] to-[oklch(0.72_0.19_165/0.1)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.72_0.19_165/0.05)] via-[oklch(0.72_0.19_165/0.4)] to-[oklch(0.72_0.19_165/0.05)] blur-sm translate-y-[2px]" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>

      {/* Bottom divider - visible gradient line */}
      <div className="w-full flex-shrink-0 h-[3px] relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.72_0.19_165/0.1)] via-[oklch(0.72_0.19_165/0.7)] to-[oklch(0.72_0.19_165/0.1)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.72_0.19_165/0.05)] via-[oklch(0.72_0.19_165/0.3)] to-[oklch(0.72_0.19_165/0.05)] blur-sm -translate-y-[2px]" />
      </div>
    </section>
  );
}
