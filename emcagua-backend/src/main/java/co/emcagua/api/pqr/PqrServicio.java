package co.emcagua.api.pqr;

import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.emcagua.api.comun.DiasHabiles;
import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.facturacion.FacturacionServicio;
import co.emcagua.api.suscriptores.PredioRepositorio;

@Service
public class PqrServicio {
    public static final int PLAZO_DIAS_HABILES = 15;

    private final PqrRepositorio repo;
    private final EventoPqrRepositorio eventos;
    private final PredioRepositorio predios;

    public PqrServicio(PqrRepositorio repo, EventoPqrRepositorio eventos, PredioRepositorio predios) {
        this.repo = repo;
        this.eventos = eventos;
        this.predios = predios;
    }

    public record Radicacion(Pqr.Tipo tipo, Pqr.Categoria categoria, Pqr.Canal canal, String predio, String nombre, String telefono, String barrio, String descripcion) {}

    /** Si no se dice la categoría, se sugiere por las palabras del texto. */
    static Pqr.Categoria sugerirCategoria(String t) {
        String q = t.toLowerCase(Locale.ROOT);
        if (q.matches(".*(factur|cobr|recibo|cuenta|valor|pag).*")) return Pqr.Categoria.FACTURACION;
        if (q.matches(".*(fuga|da[ñn]o|tubo|tuber|roto|bote).*")) return Pqr.Categoria.DANO_O_FUGA;
        if (q.matches(".*(turbi|sucia|olor|color|sabor|calidad).*")) return Pqr.Categoria.CALIDAD_DEL_AGUA;
        if (q.matches(".*(corte|reconex|suspend|sin agua).*")) return Pqr.Categoria.CORTE_Y_RECONEXION;
        if (q.matches(".*(atenci|trato|demora|funcionari).*")) return Pqr.Categoria.ATENCION;
        return Pqr.Categoria.OTRO;
    }

    @Transactional
    public Pqr radicar(Radicacion r, String usuario) {
        if (r.descripcion() == null || r.descripcion().trim().length() < 10) throw new ErrorNegocio("Describe la solicitud (mínimo 10 caracteres)");
        if (r.nombre() == null || r.nombre().isBlank()) throw new ErrorNegocio("Falta el nombre de quien radica");
        String base = "PQR-%d-".formatted(Year.now().getValue());
        Pqr p = new Pqr();
        p.setRadicado(base + "%04d".formatted(repo.countByRadicadoStartingWith(base) + 1));
        p.setTipo(r.tipo() != null ? r.tipo() : Pqr.Tipo.PETICION);
        p.setCategoria(r.categoria() != null ? r.categoria() : sugerirCategoria(r.descripcion()));
        p.setCanal(r.canal() != null ? r.canal() : Pqr.Canal.PRESENCIAL);
        if (r.predio() != null && !r.predio().isBlank()) p.setPredio(predios.findByCodigo(r.predio()).orElseThrow(() -> new NoEncontrado("No existe el suscriptor " + r.predio())));
        p.setNombre(r.nombre().trim());
        p.setTelefono(r.telefono());
        p.setBarrio(r.barrio() != null ? r.barrio() : p.getPredio() != null ? p.getPredio().nombreSector() : null);
        p.setDescripcion(r.descripcion().trim());
        Instant ahora = Instant.now();
        p.setRadicadaEn(ahora);
        p.setVence(DiasHabiles.sumar(LocalDate.now(FacturacionServicio.ZONA), PLAZO_DIAS_HABILES));
        p = repo.save(p);
        eventos.save(new EventoPqr(p, usuario, "Radicada por " + p.getCanal().name().toLowerCase().replace('_', ' ')));
        return p;
    }

    @Transactional
    public Pqr asignar(String radicado, String responsable, String usuario) {
        Pqr p = buscar(radicado);
        p.setResponsable(responsable);
        if (p.getEstado() == Pqr.Estado.RADICADA) p.setEstado(Pqr.Estado.EN_TRAMITE);
        eventos.save(new EventoPqr(p, usuario, "Asignada a " + responsable));
        return repo.save(p);
    }

    @Transactional
    public Pqr responder(String radicado, String respuesta, String usuario) {
        if (respuesta == null || respuesta.trim().length() < 15) throw new ErrorNegocio("La respuesta debe tener al menos 15 caracteres");
        Pqr p = buscar(radicado);
        if (p.getEstado() == Pqr.Estado.RESPONDIDA || p.getEstado() == Pqr.Estado.CERRADA) throw new ErrorNegocio("La PQR ya fue respondida");
        p.setRespuesta(respuesta.trim());
        p.setRespondidaEn(Instant.now());
        p.setEstado(Pqr.Estado.RESPONDIDA);
        int dias = DiasHabiles.restantes(LocalDate.now(FacturacionServicio.ZONA), p.getVence());
        eventos.save(new EventoPqr(p, usuario, dias >= 0 ? "Respondida a tiempo" : "Respondida fuera de término (" + (-dias) + " días hábiles tarde)"));
        return repo.save(p);
    }

    @Transactional
    public Pqr cerrar(String radicado, String usuario) {
        Pqr p = buscar(radicado);
        p.setEstado(Pqr.Estado.CERRADA);
        eventos.save(new EventoPqr(p, usuario, "Cerrada"));
        return repo.save(p);
    }

    public Pqr buscar(String radicado) { return repo.findByRadicado(radicado).orElseThrow(() -> new NoEncontrado("No existe la PQR " + radicado)); }
}
