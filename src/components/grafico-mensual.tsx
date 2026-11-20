/**
 * Barras agrupadas por mes (dos series) en HTML/CSS, sin JS de cliente.
 * Colores validados (CVD/contraste); como la serie clara tiene poco contraste
 * con el fondo, cada mes muestra sus valores al pasar el ratón o enfocar y hay
 * una tabla equivalente para lectores de pantalla.
 */
export interface PuntoMensual {
  mes: string;
  etiqueta: string;
  a: number;
  b: number;
}

export const SERIE_A = { nombre: "Órdenes nuevas", color: "#5b2be0" };
export const SERIE_B = { nombre: "Entregas previstas", color: "#1fb8e0" };

function escala(max: number) {
  const raw = Math.max(1, max) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const step = Math.max(1, Math.round((n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow));
  const top = Math.max(step, Math.ceil(Math.max(1, max) / step) * step);
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return { top, ticks };
}

export function Leyenda() {
  return (
    <ul className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
      {[SERIE_A, SERIE_B].map((s) => (
        <li key={s.nombre} className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-[4px]" style={{ background: s.color }} aria-hidden="true" />
          {s.nombre}
        </li>
      ))}
    </ul>
  );
}

export function GraficoMensual({ datos }: { datos: PuntoMensual[] }) {
  const { top, ticks } = escala(Math.max(0, ...datos.flatMap((d) => [d.a, d.b])));
  const pct = (v: number) => `${(v / top) * 100}%`;

  return (
    <figure>
      <div className="flex gap-3" aria-hidden="true">
        {/* Eje Y */}
        <div className="relative h-56 w-6 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: pct(t) }}>
              {t}
            </span>
          ))}
        </div>

        <div className="relative h-56 flex-1">
          {ticks.map((t) => (
            <div
              key={t}
              className={`absolute inset-x-0 border-t ${t === 0 ? "border-slate-300" : "border-slate-100"}`}
              style={{ bottom: pct(t) }}
            />
          ))}
          <div className="absolute inset-0 flex">
            {datos.map((d) => (
              <div
                key={d.mes}
                tabIndex={0}
                className="group relative flex flex-1 items-end justify-center gap-[2px] rounded-md outline-none hover:bg-slate-50/70 focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <span
                  className="w-3 rounded-t-[4px] sm:w-4"
                  style={{ height: pct(d.a), background: SERIE_A.color }}
                />
                <span
                  className="w-3 rounded-t-[4px] sm:w-4"
                  style={{ height: pct(d.b), background: SERIE_B.color }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded-lg bg-turbo-950 px-3 py-2 text-xs text-white shadow-lg group-hover:block group-focus-visible:block">
                  <p className="mb-1 font-semibold capitalize">{d.etiqueta}</p>
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-sm" style={{ background: SERIE_A.color }} />
                    {SERIE_A.nombre}: <span className="font-semibold tabular-nums">{d.a}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-sm" style={{ background: SERIE_B.color }} />
                    {SERIE_B.nombre}: <span className="font-semibold tabular-nums">{d.b}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-9 mt-2 flex text-xs capitalize text-slate-500" aria-hidden="true">
        {datos.map((d) => (
          <span key={d.mes} className="flex-1 text-center">
            {d.etiqueta}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Órdenes nuevas y entregas previstas por mes</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">{SERIE_A.nombre}</th>
            <th scope="col">{SERIE_B.nombre}</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.mes}>
              <th scope="row">{d.etiqueta}</th>
              <td>{d.a}</td>
              <td>{d.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
