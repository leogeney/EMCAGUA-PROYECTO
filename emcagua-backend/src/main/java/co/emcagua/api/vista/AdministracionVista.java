package co.emcagua.api.vista;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

import org.springframework.security.crypto.password.PasswordEncoder;
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
import co.emcagua.api.facturacion.Tarifa;
import co.emcagua.api.facturacion.TarifaRepositorio;
import co.emcagua.api.seguridad.Cuenta;
import co.emcagua.api.seguridad.CuentaRepositorio;
import co.emcagua.api.seguridad.Modulos;
import co.emcagua.api.seguridad.Rol;
import co.emcagua.api.seguridad.RolRepositorio;
import co.emcagua.api.seguridad.Sesion;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Tarifas, cuentas de funcionarios y roles, con la forma que usa el frontend. */
@RestController
@RequestMapping("/api/vista")
@Tag(name = "Vista (frontend)")
public class AdministracionVista {
    private final TarifaRepositorio tarifas;
    private final CuentaRepositorio cuentas;
    private final RolRepositorio roles;
    private final PasswordEncoder cifrador;

    public AdministracionVista(TarifaRepositorio tarifas, CuentaRepositorio cuentas, RolRepositorio roles, PasswordEncoder cifrador) {
        this.tarifas = tarifas;
        this.cuentas = cuentas;
        this.roles = roles;
        this.cifrador = cifrador;
    }

    static void exigir(String modulo) {
        if (!Sesion.cuenta().getRol().puede(modulo)) throw new ErrorNegocio("Tu rol no tiene permiso para el módulo " + modulo);
    }

    /* -------------------------------- Tarifas -------------------------------- */

    static Map<String, Object> tarifa(Tarifa t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("desde", Map.of("mes", t.getDesdeMes(), "anio", t.getDesdeAnio()));
        m.put("acueducto", Map.of("cf", t.getAcueductoCargoFijo(), "cc", t.getAcueductoPorM3()));
        m.put("alcantarillado", Map.of("cf", t.getAlcantarilladoCargoFijo(), "cc", t.getAlcantarilladoPorM3()));
        m.put("consumoBasico", t.getConsumoBasico());
        m.put("subsidio", Map.of("1", t.getSubsidioEstrato1(), "2", t.getSubsidioEstrato2(), "3", t.getSubsidioEstrato3()));
        m.put("creada", t.getCreado() == null ? 0 : t.getCreado().toEpochMilli());
        return m;
    }

    @GetMapping("/tarifas")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listaTarifas() {
        return tarifas.findAllByOrderByDesdeAnioAscDesdeMesAsc().stream().map(AdministracionVista::tarifa).toList();
    }

    public record Desde(int mes, int anio) {}
    public record Servicio(long cf, long cc) {}
    public record TarifaForm(Desde desde, Servicio acueducto, Servicio alcantarillado, int consumoBasico, Map<String, Double> subsidio) {}

    @PostMapping("/tarifas")
    @Transactional
    public Map<String, Object> guardarTarifa(@RequestBody TarifaForm f) {
        exigir("tarifas");
        if (f.desde() == null || f.acueducto() == null || f.alcantarillado() == null) throw new ErrorNegocio("Faltan datos de la tarifa");
        Tarifa t = tarifas.findAll().stream().filter(x -> x.getDesdeAnio() == f.desde().anio() && x.getDesdeMes() == f.desde().mes()).findFirst().orElseGet(Tarifa::new);
        t.setDesdeAnio(f.desde().anio());
        t.setDesdeMes(f.desde().mes());
        t.setAcueductoCargoFijo(f.acueducto().cf());
        t.setAcueductoPorM3(f.acueducto().cc());
        t.setAlcantarilladoCargoFijo(f.alcantarillado().cf());
        t.setAlcantarilladoPorM3(f.alcantarillado().cc());
        t.setConsumoBasico(f.consumoBasico());
        Map<String, Double> s = f.subsidio() == null ? Map.of() : f.subsidio();
        t.setSubsidioEstrato1(s.getOrDefault("1", 0.0));
        t.setSubsidioEstrato2(s.getOrDefault("2", 0.0));
        t.setSubsidioEstrato3(s.getOrDefault("3", 0.0));
        return tarifa(tarifas.save(t));
    }

    @DeleteMapping("/tarifas/{anio}/{mes}")
    @Transactional
    public Map<String, Object> quitarTarifa(@PathVariable int anio, @PathVariable int mes) {
        exigir("tarifas");
        tarifas.findAll().stream().filter(x -> x.getDesdeAnio() == anio && x.getDesdeMes() == mes).forEach(tarifas::delete);
        return Map.of("ok", true);
    }

    /* ---------------------------- Cuentas y roles ---------------------------- */

