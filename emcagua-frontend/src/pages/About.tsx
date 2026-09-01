const team = [
  { name: 'Direccion General', role: 'Gestion Estrategica' },
  { name: 'Area Tecnica', role: 'Ingenieria y Mantenimiento' },
  { name: 'Area Administrativa', role: 'Recursos Humanos y Finanzas' },
  { name: 'Area Comercial', role: 'Atencion al Cliente' },
]

export default function About() {
  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-br from-secondary-dark to-secondary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Nosotros</h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Conoce mas sobre EMCAGUA APC y nuestra mision de servir a la comunidad de Norte de Santander.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-gray-soft rounded-2xl p-8">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-dark mb-4">Mision</h2>
              <p className="text-gray-500 leading-relaxed">
                Brindar servicios de agua potable, alcantarillado y saneamiento de manera eficiente,
                transparente y sostenible a los habitantes de los cantones El Carmen y Guamalito,
                promoviendo el desarrollo social y el bienestar de nuestra comunidad en Norte de Santander.
              </p>
            </div>
            <div className="bg-gray-soft rounded-2xl p-8">
              <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-dark mb-4">Vision</h2>
              <p className="text-gray-500 leading-relaxed">
                Ser una empresa lider en la gestion de servicios de agua potable y saneamiento,
                reconocida por su excelencia operativa, transparencia administrativa y compromiso
                con el desarrollo sostenible de la region de Norte de Santander.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-dark text-center mb-12">Nuestros Valores</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Transparencia', desc: 'Gestion administrativa abierta y transparente ante la comunidad.' },
              { title: 'Compromiso', desc: 'Dedicacion total al bienestar de nuestros usuarios y comunidades.' },
              { title: 'Eficiencia', desc: 'Optimizacion de recursos para brindar el mejor servicio posible.' },
            ].map((value) => (
              <div key={value.title} className="bg-white rounded-xl p-8 text-center shadow-sm">
                <h3 className="text-xl font-bold text-secondary mb-3">{value.title}</h3>
                <p className="text-gray-500 text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Organization */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-dark text-center mb-12">Estructura Organizacional</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-gray-soft rounded-xl p-6 text-center border border-gray-100"
              >
                <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-bold text-dark mb-1">{member.name}</h3>
                <p className="text-gray-500 text-sm">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History */}
      <section className="py-20 bg-gradient-to-br from-secondary-dark to-secondary text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Nuestra Historia</h2>
          <p className="text-white/80 leading-relaxed text-lg">
            EMCAGUA APC fue fundada como una empresa de Administracion Publica Cooperativa
            con el objetivo de garantizar el acceso a agua potable de calidad para los
            habitantes de El Carmen y Guamalito en Norte de Santander. Desde entonces, hemos trabajado
            incansablemente para expandir y mejorar nuestros servicios, convirtiendonos en un
            pilar fundamental para el desarrollo de nuestra region.
          </p>
        </div>
      </section>
    </div>
  )
}
