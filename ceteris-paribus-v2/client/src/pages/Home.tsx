import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturedReports from "@/components/FeaturedReports";
import PreciosSection from "@/components/PreciosSection";
import VolatilidadSection from "@/components/VolatilidadSection";
import ClimaSection from "@/components/ClimaSection";
import DataSection from "@/components/DataSection";
import PremiumSection from "@/components/PremiumSection";
import MediaSection from "@/components/MediaSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import BookLayout, { BookPage } from "@/components/BookLayout";
import SojaReports from "@/components/SojaReports";
import {
  MapPin,
  Milk,
  BarChart2,
  Flag,
  Landmark,
  Globe2,
  LineChart,
} from "lucide-react";

// Data for expandable sections
const TIERRAS_DATA = [
  { label: "Precio promedio/ha (agrícola)", value: "USD 5,200", change: "+3.2%", positive: true },
  { label: "Precio promedio/ha (ganadero)", value: "USD 3,100", change: "+1.8%", positive: true },
  { label: "Precio promedio/ha (lechero)", value: "USD 4,400", change: "+2.5%", positive: true },
  { label: "Transacciones Q1 2026", value: "342", change: "-5.1%", positive: false },
  { label: "Superficie transada (ha)", value: "128,500", change: "+8.3%", positive: true },
  { label: "Índice CONEAT promedio", value: "124", change: "+0.5%", positive: true },
];

const LACTEOS_DATA = [
  { label: "Precio leche (USD/L)", value: "0.385", change: "+2.1%", positive: true },
  { label: "Remisión (mill. L/mes)", value: "185", change: "+4.3%", positive: true },
  { label: "Exportaciones (mill. USD)", value: "245", change: "+6.7%", positive: true },
  { label: "Leche en polvo (USD/ton)", value: "3,450", change: "-1.2%", positive: false },
  { label: "Quesos (USD/ton)", value: "4,120", change: "+3.8%", positive: true },
  { label: "Manteca (USD/ton)", value: "5,680", change: "+5.2%", positive: true },
];

const COMMODITIES_DATA = [
  { label: "Soja (USD/ton)", value: "446.8", change: "-0.38%", positive: false },
  { label: "Trigo (USD/ton)", value: "627.2", change: "-2.44%", positive: false },
  { label: "Maíz (USD/ton)", value: "190.0", change: "-1.04%", positive: false },
  { label: "Arroz (USD/ton)", value: "520.0", change: "+1.2%", positive: true },
  { label: "Carne bovina (USD/ton CIF)", value: "4,850", change: "+2.8%", positive: true },
  { label: "Lana (USD/kg)", value: "8.50", change: "+0.6%", positive: true },
];

const URUGUAY_DATA = [
  { label: "PIB (var. anual)", value: "+3.2%", change: "+0.4pp", positive: true },
  { label: "Inflación (12m)", value: "5.8%", change: "-0.3pp", positive: true },
  { label: "Desempleo", value: "7.2%", change: "-0.5pp", positive: true },
  { label: "Tipo de cambio (USD/UYU)", value: "40.16", change: "-0.22%", positive: true },
  { label: "Exportaciones (mill. USD)", value: "1,250", change: "+8.5%", positive: true },
  { label: "Riesgo país (pb)", value: "105", change: "-12", positive: true },
];

const FINANCIERO_DATA = [
  { label: "Tasa política monetaria", value: "8.50%", change: "-0.25pp", positive: true },
  { label: "Tasa activa promedio", value: "12.3%", change: "-0.15pp", positive: true },
  { label: "Depósitos (var. anual)", value: "+6.8%", change: "+1.2pp", positive: true },
  { label: "Crédito al sector (var.)", value: "+4.5%", change: "+0.8pp", positive: true },
  { label: "UI (valor)", value: "6.12", change: "+0.3%", positive: true },
  { label: "Bono Global 2040 (yield)", value: "4.85%", change: "-0.05pp", positive: true },
];

const GLOBAL_DATA = [
  { label: "S&P 500", value: "5,420", change: "+0.8%", positive: true },
  { label: "Dow Jones", value: "39,850", change: "+0.5%", positive: true },
  { label: "Petróleo WTI (USD/bbl)", value: "72.30", change: "-1.2%", positive: false },
  { label: "Oro (USD/oz)", value: "2,380", change: "+0.4%", positive: true },
  { label: "DXY (Índice Dólar)", value: "98.39", change: "-0.07%", positive: true },
  { label: "Bono US 10Y (yield)", value: "4.25%", change: "+0.02pp", positive: false },
];