    private static Map<String, Object> rol(Rol r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getCodigo());
        m.put("nombre", r.getNombre());
        m.put("descripcion", r.getDescripcion() == null ? "" : r.getDescripcion());
        m.put("permisos", r.isFijo() ? Modulos.TODOS : List.copyOf(r.getPermisos()));
        if (r.isFijo()) m.put("fijo", true);
        return m;
    }

    private static Map<String, Object> cuenta(Cuenta c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("usuario", c.getUsuario());
        m.put("nombre", c.getNombre());
        m.put("cargo", c.getCargo() == null ? "" : c.getCargo());
        m.put("rol", c.getRol().getCodigo());
        m.put("activo", c.isActivo());
        m.put("creada", c.getCreado() == null ? 0 : c.getCreado().toEpochMilli());
        if (c.getUltimoAcceso() != null) m.put("ultimoAcceso", c.getUltimoAcceso().toEpochMilli());
        return m;
    }

    /** Cualquier funcionario puede leer roles y cuentas (para mostrar nombres); solo "cuentas" puede cambiarlos. */
    @GetMapping("/cuentas")
    @Transactional(readOnly = true)
    public Map<String, Object> listaCuentas() {
        return Map.of("roles", roles.findAll().stream().map(AdministracionVista::rol).toList(),
            "cuentas", cuentas.findAll().stream().map(AdministracionVista::cuenta).toList());
    }

    public record CuentaForm(String usuario, String nombre, String cargo, String rol, Boolean activo, String clave) {}

    @PutMapping("/cuentas/{usuario}")
    @Transactional
    public Map<String, Object> guardarCuenta(@PathVariable String usuario, @RequestBody CuentaForm f) {
        exigir("cuentas");
        String u = usuario.trim().toLowerCase();
        if (!u.matches("[a-z0-9._-]{3,30}")) throw new ErrorNegocio("Usuario en minúsculas, sin espacios (3 a 30 caracteres)");
        Rol r = roles.findByCodigo(f.rol()).orElseThrow(() -> new NoEncontrado("No existe el rol " + f.rol()));
        Cuenta c = cuentas.findByUsuario(u).orElse(null);
        boolean nueva = c == null;
        if (nueva) {
            if (f.clave() == null || f.clave().length() < 8) throw new ErrorNegocio("Escribe una contraseña inicial de al menos 8 caracteres");
            c = new Cuenta(u, f.nombre(), f.cargo(), r, cifrador.encode(f.clave()));
        } else if (f.clave() != null && !f.clave().isBlank()) {
            if (f.clave().length() < 8) throw new ErrorNegocio("La contraseña debe tener al menos 8 caracteres");
            c.setClaveHash(cifrador.encode(f.clave()));
        }
        if (f.nombre() == null || f.nombre().isBlank()) throw new ErrorNegocio("Escribe el nombre");
        c.setNombre(f.nombre().trim());
        c.setCargo(f.cargo());
        // El gerente no se puede quitar a sí mismo el acceso
        boolean yo = c.getUsuario().equals(Sesion.cuenta().getUsuario());
        if (yo && (!r.isFijo() || Boolean.FALSE.equals(f.activo())) && c.getRol().isFijo()) throw new ErrorNegocio("No puedes quitarte a ti mismo el rol de Gerente ni desactivar tu cuenta");
        c.setRol(r);
        if (f.activo() != null) c.setActivo(f.activo());
        return cuenta(cuentas.save(c));
    }

    public record RolForm(String nombre, String descripcion, List<String> permisos) {}

    @PutMapping("/roles/{codigo}")
    @Transactional
    public Map<String, Object> guardarRol(@PathVariable String codigo, @RequestBody RolForm f) {
        exigir("cuentas");
        Rol r = roles.findByCodigo(codigo).orElseGet(() -> { Rol n = new Rol(); n.setCodigo(codigo); return n; });
        if (f.nombre() != null && !f.nombre().isBlank()) r.setNombre(f.nombre().trim());
        if (r.getNombre() == null) throw new ErrorNegocio("Escribe el nombre del rol");
        r.setDescripcion(f.descripcion());
        if (!r.isFijo() && f.permisos() != null) r.setPermisos(new LinkedHashSet<>(f.permisos().stream().filter(Modulos.TODOS::contains).toList()));
        return rol(roles.save(r));
    }

    @DeleteMapping("/roles/{codigo}")
    @Transactional
    public Map<String, Object> borrarRol(@PathVariable String codigo) {
        exigir("cuentas");
        Rol r = roles.findByCodigo(codigo).orElseThrow(() -> new NoEncontrado("No existe el rol " + codigo));
        if (r.isFijo()) throw new ErrorNegocio("El rol de Gerente no se puede borrar");
        if (cuentas.findAll().stream().anyMatch(c -> c.getRol().getId().equals(r.getId()))) throw new ErrorNegocio("Hay cuentas con ese rol: cámbiales el rol primero");
        roles.delete(r);
        return Map.of("ok", true);
    }
}
