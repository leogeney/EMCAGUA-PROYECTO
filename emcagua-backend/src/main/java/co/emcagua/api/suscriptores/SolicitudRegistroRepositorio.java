package co.emcagua.api.suscriptores;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

/** No se publica en /api (tiene contraseñas cifradas): se usa solo desde los controladores. */
@RepositoryRestResource(exported = false)
public interface SolicitudRegistroRepositorio extends JpaRepository<SolicitudRegistro, Long> {
    List<SolicitudRegistro> findAllByOrderByCreadoDesc();
    Optional<SolicitudRegistro> findFirstByCedulaAndEstadoOrderByCreadoDesc(String cedula, SolicitudRegistro.Estado estado);
    Optional<SolicitudRegistro> findFirstByCedulaOrderByCreadoDesc(String cedula);
    Optional<SolicitudRegistro> findByRadicado(String radicado);
}