const PRODUCTIVIDAD_DATA = [
  { label: "Rendimiento soja (kg/ha)", value: "2,850", change: "+5.2%", positive: true },
  { label: "Rendimiento trigo (kg/ha)", value: "3,200", change: "+3.1%", positive: true },
  { label: "Producción carne (kg/ha)", value: "185", change: "+2.8%", positive: true },
  { label: "Litros leche/ha/año", value: "6,200", change: "+4.5%", positive: true },
  { label: "Índice productividad agrícola", value: "112.5", change: "+3.8%", positive: true },
  { label: "Índice productividad ganadera", value: "108.2", change: "+2.1%", positive: true },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Book Layout - Sections as full-page "pages" */}
      <BookLayout>
        {/* Page 0: Inicio / Hero */}
        <BookPage id="inicio" className="bg-[oklch(0.10_0.02_250)]">
          <div className="flex-1 flex flex-col">
            <HeroSection />
          </div>
        </BookPage>

        {/* Page 1: Precios */}
        <BookPage id="precios" className="bg-[oklch(0.97_0.005_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16">
            <PreciosSection />
          </div>
        </BookPage>

        {/* Page 2: Volatilidad */}
        <BookPage id="volatilidad" className="bg-[oklch(0.97_0.005_210)]">
          <div className="flex-1 flex flex-col justify-start pl-0 lg:pl-16 pt-20">
            <VolatilidadSection />
          </div>
        </BookPage>

        {/* Page 3: Clima */}
        <BookPage id="clima" className="bg-[oklch(0.98_0.003_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16">
            <ClimaSection />
          </div>
        </BookPage>

        {/* Page 3: Tierras */}
        <BookPage id="tierras" className="bg-[oklch(0.97_0.005_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16 px-4 lg:px-8">
            <div className="container">
              <DataSection
                id="tierras-data"
                title="Tierras — Uruguay"
                subtitle="Mercado de tierras y precios por hectárea"
                icon={MapPin}
                iconColor="oklch(0.55 0.15 150)"
                data={TIERRAS_DATA}
                fullPage
              />
            </div>
          </div>
        </BookPage>

        {/* Page 4: Lácteos */}
        <BookPage id="lacteos" className="bg-[oklch(0.98_0.003_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16 px-4 lg:px-8">
            <div className="container">
              <DataSection
                id="lacteos-data"
                title="Lácteos"
                subtitle="Sector lechero: precios y exportaciones"
                icon={Milk}
                iconColor="oklch(0.65 0.10 60)"
                data={LACTEOS_DATA}
                fullPage
              />
            </div>
          </div>
        </BookPage>

        {/* Page 5: Commodities */}
        <BookPage id="commodities" className="bg-[oklch(0.97_0.005_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16 px-4 lg:px-8 overflow-y-auto">
            <div className="container py-6">
              <DataSection
                id="commodities-data"
                title="Commodities"
                subtitle="Seguimiento detallado por commodity"
                icon={BarChart2}
                iconColor="oklch(0.60 0.18 30)"
                data={COMMODITIES_DATA}
                fullPage
              />
              <SojaReports />
            </div>
          </div>
        </BookPage>

        {/* Page 6: Uruguay */}
        <BookPage id="uruguay" className="bg-[oklch(0.98_0.003_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16 px-4 lg:px-8">
            <div className="container">
              <DataSection
                id="uruguay-data"
                title="Uruguay"
                subtitle="Indicadores macroeconómicos"
                icon={Flag}
                iconColor="oklch(0.55 0.12 230)"
                data={URUGUAY_DATA}
                fullPage
              />
            </div>
          </div>
        </BookPage>

        {/* Page 7: Sector Financiero */}
        <BookPage id="sector-financiero" className="bg-[oklch(0.97_0.005_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16 px-4 lg:px-8">
            <div className="container">
              <DataSection
                id="financiero-data"
                title="Sector Financiero"
                subtitle="Tasas, bonos e indicadores bancarios"
                icon={Landmark}
                iconColor="oklch(0.50 0.12 270)"
                data={FINANCIERO_DATA}
                premium
                fullPage
              />
            </div>
          </div>
        </BookPage>

        {/* Page 8: Mercados Globales */}
        <BookPage id="mercados-globales" className="bg-[oklch(0.98_0.003_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16 px-4 lg:px-8">
            <div className="container">
              <DataSection
                id="globales-data"
                title="Mercados Globales"
                subtitle="Panorama internacional de mercados"
                icon={Globe2}
                iconColor="oklch(0.55 0.12 200)"
                data={GLOBAL_DATA}
                fullPage
              />
            </div>
          </div>
        </BookPage>

        {/* Page 9: Productividad */}
        <BookPage id="productividad" className="bg-[oklch(0.97_0.005_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16 px-4 lg:px-8">
            <div className="container">
              <DataSection
                id="productividad-data"
                title="Productividad & Análisis"
                subtitle="Indicadores de productividad agropecuaria"
                icon={LineChart}
                iconColor="oklch(0.60 0.14 150)"
                data={PRODUCTIVIDAD_DATA}
                premium
                fullPage
              />
            </div>
          </div>
        </BookPage>

        {/* Page 10: Premium */}
        <BookPage id="premium" className="bg-[oklch(0.10_0.02_250)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16">
            <PremiumSection />
          </div>
        </BookPage>

        {/* Page 11: Medios */}
        <BookPage id="medios" className="bg-[oklch(0.98_0.003_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16">
            <MediaSection />
          </div>
        </BookPage>

        {/* Page 12: Contacto */}
        <BookPage id="contacto" className="bg-[oklch(0.97_0.005_210)]">
          <div className="flex-1 flex flex-col justify-center pl-0 lg:pl-16">
            <ContactSection />
            <Footer />
          </div>
        </BookPage>
      </BookLayout>
    </div>
  );
}
