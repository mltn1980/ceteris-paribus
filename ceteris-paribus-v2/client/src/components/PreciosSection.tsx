import { useState } from "react";
import TradingViewWidget from "./TradingViewWidget";
import { TrendingUp } from "lucide-react";

const TABS = [
  { id: "soja", label: "Soja", symbol: "CAPITALCOM:SOYBEAN", title: "Soja — CFD" },
  { id: "maiz", label: "Maíz", symbol: "CAPITALCOM:CORN", title: "Maíz — CFD" },
  { id: "trigo", label: "Trigo", symbol: "CAPITALCOM:WHEAT", title: "Trigo — CFD" },
  { id: "brent", label: "Petróleo Brent", symbol: "TVC:UKOIL", title: "Petróleo Brent" },
  { id: "dxy", label: "DXY", symbol: "CAPITALCOM:DXY", title: "Índice Dólar (DXY)" },
  { id: "dolar", label: "USD/UYU", symbol: "FX_IDC:USDUYU", title: "Dólar / Peso Uruguayo" },
  { id: "usd-ars", label: "USD/ARS", symbol: "FX_IDC:USDARS", title: "Dólar / Peso Argentino" },
  { id: "usd-brl", label: "USD/BRL", symbol: "FX_IDC:USDBRL", title: "Dólar / Real Brasileño" },
];

export default function PreciosSection() {
  const [activeTab, setActiveTab] = useState("soja");
  const activeItem = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="w-full py-8 px-4 lg:px-8">
      <div className="container">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[oklch(0.40_0.18_165/0.15)] flex items-center justify-center border border-[oklch(0.40_0.18_165/0.25)]">
            <TrendingUp className="w-6 h-6 text-[oklch(0.35_0.18_165)]" />
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-[oklch(0.12_0.03_250)]">
              Precios & Mercados
            </h2>
            <p className="text-base text-[oklch(0.38_0.03_250)]">Cotizaciones en tiempo real</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-[oklch(0.15_0.03_250)] text-white shadow-md"
                  : "bg-[oklch(0.95_0.005_210)] text-[oklch(0.30_0.03_250)] border border-[oklch(0.85_0.01_210)] hover:border-[oklch(0.40_0.18_165/0.5)] hover:text-[oklch(0.35_0.18_165)] hover:bg-[oklch(0.40_0.18_165/0.05)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart - taller for full page */}
        <div className="rounded-xl border border-[oklch(0.85_0.01_210)] overflow-hidden shadow-sm">
          <TradingViewWidget
            symbol={activeItem.symbol}
            title={activeItem.title}
            height={500}
          />
        </div>

        <p className="text-sm text-[oklch(0.40_0.03_250)] mt-3 text-center">
          Datos provistos por TradingView. Precios de referencia, no constituyen asesoramiento financiero.
        </p>
      </div>
    </div>
  );
}
