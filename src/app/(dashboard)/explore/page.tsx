export default function ExplorePage() {
  return (
    <div className="p-8">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-100">Explorador de Datos</h1>
        <p className="text-sm text-zinc-500">Navega tablas, columnas y relaciones</p>
      </div>
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
        <p className="text-sm text-zinc-600">Conecta una fuente de datos para explorar</p>
      </div>
    </div>
  );
}
