package co.emcagua.api.auditoria;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import jakarta.persistence.criteria.Predicate;

@Repository
public interface AuditoriaRepositorio extends JpaRepository<AuditoriaLog, Long>, JpaSpecificationExecutor<AuditoriaLog> {

    long countByFechaGreaterThanEqual(Instant desde);

    @Query("SELECT DISTINCT a.usuario FROM AuditoriaLog a WHERE a.usuario IS NOT NULL ORDER BY a.usuario ASC")
    List<String> usuariosDistintos();

    @Query("SELECT DISTINCT a.modulo FROM AuditoriaLog a WHERE a.modulo IS NOT NULL ORDER BY a.modulo ASC")
    List<String> modulosDistintos();

    @Query("SELECT DISTINCT a.accion FROM AuditoriaLog a WHERE a.accion IS NOT NULL ORDER BY a.accion ASC")
    List<String> accionesDistintas();

    default Page<AuditoriaLog> buscarConFiltros(String usuario, String modulo, String accion,
                                                Instant desde, Instant hasta, String q, Pageable pageable) {
        Specification<AuditoriaLog> spec = (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (usuario != null && !usuario.isBlank()) {
                preds.add(cb.equal(cb.lower(root.get("usuario")), usuario.trim().toLowerCase()));
            }
            if (modulo != null && !modulo.isBlank()) {
                preds.add(cb.equal(cb.lower(root.get("modulo")), modulo.trim().toLowerCase()));
            }
            if (accion != null && !accion.isBlank()) {
                preds.add(cb.equal(cb.lower(root.get("accion")), accion.trim().toLowerCase()));
            }
            if (desde != null) {
                preds.add(cb.greaterThanOrEqualTo(root.get("fecha"), desde));
            }
            if (hasta != null) {
                preds.add(cb.lessThanOrEqualTo(root.get("fecha"), hasta));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                preds.add(cb.or(
                    cb.like(cb.lower(root.get("descripcion")), pattern),
                    cb.like(cb.lower(root.get("entidadId")), pattern),
                    cb.like(cb.lower(root.get("nombreUsuario")), pattern),
                    cb.like(cb.lower(root.get("usuario")), pattern)
                ));
            }
            query.orderBy(cb.desc(root.get("fecha")));
            return preds.isEmpty() ? cb.conjunction() : cb.and(preds.toArray(new Predicate[0]));
        };
        return findAll(spec, pageable);
    }
}
