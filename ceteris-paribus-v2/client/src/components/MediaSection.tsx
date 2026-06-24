import { useState, useRef } from "react";
import { Newspaper, ExternalLink, Headphones, Play, Pause } from "lucide-react";

interface Article {
  title: string;
  source: string;
  date: string;
  excerpt: string;
  url: string;
  type: "audio" | "article";
  audioSrc?: string; // URL directa a mp3 para player inline
  duration?: string; // e.g. "12:34" — se usa si no hay audioSrc o antes de cargar metadata
}

const ARTICLES: Article[] = [
  {
    title: "Ley de desburocratización: silencio positivo, digitalización y costos estructurales",
    source: "Radio Rural · Esta Mañana",
    date: "Junio 2026",
    excerpt:
      "Milton Ramallo analiza el proyecto de ley de desburocratización y destaca medidas como el silencio positivo y la digitalización de trámites, que aportan mayor agilidad y previsibilidad. No obstante, señala que persisten desafíos estructurales, como la carga impositiva y los altos costos internos, que siguen afectando la competitividad y el costo de vida en Uruguay.",
    url: "https://on.soundcloud.com/GIEGX35hdg1EMNmGe4",
    type: "audio",
  },
  {
    title: "Competitividad, costos internos e incertidumbre cambiaria en el agro",
    source: "Radio Florida",
    date: "Junio 2026",
    excerpt:
      "El diálogo analiza la incertidumbre cambiaria, el proyecto de ley de competitividad y los desafíos del agro. Ramallo destaca avances en simplificación burocrática, reclama una mayor defensa de la competencia y advierte que la pérdida de competitividad y el aumento de costos internos son hoy las principales preocupaciones del sector agroexportador.",
    url: "https://on.soundcloud.com/N4EA97S1DfNclM5LT6",
    type: "audio",
  },
  {
    title: "Fogón Económico: El gasoil y su impacto real en la economía",
    source: "770 AM Oriental Agropecuaria",
    date: "Mayo 2026",
    excerpt:
      "El gasoil es mucho más que un insumo: es el termómetro silencioso de la competitividad en Uruguay. Conversamos con Rafael Normey, presidente de la Federación Rural y el economista Milton Ramallo sobre el precio del combustible y su impacto real en la economía. ¿Cuánto pesa el gasoil en los costos? ¿Y cuánto margen hay para aliviar esa carga sin desfinanciar al Estado?",
    url: "https://open.spotify.com/episode/5NzSPunMeYA8dKmOFmqTrk?si=HUN7MjwXQZSbwyo1Bh53_g",
    type: "audio",
  },
  {
    title: "Gasoil: sobrecosto de $8,20 por litro golpea al agro, advirtió Federación Rural",
    source: "Revista Verde",
    date: "Mayo 2026",
    excerpt:
      'El economista señaló que el problema "no es nuevo", pero se vuelve "más crítico" en escenarios de márgenes ajustados para el agro. "Siempre la distorsión se da al alza y siempre la termina pagando el sector productivo", dijo Ramallo.',
    url: "https://revistaverde.com.uy/actualidad/gasoil-sobrecosto-de-820-por-litro-golpea-al-agro-advirtio-federacion-rural-que-cuestiona-subsidio-al-transporte/",
    type: "article",
  },
  {
    title: "Reunión con el Banco Mundial sobre proyecto Agriconnect",
    source: "Federación Rural",
    date: "Abril 2026",
    excerpt:
      "Hoy el presidente de la Federación Rural, junto a su equipo económico integrado por Milton Ramallo, Milagros Otegui y la Dra. Isabel Etchandy, se reunió con un equipo del Banco Mundial responsable del proyecto AgriConnect.",
    url: "https://x.com/federacionrural/status/2044229726676336953?s=20",
    type: "article",
  },
  {
    title: "Estuvimos junto a Juan Dellapiazza por Oriental770 en Punto de Equilibrio",
    source: "Punto de Equilibrio",
    date: "Marzo 2026",
    excerpt:
      "El panorama económico actual en Uruguay está marcado por una reciente flexibilización de la política monetaria en un contexto de desaceleración económica y tensiones en el mercado cambiario.",
    url: "https://soundcloud.com/milton-ramallo/2026-03-04-10-33?utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing",
    type: "audio",
  },
  {
    title: "Economía uruguaya: ¿La casa en orden o en desorden?",
    source: "TodoElCampo",
    date: "Febrero 2026",
    excerpt:
      "Análisis sobre la situación macroeconómica de Uruguay y su impacto en los mercados agrícolas y financieros.",
    url: "https://todoelcampo.com.uy/economia-uruguaya-la-casa-en-orden-o-en-desorden/",
    type: "article",
  },
  {
    title: "Federación Rural no quiere un valor del dólar a gusto propio",
    source: "Rurales El País",
    date: "Febrero 2026",
    excerpt:
      "El economista y asesor de la Federación Rural afirmó que, si las gremiales no hubieran impulsado el tema, el dólar hoy estaría en 36,50. Señaló que la mejora se debe a que se visibilizó y planteó el problema.",
    url: "https://rurales.elpais.com.uy/mercados/federacion-rural-no-quiere-un-valor-del-dolar-a-gusto-propio",
    type: "article",
  },
  {
    title: "Ec. Ramallo: Los costos lesionan la rentabilidad",
    source: "TodoElCampo",
    date: "Febrero 2026",
    excerpt:
      "El asesor de la Federación Rural también cuestionó que en Uruguay se paralice la producción para discutir algún tipo de problemática. Eso no puede pasar, como está pasando con el puerto y Conaprole.",
    url: "https://todoelcampo.com.uy/ec-ramallo-los-costos-lesionan-la-rentabilidad/",
    type: "article",
  },
  {
    title: "Milton Ramallo, asesor de la Federación Rural: 2025 será un buen año para el agro, pero con incertidumbre",
    source: "El País",
    date: "Febrero 2025",
    excerpt:
      "El asesor de la Federación Rural del Uruguay explicó que el endeudamiento de las empresas agropecuarias lleva tres ejercicios al alza, para mantener las unidades en actividad.",
    url: "https://www.elpais.com.uy/economia-y-mercado/milton-ramallo-asesor-de-la-federacion-rural-2025-sera-un-buen-ano-para-el-agro-pero-con-incertidumbre",
    type: "article",
  },
];

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function AudioCard({ article }: { article: Article }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [metaDuration, setMetaDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const hasInline = !!article.audioSrc;
  const displayDuration =
    metaDuration > 0 ? fmt(metaDuration) : (article.duration ?? "");

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  return (
    <div className="group p-5 rounded-xl bg-[oklch(0.96_0.008_210)] border border-[oklch(0.88_0.01_210)] hover:border-[oklch(0.40_0.18_165/0.5)] hover:shadow-md transition-all duration-300 flex flex-col">
      {hasInline && (
        <audio
          ref={audioRef}
          src={article.audioSrc}
          preload="metadata"
          onTimeUpdate={() => setElapsed(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setMetaDuration(audioRef.current?.duration ?? 0)}
          onEnded={() => {
            setPlaying(false);
            setElapsed(0);
          }}
        />
      )}

      {/* header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[oklch(0.35_0.18_165)] bg-[oklch(0.40_0.18_165/0.1)] border border-[oklch(0.40_0.18_165/0.2)] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {article.source}
          </span>
          <span className="text-xs text-[oklch(0.38_0.03_250)] font-medium">{article.date}</span>
        </div>
        <Headphones className="w-4 h-4 text-[oklch(0.45_0.03_250)] group-hover:text-[oklch(0.38_0.18_165)] transition-colors shrink-0" />
      </div>

      <h4 className="font-bold text-[oklch(0.12_0.03_250)] mb-2 text-sm leading-snug">{article.title}</h4>
      <p className="text-xs text-[oklch(0.35_0.03_250)] leading-relaxed flex-1">{article.excerpt}</p>

      {/* player row */}
      <div className="mt-4 flex items-center gap-3">
        {hasInline ? (
          <>
            <button
              onClick={toggle}
              aria-label={playing ? "Pausar" : "Reproducir"}
              className="w-9 h-9 rounded-full bg-[oklch(0.35_0.18_165)] hover:bg-[oklch(0.28_0.18_165)] flex items-center justify-center transition-colors shrink-0"
            >
              {playing ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" />
              )}
            </button>
            <span className="text-xs font-mono text-[oklch(0.40_0.03_250)]">
              {playing && displayDuration
                ? `${fmt(elapsed)} / ${displayDuration}`
                : displayDuration}
            </span>
          </>
        ) : (
          <>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-[oklch(0.35_0.18_165)] hover:bg-[oklch(0.28_0.18_165)] flex items-center justify-center transition-colors shrink-0"
              aria-label="Escuchar en plataforma externa"
            >
              <Play className="w-4 h-4 text-white ml-0.5" />
            </a>
            {article.duration && (
              <span className="text-xs font-mono text-[oklch(0.40_0.03_250)]">{article.duration}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group p-5 rounded-xl bg-[oklch(0.96_0.008_210)] border border-[oklch(0.88_0.01_210)] hover:border-[oklch(0.40_0.18_165/0.5)] hover:shadow-md transition-all duration-300 flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[oklch(0.35_0.18_165)] bg-[oklch(0.40_0.18_165/0.1)] border border-[oklch(0.40_0.18_165/0.2)] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {article.source}
          </span>
          <span className="text-xs text-[oklch(0.38_0.03_250)] font-medium">{article.date}</span>
        </div>
        <ExternalLink className="w-4 h-4 text-[oklch(0.45_0.03_250)] group-hover:text-[oklch(0.38_0.18_165)] transition-colors shrink-0" />
      </div>
      <h4 className="font-bold text-[oklch(0.12_0.03_250)] mb-2 group-hover:text-[oklch(0.35_0.18_165)] transition-colors text-sm leading-snug">
        {article.title}
      </h4>
      <p className="text-xs text-[oklch(0.35_0.03_250)] leading-relaxed flex-1">{article.excerpt}</p>
      <div className="mt-3 text-xs font-semibold text-[oklch(0.35_0.18_165)] group-hover:underline">
        Leer nota →
      </div>
    </a>
  );
}

export default function MediaSection() {
  return (
    <div className="w-full py-8 px-4 lg:px-8 flex-1 flex flex-col justify-center">
      <div className="container">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-[oklch(0.42_0.14_270/0.15)] flex items-center justify-center border border-[oklch(0.42_0.14_270/0.25)]">
            <Newspaper className="w-6 h-6 text-[oklch(0.38_0.14_270)]" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[oklch(0.12_0.03_250)]">
              Notas en Medios
            </h2>
            <p className="text-base text-[oklch(0.38_0.03_250)]">Cobertura y análisis en prensa</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ARTICLES.map((article) =>
            article.type === "audio" ? (
              <AudioCard key={article.title} article={article} />
            ) : (
              <ArticleCard key={article.title} article={article} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
