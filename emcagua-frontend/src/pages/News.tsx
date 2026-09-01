export default function News() {
  const news = [
    {
      date: '15 Ago 2026',
      title: 'Mejora en la red de distribucion del canton El Carmen',
      summary: 'Se ha completado la modernizacion de la red de distribucion en el sector central del canton El Carmen, beneficiando a mas de 2,000 familias.',
      category: 'Infraestructura',
    },
    {
      date: '01 Ago 2026',
      title: 'Programa de educacion sanitaria en escuelas',
      summary: 'EMCAGUA APC inicia un programa de educacion sanitaria dirigido a estudiantes de escuelas y colegios de los cantones El Carmen y Guamalito.',
      category: 'Comunidad',
    },
    {
      date: '20 Jul 2026',
      title: 'Resultados de calidad del agua - Q2 2026',
      summary: 'Los resultados del segundo trimestre confirman que el agua suministrada cumple con todos los estandares de calidad nacionales e internacionales.',
      category: 'Calidad',
    },
    {
      date: '05 Jul 2026',
      title: 'Nueva plataforma de facturacion en linea',
      summary: 'Estimados usuarios, ya esta disponible nuestra nueva plataforma para consultar y pagar sus facturas de manera electronica.',
      category: 'Servicios',
    },
  ]

  return (
    <div>
      <section className="bg-gradient-to-br from-secondary-dark to-secondary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Noticias</h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Mantente informado sobre las novedades y actividades de EMCAGUA APC.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {news.map((item) => (
              <article
                key={item.title}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-secondary/10 text-secondary text-xs font-semibold px-3 py-1 rounded-full">
                    {item.category}
                  </span>
                  <span className="text-gray-400 text-sm">{item.date}</span>
                </div>
                <h2 className="text-xl font-bold text-dark mb-3">{item.title}</h2>
                <p className="text-gray-500 leading-relaxed">{item.summary}</p>
                <button className="mt-4 text-secondary font-medium text-sm hover:text-secondary-dark transition-colors bg-transparent border-none cursor-pointer p-0">
                  Leer mas &rarr;
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
