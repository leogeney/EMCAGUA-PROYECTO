package co.emcagua.api.comun;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Respuestas de error en español y con el mismo formato: { error, detalle, fecha }. */
@RestControllerAdvice
public class ManejoErrores {

    private static ResponseEntity<Map<String, Object>> respuesta(HttpStatus estado, String error, Object detalle) {
        return ResponseEntity.status(estado).body(Map.of("error", error, "detalle", detalle == null ? "" : detalle, "fecha", Instant.now().toString()));
    }

    @ExceptionHandler(ErrorNegocio.class)
    ResponseEntity<Map<String, Object>> negocio(ErrorNegocio e) { return respuesta(HttpStatus.BAD_REQUEST, e.getMessage(), null); }

    @ExceptionHandler(NoEncontrado.class)
    ResponseEntity<Map<String, Object>> noEncontrado(NoEncontrado e) { return respuesta(HttpStatus.NOT_FOUND, e.getMessage(), null); }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> validacion(MethodArgumentNotValidException e) {
        var campos = e.getBindingResult().getFieldErrors().stream().collect(Collectors.toMap(f -> f.getField(), f -> String.valueOf(f.getDefaultMessage()), (a, b) -> a));
        return respuesta(HttpStatus.BAD_REQUEST, "Hay datos inválidos", campos);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, Object>> duplicado(DataIntegrityViolationException e) {
        return respuesta(HttpStatus.CONFLICT, "El dato ya existe o está siendo usado por otro registro", e.getMostSpecificCause().getMessage());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ResponseEntity<Map<String, Object>> concurrencia(ObjectOptimisticLockingFailureException e) {
        return respuesta(HttpStatus.CONFLICT, "Otra persona modificó este registro al mismo tiempo. Recarga y vuelve a intentar.", null);
    }
}
