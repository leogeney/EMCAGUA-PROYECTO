package co.emcagua.api.ia;

import java.util.ArrayList;
import java.util.List;

import co.emcagua.api.comun.Entidad;
import co.emcagua.api.seguridad.Cuenta;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Chat con Gotita. Cada funcionario ve solo los suyos. */
@Entity
@Table(name = "conversacion")
@Getter
@Setter
@NoArgsConstructor
public class Conversacion extends Entidad {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Cuenta cuenta;

    @Column(nullable = false, length = 120)
    private String titulo;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "mensaje_chat", joinColumns = @JoinColumn(name = "conversacion_id"))
    @OrderColumn(name = "orden")
    private List<Mensaje> mensajes = new ArrayList<>();

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Mensaje {
        /** usuario | asistente */
        @Column(nullable = false, length = 10) private String rol;
        @Column(nullable = false, columnDefinition = "text") private String texto;
        /** ollama | reglas */
        @Column(length = 10) private String fuente;

        public Mensaje(String rol, String texto, String fuente) {
            this.rol = rol;
            this.texto = texto;
            this.fuente = fuente;
        }
    }

}
