package co.emcagua.api.vista;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.perdidas.MacromedicionRepositorio;
import co.emcagua.api.suscriptores.Barrio;
import co.emcagua.api.suscriptores.BarrioRepositorio;
import co.emcagua.api.suscriptores.PredioRepositorio;
import co.emcagua.api.suscriptores.Sector;
import co.emcagua.api.suscriptores.SectorRepositorio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Sectores de la red y sus barrios (Configuración → Sectores y barrios). */
@RestController
@RequestMapping("/api/vista/zonas")
@Tag(name = "Vista (frontend)")
public class ZonasVista {
    private final SectorRepositorio sectores;
    private final BarrioRepositorio barrios;
    private final PredioRepositorio predios;
    private final MacromedicionRepositorio macro;

    public ZonasVista(SectorRepositorio sectores, BarrioRepositorio barrios, PredioRepositorio predios, MacromedicionRepositorio macro) {
        this.sectores = sectores;
        this.barrios = barrios;
        this.predios = predios;
        this.macro = macro;
    }

    private static String limpio(String s, String campo) {
        if (s == null || s.isBlank()) throw new ErrorNegocio("Escribe el nombre del " + campo);
        String t = s.trim().replaceAll("\\s+", " ");
        if (t.length() > 80) throw new ErrorNegocio("El nombre es muy largo");
        return t;
    }

    @Operation(summary = "Sectores con sus barrios y cuántos predios tiene cada uno")
    @GetMapping
    @Transactional(readOnly = true)
    public List<Map<String, Object>> lista() {
        return sectores.findAllByOrderByOrdenAscNombreAsc().stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("nombre", s.getNombre());
            m.put("predios", predios.countBySector(s));
            m.put("barrios", barrios.findBySectorOrderByNombreAsc(s).stream()
                .map(b -> Map.<String, Object>of("id", b.getId(), "nombre", b.getNombre(), "predios", predios.countByBarrio(b))).toList());
            return m;
        }).toList();
    }

    public record Nombre(String nombre) {}

    @PostMapping("/sectores")
    @Transactional
    public Map<String, Object> crearSector(@RequestBody Nombre n) {
        AdministracionVista.exigir("configuracion");
        String nombre = limpio(n.nombre(), "sector");
        if (sectores.findByNombreIgnoreCase(nombre).isPresent()) throw new ErrorNegocio("Ya existe el sector " + nombre);
        int orden = sectores.findAll().stream().mapToInt(Sector::getOrden).max().orElse(0) + 1;
        Sector s = sectores.save(new Sector(nombre, orden));
        return Map.of("id", s.getId(), "nombre", s.getNombre());
    }

    @PutMapping("/sectores/{id}")
    @Transactional
    public Map<String, Object> renombrarSector(@PathVariable Long id, @RequestBody Nombre n) {
        AdministracionVista.exigir("configuracion");
        Sector s = sectores.findById(id).orElseThrow(() -> new NoEncontrado("No existe ese sector"));
        String nombre = limpio(n.nombre(), "sector");
        sectores.findByNombreIgnoreCase(nombre).filter(x -> !x.getId().equals(id)).ifPresent(x -> { throw new ErrorNegocio("Ya existe el sector " + nombre); });
        s.setNombre(nombre);
        return Map.of("id", sectores.save(s).getId(), "nombre", nombre);
    }

    @DeleteMapping("/sectores/{id}")
    @Transactional
    public Map<String, Object> borrarSector(@PathVariable Long id) {
        AdministracionVista.exigir("configuracion");
        Sector s = sectores.findById(id).orElseThrow(() -> new NoEncontrado("No existe ese sector"));
        if (predios.countBySector(s) > 0) throw new ErrorNegocio("El sector " + s.getNombre() + " tiene predios: cámbialos de sector primero");
        if (barrios.countBySector(s) > 0) throw new ErrorNegocio("El sector " + s.getNombre() + " tiene barrios: bórralos primero");
        if (macro.findAll().stream().anyMatch(m -> m.getSector() != null && m.getSector().getId().equals(id))) throw new ErrorNegocio("El sector tiene mediciones de agua guardadas");
        sectores.delete(s);
        return Map.of("ok", true);
    }

    public record BarrioForm(Long sector, String nombre) {}

    @PostMapping("/barrios")
    @Transactional
    public Map<String, Object> crearBarrio(@RequestBody BarrioForm f) {
        AdministracionVista.exigir("configuracion");
        Sector s = sectores.findById(f.sector() == null ? -1 : f.sector()).orElseThrow(() -> new NoEncontrado("Elige el sector del barrio"));
        String nombre = limpio(f.nombre(), "barrio");
        if (barrios.findBySectorAndNombreIgnoreCase(s, nombre).isPresent()) throw new ErrorNegocio("El barrio " + nombre + " ya existe en " + s.getNombre());
        Barrio b = barrios.save(new Barrio(s, nombre));
        return Map.of("id", b.getId(), "nombre", b.getNombre());
    }

    @PutMapping("/barrios/{id}")
    @Transactional
    public Map<String, Object> editarBarrio(@PathVariable Long id, @RequestBody BarrioForm f) {
        AdministracionVista.exigir("configuracion");
        Barrio b = barrios.findById(id).orElseThrow(() -> new NoEncontrado("No existe ese barrio"));
        Sector s = f.sector() == null ? b.getSector() : sectores.findById(f.sector()).orElseThrow(() -> new NoEncontrado("No existe ese sector"));
        String nombre = limpio(f.nombre(), "barrio");
        barrios.findBySectorAndNombreIgnoreCase(s, nombre).filter(x -> !x.getId().equals(id)).ifPresent(x -> { throw new ErrorNegocio("El barrio " + nombre + " ya existe en " + s.getNombre()); });
        if (!s.getId().equals(b.getSector().getId()) && predios.countByBarrio(b) > 0) throw new ErrorNegocio("El barrio tiene predios: no se puede pasar a otro sector");
        b.setSector(s);
        b.setNombre(nombre);
        return Map.of("id", barrios.save(b).getId(), "nombre", nombre);
    }

    @DeleteMapping("/barrios/{id}")
    @Transactional
    public Map<String, Object> borrarBarrio(@PathVariable Long id) {
        AdministracionVista.exigir("configuracion");
        Barrio b = barrios.findById(id).orElseThrow(() -> new NoEncontrado("No existe ese barrio"));
        long n = predios.countByBarrio(b);
        if (n > 0) throw new ErrorNegocio("El barrio " + b.getNombre() + " tiene " + n + " predio(s): cámbialos de barrio primero");
        barrios.delete(b);
        return Map.of("ok", true);
    }
}
