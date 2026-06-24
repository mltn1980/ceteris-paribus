import { useAuth } from "@/_core/hooks/useAuth";
import LoginModal from "@/components/LoginModal";
import { Menu, X, LogOut, User, LogIn } from "lucide-react";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Precios", href: "#precios" },
  { label: "Clima", href: "#clima" },
  { label: "Tierras", href: "#tierras" },
  { label: "Lácteos", href: "#lacteos" },
  { label: "Commodities", href: "#commodities" },
  { label: "Uruguay", href: "#uruguay" },
  { label: "Financiero", href: "#sector-financiero" },
  { label: "Globales", href: "#mercados-globales" },
  { label: "Productividad", href: "#productividad" },
  { label: "Medios", href: "#medios" },
  { label: "Contacto", href: "#contacto" },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");

  // Listen for scroll changes to update active section indicator
  useEffect(() => {
    const handleScroll = () => {
      // Check which section is currently visible
      const bookContainer = document.querySelector("#book-container > div:last-child") as HTMLElement;
      if (!bookContainer) return;

      const scrollTop = bookContainer.scrollTop;
      const sectionHeight = bookContainer.clientHeight;
      const sectionIndex = Math.round(scrollTop / sectionHeight);

      const sectionIds = [
        "inicio", "precios", "clima", "tierras", "lacteos",
        "commodities", "uruguay", "sector-financiero",
        "mercados-globales", "productividad", "premium",
        "medios", "contacto"
      ];

      if (sectionIndex >= 0 && sectionIndex < sectionIds.length) {
        setActiveSection(sectionIds[sectionIndex]);
      }
    };

    // Observe scroll on the book container
    const interval = setInterval(() => {
      const bookContainer = document.querySelector("#book-container > div:last-child") as HTMLElement;
      if (bookContainer) {
        bookContainer.addEventListener("scroll", handleScroll, { passive: true });
        clearInterval(interval);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      const bookContainer = document.querySelector("#book-container > div:last-child") as HTMLElement;
      if (bookContainer) {
        bookContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const sectionId = href.replace("#", "");
    setActiveSection(sectionId);
    // Dispatch custom event for BookLayout to handle navigation
    const event = new CustomEvent("navigateToSection", { detail: { id: sectionId } });
    window.dispatchEvent(event);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[oklch(0.10_0.02_250/0.92)] backdrop-blur-xl border-b border-[oklch(0.35_0.03_250/0.3)]">
      <div className="container flex items-center justify-between h-14">
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); handleNavClick("#inicio"); }}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.19_165)] to-[oklch(0.65_0.16_195)] flex items-center justify-center shadow-[0_0_12px_oklch(0.72_0.19_165/0.3)] group-hover:shadow-[0_0_20px_oklch(0.72_0.19_165/0.5)] transition-shadow">
            <span className="text-sm font-black text-[oklch(0.13_0.02_250)]">CP</span>
          </div>
          <span className="text-lg font-bold text-gradient-emerald hidden sm:block">
            Ceteris Paribus
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden xl:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => {
            const sectionId = link.href.replace("#", "");
            const isActive = activeSection === sectionId;
            return (
              <button
                key={link.href}
                onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); handleNavClick(link.href); }}
                className={`relative px-2.5 py-1.5 text-[13px] font-semibold transition-all rounded-md outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[oklch(0.72_0.19_165/0.5)] ${
                  isActive
                    ? "text-[oklch(0.72_0.19_165)] bg-[oklch(0.72_0.19_165/0.12)]"
                    : "text-[oklch(0.70_0.02_250)] hover:text-[oklch(0.72_0.19_165)] hover:bg-[oklch(0.72_0.19_165/0.06)]"
                }`}
              >
                {link.label}
                {/* Active indicator underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[2px] bg-[oklch(0.72_0.19_165)] rounded-full shadow-[0_0_6px_oklch(0.72_0.19_165/0.6)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Auth Button */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card-light">
                <User className="w-3.5 h-3.5 text-[oklch(0.72_0.19_165)]" />
                <span className="text-xs font-medium text-[oklch(0.85_0.01_250)]">
                  {user?.name || "Usuario"}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[oklch(0.70_0.02_250)] border border-[oklch(0.35_0.03_250/0.5)] hover:border-[oklch(0.55_0.22_25/0.6)] hover:text-[oklch(0.70_0.18_25)] hover:bg-[oklch(0.55_0.22_25/0.08)] transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-[oklch(0.72_0.19_165)] to-[oklch(0.65_0.16_195)] text-[oklch(0.13_0.02_250)] hover:shadow-[0_0_24px_oklch(0.72_0.19_165/0.5)] transition-all duration-300"
            >
              <LogIn className="w-3.5 h-3.5" />
              Acceder
            </button>
          )}

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2 rounded-lg text-[oklch(0.70_0.02_250)] hover:bg-[oklch(0.20_0.02_250)] transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="xl:hidden absolute top-14 left-0 right-0 bg-[oklch(0.10_0.02_250/0.98)] backdrop-blur-xl border-b border-[oklch(0.30_0.03_250/0.5)] py-4 px-4">
          <div className="grid grid-cols-2 gap-1">
            {NAV_LINKS.map((link) => {
              const sectionId = link.href.replace("#", "");
              const isActive = activeSection === sectionId;
              return (
                <button
                  key={link.href}
                  onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); handleNavClick(link.href); }}
                  className={`px-3 py-2.5 text-sm font-semibold rounded-lg transition-all text-left outline-none focus:outline-none ${
                    isActive
                      ? "text-[oklch(0.72_0.19_165)] bg-[oklch(0.72_0.19_165/0.12)] border border-[oklch(0.72_0.19_165/0.3)]"
                      : "text-[oklch(0.70_0.02_250)] hover:text-[oklch(0.72_0.19_165)] hover:bg-[oklch(0.72_0.19_165/0.08)]"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-[oklch(0.30_0.03_250/0.4)]">
            {isAuthenticated ? (
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[oklch(0.35_0.03_250/0.5)] text-[oklch(0.70_0.02_250)] hover:border-[oklch(0.55_0.22_25/0.5)] hover:text-[oklch(0.70_0.18_25)] transition-all"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            ) : (
              <button
                onClick={() => { setMobileOpen(false); setLoginOpen(true); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-[oklch(0.72_0.19_165)] to-[oklch(0.65_0.16_195)] text-[oklch(0.13_0.02_250)]"
              >
                <LogIn className="w-4 h-4" />
                Acceder
              </button>
            )}
          </div>
        </div>
      )}
    </nav>

    <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
  );
}
