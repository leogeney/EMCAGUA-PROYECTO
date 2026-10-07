package co.emcagua.api.ia;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import co.emcagua.api.seguridad.Cuenta;

/** No se expone por la API REST genérica: los chats son privados (ver ChatControlador). */
@RepositoryRestResource(exported = false)
public interface ConversacionRepositorio extends JpaRepository<Conversacion, Long> {
    List<Conversacion> findTop60ByCuentaOrderByActualizadoDesc(Cuenta cuenta);

    Optional<Conversacion> findByIdAndCuenta(Long id, Cuenta cuenta);
}
